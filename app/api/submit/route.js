import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const maxDuration = 60

export async function POST(request) {
    const { userName, birthYear, memoryText, interpretationText, responseText, sceneDescription, tintColor, imageData, thumbnailData } = await request.json()

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

    // Also upload the first generation preview thumbnail to a separate bucket so
    // the landing page can pick a random one as its background.
    if (thumbnailData) {
      const thumbBuffer = Buffer.from(thumbnailData, 'base64')
      const thumbFilename = `${Date.now()}-${userName.replace(/\s+/g, '_')}.jpg`
      const { error: thumbError } = await supabase.storage
        .from('album-thumbnails')
        .upload(thumbFilename, thumbBuffer, { contentType: 'image/jpeg' })
      if (thumbError) {
        // Non-fatal — log and continue. The album row still gets saved.
        console.error('Supabase thumbnail upload error:', thumbError)
      }
    }
  
    const { error: dbError } = await supabase
      .from('Albums')
      .insert({
        user_name: userName,
        birth_year: birthYear,
        memory_text: memoryText,
        interpretation_text: interpretationText,
        response_text: responseText,
        scene_description: sceneDescription,
        tint_color: tintColor,
        image_url: publicUrl,
      })
  
    if (dbError) {
      console.error('5. DB error:', dbError)
      return Response.json({ error: 'Failed to save album', detail: dbError.message }, { status: 500 })
    }
  
    return Response.json({ success: true, imageUrl: publicUrl })
  }