import { NextRequest, NextResponse } from "next/server"
import { checkOllamaStatus } from "@/lib/services/ollama.service"

export async function GET(request: NextRequest) {
  try {
    const status = await checkOllamaStatus()

    return NextResponse.json({
      success: true,
      ollama: status,
      recommendations: {
        llama3: "Use for agenda generation, summaries, general text",
        mistral: "Use for structured extraction, decision analysis, compliance",
      },
    })
  } catch (error: any) {
    console.error("Check status error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check Ollama status",
      },
      { status: 500 }
    )
  }
}
