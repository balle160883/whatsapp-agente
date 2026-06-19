import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { format, parseISO } from 'date-fns'

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

  const conversations = await prisma.conversation.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      contact: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        select: { content: true, sender: true, createdAt: true },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  })

  const headers = [
    'ID',
    'Contacto Nombre',
    'Contacto Teléfono',
    'Estado',
    'Sentimiento',
    'Prioridad Alta',
    'Último Mensaje',
    'Fecha Último Mensaje',
    'Número de Mensajes',
    'Fecha Creación',
  ]

  const rows = conversations.map((conv) => {
    const lastMessage = conv.messages[conv.messages.length - 1]

    return [
      conv.id,
      conv.contact.fullName || conv.contact.phone,
      conv.contact.phone,
      conv.status,
      conv.sentiment || '',
      conv.isHighPriority ? 'Sí' : 'No',
      lastMessage?.content || '',
      lastMessage?.createdAt ? format(lastMessage.createdAt, 'dd/MM/yyyy HH:mm') : '',
      conv.messages.length,
      conv.createdAt ? format(conv.createdAt, 'dd/MM/yyyy HH:mm') : '',
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
  ].join('\n')

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=conversaciones-${new Date().toISOString().split('T')[0]}.csv`,
    },
  })
}
