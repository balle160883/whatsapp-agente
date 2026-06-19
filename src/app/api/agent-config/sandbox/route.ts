import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { safeDecrypt } from '@/lib/encryption'
import { OpenAIProvider } from '@/lib/ai/providers/openai'
import { AntigravityProvider } from '@/lib/ai/providers/antigravity'
import { CustomProvider } from '@/lib/ai/providers/custom'
import { AGENT_TOOLS } from '@/lib/ai/tools'
import type { ChatMessage } from '@/lib/ai/ai-provider'
import { getRagContext } from '@/lib/rag'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { organizationId } = session.user
  const body = (await req.json()) as {
    message: string
    history?: Array<{ role: string; content: string }>
  }

  const config = await prisma.agentConfig.findUnique({ where: { organizationId } })
  if (!config) return NextResponse.json({ response: 'No hay configuración del agente.' })

  const apiKey = safeDecrypt(config.apiKeyEnc)

  let provider
  switch (config.provider) {
    case 'OPENAI':
      provider = new OpenAIProvider(apiKey ?? process.env.OPENAI_API_KEY ?? '')
      break
    case 'ANTIGRAVITY':
      provider = new AntigravityProvider(apiKey ?? process.env.ANTIGRAVITY_API_KEY ?? '')
      break
    case 'CUSTOM':
      provider = new CustomProvider({
        apiKey: apiKey ?? '',
        endpoint: config.customEndpoint ?? '',
        model: config.customModel ?? 'gpt-4o-mini',
      })
      break
    default:
      provider = new OpenAIProvider(process.env.OPENAI_API_KEY ?? '')
  }

  // Retrieve RAG context if applicable
  const { contextText } = await getRagContext(organizationId, body.message)

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${config.systemPrompt}\n\nTono: ${config.tone}\nServicios: ${JSON.stringify(config.services)}\nPreguntas frecuentes: ${JSON.stringify(config.faqs)}\nPolíticas: ${JSON.stringify(config.policies)}${contextText ? `\n${contextText}` : ''}\n\nEsto es una sesión de prueba sandbox. No ejecutes herramientas reales.`,
    },
    ...(body.history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: body.message },
  ]

  const response = await provider.generateResponse(messages, AGENT_TOOLS)
  return NextResponse.json({ response: response.content || 'El agente procesó la solicitud.' })
}
