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
  contactIds: z.array(z.string().uuid()).min(1, 'Debes seleccionar al menos un contacto'),
})

// GET /api/campaigns - Obtener historial de campañas agrupando los mensajes
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    // Buscar mensajes de salida que tengan metadatos de campaña
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
        sentAt: Date
        totalRecipients: number
        recipients: Array<{ name: string; phone: string; status: string }>
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
            sentAt: msg.createdAt,
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

    const campaigns = Array.from(campaignsMap.values()).sort(
      (a, b) => b.sentAt.getTime() - a.sentAt.getTime()
    )

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/campaigns - Enviar campaña masiva
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

    const { name, message, contactIds } = parsed.data
    const campaignId = crypto.randomUUID()

    // 1. Obtener la config de WhatsApp activa
    const waConfig = await prisma.whatsAppConfig.findFirst({
      where: { organizationId, isActive: true },
    })

    const accessToken = waConfig ? safeDecrypt(waConfig.accessTokenEnc) : null
    const hasConfig = waConfig && accessToken

    const results = []

    // 2. Procesar cada contacto en bucle
    for (const contactId of contactIds) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, organizationId },
      })

      if (!contact) continue

      // Buscar o crear conversación activa
      let conversation = await prisma.conversation.findFirst({
        where: { contactId, organizationId },
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
        // Simulación exitosa si no hay API configurada
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
        contactId,
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
        recipientsCount: contactIds.length,
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
