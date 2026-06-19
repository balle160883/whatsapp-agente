import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🔍 Buscando usuarios existentes...')
  const users = await prisma.user.findMany({ include: { organization: true } })

  if (users.length > 0) {
    console.log('✅ Usuarios encontrados:')
    users.forEach((u) => {
      console.log(`- ${u.name} (${u.email}) - Org: ${u.organization?.name}`)
    })
    console.log(
      '\n💡 Si no recuerdas la contraseña, registra un usuario nuevo desde el botón "Registrate gratis".'
    )
  } else {
    console.log('⚠️ No hay usuarios en la BD.')

    // Creamos un usuario de prueba
    const testEmail = 'admin@test.com'
    const testPassword = 'Test1234!'
    const testOrganization = 'Test Organization'
    const testName = 'Test Admin'

    console.log(`\n🆕 Creando usuario de prueba: ${testEmail} / ${testPassword}...`)
    const hashedPassword = await bcrypt.hash(testPassword, 12)

    await prisma.organization.create({
      data: {
        name: testOrganization,
        slug: 'test-organization',
        users: {
          create: {
            name: testName,
            email: testEmail,
            hashedPassword,
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
            businessHours: { mon: [9, 17], tue: [9, 17], wed: [9, 17], thu: [9, 17], fri: [9, 17] },
          },
        },
      },
    })

    console.log(`✅ Usuario creado! Email: ${testEmail}, Contraseña: ${testPassword}`)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
