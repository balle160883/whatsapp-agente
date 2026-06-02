import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown;
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, organizationName } = parsed.data;

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create organization and admin user atomically
    const org = await prisma.organization.create({
      data: {
        name: organizationName,
        slug: organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        users: {
          create: {
            name,
            email,
            hashedPassword,
            role: "ADMIN",
          },
        },
        agentConfig: {
          create: {
            systemPrompt:
              "Eres un asistente de atención al cliente amigable y profesional.",
            tone: "profesional",
            services: [],
            faqs: [],
            policies: {},
            businessHours: {
              mon: [9, 17],
              tue: [9, 17],
              wed: [9, 17],
              thu: [9, 17],
              fri: [9, 17],
            },
          },
        },
      },
      include: { users: true },
    });

    const user = org.users[0]!;
    await createAuditEvent({
      organizationId: org.id,
      userId: user.id,
      action: AUDIT_ACTIONS.USER_REGISTER,
      entity: "User",
      entityId: user.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json(
      { message: "Cuenta creada exitosamente" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
