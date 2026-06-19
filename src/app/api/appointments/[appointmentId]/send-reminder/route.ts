import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sendAppointmentReminder } from '@/lib/reminder'

interface Params {
  params: Promise<{ appointmentId: string }>
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { appointmentId } = await params

  try {
    await sendAppointmentReminder(appointmentId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to send reminder:', error)
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
  }
}
