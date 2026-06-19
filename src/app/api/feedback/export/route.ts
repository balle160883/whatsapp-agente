import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { Feedback } from '@prisma/client'

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

  const feedbacks = await prisma.feedback.findMany({
    where: { organizationId: session.user.organizationId },
    include: { contact: true, appointment: true },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'ID',
    'Contacto Nombre',
    'Contacto Teléfono',
    'Servicio Cita',
    'Fecha Cita',
    'Calificación',
    'Comentario',
    'Categoría NPS',
    'Sentimiento',
    'Prioridad Alta',
    'Estado',
    'Fecha Envío',
    'Fecha Respuesta',
    'Fecha Creación',
  ]

  const rows = feedbacks.map((f: any) => [
    f.id,
    f.contact?.fullName || f.contact?.phone,
    f.contact?.phone,
    f.appointment?.service || '',
    f.appointment?.startsAt ? new Date(f.appointment.startsAt).toLocaleDateString('es-ES') : '',
    f.score?.toString() || '',
    f.comment || '',
    f.npsCategory || '',
    f.sentiment || '',
    f.isHighPriority ? 'Sí' : 'No',
    f.status,
    f.sentAt ? new Date(f.sentAt).toLocaleDateString('es-ES') : '',
    f.respondedAt ? new Date(f.respondedAt).toLocaleDateString('es-ES') : '',
    new Date(f.createdAt).toLocaleDateString('es-ES'),
  ])

  const csvContent = [headers.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join(
    '\n'
  )

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=feedbacks-${new Date().toISOString().split('T')[0]}.csv`,
    },
  })
}
