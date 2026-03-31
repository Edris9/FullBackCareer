import NextAuth from 'next-auth'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '@/lib/db'
import { users } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    // Google OAuth (rekommenderas — enklast för användarna)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Eller email/lösenord
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'E-post', type: 'email' },
        password: { label: 'Lösenord', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        const [user] = await db.select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1)
        return user ?? null
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Skapa användare i Neon om de inte finns
      const [existing] = await db.select()
        .from(users)
        .where(eq(users.email, user.email!))
        .limit(1)
      if (!existing) {
        await db.insert(users).values({
          email: user.email!,
          name: user.name ?? null,
        })
      }
      return true
    },
    async session({ session }) {
      const [dbUser] = await db.select()
        .from(users)
        .where(eq(users.email, session.user.email!))
        .limit(1)
      if (dbUser) session.user.id = dbUser.id
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }