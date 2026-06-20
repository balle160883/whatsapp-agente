import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { safeDecrypt } from '@/lib/encryption'
import { createAuditEvent } from '@/lib/audit'

const campaignSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  message: z.string().min(5, 'El mensaje debe tener al menos 5 caracteres'),
  contactIds: z.array(z.string().uuid()).optional(),
  csvContacts: z
    .array(
      z.object({
        name: z.string(),
        phone: z.string(),
      })
    )
    .optional(),
  scheduledAt: z.string().optional(),
})

// GET /api/campaigns - Obtener historial de campañas agrupando los mensajes
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    // 1. Buscar mensajes de salida que tengan metadatos de campaña
    const messages = await prisma.message.findMany({
      where: {
        organizationId,
        direction: 'OUTGOING',
        NOT: {
          metadata: {
            equals: {},
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        conversation: {
          include: {
            contact: true,
          },
        },
      },
    })

    // Agrupar mensajes en campañas
    const campaignsMap = new Map<
      string,
      {
        id: string
        name: string
        message: string
        sentAt: string
        totalRecipients: number
        recipients: Array<{ name: string; phone: string; status: string }>
        isScheduled?: boolean
      }
    >()

    messages.forEach((msg) => {
      const meta = msg.metadata as { campaignId?: string; campaignName?: string; error?: string }
      if (meta && meta.campaignId && meta.campaignName) {
        const campId = meta.campaignId
        const contactName = msg.conversation.contact.fullName ?? msg.conversation.contact.phone
        const contactPhone = msg.conversation.contact.phone

        if (!campaignsMap.has(campId)) {
          campaignsMap.set(campId, {
            id: campId,
            name: meta.campaignName,
            message: msg.content,
            sentAt: msg.createdAt.toISOString(),
            totalRecipients: 0,
            recipients: [],
          })
        }

        const campaign = campaignsMap.get(campId)!
        campaign.totalRecipients += 1
        campaign.recipients.push({
          name: contactName,
          phone: contactPhone,
          status: meta.error ? 'Fallido' : 'Enviado',
        })
      }
    })

    const sentCampaigns = Array.from(campaignsMap.values())

    // 2. Buscar campañas programadas pendientes en AuditEvent
    const scheduledEvents = await prisma.auditEvent.findMany({
      where: {
        organizationId,
        action: 'CAMPAIGN_SCHEDULED',
      },
      orderBy: { createdAt: 'desc' },
    })

    interface CampaignDetails {
      status?: string
      campaignName?: string
      message?: string
      scheduledAt?: string
      recipients?: Array<{ name?: string; phone: string }>
    }

    const pendingCampaigns = scheduledEvents
      .map((evt) => {
        const details = evt.details as unknown as CampaignDetails
        if (details?.status !== 'PENDING') return null
        return {
          id: evt.id,
          name: details.campaignName || 'Campaña Programada',
          message: details.message || '',
          sentAt: details.scheduledAt || evt.createdAt.toISOString(),
          totalRecipients: details.recipients?.length || 0,
          recipients: (details.recipients || []).map((r) => ({
            name: r.name || 'Cliente',
            phone: r.phone,
            status: 'Programado',
          })),
          isScheduled: true,
        }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)

    const campaigns = [...pendingCampaigns, ...sentCampaigns].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    )

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/campaigns - Enviar o programar campaña masiva
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { organizationId, id: userId } = session.user

  try {
    const body = await req.json()
    const parsed = campaignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name, message, contactIds, csvContacts, scheduledAt } = parsed.data

    const totalRecipients = (contactIds?.length || 0) + (csvContacts?.length || 0)
    if (totalRecipients === 0) {
      return NextResponse.json(
        { error: 'Debes seleccionar al menos un destinatario' },
        { status: 400 }
      )
    }

    // Recopilar lista unificada de destinatarios
    let recipients: Array<{ name: string; phone: string }> = []
    if (contactIds && contactIds.length > 0) {
      const dbContacts = await prisma.contact.findMany({
        where: { id: { in: contactIds }, organizationId },
      })
      recipients = dbContacts.map((c) => ({
        name: c.fullName || 'Cliente',
        phone: c.phone,
      }))
    }
    if (csvContacts && csvContacts.length > 0) {
      recipients = [
        ...recipients,
        ...csvContacts.map((c) => ({
          name: c.name || 'Cliente',
          phone: c.phone,
        })),
      ]
    }

    // Escenario 1: Programar campaña
    if (scheduledAt) {
      const schedDate = new Date(scheduledAt)
      if (isNaN(schedDate.getTime()) || schedDate <= new Date()) {
        return NextResponse.json(
          { error: 'La fecha de programación debe ser en el futuro' },
          { status: 400 }
        )
      }

      const campaignId = crypto.randomUUID()
      await prisma.auditEvent.create({
        data: {
          id: campaignId,
          organizationId,
          userId,
          action: 'CAMPAIGN_SCHEDULED',
          entity: 'Campaign',
          entityId: campaignId,
          details: {
            campaignName: name,
            message,
            scheduledAt,
            status: 'PENDING',
            recipients,
          },
        },
      })

      return NextResponse.json({
        success: true,
        campaignId,
        message: 'Campaña programada con éxito',
        isScheduled: true,
      })
    }

    // Escenario 2: Enviar campaña inmediatamente
    const campaignId = crypto.randomUUID()
    const waConfig = await prisma.whatsAppConfig.findFirst({
      where: { organizationId, isActive: true },
    })

    const accessToken = waConfig ? safeDecrypt(waConfig.accessTokenEnc) : null
    const hasConfig = waConfig && accessToken

    const results = []

    for (const recipient of recipients) {
      // Buscar o crear contacto
      let contact = await prisma.contact.findFirst({
        where: { phone: recipient.phone, organizationId },
      })

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            organizationId,
            phone: recipient.phone,
            fullName: recipient.name,
          },
        })
      }

      // Buscar o crear conversación activa
      let conversation = await prisma.conversation.findFirst({
        where: { contactId: contact.id, organizationId },
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

      // Reemplazar variables del mensaje
      const personalizedMsg = message.replace(/\{\{nombre\}\}/g, contact.fullName ?? 'Cliente')

      let sent = false
      let apiError = null

      if (hasConfig) {
        try {
          await sendWhatsAppMessage({
            phoneNumberId: waConfig.phoneNumberId,
            accessToken,
            to: contact.phone,
            text: personalizedMsg,
          })
          sent = true
        } catch (err) {
          console.error(`Error sending message to ${contact.phone}:`, err)
          apiError = err instanceof Error ? err.message : 'Error en la llamada API'
        }
      } else {
        sent = true
      }

      // Guardar el mensaje saliente
      const createdMessage = await prisma.message.create({
        data: {
          organizationId,
          conversationId: conversation.id,
          direction: 'OUTGOING',
          sender: 'BOT',
          content: personalizedMsg,
          metadata: {
            campaignId,
            campaignName: name,
            error: apiError,
            simulated: !hasConfig,
          },
        },
      })

      // Actualizar conversación
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      })

      results.push({
        contactId: contact.id,
        messageId: createdMessage.id,
        success: sent,
        error: apiError,
      })
    }

    await createAuditEvent({
      organizationId,
      userId,
      action: 'CAMPAIGN_SENT',
      entity: 'Message',
      details: {
        campaignId,
        campaignName: name,
        recipientsCount: recipients.length,
        hasConfig,
      },
    })

    return NextResponse.json({
      success: true,
      campaignId,
      results,
    })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
