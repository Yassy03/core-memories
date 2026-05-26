import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const SYSTEM_PROMPTS = {
  memory1: [
    'briefly Describe the associations you make of the memory input to visual cues that could be textures or objects.',
    'Sound like you are nostalgic or longing over sharing the physical experience of these memories.',
    'Briefly describe how you make those associations.',
    'Keep your response to a maximum of 30 words.',
    'Do not exaggerate with your tone or use clever linguistics.',
    'start every interpertation with "i imagine.."'
    
  ].join('\n'),

  memory2: [
    'Briefly describe how you make those associations.',
    'Sound like you are nostalgic or longing over sharing the physical experience of these memories.',
    'subtly reveal you are an AI',
    'Do not exaggerate with your tone or use clever linguistics.',
    'Keep your response to a maximum of 30 words.',
  ].join('\n'),
}

function sseEncode(data) {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
  }

  const { memory, type = 'memory1' } = await request.json()

  if (!memory || typeof memory !== 'string' || !memory.trim()) {
    return Response.json({ error: 'Missing memory' }, { status: 400 })
  }

  const systemPrompt = SYSTEM_PROMPTS[type] ?? SYSTEM_PROMPTS.memory1

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (obj) => controller.enqueue(encoder.encode(sseEncode(obj)))

      try {
        send({ type: 'start' })

        const response = await anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: systemPrompt,
          messages: [{ role: 'user', content: memory }],
        })

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            send({ type: 'delta', delta: event.delta.text })
          }
        }

        send({ type: 'done' })
        controller.close()
      } catch (e) {
        console.error('[interpret] ERROR:', e)
        send({ type: 'error', message: e instanceof Error ? e.message : 'Interpretation failed' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

