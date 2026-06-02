import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { safeDecrypt } from "@/lib/encryption";
import { createAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";

// GET /api/conversations/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { organizationId } = session.user;

  const conversation = await prisma.conversation.findFirst({
    where: { id, organizationId },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
      appointments: { orderBy: { startsAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

// PATCH /api/conversations/[id] - Toggle bot, change status
const patchSchema = z.object({
  botActive: z.boolean().optional(),
  status: z.enum(["OPEN", "CLOSED", "HUMAN_HANDOFF"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { organizationId, id: userId } = session.user;

  const body = await req.json() as unknown;
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.conversation.findFirst({
    where: { id, organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.conversation.update({
    where: { id },
    data: parsed.data,
  });

  if (typeof parsed.data.botActive === "boolean") {
    await createAuditEvent({
      organizationId,
      userId,
      action: parsed.data.botActive
        ? AUDIT_ACTIONS.BOT_ACTIVATED
        : AUDIT_ACTIONS.BOT_DEACTIVATED,
      entity: "Conversation",
      entityId: id,
    });
  }

  return NextResponse.json(updated);
}

// POST /api/conversations/[id]/messages - Send manual message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { organizationId, id: userId } = session.user;

  const body = await req.json() as { message?: string };
  if (!body.message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Verify conversation ownership
  const conversation = await prisma.conversation.findFirst({
    where: { id, organizationId },
    include: { contact: true },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get WhatsApp config
  const waConfig = await prisma.whatsAppConfig.findFirst({
    where: { organizationId, isActive: true },
  });

  if (!waConfig) {
    return NextResponse.json({ error: "WhatsApp not configured" }, { status: 400 });
  }

  const accessToken = safeDecrypt(waConfig.accessTokenEnc);
  if (!accessToken) {
    return NextResponse.json({ error: "Invalid WhatsApp credentials" }, { status: 400 });
  }

  // Send via WhatsApp
  await sendWhatsAppMessage({
    phoneNumberId: waConfig.phoneNumberId,
    accessToken,
    to: conversation.contact.phone,
    text: body.message,
  });

  // Save message to DB
  const message = await prisma.message.create({
    data: {
      organizationId,
      conversationId: id,
      direction: "OUTGOING",
      sender: "HUMAN",
      content: body.message,
    },
  });

  await prisma.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  await createAuditEvent({
    organizationId,
    userId,
    action: AUDIT_ACTIONS.MESSAGE_SENT_MANUALLY,
    entity: "Message",
    entityId: message.id,
  });

  return NextResponse.json(message, { status: 201 });
}
