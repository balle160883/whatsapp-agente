import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { subDays, startOfDay, eachDayOfInterval, format } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId } = session.user
    const { searchParams } = req.nextUrl
    const timeframe = searchParams.get('timeframe') || '30d'

    const now = new Date()
    let startDate: Date | undefined

    if (timeframe === '7d') {
      startDate = subDays(now, 7)
    } else if (timeframe === '30d') {
      startDate = subDays(now, 30)
    } else if (timeframe === '90d') {
      startDate = subDays(now, 90)
    } else {
      startDate = undefined // 'all'
    }

    // 1. Fetch messages for volume, trend, and peak hours
    const messages = await prisma.message.findMany({
      where: {
        organizationId,
        createdAt: startDate ? { gte: startDate } : undefined,
      },
      select: {
        createdAt: true,
        direction: true,
      },
    })

    const totalMessages = messages.length
    const incomingMessages = messages.filter((m) => m.direction === 'INCOMING').length
    const outgoingMessages = messages.filter((m) => m.direction === 'OUTGOING').length

    // Calculate peak hours (0-23)
    const peakHours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
    messages.forEach((m) => {
      const hr = new Date(m.createdAt).getHours()
      if (hr >= 0 && hr < 24) {
        peakHours[hr].count++
      }
    })

    // Calculate daily trend
    let intervalStart = startDate
    if (!intervalStart) {
      // Find oldest message or default to 30 days ago
      const oldestMsg = messages.reduce(
        (oldest, m) => (m.createdAt.getTime() < oldest.getTime() ? m.createdAt : oldest),
        now
      )
      // Cap at 180 days to avoid performance issues
      const maxAge = subDays(now, 180)
      intervalStart = oldestMsg.getTime() < maxAge.getTime() ? maxAge : oldestMsg
    }

    // Ensure start is before end
    if (intervalStart.getTime() > now.getTime()) {
      intervalStart = subDays(now, 30)
    }

    const days = eachDayOfInterval({ start: startOfDay(intervalStart), end: now })
    const dailyMap = new Map<string, { incoming: number; outgoing: number }>()

    messages.forEach((m) => {
      const dayStr = format(m.createdAt, 'yyyy-MM-dd')
      if (!dailyMap.has(dayStr)) {
        dailyMap.set(dayStr, { incoming: 0, outgoing: 0 })
      }
      const val = dailyMap.get(dayStr)!
      if (m.direction === 'INCOMING') {
        val.incoming++
      } else {
        val.outgoing++
      }
    })

    const dailyTrend = days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const val = dailyMap.get(dayStr) || { incoming: 0, outgoing: 0 }
      return {
        date: dayStr,
        incoming: val.incoming,
        outgoing: val.outgoing,
        total: val.incoming + val.outgoing,
      }
    })

    // 2. Appointment Conversion
    const totalConversations = await prisma.conversation.count({
      where: {
        organizationId,
        createdAt: startDate ? { gte: startDate } : undefined,
      },
    })

    const convertedConversations = await prisma.conversation.count({
      where: {
        organizationId,
        createdAt: startDate ? { gte: startDate } : undefined,
        appointments: {
          some: {
            status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] },
          },
        },
      },
    })

    const totalAppointments = await prisma.appointment.count({
      where: {
        organizationId,
        createdAt: startDate ? { gte: startDate } : undefined,
      },
    })

    const appointmentStatuses = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        organizationId,
        createdAt: startDate ? { gte: startDate } : undefined,
      },
      _count: { id: true },
    })

    const appointmentStatusCounts: Record<string, number> = {
      SCHEDULED: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    }
    appointmentStatuses.forEach((item) => {
      appointmentStatusCounts[item.status] = item._count.id
    })

    const appointmentConversionRate =
      totalConversations > 0
        ? Number(((convertedConversations / totalConversations) * 100).toFixed(1))
        : 0

    // 3. NPS & Customer Satisfaction
    const feedbacks = await prisma.feedback.findMany({
      where: {
        organizationId,
        status: 'RESPONDED',
        createdAt: startDate ? { gte: startDate } : undefined,
      },
      select: {
        score: true,
        npsCategory: true,
        comment: true,
        createdAt: true,
      },
    })

    const totalFeedbacks = feedbacks.length
    const npsCategoryCounts = {
      PROMOTER: 0,
      PASSIVE: 0,
      DETRACTOR: 0,
    }
    const scoreDistribution: Record<number, number> = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    }
    let totalScore = 0
    let scoreCount = 0

    feedbacks.forEach((f) => {
      if (f.npsCategory) {
        npsCategoryCounts[f.npsCategory]++
      }
      if (f.score !== null && f.score !== undefined) {
        scoreDistribution[f.score] = (scoreDistribution[f.score] || 0) + 1
        totalScore += f.score
        scoreCount++
      }
    })

    const scoreAverage = scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0
    let npsScore = 0
    if (totalFeedbacks > 0) {
      npsScore = Math.round(
        ((npsCategoryCounts.PROMOTER - npsCategoryCounts.DETRACTOR) / totalFeedbacks) * 100
      )
    }

    // 4. Handoff Analysis (Audit log query)
    const handoffEvents = await prisma.auditEvent.findMany({
      where: {
        organizationId,
        action: 'HUMAN_HANDOFF_REQUESTED',
        createdAt: startDate ? { gte: startDate } : undefined,
      },
      select: {
        entityId: true,
        details: true,
      },
    })

    const handoffConversationIds = new Set<string>()
    handoffEvents.forEach((e) => {
      if (e.entityId) {
        handoffConversationIds.add(e.entityId)
      }
    })

    const handoffConversationsCount = handoffConversationIds.size
    const handoffRate =
      totalConversations > 0
        ? Number(((handoffConversationsCount / totalConversations) * 100).toFixed(1))
        : 0

    const handoffReasonMap = new Map<string, number>()
    handoffEvents.forEach((e) => {
      const details = e.details as Record<string, unknown> | null
      let reason = (details?.reason as string) || 'No especificado'
      reason = reason.trim()
      if (reason.length > 80) {
        reason = reason.substring(0, 77) + '...'
      }
      handoffReasonMap.set(reason, (handoffReasonMap.get(reason) || 0) + 1)
    })

    const commonHandoffReasons = Array.from(handoffReasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 5. Sentiment analysis (from conversations)
    const sentimentGroups = await prisma.conversation.groupBy({
      by: ['sentiment'],
      where: {
        organizationId,
        createdAt: startDate ? { gte: startDate } : undefined,
      },
      _count: { id: true },
    })

    const sentimentDistribution: Record<string, number> = {
      POSITIVE: 0,
      NEUTRAL: 0,
      NEGATIVE: 0,
    }

    let sentimentTotal = 0
    sentimentGroups.forEach((item) => {
      const s = item.sentiment || 'NEUTRAL'
      sentimentDistribution[s] = (sentimentDistribution[s] || 0) + item._count.id
      sentimentTotal += item._count.id
    })

    return NextResponse.json({
      messages: {
        total: totalMessages,
        incoming: incomingMessages,
        outgoing: outgoingMessages,
        peakHours,
        dailyTrend,
      },
      appointments: {
        conversionRate: appointmentConversionRate,
        totalConversations,
        convertedConversations,
        totalAppointments,
        statusCounts: appointmentStatusCounts,
      },
      nps: {
        scoreAverage,
        npsScore,
        categoryCounts: npsCategoryCounts,
        scoreDistribution,
        totalFeedbacks,
      },
      handoff: {
        handoffRate,
        totalConversations,
        handoffConversations: handoffConversationsCount,
        reasons: commonHandoffReasons,
      },
      sentiment: {
        distribution: sentimentDistribution,
        total: sentimentTotal,
      },
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
