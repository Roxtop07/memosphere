/*
  Generate a series name from multiple meeting transcripts.
  Priority: 1) Local Ollama (Llama3), 2) OpenRouter, 3) Heuristic fallback
*/
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { transcripts = [] } = body

    if (!Array.isArray(transcripts) || transcripts.length === 0) {
      return Response.json({ error: 'transcripts must be a non-empty array' }, { status: 400 })
    }

    const combined = transcripts.map(t => String(t)).join('\n\n---\n\n')
    const prompt = `Analyze these meeting transcripts and create a short (3-6 words), descriptive series name for these recurring meetings.

Examples:
- "AI Development Sprint"
- "Product Planning Weekly"
- "Engineering Standup"

Transcripts:
${combined}

Series name:`

    // 1) Try local Ollama first (Llama 3)
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
    try {
      const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt,
          stream: false,
          options: { temperature: 0.4, num_predict: 20 }
        })
      })

      if (resp.ok) {
        const data = await resp.json()
        const seriesName = (data.response || '').trim().replace(/^Series name:\s*/i, '')
        return Response.json({ seriesName, source: 'ollama-llama3' })
      }
    } catch (e) {
      console.warn('[series] ollama unavailable', e)
    }

    // 2) Fallback to OpenRouter if available
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
    if (OPENROUTER_API_KEY) {
      try {
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-r1-0528:free',
            messages: [
              { role: 'system', content: 'Create a short (3-6 words), descriptive series name for these meetings.' },
              { role: 'user', content: combined }
            ],
            temperature: 0.4,
            max_tokens: 30
          })
        })

        if (resp.ok) {
          const data = await resp.json()
          const name = data.choices?.[0]?.message?.content || ''
          return Response.json({ seriesName: String(name).trim(), source: 'openrouter' })
        }
      } catch (e) {
        console.warn('[series] openrouter error', e)
      }
    }

    // Heuristic: pick top 2-3 frequent non-stop words
    const stop = new Set(['the','and','to','of','a','in','for','on','with','is','are','this','that','it','we','our'])
    const freq: Record<string, number> = {}
    for (const t of transcripts) {
      const words = String(t).toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
      for (const w of words) {
        if (stop.has(w) || w.length < 3) continue
        freq[w] = (freq[w] || 0) + 1
      }
    }
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0])
    const seriesName = top.length ? top.map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' ') : 'Meeting Series'

    return Response.json({ seriesName, source: 'heuristic' })

  } catch (err) {
    console.error('[series] error', err)
    return Response.json({ error: 'Failed to generate series name' }, { status: 500 })
  }
}
