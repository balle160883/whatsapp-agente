import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import type { Feedback } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const minScore = searchParams.get('minScore')
  const maxScore = searchParams.get('maxScore')
  const npsCategory = searchParams.get('npsCategory')
  const sentiment = searchParams.get('sentiment')
  const isHighPriority = searchParams.get('isHighPriority')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: any = { organizationId: session.user.organizationId }

  if (status) where.status = status
  if (minScore) where.score = { gte: parseInt(minScore, 10) }
  if (maxScore) where.score = { ...where.score, lte: parseInt(maxScore, 10) }
  if (npsCategory) where.npsCategory = npsCategory
  if (sentiment) where.sentiment = sentiment
  if (isHighPriority !== null) where.isHighPriority = isHighPriority === 'true'
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) where.createdAt.lte = new Date(endDate)
  }

  const feedbacks = await prisma.feedback.findMany({
    where,
    include: { contact: true, appointment: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Calculate NPS
  const responses = feedbacks.filter((f: Feedback) => f.score !== null)
  let nps = 0
  let promoters = 0
  let passives = 0
  let detractors = 0
  const totalResponses = responses.length

  if (totalResponses > 0) {
    responses.forEach((f: Feedback) => {
      const score = f.score!
      if (score >= 4) promoters++
      else if (score >= 2) passives++
      else detractors++
    })
    nps = ((promoters - detractors) / totalResponses) * 100
  }

  const stats = {
    total: feedbacks.length,
    responded: responses.length,
    pending: feedbacks.filter((f: Feedback) => f.status === 'PENDING').length,
    highPriority: feedbacks.filter((f: Feedback) => f.isHighPriority).length,
    averageScore:
      totalResponses > 0
        ? (
            responses.reduce((sum: number, f: Feedback) => sum + (f.score || 0), 0) / totalResponses
          ).toFixed(1)
        : '0',
    nps,
    promoters,
    passives,
    detractors,
  }

  return NextResponse.json({ feedbacks, stats })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { contactId, appointmentId } = body

  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      organizationId: session.user.organizationId,
    },
  })

  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const feedback = await prisma.feedback.create({
    data: {
      organizationId: session.user.organizationId,
      contactId,
      appointmentId,
      status: 'PENDING',
    },
  })

  await createAuditEvent({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: AUDIT_ACTIONS.FEEDBACK_SENT,
    entity: 'Feedback',
    entityId: feedback.id,
    details: { contactId, appointmentId },
  })

  return NextResponse.json({ feedback })
}
