import { NextRequest, NextResponse } from "next/server"
import { generateWithLlama3 } from "@/lib/services/ollama.service"

export async function POST(request: NextRequest) {
  try {
    const { title, content, contextData } = await request.json()

    const prompt = `Generate a clean, actionable meeting agenda for "${title}".

Context: ${content}
${contextData ? `Additional Info: ${JSON.stringify(contextData, null, 2)}` : ""}

Create an agenda with:
1. Meeting Title
2. Date/Time (if available)
3. Attendees (if available)
4. Objectives (3-5 clear goals)
5. Agenda Items (with time allocations)
6. Expected Outcomes
7. Next Steps

Format with clear headings and bullet points.`

    const agenda = await generateWithLlama3(prompt, {
      temperature: 0.4,
      max_tokens: 1500,
    })

    return NextResponse.json({ agenda })
  } catch (error: any) {
    console.error("Generate agenda error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate agenda" },
      { status: 500 }
    )
  }
}
