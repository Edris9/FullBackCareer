import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Alla fält måste fyllas i." }, { status: 400 })
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ error: "En användare med den e-postadressen finns redan." }, { status: 409 })
    }

    const [newUser] = await db.insert(users).values({
      name,
      email,
    }).returning()

    return NextResponse.json({ success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name } })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Något gick fel." }, { status: 500 })
  }
}