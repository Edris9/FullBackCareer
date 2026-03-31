import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { NextResponse } from 'next/server'
import { groq } from '../../../lib/groq'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Din Groq-kod här — exakt samma som förut!
  const { cvText } = await req.json()

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'Du är en expert karriärcoach. Analysera CV:t och ge konkret feedback på svenska. Svara alltid i JSON-format.'
      },
      {
        role: 'user',
        content: `Analysera detta CV och returnera JSON med: { score: 1-10, strengths: string[], improvements: string[], keywords: string[] }\n\nCV:\n${cvText}`
      }
    ],
    response_format: { type: 'json_object' },
  })

  const analysis = JSON.parse(completion.choices[0].message.content!)

  // Spara i Supabase
  await supabase.from('ai_analyses').insert({
    user_id: user.id,
    type: 'cv_feedback',
    result: analysis,
  })

  return NextResponse.json(analysis)
}