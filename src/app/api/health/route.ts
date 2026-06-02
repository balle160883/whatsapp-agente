import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "healthy", timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { status: "unhealthy", error: error.message || String(error), timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
