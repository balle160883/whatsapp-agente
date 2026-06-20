import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { safeDecrypt } from '@/lib/encryption'

export async function processPendingCampaigns() {
  const now = new Date()
  console.log(`[${now.toISOString()}] - Processing pending campaigns...`)

  try {
    // Find scheduled campaigns in AuditEvent
    const campaigns = await prisma.auditEvent.findMany({
      where: { action: 'CAMPAIGN_SCHEDULED' },
    })

    for (const camp of campaigns) {
      const details = camp.details as {
        campaignName?: string
        message?: string
        scheduledAt?: string
        status?: string
        recipients?: Array<{ name: string; phone: string }>
      }

      if (!details || details.status !== 'PENDING') continue

      const scheduledAt = details.scheduledAt ? new Date(details.scheduledAt) : null
      if (!scheduledAt || scheduledAt > now) continue // Not scheduled or scheduled in the future

      console.log(`[Campaign Job] Processing campaign "${details.campaignName}" (${camp.id})`)

      // 1. Mark status as SENDING first to prevent concurrent execution
      const updatedDetails = { ...details, status: 'SENDING' }
      await prisma.auditEvent.update({
        where: { id: camp.id },
        data: { details: updatedDetails },
      })

      // 2. Get WhatsApp config for organization
      const waConfig = await prisma.whatsAppConfig.findFirst({
        where: { organizationId: camp.organizationId, isActive: true },
      })
      const accessToken = waConfig ? safeDecrypt(waConfig.accessTokenEnc) : null
      const hasConfig = waConfig && accessToken

      const recipients = details.recipients || []
      const results = []

      for (const rec of recipients) {
        try {
          // Find or create contact
          let contact = await prisma.contact.findFirst({
            where: { phone: rec.phone, organizationId: camp.organizationId },
          })

          if (!contact) {
            contact = await prisma.contact.create({
              data: {
                organizationId: camp.organizationId,
                phone: rec.phone,
                fullName: rec.name,
              },
            })
          }

          // Find or create conversation
          let conversation = await prisma.conversation.findFirst({
            where: { contactId: contact.id, organizationId: camp.organizationId },
          })

          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                organizationId: camp.organizationId,
                contactId: contact.id,
                status: 'OPEN',
                botActive: true,
              },
            })
          }

          const personalizedMsg = (details.message || '').replace(
            /\{\{nombre\}\}/g,
            contact.fullName ?? 'Cliente'
          )

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

          // Save outgoing message
          await prisma.message.create({
            data: {
              organizationId: camp.organizationId,
              conversationId: conversation.id,
              direction: 'OUTGOING',
              sender: 'BOT',
              content: personalizedMsg,
              metadata: {
                campaignId: camp.id,
                campaignName: details.campaignName,
                error: apiError,
                simulated: !hasConfig,
              },
            },
          })

          // Update conversation
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() },
          })

          results.push({
            name: rec.name,
            phone: rec.phone,
            success: sent,
            error: apiError,
          })
        } catch (err) {
          console.error(`Failed to process campaign recipient ${rec.phone}:`, err)
          results.push({
            name: rec.name,
            phone: rec.phone,
            success: false,
            error: err instanceof Error ? err.message : 'Error interno',
          })
        }
      }

      // 3. Mark status as SENT
      const finalDetails = {
        ...updatedDetails,
        status: 'SENT',
        sentAt: new Date().toISOString(),
        results,
      }
      await prisma.auditEvent.update({
        where: { id: camp.id },
        data: { details: finalDetails },
      })

      // Create sent audit log
      await prisma.auditEvent.create({
        data: {
          organizationId: camp.organizationId,
          userId: camp.userId,
          action: 'CAMPAIGN_SENT',
          entity: 'Message',
          details: {
            campaignId: camp.id,
            campaignName: details.campaignName,
            recipientsCount: recipients.length,
            hasConfig,
          },
        },
      })

      console.log(`[Campaign Job] Finished campaign "${details.campaignName}" (${camp.id})`)
    }
  } catch (error) {
    console.error('Error processing pending campaigns:', error)
  }

  console.log(`[${new Date().toISOString()}] - Done processing pending campaigns.`)
}
