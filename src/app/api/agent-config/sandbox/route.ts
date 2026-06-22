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

  try {
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
    const { contextText, sources } = await getRagContext(organizationId, body.message)

    // Dynamic table discovery for sandbox
    let tablesListStr = ''
    try {
      const apiUrl = process.env.PROMOBILE_API_URL || 'https://api.promobile.cloud'
      const apiKeyPromobile = process.env.PROMOBILE_API_KEY || 'chatbot-secret-key-2024'
      const res = await fetch(`${apiUrl}/chatbot/tables`, {
        headers: {
          'X-API-Key': apiKeyPromobile,
        },
      })
      if (res.ok) {
        const data = (await res.json()) as { tables: string[] }
        if (data && Array.isArray(data.tables)) {
          tablesListStr = `\nTablas de información de la cooperativa disponibles en la base de datos:\n${data.tables
            .map((t) => `- ${t}`)
            .join('\n')}\n`
        }
      }
    } catch (err) {
      console.error('Error fetching tables list in sandbox:', err)
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `${config.systemPrompt}

Tono: ${config.tone}
Servicios disponibles: ${JSON.stringify(config.services)}
Preguntas frecuentes: ${JSON.stringify(config.faqs)}
Políticas: ${JSON.stringify(config.policies)}${contextText ? `\n${contextText}` : ''}
${tablesListStr}

REGLAS IMPORTANTES:
1. Responde SIEMPRE en español.
2. Sé amable, profesional y conciso.
3. Si el cliente tiene preguntas sobre la cooperativa (cuentas de ahorro, créditos/préstamos, sucursales, cajeros/ATMs, horarios, vacantes de empleo, seguros/protecciones, soporte técnico o conceptos cooperativos como Aanty o la parte social), debes buscar o consultar la información correspondiente utilizando la herramienta "search_database_table" o "query_database_table". Nunca inventes información de estos temas.
4. Esto es una sesión de prueba sandbox. Puedes ejecutar libremente las herramientas de consulta de base de datos ("search_database_table" y "query_database_table") para traer información real, pero simula o responde textualmente cualquier otra acción que requiera agendar citas o modificar datos.`,
      },
      ...(body.history ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: body.message },
    ]

    let finalResponse = ''
    const responseSources: string[] = [...(sources || [])]

    // Agentic loop (max 5 iterations)
    for (let i = 0; i < 5; i++) {
      const response = await provider.generateResponse(messages, AGENT_TOOLS)

      if (response.finishReason === 'stop' || response.finishReason === 'error') {
        finalResponse = response.content || 'El agente procesó la solicitud.'
        break
      }

      if (
        response.finishReason === 'tool_calls' &&
        response.toolCalls &&
        response.toolCalls.length > 0
      ) {
        messages.push({
          role: 'assistant',
          content:
            response.content ||
            `Usando herramienta: ${response.toolCalls.map((tc) => tc.name).join(', ')}`,
        })

        for (const toolCall of response.toolCalls) {
          let toolResult: { success: boolean; data?: unknown; error?: string }

          if (toolCall.name === 'search_database_table') {
            const table = toolCall.arguments.table as string
            const query = toolCall.arguments.query as string
            const limit = (toolCall.arguments.limit as number) ?? 5
            const apiUrl = process.env.PROMOBILE_API_URL || 'https://api.promobile.cloud'
            const apiKeyPromobile = process.env.PROMOBILE_API_KEY || 'chatbot-secret-key-2024'

            try {
              const res = await fetch(`${apiUrl}/chatbot/search`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-API-Key': apiKeyPromobile,
                },
                body: JSON.stringify({ table, message: query, limit }),
              })
              if (!res.ok) {
                toolResult = { success: false, error: `Error HTTP ${res.status}` }
              } else {
                const data = (await res.json()) as { data: unknown }
                toolResult = { success: true, data: data.data }
              }
            } catch (err) {
              toolResult = {
                success: false,
                error: err instanceof Error ? err.message : String(err),
              }
            }
          } else if (toolCall.name === 'query_database_table') {
            const table = toolCall.arguments.table as string
            const limit = (toolCall.arguments.limit as number) ?? 10
            const apiUrl = process.env.PROMOBILE_API_URL || 'https://api.promobile.cloud'
            const apiKeyPromobile = process.env.PROMOBILE_API_KEY || 'chatbot-secret-key-2024'

            try {
              const res = await fetch(`${apiUrl}/chatbot/query`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-API-Key': apiKeyPromobile,
                },
                body: JSON.stringify({ table, limit }),
              })
              if (!res.ok) {
                toolResult = { success: false, error: `Error HTTP ${res.status}` }
              } else {
                const data = (await res.json()) as { data: unknown }
                toolResult = { success: true, data: data.data }
              }
            } catch (err) {
              toolResult = {
                success: false,
                error: err instanceof Error ? err.message : String(err),
              }
            }
          } else {
            // Mocks for write / calendar tools in sandbox
            toolResult = {
              success: true,
              data: {
                message: `[Simulación Sandbox] Acción "${toolCall.name}" ejecutada con éxito.`,
              },
            }
          }

          messages.push({
            role: 'user',
            content: `Resultado de ${toolCall.name}: ${JSON.stringify(toolResult)}`,
          })
          responseSources.push(`Herramienta: ${toolCall.name}`)
        }
      }
    }

    return NextResponse.json({
      response: finalResponse || 'El agente procesó la solicitud.',
      sources: responseSources,
    })
  } catch (err) {
    console.error('Error in sandbox route:', err)
    return NextResponse.json({
      response:
        'Error: No se pudo conectar con el agente. Por favor, asegúrate de haber configurado y guardado correctamente tu API Key del proveedor de IA en la pantalla de Configuración.',
      sources: [],
    })
  }
}
