import { prisma } from '@/lib/prisma'
import { safeDecrypt } from '@/lib/encryption'
import { getCalendarService } from '@/lib/google-calendar'
import type { ChatMessage, AIProvider, AIResponse } from '@/lib/ai/ai-provider'
import { AGENT_TOOLS } from '@/lib/ai/tools'
import { OpenAIProvider } from '@/lib/ai/providers/openai'
import { AntigravityProvider } from '@/lib/ai/providers/antigravity'
import { CustomProvider } from '@/lib/ai/providers/custom'
import { createAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { addMinutes, parseISO } from 'date-fns'
import { getRagContext } from '@/lib/rag'
import { sendHandoffNotification } from '@/lib/notifications'

interface AgentContext {
  organizationId: string
  conversationId: string
  contactId: string
  contactPhone: string
}

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

// Cache memory to prevent excessive API hits when checking available tables
let cachedTables: string[] | null = null
let lastTablesFetchTime = 0
const TABLES_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Provider Factory
// ─────────────────────────────────────────────────────────────────────────────
export async function getProvider(organizationId: string): Promise<AIProvider> {
  const config = await prisma.agentConfig.findUnique({
    where: { organizationId },
  })

  if (!config) {
    throw new Error(`No agent config found for org ${organizationId}`)
  }

  const apiKey = safeDecrypt(config.apiKeyEnc)

  switch (config.provider) {
    case 'OPENAI':
      return new OpenAIProvider(apiKey ?? process.env.OPENAI_API_KEY ?? '', 'gpt-4o-mini')
    case 'ANTIGRAVITY':
      return new AntigravityProvider(
        apiKey ?? process.env.ANTIGRAVITY_API_KEY ?? '',
        'gemini-2.0-flash-exp'
      )
    case 'CUSTOM':
      return new CustomProvider({
        apiKey: apiKey ?? '',
        endpoint: config.customEndpoint ?? '',
        model: config.customModel ?? 'gpt-4o-mini',
      })
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Execution
// ─────────────────────────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AgentContext
): Promise<ToolResult> {
  console.info(
    JSON.stringify({ level: 'info', tool: name, args, conversationId: ctx.conversationId })
  )

  try {
    switch (name) {
      case 'get_available_slots': {
        const calService = await getCalendarService(ctx.organizationId)
        if (!calService) {
          return { success: false, error: 'Google Calendar no está conectado.' }
        }
        const daysAhead = (args.days_ahead as number) ?? 7
        const slots = await calService.getAvailableSlots(args.service as string, daysAhead)
        return { success: true, data: slots }
      }

      case 'book_appointment': {
        const calService = await getCalendarService(ctx.organizationId)
        if (!calService) {
          return { success: false, error: 'Google Calendar no está conectado.' }
        }
        const startsAt = parseISO(args.starts_at as string)
        const endsAt = addMinutes(startsAt, 60)

        const event = await calService.createEvent({
          summary: `${args.service} - ${args.full_name}`,
          start: startsAt,
          end: endsAt,
        })

        // Save appointment in DB
        await prisma.appointment.create({
          data: {
            organizationId: ctx.organizationId,
            contactId: ctx.contactId,
            conversationId: ctx.conversationId,
            service: args.service as string,
            startsAt,
            endsAt,
            googleEventId: event.id,
            googleCalendarId: event.calendarId,
          },
        })

        await createAuditEvent({
          organizationId: ctx.organizationId,
          action: AUDIT_ACTIONS.APPOINTMENT_CREATED,
          entity: 'Appointment',
          details: { service: args.service, startsAt: args.starts_at },
        })

        return {
          success: true,
          data: {
            message: `Cita agendada para el ${startsAt.toLocaleString('es-MX')}`,
            eventId: event.id,
          },
        }
      }

      case 'save_contact_info': {
        await prisma.contact.update({
          where: {
            organizationId_phone: {
              organizationId: ctx.organizationId,
              phone: ctx.contactPhone,
            },
          },
          data: {
            fullName: args.full_name as string,
            isNewPatient: args.is_new_patient as boolean,
          },
        })
        return { success: true, data: { message: 'Información guardada correctamente.' } }
      }

      case 'request_human_handoff': {
        const updated = await prisma.conversation.update({
          where: { id: ctx.conversationId },
          data: {
            botActive: false,
            status: 'HUMAN_HANDOFF',
          },
          include: { contact: true, organization: true },
        })
        await sendHandoffNotification({
          contactName: updated.contact.fullName ?? 'Cliente',
          contactPhone: updated.contact.phone,
          conversationId: ctx.conversationId,
          organizationName: updated.organization.name,
        })
        await createAuditEvent({
          organizationId: ctx.organizationId,
          action: AUDIT_ACTIONS.HUMAN_HANDOFF_REQUESTED,
          entity: 'Conversation',
          entityId: ctx.conversationId,
          details: { reason: args.reason },
        })
        return {
          success: true,
          data: {
            message: 'Te estoy transfiriendo con un agente humano. En breve te atenderán.',
          },
        }
      }

      case 'search_database_table': {
        const table = args.table as string
        const query = args.query as string
        const limit = (args.limit as number) ?? 5
        const apiUrl = process.env.PROMOBILE_API_URL || 'https://api.promobile.cloud'
        const apiKey = process.env.PROMOBILE_API_KEY || 'chatbot-secret-key-2024'

        const res = await fetch(`${apiUrl}/chatbot/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify({ table, message: query, limit }),
        })
        if (!res.ok) {
          return {
            success: false,
            error: `Error HTTP ${res.status} al consultar la base de datos.`,
          }
        }
        const data = (await res.json()) as { data: unknown }
        return { success: true, data: data.data }
      }

      case 'query_database_table': {
        const table = args.table as string
        const limit = (args.limit as number) ?? 10
        const apiUrl = process.env.PROMOBILE_API_URL || 'https://api.promobile.cloud'
        const apiKey = process.env.PROMOBILE_API_KEY || 'chatbot-secret-key-2024'

        const res = await fetch(`${apiUrl}/chatbot/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify({ table, limit }),
        })
        if (!res.ok) {
          return {
            success: false,
            error: `Error HTTP ${res.status} al consultar la base de datos.`,
          }
        }
        const data = (await res.json()) as { data: unknown }
        return { success: true, data: data.data }
      }

      default:
        return { success: false, error: `Herramienta desconocida: ${name}` }
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        tool: name,
        error: error instanceof Error ? error.message : String(error),
      })
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Agent Orchestrator
// ─────────────────────────────────────────────────────────────────────────────
export async function runAgent(ctx: AgentContext, userMessage: string): Promise<string> {
  const config = await prisma.agentConfig.findUnique({
    where: { organizationId: ctx.organizationId },
  })

  if (!config) {
    return 'Lo siento, el agente no está configurado.'
  }

  // Retrieve RAG context if applicable
  const { contextText } = await getRagContext(ctx.organizationId, userMessage)

  // Dynamic table discovery cache retrieval
  let tablesListStr = ''
  try {
    const now = Date.now()
    if (!cachedTables || now - lastTablesFetchTime > TABLES_CACHE_TTL_MS) {
      const apiUrl = process.env.PROMOBILE_API_URL || 'https://api.promobile.cloud'
      const apiKey = process.env.PROMOBILE_API_KEY || 'chatbot-secret-key-2024'
      const res = await fetch(`${apiUrl}/chatbot/tables`, {
        headers: {
          'X-API-Key': apiKey,
        },
      })
      if (res.ok) {
        const data = (await res.json()) as { tables: string[] }
        if (data && Array.isArray(data.tables)) {
          cachedTables = data.tables
          lastTablesFetchTime = now
        }
      }
    }
    if (cachedTables && cachedTables.length > 0) {
      tablesListStr = `\nTablas de información de la cooperativa disponibles en la base de datos:\n${cachedTables
        .map((t) => `- ${t}`)
        .join('\n')}\n`
    }
  } catch (err) {
    console.error('Error fetching tables from Promobile API:', err)
  }

  // Build system prompt with organization context
  const systemPrompt = `${config.systemPrompt}

Tono: ${config.tone}
Servicios disponibles: ${JSON.stringify(config.services)}
Horarios de atención: ${JSON.stringify(config.businessHours)}
Preguntas frecuentes: ${JSON.stringify(config.faqs)}
Políticas: ${JSON.stringify(config.policies)}${contextText ? `\n${contextText}` : ''}
${tablesListStr}

REGLAS IMPORTANTES:
1. Responde SIEMPRE en español.
2. Sé amable, profesional y conciso.
3. Cuando un cliente quiere una cita, usa las herramientas disponibles.
4. Si el cliente tiene preguntas sobre cuentas de ahorro, créditos/préstamos, sucursales, cajeros (ATMs), horarios, vacantes de empleo, seguros/protecciones o soporte técnico, debes buscar o consultar la información correspondiente utilizando la herramienta "search_database_table" o "query_database_table". Nunca inventes información de estos temas.
5. Si no puedes ayudar, solicita la transferencia a un humano.
6. No inventes información; si no la tienes, pregunta al cliente.`

  // Load conversation history
  const history = await prisma.message.findMany({
    where: { conversationId: ctx.conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: m.sender === 'CLIENT' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ]

  const provider = await getProvider(ctx.organizationId)

  // Agentic loop (max 5 iterations to prevent infinite loops)
  for (let i = 0; i < 5; i++) {
    const response: AIResponse = await provider.generateResponse(messages, AGENT_TOOLS)

    if (response.finishReason === 'stop' || response.finishReason === 'error') {
      return response.content || 'Lo siento, no pude procesar tu solicitud.'
    }

    if (
      response.finishReason === 'tool_calls' &&
      response.toolCalls &&
      response.toolCalls.length > 0
    ) {
      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content:
          response.content ||
          `Usando herramienta: ${response.toolCalls.map((tc) => tc.name).join(', ')}`,
      })

      // Execute all tool calls
      for (const toolCall of response.toolCalls) {
        const result = await executeTool(toolCall.name, toolCall.arguments, ctx)

        // Add tool result to messages
        messages.push({
          role: 'user',
          content: `Resultado de ${toolCall.name}: ${JSON.stringify(result)}`,
        })

        // If human handoff was requested, return the message immediately
        if (toolCall.name === 'request_human_handoff' && result.success) {
          return (result.data as { message: string }).message
        }
      }
    }
  }

  return 'Lo siento, no pude completar la acción. Por favor contacta directamente.'
}
