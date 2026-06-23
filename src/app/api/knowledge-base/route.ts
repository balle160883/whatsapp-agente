import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createAuditEvent } from '@/lib/audit'
import { parseFile } from '@/lib/file-parser'
import { chunkText } from '@/lib/chunking'

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
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
      }

      const fileName = file.name
      const fileType = file.type || fileName.split('.').pop() || ''
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Parse file
      const rawText = await parseFile(buffer, fileType)

      if (!rawText || rawText.trim().length === 0) {
        return NextResponse.json({ error: 'El archivo no contiene texto legible' }, { status: 400 })
      }

      // Chunk text
      const chunks = chunkText(rawText)

      if (chunks.length === 0) {
        return NextResponse.json(
          { error: 'No se pudieron generar fragmentos de texto' },
          { status: 400 }
        )
      }

      // Batch save chunks as KnowledgeBase documents
      const dataToInsert = chunks.map((chunk, index) => ({
        organizationId,
        title: `${fileName} - Parte ${index + 1}`,
        content: chunk,
      }))

      await prisma.knowledgeBase.createMany({
        data: dataToInsert,
      })

      // Audit log
      await createAuditEvent({
        organizationId,
        userId,
        action: 'KNOWLEDGE_BASE_UPLOADED',
        entity: 'KnowledgeBase',
        details: { fileName, chunksCount: chunks.length },
      })

      return NextResponse.json({ success: true, count: chunks.length })
    } catch (error: unknown) {
      console.error('Error processing uploaded file:', error)
      const errMessage =
        error instanceof Error ? error.message : 'Error interno del servidor al procesar el archivo'
      return NextResponse.json({ error: errMessage }, { status: 500 })
    }
  }

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
