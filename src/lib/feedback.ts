import { prisma } from '@/lib/prisma'
import { safeDecrypt } from '@/lib/encryption'
import { sendWhatsAppMessage, sendWhatsAppInteractiveMessage } from '@/lib/whatsapp'

export async function sendFeedbackSurvey(
  organizationId: string,
  contactId: string,
  appointmentId?: string
) {
  const contact = await prisma.contact.findUnique({ where: { id: contactId } })
  if (!contact) throw new Error('Contact not found')

  const waConfig = await prisma.whatsAppConfig.findUnique({
    where: { organizationId },
  })
  if (!waConfig) throw new Error('WhatsApp config not found')

  // Get agent config for custom messages
  const agentConfig = await prisma.agentConfig.findUnique({
    where: { organizationId },
  })

  // Create feedback record
  const feedback = await prisma.feedback.create({
    data: {
      organizationId,
      contactId,
      appointmentId,
      status: 'SENT',
      sentAt: new Date(),
    },
  })

  // Send WhatsApp message
  const accessToken = safeDecrypt(waConfig.accessTokenEnc)
  if (!accessToken) throw new Error('Cannot decrypt access token')

  const surveyText =
    agentConfig?.npsSurveyMessage ||
    `¡Hola! Esperamos que hayas tenido una excelente experiencia. 🌟

Por favor, califica tu servicio de 0 a 5 estrellas:

1️⃣ - Muy malo
2️⃣ - Malo
3️⃣ - Regular
4️⃣ - Bueno
5️⃣ - Excelente

También puedes dejar un comentario si lo deseas. ¡Gracias por tu feedback!`

  // Try sending interactive list message
  try {
    await sendWhatsAppInteractiveMessage({
      phoneNumberId: waConfig.phoneNumberId,
      accessToken,
      to: contact.phone,
      bodyText: surveyText,
      list: {
        buttonText: 'Calificar servicio',
        sections: [
          {
            title: 'Calificación NPS',
            rows: [
              { id: 'score_5', title: '5️⃣ Excelente', description: 'Totalmente satisfecho' },
              { id: 'score_4', title: '4️⃣ Bueno', description: 'Satisfecho' },
              { id: 'score_3', title: '3️⃣ Regular', description: 'Se puede mejorar' },
              { id: 'score_2', title: '2️⃣ Malo', description: 'Insatisfecho' },
              { id: 'score_1', title: '1️⃣ Muy malo', description: 'Totalmente insatisfecho' },
            ],
          },
        ],
      },
    })
  } catch (error) {
    console.warn('[Feedback] Failed to send interactive list, falling back to text:', error)
    await sendWhatsAppMessage({
      phoneNumberId: waConfig.phoneNumberId,
      accessToken,
      to: contact.phone,
      text: surveyText,
    })
  }

  // Find or create conversation to save outgoing message
  let conversation = await prisma.conversation.findFirst({
    where: {
      organizationId,
      contactId,
      status: { in: ['OPEN', 'HUMAN_HANDOFF'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        organizationId,
        contactId,
        status: 'OPEN',
        botActive: true,
      },
    })
  }

  // Save outgoing message to DB
  await prisma.message.create({
    data: {
      organizationId,
      conversationId: conversation.id,
      direction: 'OUTGOING',
      sender: 'BOT',
      content: surveyText,
    },
  })

  return feedback
}

export async function processFeedbackResponse(
  organizationId: string,
  contactId: string,
  text: string
) {
  // Find latest pending/ sent feedback
  const feedback = await prisma.feedback.findFirst({
    where: {
      organizationId,
      contactId,
      status: { in: ['PENDING', 'SENT'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!feedback) return null

  // Try to extract score (0-5) from text
  let score: number | null = null
  let comment: string | null = text

  const numMatch = text.match(/^[0-5]/)
  if (numMatch) {
    score = parseInt(numMatch[0], 10)
    // Remove the score from the comment if it's at the beginning
    comment = text.slice(numMatch[0].length).trim() || null
  } else {
    // If the message is just a single emoji or number, try to map it
    const emojiToScore: Record<string, number> = {
      '⭐': 1,
      '🌟': 5,
      '1️⃣': 1,
      '2️⃣': 2,
      '3️⃣': 3,
      '4️⃣': 4,
      '5️⃣': 5,
    }
    const emojiMatch = Object.keys(emojiToScore).find((e) => text.includes(e))
    if (emojiMatch) {
      score = emojiToScore[emojiMatch]
      comment = text.replace(emojiMatch, '').trim() || null
    }
  }

  if (score !== null) {
    let npsCategory: 'PROMOTER' | 'PASSIVE' | 'DETRACTOR' | undefined
    let sentiment: 'positive' | 'neutral' | 'negative' | undefined
    let isHighPriority = false
    let responseText = ''

    if (score >= 4) {
      npsCategory = 'PROMOTER'
      sentiment = 'positive'
      responseText = '¡Gracias por tu excelente calificación! 😊'
    } else if (score >= 2) {
      npsCategory = 'PASSIVE'
      sentiment = 'neutral'
      responseText = 'Gracias por tu feedback. Lo tendremos en cuenta.'
    } else {
      npsCategory = 'DETRACTOR'
      sentiment = 'negative'
      isHighPriority = true
      responseText =
        'Lo sentimos que tu experiencia no haya sido buena. Nos pondremos en contacto contigo pronto.'
    }

    await prisma.feedback.update({
      where: { id: feedback.id },
      data: {
        score,
        comment,
        npsCategory,
        sentiment,
        isHighPriority,
        status: 'RESPONDED',
        respondedAt: new Date(),
      },
    })

    return { feedbackId: feedback.id, score, comment, responseText }
  }

  return null
}
