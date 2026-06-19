import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendFeedbackSurvey } from '@/lib/feedback'
import { createAuditEvent } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const service = searchParams.get('service')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: any = { organizationId: session.user.organizationId }

  if (status) where.status = status
  if (service) where.service = { contains: service, mode: 'insensitive' }
  if (startDate || endDate) {
    where.startsAt = {}
    if (startDate) where.startsAt.gte = new Date(startDate)
    if (endDate) where.startsAt.lte = new Date(endDate)
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { startsAt: 'desc' },
    take: 100,
    include: {
      contact: { select: { fullName: true, phone: true } },
      feedback: true,
    },
  })

  return NextResponse.json({ appointments })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json()

  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId: session.user.organizationId },
  })

  if (!appointment) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status },
    include: { contact: true },
  })

  await createAuditEvent({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: status === 'COMPLETED' ? 'APPOINTMENT_COMPLETED' : 'APPOINTMENT_UPDATED',
    entity: 'Appointment',
    entityId: id,
    details: { status },
  })

  // Send feedback survey when appointment is marked as completed
  if (status === 'COMPLETED' && !appointment.googleEventId) {
    try {
      await sendFeedbackSurvey(session.user.organizationId, updated.contactId, id)
    } catch (error) {
      console.error('Failed to send feedback survey:', error)
    }
  }

  return NextResponse.json({ appointment: updated })
}
