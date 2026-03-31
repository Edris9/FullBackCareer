import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { groq } from '@/lib/groq'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cvText, jobTitle, company, jobDescription } = await req.json()

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'Du är expert på att skriva professionella personliga brev på svenska.'
      },
      {
        role: 'user',
        content: `Skriv ett personligt brev för tjänsten "${jobTitle}" på "${company}".\n\nJobbannons:\n${jobDescription}\n\nSökandens CV:\n${cvText}\n\nBrevet ska vara 3 stycken, professionellt och personligt.`
      }
    ],
  })

  const letter = completion.choices[0].message.content!

  await supabase.from('ai_analyses').insert({
    user_id: user.id,
    type: 'cover_letter',
    result: { letter, jobTitle, company },
  })

  return NextResponse.json({ letter })
}