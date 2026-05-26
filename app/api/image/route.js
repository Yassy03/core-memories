export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    const subfolder = searchParams.get('subfolder')
    const type = searchParams.get('type')
  
    const comfyHost = process.env.COMFYUI_HOST
    const imageRes = await fetch(
      `${comfyHost}/view?filename=${filename}&subfolder=${subfolder}&type=${type}`
    )
  
    const buffer = await imageRes.arrayBuffer()
    return new Response(buffer, {
      headers: { 'Content-Type': 'image/png' }
    })
  }