import { NextRequest, NextResponse } from "next/server"
import { transcribeAudioBuffer } from "@/lib/whisper.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/transcribe
 * Transcribe audio file to text using Whisper.cpp
 * 
 * Body (multipart/form-data):
 * - audio: Audio file (wav, mp3, etc.)
 * - model: (optional) Model to use (tiny, base, small, medium, large)
 * - language: (optional) Language code (en, es, fr, etc.)
 * - translate: (optional) Translate to English (true/false)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const model = (formData.get("model") as string) || "base"
    const language = (formData.get("language") as string) || "en"
    const translate = formData.get("translate") === "true"

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      )
    }

    // Validate model
    const validModels = ["tiny", "base", "small", "medium", "large"]
    if (!validModels.includes(model)) {
      return NextResponse.json(
        { error: `Invalid model. Must be one of: ${validModels.join(", ")}` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Transcribe
    const result = await transcribeAudioBuffer(buffer, audioFile.name, {
      model: model as any,
      language,
      translate,
      threads: 4,
    })

    return NextResponse.json({
      success: true,
      transcription: result.text,
      segments: result.segments,
      language: result.language,
      model,
    })
  } catch (error: any) {
    console.error("Transcription error:", error)
    return NextResponse.json(
      {
        error: "Transcription failed",
        message: error.message,
      },
      { status: 500 }
    )
  }
}
