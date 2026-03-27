import { NextRequest, NextResponse } from "next/server"
import { generateWithLlama3 } from "@/lib/services/ollama.service"

export async function POST(request: NextRequest) {
  try {
    const { title, transcript, contextData } = await request.json()

    const prompt = `Analyze this meeting and propose a recurring series name.

Meeting Title: ${title}
Transcript: ${transcript || "N/A"}
Context: ${contextData ? JSON.stringify(contextData) : "N/A"}

Based on the content, topics discussed, and any patterns, suggest:
1. A recurring series name (e.g., "AI Dev Sprint", "Weekly Standup", "Product Review")
2. Suggested number/iteration if this appears to be part of a series (e.g., "#3", "Week 5")
3. Brief rationale for the name

Format:
**Proposed Series Name**: [Name with iteration number]
**Rationale**: [One paragraph explanation]
**Recommended Frequency**: [Daily/Weekly/Bi-weekly/Monthly]`

    const seriesName = await generateWithLlama3(prompt, {
      temperature: 0.5,
      max_tokens: 800,
    })

    return NextResponse.json({ seriesName })
  } catch (error: any) {
    console.error("Detect series error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to detect series" },
      { status: 500 }
    )
  }
}
