export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 })
  
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return Response.json({ imageData: base64 })
  }