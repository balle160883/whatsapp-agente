import { prisma } from "@/lib/prisma";

interface AuditEventInput {
  organizationId: string;
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export async function createAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        details: (input.details ?? {}) as unknown as Parameters<typeof prisma.auditEvent.create>[0]["data"]["details"],
      },
    });
  } catch (error) {
    // Audit failures should not break the main flow
    console.error(
      JSON.stringify({
        level: "error",
        message: "Failed to create audit event",
        error: error instanceof Error ? error.message : String(error),
        input,
      })
    );
  }
}

export const AUDIT_ACTIONS = {
  // Auth
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  USER_REGISTER: "USER_REGISTER",
  // WhatsApp Config
  WHATSAPP_CONFIG_UPDATED: "WHATSAPP_CONFIG_UPDATED",
  WHATSAPP_CONNECTION_TESTED: "WHATSAPP_CONNECTION_TESTED",
  // Google Calendar
  GOOGLE_CALENDAR_CONNECTED: "GOOGLE_CALENDAR_CONNECTED",
  GOOGLE_CALENDAR_DISCONNECTED: "GOOGLE_CALENDAR_DISCONNECTED",
  // Agent Config
  AGENT_CONFIG_UPDATED: "AGENT_CONFIG_UPDATED",
  BOT_ACTIVATED: "BOT_ACTIVATED",
  BOT_DEACTIVATED: "BOT_DEACTIVATED",
  // Conversation
  HUMAN_HANDOFF_REQUESTED: "HUMAN_HANDOFF_REQUESTED",
  MESSAGE_SENT_MANUALLY: "MESSAGE_SENT_MANUALLY",
  // Appointment
  APPOINTMENT_CREATED: "APPOINTMENT_CREATED",
  APPOINTMENT_CANCELLED: "APPOINTMENT_CANCELLED",
} as const;
