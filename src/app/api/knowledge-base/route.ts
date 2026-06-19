import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createAuditEvent } from '@/lib/audit'

const documentSchema = z.object({
  title: z.string().min(2, 'El título debe tener al menos 2 caracteres'),
  content: z.string().min(10, 'El contenido debe tener al menos 10 caracteres'),
})

// GET /api/knowledge-base - List all documents for the organization
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { organizationId } = session.user

  const documents = await prisma.knowledgeBase.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ documents })
}

// POST /api/knowledge-base - Create a new document
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { organizationId, id: userId } = session.user

  try {
    const body = await req.json()
    const parsed = documentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { title, content } = parsed.data

    const doc = await prisma.knowledgeBase.create({
      data: {
        organizationId,
        title,
        content,
      },
    })

    await createAuditEvent({
      organizationId,
      userId,
      action: 'KNOWLEDGE_BASE_CREATED',
      entity: 'KnowledgeBase',
      entityId: doc.id,
    })

    return NextResponse.json({ document: doc })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/knowledge-base - Delete a document
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { organizationId, id: userId } = session.user

  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Falta el ID del documento' }, { status: 400 })
  }

  try {
    // Ensure document belongs to this organization
    const existing = await prisma.knowledgeBase.findFirst({
      where: { id, organizationId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    await prisma.knowledgeBase.delete({
      where: { id },
    })

    await createAuditEvent({
      organizationId,
      userId,
      action: 'KNOWLEDGE_BASE_DELETED',
      entity: 'KnowledgeBase',
      entityId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
