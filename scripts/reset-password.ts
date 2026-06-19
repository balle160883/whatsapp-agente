import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const targetEmail = 'ing.ballesteros16@gmail.com' // Tu email
  const newPassword = 'Test1234!' // Nueva contraseña temporal

  console.log(`🔍 Buscando usuario: ${targetEmail}...`)
  const user = await prisma.user.findFirst({ where: { email: targetEmail } })

  if (!user) {
    console.error('❌ Usuario no encontrado')
    return
  }

  console.log(`✅ Usuario encontrado: ${user.name} (${user.email})`)
  console.log(`🔑 Actualizando contraseña a: ${newPassword}...`)

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword },
  })

  console.log('✅ Contraseña actualizada!')
  console.log('\n🔑 Credenciales para iniciar sesión:')
  console.log(`   Email: ${targetEmail}`)
  console.log(`   Contraseña: ${newPassword}`)
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
