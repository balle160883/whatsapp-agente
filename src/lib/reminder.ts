import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { safeDecrypt } from '@/lib/encryption'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export async function sendAppointmentReminder(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { contact: true, organization: { include: { whatsappConfig: true, agentConfig: true } } },
  })

  if (!appointment || !appointment.organization.whatsappConfig) {
    throw new Error('Appointment or WhatsApp config not found')
  }

  const accessToken = safeDecrypt(appointment.organization.whatsappConfig.accessTokenEnc)
  if (!accessToken) {
    throw new Error('Failed to decrypt WhatsApp access token')
  }

  const clientName = appointment.contact.fullName || 'Cliente'
  const formattedDate = format(
    parseISO(appointment.startsAt.toISOString()),
    "EEEE d 'de' MMMM 'a las' HH:mm",
    { locale: es }
  )

  // Get custom message from agent config or use default
  const messageTemplate = appointment.organization.agentConfig?.reminderMessage || `¡Hola {{nombre}}! 📅

Te recordamos tu cita:

Servicio: {{servicio}}
Fecha y hora: {{fecha_hora}}

¿Quieres confirmar tu asistencia, reprogramar o cancelar?

1️⃣ Confirmar
2️⃣ Reprogramar
3️⃣ Cancelar`

  // Interpolate variables
  const reminderText = messageTemplate
    .replace(/\{\{nombre\}\}/g, clientName)
    .replace(/\{\{servicio\}\}/g, appointment.service)
    .replace(/\{\{fecha_hora\}\}/g, formattedDate)

  await sendWhatsAppMessage({
    phoneNumberId: appointment.organization.whatsappConfig.phoneNumberId,
    accessToken,
    to: appointment.contact.phone,
    text: reminderText,
  })

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      reminderSent: true,
      reminderSentAt: new Date(),
    },
  })

  return { success: true }
}

export async function processReminderResponse(
  organizationId: string,
  contactId: string,
  text: string
) {
  const latestAppointment = await prisma.appointment.findFirst({
    where: {
      organizationId,
      contactId,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      reminderSent: true,
    },
    orderBy: { startsAt: 'asc' },
  })

  if (!latestAppointment) {
    return null
  }

  const response = text.toLowerCase()
  let responseText = ''

  if (response.includes('1') || response.includes('confirmar')) {
    await prisma.appointment.update({
      where: { id: latestAppointment.id },
      data: { status: 'CONFIRMED' },
    })
    responseText = '¡Perfecto! Hemos confirmado tu asistencia. ¡Nos vemos pronto! 😊'
    return { appointmentId: latestAppointment.id, action: 'confirmed', responseText }
  } else if (response.includes('2') || response.includes('reprogramar')) {
    responseText =
      '¡Claro! Por favor, ¿qué día y hora te conviene? Te ayudaremos a reprogramar tu cita.'
    return { appointmentId: latestAppointment.id, action: 'reschedule', responseText }
  } else if (response.includes('3') || response.includes('cancelar')) {
    await prisma.appointment.update({
      where: { id: latestAppointment.id },
      data: { status: 'CANCELLED' },
    })
    responseText = 'Lo sentimos, hemos cancelado tu cita. Si deseas reprogramarla, ¡avísanos!'
    return { appointmentId: latestAppointment.id, action: 'cancelled', responseText }
  }

  return null
}
