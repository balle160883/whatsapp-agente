import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { organizationId } = session.user

  try {
    const { fullName, phone } = await req.json()

    if (!phone) {
      return NextResponse.json({ error: 'El teléfono es obligatorio' }, { status: 400 })
    }

    const contact = await prisma.contact.upsert({
      where: {
        organizationId_phone: {
          organizationId,
          phone,
        },
      },
      update: {
        fullName,
      },
      create: {
        organizationId,
        fullName,
        phone,
      },
    })

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error creating mock contact:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
