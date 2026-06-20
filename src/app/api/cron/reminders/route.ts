import { NextResponse } from 'next/server'
import { processPendingReminders } from '@/lib/reminder-job'
import { processPendingCampaigns } from '@/lib/campaign-job'

export const maxDuration = 60

// POST /api/cron/reminders
export async function POST() {
  try {
    await processPendingReminders()
    await processPendingCampaigns()
    return NextResponse.json({
      success: true,
      message: 'Reminders and campaigns processed successfully',
    })
  } catch (error) {
    console.error('Failed to process cron jobs', error)
    return NextResponse.json(
      { error: 'Failed to process reminders and campaigns' },
      { status: 500 }
    )
  }
}
