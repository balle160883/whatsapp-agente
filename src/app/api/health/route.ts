import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface TestCreateError {
  message: string
  code?: string
  meta?: unknown
  stack?: string
}

export async function GET() {
  try {
    // 1. Check DB connection
    await prisma.$queryRaw`SELECT 1`

    // 2. Fetch existing organizations and users to check if they exist or if there's unique constraint violation
    const orgsCount = await prisma.organization.count()
    const usersCount = await prisma.user.count()

    // 3. Try to run the exact organization creation query in a dry-run fashion
    let testCreateResult = 'not_run'
    let testCreateError: TestCreateError | null = null
    try {
      const email = `test-health-${Date.now()}@test.com`
      const slug = `test-health-slug-${Date.now()}`

      const testOrg = await prisma.organization.create({
        data: {
          name: 'Test Health Org',
          slug,
          users: {
            create: {
              name: 'Test User',
              email,
              hashedPassword: 'test-hashed-password',
              role: 'ADMIN',
            },
          },
          agentConfig: {
            create: {
              systemPrompt: 'Eres un asistente de atención al cliente amigable y profesional.',
              tone: 'profesional',
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
      })

      // Cleanup immediately if succeeded
      await prisma.organization.delete({
        where: { id: testOrg.id },
      })
      testCreateResult = 'success_and_cleaned'
    } catch (e) {
      const error = e as Error & { code?: string; meta?: unknown }
      testCreateError = {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
      }
    }

    return NextResponse.json(
      {
        status: 'healthy',
        orgsCount,
        usersCount,
        testCreateResult,
        testCreateError,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    const err = error as Error
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: err.message || String(error),
        stack: err.stack,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
