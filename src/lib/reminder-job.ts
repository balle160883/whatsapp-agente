import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { safeDecrypt } from '@/lib/encryption'
import { format, parseISO, addMinutes } from 'date-fns'
import { es } from 'date-fns/locale'

export async function processPendingReminders() {
  const now = new Date()
  console.log(`[${now.toISOString()}] - Processing pending reminders...`)

  // Fetch agent configs for all organizations
  const agentConfigs = await prisma.agentConfig.findMany()

  for (const config of agentConfigs) {
    const reminderMinutes = config.reminderMinutes || 60
    const targetTime = addMinutes(now, reminderMinutes)

    // Find upcoming appointments without reminders sent
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        organizationId: config.organizationId,
        status: {
          in: ['SCHEDULED', 'CONFIRMED'],
        },
        reminderSent: false,
        startsAt: {
          lte: targetTime,
          gte: now,
        },
      },
      include: {
        contact: true,
        organization: {
          include: {
            whatsappConfig: true,
          },
        },
      },
    })

    for (const apt of upcomingAppointments) {
      if (!apt.organization.whatsappConfig) continue

      try {
        const accessToken = safeDecrypt(apt.organization.whatsappConfig.accessTokenEnc)
        if (!accessToken) continue

        const clientName = apt.contact.fullName || 'Cliente'
        const formattedDate = format(
          parseISO(apt.startsAt.toISOString()),
          "EEEE d 'de' MMMM 'a las' HH:mm",
          { locale: es }
        )

        const reminderText = `¡Hola ${clientName}! 📅\n\nTe recordamos tu cita:\n\nServicio: ${apt.service}\nFecha y hora: ${formattedDate}\n\n¿Quieres confirmar tu asistencia, reprogramar o cancelar?\n\n1️⃣ Confirmar\n2️⃣ Reprogramar\n3️⃣ Cancelar`

        await sendWhatsAppMessage({
          phoneNumberId: apt.organization.whatsappConfig.phoneNumberId,
          accessToken,
          to: apt.contact.phone,
          text: reminderText,
        })

        await prisma.appointment.update({
          where: { id: apt.id },
          data: {
            reminderSent: true,
            reminderSentAt: new Date(),
          },
        })

        console.log(`✅ Reminder sent to ${apt.contact.phone} for appointment ${apt.id}`)
      } catch (error) {
        console.error(`❌ Failed to send reminder for appointment ${apt.id}`, error)
      }
    }
  }

  console.log(`[${new Date().toISOString()}] - Done processing pending reminders.`)
}
