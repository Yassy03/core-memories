import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const maxDuration = 60

export async function POST(request) {
    const { userName, birthYear, memoryText, interpretationText, tintColor, imageData } = await request.json()
  
    // convert base64 directly to buffer — no Modal fetch needed
    const imageBuffer = Buffer.from(imageData, 'base64')
  
    const filename = `${Date.now()}-${userName.replace(/\s+/g, '_')}.png`
    const { error: uploadError } = await supabase.storage
      .from('album-images')
      .upload(filename, imageBuffer, { contentType: 'image/png' })
  
    if (uploadError) {
      console.error('3. Supabase upload error:', uploadError)
      return Response.json({ error: 'Failed to upload image', detail: uploadError.message }, { status: 500 })
    }
  
    const { data: { publicUrl } } = supabase.storage
      .from('album-images')
      .getPublicUrl(filename)
  
    const { error: dbError } = await supabase
      .from('Albums')
      .insert({
        user_name: userName,
        birth_year: birthYear,
        memory_text: memoryText,
        interpretation_text: interpretationText,
        tint_color: tintColor,
        image_url: publicUrl,
      })
  
    if (dbError) {
      console.error('5. DB error:', dbError)
      return Response.json({ error: 'Failed to save album', detail: dbError.message }, { status: 500 })
    }
  
    return Response.json({ success: true, imageUrl: publicUrl })
  }