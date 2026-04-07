import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "E-post", type: "email" },
        password: { label: "Losenord", type: "password" },
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
    signIn: "/login",
  },
}