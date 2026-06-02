import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointments = await prisma.appointment.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { startsAt: "desc" },
    take: 100,
    include: {
      contact: { select: { fullName: true, phone: true } },
    },
  });

  return NextResponse.json({ appointments });
}
