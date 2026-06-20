import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/campaigns/[id] - Cancelar campaña programada pendiente
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { organizationId } = session.user

  try {
    // Verificar si es una campaña programada en AuditEvent
    const campaign = await prisma.auditEvent.findFirst({
      where: { id, organizationId, action: 'CAMPAIGN_SCHEDULED' },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada o no es cancelable' },
        { status: 404 }
      )
    }

    const details = campaign.details as { status?: string }
    if (details?.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Solo se pueden cancelar campañas pendientes' },
        { status: 400 }
      )
    }

    // Eliminar el registro de la campaña programada
    await prisma.auditEvent.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Campaña cancelada con éxito' })
  } catch (error) {
    console.error('Error deleting scheduled campaign:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
