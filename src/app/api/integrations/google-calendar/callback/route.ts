import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client } from '@/lib/google-calendar'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { google } from 'googleapis'
import { auth } from '@/auth'
import { createAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const appUrl =
    process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/integraciones?error=google_oauth_denied`)
  }

  // We need the session to identify the organization
  const session = await auth()
  if (!session?.user) {
    return NextResponse.redirect(`${appUrl}/login`)
  }

  const { organizationId, id: userId } = session.user

  try {
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    oauth2Client.setCredentials(tokens)

    // Get list of calendars
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calListResponse = await calendar.calendarList.list()
    const primaryCalendar = calListResponse.data.items?.find((cal) => cal.primary)

    await prisma.googleCalendarConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        accessTokenEnc: tokens.access_token ? encrypt(tokens.access_token) : null,
        refreshTokenEnc: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarId: primaryCalendar?.id ?? 'primary',
        calendarName: primaryCalendar?.summary ?? 'Primary Calendar',
        isConnected: true,
      },
      update: {
        accessTokenEnc: tokens.access_token ? encrypt(tokens.access_token) : undefined,
        refreshTokenEnc: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        calendarId: primaryCalendar?.id ?? 'primary',
        calendarName: primaryCalendar?.summary ?? 'Primary Calendar',
        isConnected: true,
      },
    })

    await createAuditEvent({
      organizationId,
      userId,
      action: AUDIT_ACTIONS.GOOGLE_CALENDAR_CONNECTED,
      details: { calendarId: primaryCalendar?.id },
    })

    return NextResponse.redirect(`${appUrl}/integraciones?success=google_connected`)
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(`${appUrl}/integraciones?error=google_oauth_failed`)
  }
}
