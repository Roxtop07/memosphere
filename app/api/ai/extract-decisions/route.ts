import { NextRequest, NextResponse } from "next/server"
import { generateWithMistral } from "@/lib/services/ollama.service"

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json()

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      )
    }

    const prompt = `Analyze this meeting transcript and extract all decisions made. For each decision, identify:
- The decision itself
- Who is responsible (owner)
- Deadline or due date (if mentioned)

Transcript:
${transcript}

Provide a numbered list in this format:
1. **Decision**: [Clear statement]
   - **Owner**: [Person responsible or "TBD"]
   - **Due Date**: [Date or "TBD"]

2. **Decision**: [Clear statement]
   - **Owner**: [Person responsible or "TBD"]
   - **Due Date**: [Date or "TBD"]

If no decisions were made, state that clearly.`

    const decisions = await generateWithMistral(prompt, {
      temperature: 0.2,
      max_tokens: 1500,
    })

    return NextResponse.json({ decisions })
  } catch (error: any) {
    console.error("Extract decisions error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to extract decisions" },
      { status: 500 }
    )
  }
}
