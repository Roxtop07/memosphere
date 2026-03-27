import { NextRequest, NextResponse } from "next/server"
import { generateWithLlama3 } from "@/lib/ollama.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/ai/analyze-transcript
 * Comprehensive transcript analysis including summary, decisions, and follow-ups
 */
export async function POST(request: NextRequest) {
  try {
    const { transcript, title, includeDecisions, includeFollowups, includeSentiment } = await request.json()

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      )
    }

    const prompt = `You are analyzing a meeting transcript. Provide a comprehensive analysis.

Meeting: ${title || "Meeting"}

Transcript:
${transcript}

Please provide:

1. **Summary** (5-7 key points with timestamps if available)

${includeDecisions ? '2. **Decisions Made** (list each decision with owner and due date if mentioned)\n' : ''}

${includeFollowups ? '3. **Action Items** (list tasks with assignees, deadlines, and priority)\n' : ''}

${includeSentiment ? '4. **Sentiment Analysis** (overall tone, key topics, and insights)\n' : ''}

Format your response in clear sections with headings.`

    const analysis = await generateWithLlama3(prompt, {
      temperature: 0.4,
      max_tokens: 3000,
    })

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error: any) {
    console.error("Transcript analysis error:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze transcript",
        message: error.message,
      },
      { status: 500 }
    )
  }
}
