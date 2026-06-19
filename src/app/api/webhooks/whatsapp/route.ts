import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { safeDecrypt } from '@/lib/encryption'
import { processIncomingMessage } from '@/lib/message-processor'
import { webhookRateLimit } from '@/lib/rate-limit'

const log = (level: string, msg: string, extra?: Record<string, unknown>) =>
  console.log(JSON.stringify({ level, msg, ts: new Date().toISOString(), ...extra }))

// ─────────────────────────────────────────────────────────────────────────────
// GET - Webhook Verification
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe' || !token || !challenge) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Find organization with matching verify token
  const waConfig = await prisma.whatsAppConfig.findFirst({
    where: { verifyToken: token, isActive: true },
  })

  if (!waConfig) {
    log('warn', 'Webhook verification failed: unknown verify_token')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  log('info', 'Webhook verified', { orgId: waConfig.organizationId })
  return new NextResponse(challenge, { status: 200 })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST - Receive Messages
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limiting
  const limitResult = await webhookRateLimit(req)
  if (!limitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Read raw body for HMAC validation
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256') ?? ''

  // Respond 200 immediately (async processing)
  // We'll process after returning the response using a non-blocking approach
  const payload = JSON.parse(rawBody) as WhatsAppPayload

  // Extract phone number ID to find the right org config
  const phoneNumberId = extractPhoneNumberId(payload)

  if (!phoneNumberId) {
    log('warn', 'No phone number ID in payload')
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  }

  // Validate HMAC signature
  const waConfig = await prisma.whatsAppConfig.findFirst({
    where: { phoneNumberId, isActive: true },
  })

  if (waConfig) {
    const appSecret = safeDecrypt(waConfig.appSecretEnc)
    if (appSecret && !validateHmac(rawBody, signature, appSecret)) {
      log('warn', 'HMAC validation failed', { phoneNumberId })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  // Process asynchronously (fire and forget)
  processPayloadAsync(payload, phoneNumberId)

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function validateHmac(body: string, signature: string, secret: string): boolean {
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

interface WhatsAppPayload {
  object: string
  entry?: Array<{
    id: string
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id: string; display_phone_number: string }
        messages?: Array<{
          id: string
          from: string
          timestamp: string
          type: string
          text?: { body: string }
        }>
        statuses?: unknown[]
      }
      field: string
    }>
  }>
}

function extractPhoneNumberId(payload: WhatsAppPayload): string | null {
  return payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? null
}

async function processPayloadAsync(payload: WhatsAppPayload, phoneNumberId: string): Promise<void> {
  if (payload.object !== 'whatsapp_business_account') return

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue

      const messages = change.value?.messages ?? []
      for (const message of messages) {
        if (message.type !== 'text' || !message.text?.body) continue

        try {
          await processIncomingMessage({
            messageId: message.id,
            from: message.from,
            text: message.text.body,
            phoneNumberId,
            timestamp: parseInt(message.timestamp, 10),
          })
        } catch (error) {
          log('error', 'Failed to process message', {
            messageId: message.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
  }
}
