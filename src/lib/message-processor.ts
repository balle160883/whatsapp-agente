import { prisma } from '@/lib/prisma'
import { safeDecrypt } from '@/lib/encryption'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { runAgent } from '@/lib/ai/agent'
import { processFeedbackResponse } from '@/lib/feedback'
import { processReminderResponse } from '@/lib/reminder'
import { analyzeSentiment } from '@/lib/sentiment'
import { sendHandoffNotification } from '@/lib/notifications'

interface IncomingMessage {
  messageId: string
  from: string
  text: string
  phoneNumberId: string
  timestamp: number
}

export async function processIncomingMessage(msg: IncomingMessage): Promise<void> {
  const log = (level: string, message: string, extra?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level, message, ...extra, messageId: msg.messageId }))

  // ── 1. Find organization by phone number ID ──────────────────────────────
  const waConfig = await prisma.whatsAppConfig.findFirst({
    where: { phoneNumberId: msg.phoneNumberId, isActive: true },
    include: { organization: true },
  })

  if (!waConfig) {
    log('warn', 'No active WhatsApp config found for phoneNumberId', {
      phoneNumberId: msg.phoneNumberId,
    })
    return
  }

  const { organizationId } = waConfig

  // ── 2. Idempotency check ─────────────────────────────────────────────────
  const existingMsg = await prisma.message.findUnique({
    where: { externalId: msg.messageId },
  })

  if (existingMsg) {
    log('info', 'Duplicate message, skipping', { externalId: msg.messageId })
    return
  }

  // ── 3. Upsert contact ────────────────────────────────────────────────────
  const contact = await prisma.contact.upsert({
    where: {
      organizationId_phone: {
        organizationId,
        phone: msg.from,
      },
    },
    create: {
      organizationId,
      phone: msg.from,
    },
    update: {},
  })

  // ── 4. Get or create conversation ────────────────────────────────────────
  let conversation = await prisma.conversation.findFirst({
    where: {
      organizationId,
      contactId: contact.id,
      status: { in: ['OPEN', 'HUMAN_HANDOFF'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        organizationId,
        contactId: contact.id,
        status: 'OPEN',
        botActive: true,
      },
    })
  }

  // ── 5. Save incoming message ─────────────────────────────────────────────
  await prisma.message.create({
    data: {
      organizationId,
      conversationId: conversation.id,
      externalId: msg.messageId,
      direction: 'INCOMING',
      sender: 'CLIENT',
      content: msg.text,
    },
  })

  // Analyze sentiment and update conversation
  const sentimentResult = analyzeSentiment(msg.text)
  const isNegative = sentimentResult.sentiment === 'NEGATIVE'

  let transferToHuman = false
  let humanHandoffMessage = ''

  if (isNegative && conversation.status !== 'HUMAN_HANDOFF') {
    transferToHuman = true
    humanHandoffMessage =
      'Lo siento que estés teniendo una mala experiencia. He transferido tu conversación a un agente humano que te atenderá pronto.'
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      sentiment: sentimentResult.sentiment,
      isHighPriority: isNegative,
      status: transferToHuman ? 'HUMAN_HANDOFF' : conversation.status,
      botActive: transferToHuman ? false : conversation.botActive,
    },
  })

  if (transferToHuman) {
    log('info', 'Automatic human handoff triggered due to negative sentiment', {
      conversationId: conversation.id,
      sentiment: sentimentResult.sentiment,
    })

    const fullConv = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: { contact: true, organization: true },
    })

    if (fullConv) {
      await sendHandoffNotification({
        contactName: fullConv.contact.fullName ?? 'Cliente',
        contactPhone: fullConv.contact.phone,
        conversationId: conversation.id,
        organizationName: fullConv.organization.name,
      })
    }

    const accessToken = safeDecrypt(waConfig.accessTokenEnc)
    if (accessToken) {
      await sendWhatsAppMessage({
        phoneNumberId: msg.phoneNumberId,
        accessToken,
        to: msg.from,
        text: humanHandoffMessage,
      })

      await prisma.message.create({
        data: {
          organizationId,
          conversationId: conversation.id,
          direction: 'OUTGOING',
          sender: 'BOT',
          content: humanHandoffMessage,
        },
      })
    }

    return // Skip normal agent flow for handoff
  }

  log('info', 'Message saved', {
    conversationId: conversation.id,
    from: msg.from,
  })

  // ── 5.5. Check if this is a feedback response ─────────────────────────────
  const feedbackResult = await processFeedbackResponse(organizationId, contact.id, msg.text)

  if (feedbackResult) {
    log('info', 'Feedback response processed', {
      feedbackId: feedbackResult.feedbackId,
      score: feedbackResult.score,
    })

    const accessToken = safeDecrypt(waConfig.accessTokenEnc)
    if (accessToken) {
      await sendWhatsAppMessage({
        phoneNumberId: msg.phoneNumberId,
        accessToken,
        to: msg.from,
        text: feedbackResult.responseText,
      })

      await prisma.message.create({
        data: {
          organizationId,
          conversationId: conversation.id,
          direction: 'OUTGOING',
          sender: 'BOT',
          content: feedbackResult.responseText,
        },
      })
    }

    return // Skip normal agent flow for feedback responses
  }

  // ── 5.6. Check if this is a reminder response ──────────────────────────────
  const reminderResult = await processReminderResponse(organizationId, contact.id, msg.text)

  if (reminderResult) {
    log('info', 'Reminder response processed', {
      appointmentId: reminderResult.appointmentId,
      action: reminderResult.action,
    })

    const accessToken = safeDecrypt(waConfig.accessTokenEnc)
    if (accessToken) {
      await sendWhatsAppMessage({
        phoneNumberId: msg.phoneNumberId,
        accessToken,
        to: msg.from,
        text: reminderResult.responseText,
      })

      await prisma.message.create({
        data: {
          organizationId,
          conversationId: conversation.id,
          direction: 'OUTGOING',
          sender: 'BOT',
          content: reminderResult.responseText,
        },
      })
    }

    return // Skip normal agent flow for reminder responses
  }

  // ── 6. Check if bot is active ────────────────────────────────────────────
  if (!conversation.botActive) {
    log('info', 'Bot is inactive for this conversation, skipping AI response')
    return
  }

  // ── 7. Check agent config ────────────────────────────────────────────────
  const agentConfig = await prisma.agentConfig.findUnique({
    where: { organizationId },
  })

  if (!agentConfig?.botActive) {
    log('info', 'Bot disabled at org level, skipping')
    return
  }

  // ── 8. Run AI agent ──────────────────────────────────────────────────────
  let agentResponse: string
  try {
    agentResponse = await runAgent(
      {
        organizationId,
        conversationId: conversation.id,
        contactId: contact.id,
        contactPhone: msg.from,
      },
      msg.text
    )
  } catch (error) {
    log('error', 'Agent failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    agentResponse =
      'Lo siento, estoy teniendo dificultades. Por favor intenta de nuevo en un momento.'
  }

  // ── 9. Save bot response ─────────────────────────────────────────────────
  await prisma.message.create({
    data: {
      organizationId,
      conversationId: conversation.id,
      direction: 'OUTGOING',
      sender: 'BOT',
      content: agentResponse,
    },
  })

  // ── 10. Send response via WhatsApp API ───────────────────────────────────
  const accessToken = safeDecrypt(waConfig.accessTokenEnc)
  if (!accessToken) {
    log('error', 'Cannot decrypt access token')
    return
  }

  try {
    await sendWhatsAppMessage({
      phoneNumberId: msg.phoneNumberId,
      accessToken,
      to: msg.from,
      text: agentResponse,
    })
    log('info', 'Response sent via WhatsApp', { to: msg.from })
  } catch (error) {
    log('error', 'Failed to send WhatsApp message', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
