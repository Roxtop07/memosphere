import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { content, maxPoints = 7 } = await req.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Use Ollama to extract key points
    const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"

    const prompt = `Extract the ${maxPoints} most important key points from this content. Be concise and specific.

Content:
${content.substring(0, 4000)}

Provide ${maxPoints} key points as a numbered list.`

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 500,
        },
      }),
    })

    if (!response.ok) {
      throw new Error("Ollama API failed")
    }

    const data = await response.json()
    let responseText = data.response || ""

    // Parse key points from response
    const keyPoints = responseText
      .split("\n")
      .filter((line: string) => line.trim())
      .map((line: string) => line.replace(/^\d+\.\s*/, "").trim())
      .filter((line: string) => line.length > 10)
      .slice(0, maxPoints)

    return NextResponse.json({ keyPoints })
  } catch (error: any) {
    console.error("[extract-key-points] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to extract key points" },
      { status: 500 }
    )
  }
}
