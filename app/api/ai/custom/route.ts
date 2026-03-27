import { NextRequest, NextResponse } from "next/server"
import { generateWithLlama3 } from "@/lib/services/ollama.service"

export async function POST(request: NextRequest) {
  try {
    const { prompt, selectedText, contextData } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    let fullPrompt = prompt

    if (selectedText) {
      fullPrompt += `\n\nSelected Text:\n${selectedText}`
    }

    if (contextData) {
      fullPrompt += `\n\nContext (${contextData.type}):\n${JSON.stringify(contextData.data, null, 2)}`
    }

    const response = await generateWithLlama3(fullPrompt, {
      temperature: 0.6,
      max_tokens: 2000,
    })

    return NextResponse.json({ response })
  } catch (error: any) {
    console.error("Custom prompt error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process custom prompt" },
      { status: 500 }
    )
  }
}
