import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/conversations
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { organizationId } = session.user
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = 20

  const conversations = await prisma.conversation.findMany({
    where: {
      organizationId,
      ...(status ? { status: status as 'OPEN' | 'CLOSED' | 'HUMAN_HANDOFF' } : {}),
    },
    orderBy: [
      { isHighPriority: 'desc' },
      { sentiment: 'asc' }, // NEGATIVE comes first, then NEUTRAL, then POSITIVE
      { lastMessageAt: 'desc' },
    ],
    skip: (page - 1) * limit,
    take: limit,
    include: {
      contact: { select: { fullName: true, phone: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, createdAt: true, sender: true, direction: true },
      },
    },
  })

  const total = await prisma.conversation.count({
    where: { organizationId, ...(status ? { status: status as 'OPEN' } : {}) },
  })

  return NextResponse.json({ conversations, total, page, limit })
}
