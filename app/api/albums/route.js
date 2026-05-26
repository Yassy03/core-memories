import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Always hit Supabase fresh — albums grow over time, we never want a stale build-time snapshot.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const { data, error } = await supabase
    .from('Albums')
    .select('id, user_name, birth_year, memory_text, interpretation_text, response_text, scene_description, tint_color, image_url')
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ albums: data })
}