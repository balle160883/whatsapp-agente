import { NextResponse } from 'next/server'
import { processPendingReminders } from '@/lib/reminder-job'

export const maxDuration = 60

// POST /api/cron/reminders
export async function POST() {
  try {
    await processPendingReminders()
    return NextResponse.json({ success: true, message: 'Reminders processed successfully' })
  } catch (error) {
    console.error('Failed to process reminders', error)
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 })
  }
}
