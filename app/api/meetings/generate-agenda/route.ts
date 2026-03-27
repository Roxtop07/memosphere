/*
  Generates an agenda from a meeting transcript.
  Priority: 1) Local Ollama (Llama3), 2) OpenRouter, 3) Heuristic fallback
*/
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { transcript = '', userPreferences } = body

    const prompt = `You are an assistant that extracts a concise agenda (bullet points) from the meeting transcript. Keep 6 or fewer items and make them actionable.

Transcript:
${transcript}`

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
          options: { temperature: 0.3 }
        })
      })

      if (resp.ok) {
        const data = await resp.json()
        const agenda = data.response || ''
        return Response.json({ agenda: String(agenda).trim(), source: 'ollama-llama3' })
      }
    } catch (e) {
      console.warn('[generate-agenda] ollama unavailable', e)
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
              { role: 'system', content: 'Extract a concise agenda (bullet points) from the meeting transcript. Keep 6 or fewer items and make them actionable.' },
              { role: 'user', content: transcript }
            ],
            temperature: 0.3,
            max_tokens: 300
          })
        })

        if (resp.ok) {
          const data = await resp.json()
          const agenda = data.choices?.[0]?.message?.content || ''
          return Response.json({ agenda: String(agenda).trim(), source: 'openrouter' })
        }
      } catch (e) {
        console.warn('[generate-agenda] openrouter fallback', e)
      }
    }

    // Fallback heuristic: extract lines and create bullets by picking sentences with verbs/nouns
    const sentences = String(transcript)
      .split(/[\.\n]+/)
      .map(s => s.trim())
      .filter(Boolean)

    // Score sentences by length and presence of action words
    const actionWords = ['action', 'follow up', 'deadline', 'due', 'assign', 'decide', 'task', 'complete']
    const scored = sentences.map(s => {
      const lw = s.toLowerCase()
      const score = actionWords.reduce((acc, w) => acc + (lw.includes(w) ? 2 : 0), 0) + Math.min(5, lw.split(' ').length / 5)
      return { s, score }
    })

    scored.sort((a, b) => b.score - a.score)
    const agendaItems = scored.slice(0, 6).map(x => x.s)

    return Response.json({ agenda: agendaItems, source: 'heuristic' })
  } catch (err) {
    console.error('[generate-agenda] error', err)
    return Response.json({ error: 'Failed to generate agenda' }, { status: 500 })
  }
}
