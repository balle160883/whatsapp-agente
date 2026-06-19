import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.organizationId = user.organizationId
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.organizationId = token.organizationId as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findFirst({
          where: { email: parsed.data.email },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(parsed.data.password, user.hashedPassword)

        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          role: user.role,
        }
      },
    }),
  ],
})

// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    organizationId: string
    role: string
  }

  interface Session {
    user: {
      id: string
      organizationId: string
      role: string
      email: string
      name: string
    }
  }
}
