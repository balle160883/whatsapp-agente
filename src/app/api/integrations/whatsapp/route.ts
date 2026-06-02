import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { verifyWhatsAppConnection } from "@/lib/whatsapp";
import { safeDecrypt } from "@/lib/encryption";
import { z } from "zod";
import { createAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";

const whatsappConfigSchema = z.object({
  phoneNumberId: z.string().min(1),
  wabaId: z.string().min(1),
  accessToken: z.string().min(1),
  verifyToken: z.string().min(6),
  appSecret: z.string().min(1),
});

// GET /api/integrations/whatsapp
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.whatsAppConfig.findUnique({
    where: { organizationId: session.user.organizationId },
  });

  if (!config) return NextResponse.json(null);

  return NextResponse.json({
    id: config.id,
    phoneNumberId: config.phoneNumberId,
    wabaId: config.wabaId,
    verifyToken: config.verifyToken,
    isActive: config.isActive,
    hasAccessToken: !!config.accessTokenEnc,
    hasAppSecret: !!config.appSecretEnc,
  });
}

// PUT /api/integrations/whatsapp
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationId, id: userId } = session.user;

  const body = await req.json() as unknown;
  const parsed = whatsappConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { phoneNumberId, wabaId, accessToken, verifyToken, appSecret } = parsed.data;

  const config = await prisma.whatsAppConfig.upsert({
    where: { organizationId },
    create: {
      organizationId,
      phoneNumberId,
      wabaId,
      accessTokenEnc: encrypt(accessToken),
      verifyToken,
      appSecretEnc: encrypt(appSecret),
      isActive: true,
    },
    update: {
      phoneNumberId,
      wabaId,
      accessTokenEnc: encrypt(accessToken),
      verifyToken,
      appSecretEnc: encrypt(appSecret),
      isActive: true,
    },
  });

  await createAuditEvent({
    organizationId,
    userId,
    action: AUDIT_ACTIONS.WHATSAPP_CONFIG_UPDATED,
    entity: "WhatsAppConfig",
    entityId: config.id,
  });

  return NextResponse.json({ success: true });
}

// POST /api/integrations/whatsapp/test
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { organizationId } = session.user;

  const config = await prisma.whatsAppConfig.findUnique({
    where: { organizationId },
  });

  if (!config) {
    return NextResponse.json({ success: false, error: "No config found" }, { status: 404 });
  }

  const accessToken = safeDecrypt(config.accessTokenEnc);
  if (!accessToken) {
    return NextResponse.json({ success: false, error: "Cannot decrypt token" }, { status: 400 });
  }

  const result = await verifyWhatsAppConnection(config.phoneNumberId, accessToken);
  return NextResponse.json(result);
}
