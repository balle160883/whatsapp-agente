import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { score, comment } = body

  const feedback = await prisma.feedback.findFirst({
    where: {
      id,
      organizationId: session.user.organizationId,
    },
  })

  if (!feedback) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })

  let npsCategory: 'PROMOTER' | 'PASSIVE' | 'DETRACTOR' | undefined
  let sentiment: 'positive' | 'neutral' | 'negative' | undefined
  let isHighPriority = false

  if (score !== undefined && score !== null) {
    if (score >= 4) {
      npsCategory = 'PROMOTER'
      sentiment = 'positive'
    } else if (score >= 2) {
      npsCategory = 'PASSIVE'
      sentiment = 'neutral'
    } else {
      npsCategory = 'DETRACTOR'
      sentiment = 'negative'
      isHighPriority = true
    }
  }

  const updated = await prisma.feedback.update({
    where: { id },
    data: {
      score,
      comment,
      npsCategory,
      sentiment,
      isHighPriority,
      status: 'RESPONDED',
      respondedAt: new Date(),
    },
    include: { contact: true, appointment: true },
  })

  await createAuditEvent({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: AUDIT_ACTIONS.FEEDBACK_RESPONDED,
    entity: 'Feedback',
    entityId: id,
    details: { score, comment, npsCategory, isHighPriority },
  })

  return NextResponse.json({ feedback: updated })
}
