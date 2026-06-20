import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getProvider } from '@/lib/ai/agent'
import type { ChatMessage } from '@/lib/ai/ai-provider'
import { getRagContext } from '@/lib/rag'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { organizationId } = session.user

  try {
    // 1. Obtener la conversación y verificar pertenencia
    const conversation = await prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        contact: true,
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    // 2. Cargar historial de mensajes
    const history = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    if (history.length === 0) {
      return NextResponse.json({ suggestion: '¡Hola! ¿En qué puedo ayudarte hoy?' })
    }

    const lastMessage = history[history.length - 1].content

    // 3. Obtener configuración del agente y RAG context
    const config = await prisma.agentConfig.findUnique({
      where: { organizationId },
    })

    if (!config) {
      return NextResponse.json({ error: 'El agente no está configurado.' }, { status: 400 })
    }

    const { contextText } = await getRagContext(organizationId, lastMessage)

    // 4. Construir prompt del sistema para el copiloto
    const systemPrompt = `Eres el asistente de Copiloto de IA de un agente de atención al cliente humano.
Tu tarea es sugerir la mejor respuesta para responder al cliente de manera amable y concisa.
Utiliza el contexto de soporte de la empresa provisto a continuación.

🏢 Información de la empresa:
Prompt del sistema del bot: ${config.systemPrompt}
Tono sugerido: ${config.tone}
Servicios disponibles: ${JSON.stringify(config.services)}
Preguntas frecuentes: ${JSON.stringify(config.faqs)}
Políticas: ${JSON.stringify(config.policies)}
${contextText ? `\nContexto relevante encontrado:\n${contextText}` : ''}

REGLAS DE RESPUESTA:
1. Responde SIEMPRE en español.
2. Sugiere ÚNICAMENTE el texto que el agente humano enviará al cliente. No agregues saludos a menos que el cliente acabe de saludar, no agregues preámbulos como "Sugerencia:", ni explicaciones ni comillas.
3. Sé profesional y directo.`

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: m.sender === 'CLIENT' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      })),
      { role: 'user', content: 'Genera la sugerencia de respuesta para el último mensaje.' },
    ]

    // 5. Generar respuesta con el proveedor de IA
    const provider = await getProvider(organizationId)
    const response = await provider.generateResponse(messages, [])

    const suggestion =
      response.content?.trim() || 'No se pudo generar una sugerencia en este momento.'

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error('Error generating suggestion:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
