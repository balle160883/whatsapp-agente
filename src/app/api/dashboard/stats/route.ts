import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { subDays, startOfWeek, endOfWeek, startOfDay, eachDayOfInterval, format } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { organizationId } = session.user;
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [
    totalConversations,
    appointmentsThisWeek,
    recentConversations,
    dailyMessages,
  ] = await Promise.all([
    // Conversations last 30 days
    prisma.conversation.count({
      where: {
        organizationId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    // Appointments this week
    prisma.appointment.count({
      where: {
        organizationId,
        startsAt: { gte: weekStart, lte: weekEnd },
        status: { notIn: ["CANCELLED"] },
      },
    }),
    // Latest conversations with last message
    prisma.conversation.findMany({
      where: { organizationId },
      orderBy: { lastMessageAt: "desc" },
      take: 5,
      include: {
        contact: { select: { fullName: true, phone: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, sender: true },
        },
      },
    }),
    // Daily message count for trend (last 14 days)
    prisma.message.groupBy({
      by: ["createdAt"],
      where: {
        organizationId,
        createdAt: { gte: subDays(now, 14) },
        direction: "INCOMING",
      },
      _count: { id: true },
    }),
  ]);

  // Build daily trend data
  const days = eachDayOfInterval({ start: subDays(now, 13), end: now });
  const trend = days.map((day) => {
    const dayStr = format(startOfDay(day), "yyyy-MM-dd");
    const count = dailyMessages.reduce((sum, m) => {
      const mDay = format(startOfDay(new Date(m.createdAt)), "yyyy-MM-dd");
      return mDay === dayStr ? sum + m._count.id : sum;
    }, 0);
    return { date: dayStr, count };
  });

  return NextResponse.json({
    totalConversations,
    appointmentsThisWeek,
    recentConversations: recentConversations.map((c) => ({
      id: c.id,
      status: c.status,
      botActive: c.botActive,
      contact: c.contact,
      lastMessage: c.messages[0] ?? null,
      lastMessageAt: c.lastMessageAt,
    })),
    trend,
  });
}
