import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { groq } from "@/lib/groq"
import { db } from "@/lib/db"
import { aiAnalyses } from "@/lib/schema"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { cvText } = await req.json()

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "Du ar en expert karriarcoach. Analysera CV:t och ge konkret feedback pa svenska. Svara alltid i JSON-format."
      },
      {
        role: "user",
        content: `Analysera detta CV och returnera JSON med: { score: number, strengths: string[], improvements: string[], keywords: string[] }\n\nCV:\n${cvText}`
      }
    ],
    response_format: { type: "json_object" },
  })

  const analysis = JSON.parse(completion.choices[0].message.content!)

  await db.insert(aiAnalyses).values({
    userId: (session.user as any).id,
    type: "cv_feedback",
    result: analysis,
  })

  return NextResponse.json(analysis)
}
