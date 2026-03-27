import { NextRequest, NextResponse } from "next/server"
import { generateWithLlama3 } from "@/lib/services/ollama.service"

export async function POST(request: NextRequest) {
  try {
    const { policy } = await request.json()

    if (!policy) {
      return NextResponse.json(
        { error: "Policy content is required" },
        { status: 400 }
      )
    }

    const prompt = `Rewrite this policy in plain, simple language that anyone can understand. Use clear headings, bullet points, and short sentences.

Original Policy:
${policy}

Simplified Version should include:
- Clear section headings (##)
- Bullet points for key requirements
- Simple explanations without jargon
- Examples where helpful
- "What this means for you" sections

Make it conversational but professional.`

    const simplified = await generateWithLlama3(prompt, {
      temperature: 0.4,
      max_tokens: 2000,
    })

    return NextResponse.json({ simplified })
  } catch (error: any) {
    console.error("Simplify policy error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to simplify policy" },
      { status: 500 }
    )
  }
}
