import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { groq } from "@/lib/groq"
import { db } from "@/lib/db"
import { aiAnalyses } from "@/lib/schema"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { cvText, jobTitle, company, jobDescription } = await req.json()

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "Du ar expert pa att skriva professionella personliga brev pa svenska."
      },
      {
        role: "user",
        content: `Skriv ett personligt brev for tjansten "${jobTitle}" pa "${company}".\n\nJobbannons:\n${jobDescription}\n\nCV:\n${cvText}`
      }
    ],
  })

  const letter = completion.choices[0].message.content!

  await db.insert(aiAnalyses).values({
    userId: (session.user as any).id,
    type: "cover_letter",
    result: { letter, jobTitle, company },
  })

  return NextResponse.json({ letter })
}