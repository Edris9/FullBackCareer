import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { groq } from "@/lib/groq"
import { db } from "@/lib/db"
import { aiAnalyses } from "@/lib/schema"

async function extractPdfText(buffer: Buffer): Promise<string> {
  const PDFParser = (await import("pdf2json")).default
  return new Promise((resolve, reject) => {
    const parser = new PDFParser()
    parser.on("pdfParser_dataReady", (data: any) => {
      const text = data.Pages
        .flatMap((page: any) => page.Texts)
        .map((t: any) => { try { return decodeURIComponent(t.R.map((r: any) => r.T).join("")) } catch { return "" } })
        .join(" ")
      resolve(text)
    })
    parser.on("pdfParser_dataError", (err: any) => reject(err))
    parser.parseBuffer(buffer)
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File
  const jobTitle = formData.get("jobTitle") as string || ""

  if (!file) return NextResponse.json({ error: "Ingen fil uppladdad" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const cvText = (await extractPdfText(buffer)).slice(0, 4000)

  if (!cvText || cvText.trim().length < 30) {
    return NextResponse.json({ error: "Kunde inte läsa PDF-innehållet" }, { status: 400 })
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `Du är en senior HR-expert och karriärcoach med 20 års erfarenhet.
Du analyserar CV:n professionellt och ger konstruktiv, realistisk feedback på svenska.

VIKTIGT om poängsättning:
- score är ett HELTAL mellan 50 och 95
- Ett genomsnittligt CV får 60-70
- Ett bra CV får 70-80
- Ett utmärkt CV får 80-95
- Ge ALDRIG under 50 om CV:t har något innehåll

Svara ALLTID i exakt detta JSON-format:
{
  "score": 72,
  "atsScore": 68,
  "strengths": ["styrka 1", "styrka 2", "styrka 3"],
  "improvements": ["förbättring 1", "förbättring 2", "förbättring 3"],
  "keywords": ["nyckelord1", "nyckelord2", "nyckelord3", "nyckelord4", "nyckelord5"]
}`
      },
      {
        role: "user",
        content: `Analysera detta CV${jobTitle ? ` för tjänsten "${jobTitle}"` : ""} och ge en rättvis bedömning.\n\nCV:\n${cvText}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  })

  const analysis = JSON.parse(completion.choices[0].message.content!)
  if (analysis.score < 50) analysis.score = 50
  if (analysis.score > 95) analysis.score = 95
  if (!analysis.atsScore) analysis.atsScore = Math.floor(analysis.score * 0.95)
  if (analysis.atsScore < 50) analysis.atsScore = 50

  await db.insert(aiAnalyses).values({
    userId: (session.user as any).id,
    type: "cv_feedback",
    result: analysis,
  })

  return NextResponse.json(analysis)
}