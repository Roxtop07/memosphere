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

    const prompt = `Extract all action items and follow-ups from this meeting transcript.

Transcript:
${transcript}

For each action item, identify:
- The specific task or action
- Suggested assignee (based on context, or "Recommend: [person]" if unclear)
- Deadline or urgency (Immediate/This Week/Next Week/Month/TBD)
- Priority level (High/Medium/Low)

Format as numbered list:
1. **Action**: [Clear task description]
   - **Assignee**: [Person name or suggestion]
   - **Deadline**: [Date or timeframe]
   - **Priority**: [High/Medium/Low]
   - **Context**: [Brief note about why this is needed]

If no action items detected, state that clearly.`

    const followUps = await generateWithMistral(prompt, {
      temperature: 0.2,
      max_tokens: 1500,
    })

    return NextResponse.json({ followUps })
  } catch (error: any) {
    console.error("Follow-ups error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to find follow-ups" },
      { status: 500 }
    )
  }
}
