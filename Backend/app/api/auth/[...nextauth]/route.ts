import { NextResponse } from "next/server"
import { groq } from "@/lib/groq"

export async function POST(req: Request) {
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
  return NextResponse.json(analysis)
}