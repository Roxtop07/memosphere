import { NextResponse } from "next/server"
import { getWhisperStatus } from "@/lib/whisper.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/transcribe/status
 * Check Whisper.cpp availability and list available models
 */
export async function GET() {
  try {
    const status = await getWhisperStatus()

    return NextResponse.json({
      success: true,
      whisper: status,
    })
  } catch (error: any) {
    console.error("Whisper status check error:", error)
    return NextResponse.json(
      {
        error: "Failed to check Whisper status",
        message: error.message,
      },
      { status: 500 }
    )
  }
}
