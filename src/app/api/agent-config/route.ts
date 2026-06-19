import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { encrypt } from '@/lib/encryption'
import { createAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'

const agentConfigSchema = z.object({
  provider: z
    .union([z.literal('OPENAI'), z.literal('ANTIGRAVITY'), z.literal('CUSTOM')])
    .optional(),
  apiKey: z.string().optional(),
  customEndpoint: z.string().url().optional().or(z.literal('')),
  customModel: z.string().optional(),
  systemPrompt: z.string().min(10).optional(),
  tone: z.string().optional(),
  businessHours: z.record(z.string(), z.array(z.number())).optional(),
  services: z.array(z.string()).optional(),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  policies: z.record(z.string(), z.string()).optional(),
  botActive: z.boolean().optional(),
  reminderMinutes: z.number().min(1).max(43200).optional(),
  npsSurveyMessage: z.string().optional(),
  reminderMessage: z.string().optional(),
})

// GET /api/agent-config
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await prisma.agentConfig.findUnique({
    where: { organizationId: session.user.organizationId },
  })

  if (!config) return NextResponse.json(null)

  return NextResponse.json({
    id: config.id,
    provider: config.provider,
    hasApiKey: !!config.apiKeyEnc,
    customEndpoint: config.customEndpoint,
    customModel: config.customModel,
    systemPrompt: config.systemPrompt,
    tone: config.tone,
    businessHours: config.businessHours,
    services: config.services,
    faqs: config.faqs,
    policies: config.policies,
    botActive: config.botActive,
    reminderMinutes: config.reminderMinutes,
    npsSurveyMessage: config.npsSurveyMessage,
    reminderMessage: config.reminderMessage,
  })
}

// PATCH /api/agent-config
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { organizationId, id: userId } = session.user

  const body = (await req.json()) as unknown
  const parsed = agentConfigSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid data', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { apiKey, ...rest } = parsed.data
  const updateData: Record<string, unknown> = { ...rest }

  if (apiKey) {
    updateData.apiKeyEnc = encrypt(apiKey)
  }

  const config = await prisma.agentConfig.upsert({
    where: { organizationId },
    create: { organizationId, ...updateData },
    update: updateData,
  })

  await createAuditEvent({
    organizationId,
    userId,
    action: AUDIT_ACTIONS.AGENT_CONFIG_UPDATED,
    entity: 'AgentConfig',
    entityId: config.id,
  })

  return NextResponse.json({ success: true })
}
