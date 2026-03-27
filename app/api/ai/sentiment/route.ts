import { NextRequest, NextResponse } from "next/server"
import { generateWithMistral } from "@/lib/services/ollama.service"

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      )
    }

    const prompt = `Perform a sentiment and insight analysis on this content.

Content:
${content}

Provide:
1. **Overall Sentiment**: (Positive/Neutral/Negative with confidence score 0-100%)
2. **Tone Analysis**: One paragraph describing the emotional tone, communication style, and atmosphere
3. **Key Themes**: Top 5-7 keywords or phrases that capture the essence
4. **Insights**: 2-3 actionable insights about the content
5. **Concerns** (if any): Any red flags or issues detected

Format clearly with headings.`

    const analysis = await generateWithMistral(prompt, {
      temperature: 0.3,
      max_tokens: 1200,
    })

    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error("Sentiment analysis error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to analyze sentiment" },
      { status: 500 }
    )
  }
}
