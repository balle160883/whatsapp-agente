import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp'
import { safeDecrypt } from '@/lib/encryption'
import { createAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { sendHandoffNotification } from '@/lib/notifications'

// GET /api/conversations/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { organizationId } = session.user

  const conversation = await prisma.conversation.findFirst({
    where: { id, organizationId },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: 'asc' } },
      appointments: { orderBy: { startsAt: 'asc' } },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(conversation)
}

// PATCH /api/conversations/[id] - Toggle bot, change status, assign agent
const patchSchema = z.object({
  botActive: z.boolean().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'HUMAN_HANDOFF']).optional(),
  assignedToId: z.string().nullable().optional(),
  assignedToName: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { organizationId, id: userId } = session.user

  const body = (await req.json()) as unknown
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  // Verify ownership
  const existing = await prisma.conversation.findFirst({
    where: { id, organizationId },
    include: { contact: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If assigning an agent, update Contact metadata
  if (parsed.data.assignedToId !== undefined || parsed.data.assignedToName !== undefined) {
    const currentMetadata = (existing.contact.metadata as Record<string, string | null>) || {}
    const updatedMetadata = { ...currentMetadata }

    if (parsed.data.assignedToId !== undefined) {
      if (parsed.data.assignedToId === null) {
        delete updatedMetadata.assignedToId
      } else {
        updatedMetadata.assignedToId = parsed.data.assignedToId
      }
    }

    if (parsed.data.assignedToName !== undefined) {
      if (parsed.data.assignedToName === null) {
        delete updatedMetadata.assignedToName
      } else {
        updatedMetadata.assignedToName = parsed.data.assignedToName
      }
    }

    await prisma.contact.update({
      where: { id: existing.contactId },
      data: {
        metadata: updatedMetadata as Prisma.InputJsonValue,
      },
    })
  }

  const conversationUpdateData: {
    botActive?: boolean
    status?: 'OPEN' | 'CLOSED' | 'HUMAN_HANDOFF'
  } = {}
  if (parsed.data.botActive !== undefined) conversationUpdateData.botActive = parsed.data.botActive
  if (parsed.data.status !== undefined) conversationUpdateData.status = parsed.data.status

  const updated = await prisma.conversation.update({
    where: { id },
    data: conversationUpdateData,
    include: { contact: true, organization: true },
  })

  if (parsed.data.status === 'HUMAN_HANDOFF') {
    await sendHandoffNotification({
      contactName: updated.contact.fullName ?? 'Cliente',
      contactPhone: updated.contact.phone,
      conversationId: id,
      organizationName: updated.organization.name,
    })
  }

  if (typeof parsed.data.botActive === 'boolean') {
    await createAuditEvent({
      organizationId,
      userId,
      action: parsed.data.botActive ? AUDIT_ACTIONS.BOT_ACTIVATED : AUDIT_ACTIONS.BOT_DEACTIVATED,
      entity: 'Conversation',
      entityId: id,
    })
  }

  // Remove relation nesting to match output schema if required, or return directly
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contact: _, organization: __, ...conversationData } = updated
  return NextResponse.json(conversationData)
}

// POST /api/conversations/[id]/messages - Send manual message or internal note
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { organizationId, id: userId } = session.user

  const body = (await req.json()) as {
    message?: string
    isInternal?: boolean
    templateName?: string
    languageCode?: string
    templateText?: string
  }

  if (!body.message?.trim() && !body.templateName?.trim()) {
    return NextResponse.json({ error: 'Message or templateName is required' }, { status: 400 })
  }

  // Verify conversation ownership
  const conversation = await prisma.conversation.findFirst({
    where: { id, organizationId },
    include: { contact: true },
  })
  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isInternal = !!body.isInternal

  let message
  if (isInternal) {
    // Save internal note to DB (do not send via WhatsApp)
    message = await prisma.message.create({
      data: {
        organizationId,
        conversationId: id,
        direction: 'OUTGOING',
        sender: 'HUMAN',
        content: body.message || '',
        metadata: { isInternal: true } as Prisma.InputJsonValue,
      },
    })
  } else {
    // Get WhatsApp config
    const waConfig = await prisma.whatsAppConfig.findFirst({
      where: { organizationId, isActive: true },
    })

    if (!waConfig) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })
    }

    const accessToken = safeDecrypt(waConfig.accessTokenEnc)
    if (!accessToken) {
      return NextResponse.json({ error: 'Invalid WhatsApp credentials' }, { status: 400 })
    }

    const msgContent = body.templateText || body.message || ''

    if (body.templateName) {
      // Send template via WhatsApp
      await sendWhatsAppTemplate({
        phoneNumberId: waConfig.phoneNumberId,
        accessToken,
        to: conversation.contact.phone,
        templateName: body.templateName,
        languageCode: body.languageCode || 'es',
      })
    } else {
      // Send regular message via WhatsApp
      await sendWhatsAppMessage({
        phoneNumberId: waConfig.phoneNumberId,
        accessToken,
        to: conversation.contact.phone,
        text: body.message || '',
      })
    }

    // Save message to DB
    message = await prisma.message.create({
      data: {
        organizationId,
        conversationId: id,
        direction: 'OUTGOING',
        sender: 'HUMAN',
        content: msgContent,
        metadata: body.templateName
          ? ({ templateName: body.templateName } as Prisma.InputJsonValue)
          : undefined,
      },
    })
  }

  await prisma.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  })

  await createAuditEvent({
    organizationId,
    userId,
    action: isInternal ? AUDIT_ACTIONS.INTERNAL_NOTE_ADDED : AUDIT_ACTIONS.MESSAGE_SENT_MANUALLY,
    entity: 'Message',
    entityId: message.id,
  })

  return NextResponse.json(message, { status: 201 })
}
