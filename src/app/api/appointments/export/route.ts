import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appointments = await prisma.appointment.findMany({
    where: { organizationId: session.user.organizationId },
    include: { contact: true, feedback: true },
    orderBy: { startsAt: 'desc' },
  })

  const headers = [
    'ID',
    'Paciente Nombre',
    'Paciente Teléfono',
    'Servicio',
    'Fecha Inicio',
    'Fecha Fin',
    'Duración (min)',
    'Estado',
    'Google Calendar',
    'Feedback Estado',
    'Feedback Calificación',
    'Fecha Creación',
  ]

  const rows = appointments.map((apt) => {
    const start = parseISO(apt.startsAt.toISOString())
    const end = parseISO(apt.endsAt.toISOString())
    const durationMin = Math.round((end.getTime() - start.getTime()) / 60000)

    return [
      apt.id,
      apt.contact.fullName || apt.contact.phone,
      apt.contact.phone,
      apt.service,
      format(start, 'dd/MM/yyyy HH:mm'),
      format(end, 'dd/MM/yyyy HH:mm'),
      durationMin,
      apt.status,
      apt.googleEventId ? 'Sí' : 'No',
      apt.feedback?.status || '',
      apt.feedback?.score?.toString() || '',
      format(apt.createdAt, 'dd/MM/yyyy HH:mm'),
    ]
  })

  const csvContent = [headers.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join(
    '\n'
  )

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=citas-${new Date().toISOString().split('T')[0]}.csv`,
    },
  })
}
