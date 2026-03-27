import { NextRequest, NextResponse } from "next/server"
import { generateWithLlama3 } from "@/lib/services/ollama.service"

export async function POST(request: NextRequest) {
  try {
    const { content, contextType } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      )
    }

    const prompt = `Summarize the following ${contextType || "content"} into 5-7 key bullet points. Include timestamps if they appear in the content. Be concise and actionable.

Content:
${content}

Provide the summary in this format:
- [Timestamp if available] Key point with action items
- [Timestamp if available] Key point with action items
...`

    const summary = await generateWithLlama3(prompt, {
      temperature: 0.3,
      max_tokens: 1000,
    })

    return NextResponse.json({ summary })
  } catch (error: any) {
    console.error("Summarize error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate summary" },
      { status: 500 }
    )
  }
}
