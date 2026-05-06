import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  try {
    const { data, error } = await supabase.storage
      .from('album-images')
      .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })

    if (error) {
      console.error('Supabase storage error:', error)
      return Response.json({ error: error.message, images: [] }, { status: 500 })
    }

    if (!data) {
      console.error('No data returned')
      return Response.json({ images: [] })
    }

    const images = data
      .filter(f => f.name.match(/\.(png|jpg|jpeg|webp)$/i))
      .map(f => {
        const { data: { publicUrl } } = supabase.storage
          .from('album-images')
          .getPublicUrl(f.name)
        return publicUrl
      })

    return Response.json({ images })

  } catch (e) {
    console.error('Caught error:', e)
    return Response.json({ error: String(e), images: [] }, { status: 500 })
  }
}