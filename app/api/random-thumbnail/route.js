import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  try {
    const { data, error } = await supabase.storage
      .from('album-thumbnails')
      .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })

    if (error) {
      console.error('Supabase storage error:', error)
      return Response.json({ url: null, error: error.message }, { status: 500 })
    }

    const images = (data ?? []).filter(f => /\.(jpe?g|png|webp)$/i.test(f.name))
    if (images.length === 0) return Response.json({ url: null })

    const random = images[Math.floor(Math.random() * images.length)]
    const { data: { publicUrl } } = supabase.storage
      .from('album-thumbnails')
      .getPublicUrl(random.name)

    return Response.json({ url: publicUrl })
  } catch (e) {
    console.error('random-thumbnail caught error:', e)
    return Response.json({ url: null, error: String(e) }, { status: 500 })
  }
}
