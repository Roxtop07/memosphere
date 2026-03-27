/*
  Extract discussion points and decisions from a transcript.
  Priority: 1) Local Ollama (Mistral 7B), 2) OpenRouter, 3) Heuristic fallback
*/
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { transcript = '' } = body

    const prompt = `Extract discussions and decisions from this meeting transcript in JSON format:

{
  "discussions": ["Topic 1", "Topic 2", ...],
  "decisions": ["Decision 1 with owner if mentioned", "Decision 2", ...]
}

Meeting transcript:
${transcript}

JSON output:`

    // 1) Try local Ollama first (Mistral 7B - better for structured extraction)
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
    try {
      const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          prompt,
          stream: false,
          options: { temperature: 0.2, num_predict: 500 }
        })
      })

      if (resp.ok) {
        const data = await resp.json()
        let output = (data.response || '').trim()
        
        // Try to parse JSON response from Mistral
        try {
          // Clean up the response to extract JSON
          const jsonMatch = output.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            return Response.json({ 
              discussions: parsed.discussions || [],
              decisions: parsed.decisions || [],
              source: 'ollama-mistral'
            })
          }
        } catch (parseError) {
          // If JSON parsing fails, return raw output
          return Response.json({ 
            extracted: output,
            source: 'ollama-mistral-raw'
          })
        }
      }
    } catch (e) {
      console.warn('[extract-decisions] ollama unavailable, trying llama3', e)
      
      // Try Llama3 as secondary local option
      try {
        const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3',
            prompt,
            stream: false,
            options: { temperature: 0.2, num_predict: 500 }
          })
        })

        if (resp.ok) {
          const data = await resp.json()
          const output = (data.response || '').trim()
          return Response.json({ 
            extracted: output,
            source: 'ollama-llama3'
          })
        }
      } catch (e2) {
        console.warn('[extract-decisions] all ollama models unavailable', e2)
      }
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
              { role: 'system', content: 'From the transcript, list (1) summary discussion points and (2) explicit decisions or action items with owners if mentioned.' },
              { role: 'user', content: transcript }
            ],
            temperature: 0.2,
            max_tokens: 600
          })
        })

        if (resp.ok) {
          const data = await resp.json()
          const output = data.choices?.[0]?.message?.content || ''
          return Response.json({ extracted: String(output).trim(), source: 'openrouter' })
        }
      } catch (e) {
        console.warn('[extract-decisions] openrouter failed', e)
      }
    }

    // Heuristic fallback
    const text = String(transcript)
    const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean)
    const decisions: string[] = []
    const discussions: string[] = []

    const decisionWords = ['decide','decided','decision','approve','approved','action','will','shall','assign','assigned','due']

    for (const line of lines) {
      const lw = line.toLowerCase()
      if (decisionWords.some(w => lw.includes(w))) {
        decisions.push(line)
      } else {
        // treat as discussion if line is reasonably long
        if (line.split(' ').length > 5) discussions.push(line)
      }
    }

    return Response.json({ discussions, decisions, source: 'heuristic' })
  } catch (err) {
    console.error('[extract-decisions] error', err)
    return Response.json({ error: 'Failed to extract decisions' }, { status: 500 })
  }
}
