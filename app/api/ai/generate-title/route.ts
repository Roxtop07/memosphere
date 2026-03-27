import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json()

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      )
    }

    // Use Ollama to generate title and description
    const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"

    const prompt = `Analyze this meeting transcript and provide:
1. A concise meeting title (5-8 words max)
2. A brief description (1-2 sentences)

Transcript:
${transcript.substring(0, 2000)}

Respond in JSON format:
{
  "title": "Meeting Title Here",
  "description": "Brief description here"
}`

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 200,
        },
      }),
    })

    if (!response.ok) {
      throw new Error("Ollama API failed")
    }

    const data = await response.json()
    let responseText = data.response || ""

    // Try to parse JSON from response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return NextResponse.json({
          title: parsed.title || "Meeting",
          description: parsed.description || "Meeting discussion",
        })
      }
    } catch (e) {
      // Fallback: extract title and description from text
      const lines = responseText.split("\n").filter((l: string) => l.trim())
      return NextResponse.json({
        title: lines[0]?.replace(/^["']|["']$/g, "").substring(0, 100) || "Meeting",
        description: lines[1]?.replace(/^["']|["']$/g, "").substring(0, 200) || "Meeting discussion",
      })
    }

    return NextResponse.json({
      title: "Meeting",
      description: responseText.substring(0, 200) || "Meeting discussion",
    })
  } catch (error: any) {
    console.error("[generate-title] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate title" },
      { status: 500 }
    )
  }
}
