import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAuthUrl } from '@/lib/google-calendar'
import { prisma } from '@/lib/prisma'
import { createAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'

// GET /api/integrations/google-calendar - Get auth URL or current config
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')

  if (action === 'auth-url') {
    const url = getAuthUrl()
    return NextResponse.json({ url })
  }

  const config = await prisma.googleCalendarConfig.findUnique({
    where: { organizationId: session.user.organizationId },
  })

  if (!config) return NextResponse.json(null)

  return NextResponse.json({
    isConnected: config.isConnected,
    calendarId: config.calendarId,
    calendarName: config.calendarName,
    expiryDate: config.expiryDate,
  })
}

// DELETE /api/integrations/google-calendar - Disconnect
export async function DELETE() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { organizationId, id: userId } = session.user

  await prisma.googleCalendarConfig.upsert({
    where: { organizationId },
    create: { organizationId, isConnected: false },
    update: {
      accessTokenEnc: null,
      refreshTokenEnc: null,
      expiryDate: null,
      calendarId: null,
      calendarName: null,
      isConnected: false,
    },
  })

  await createAuditEvent({
    organizationId,
    userId,
    action: AUDIT_ACTIONS.GOOGLE_CALENDAR_DISCONNECTED,
  })

  return NextResponse.json({ success: true })
}
