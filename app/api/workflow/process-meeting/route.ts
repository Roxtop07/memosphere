/**
 * Meeting Workflow API
 * Entry point for processing complete meeting workflow
 */

import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 300 // 5 minutes timeout for long operations

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || ""

    let audioBuffer: Buffer | undefined
    let audioFile: File | undefined
    let transcript: string | undefined
    let userId = "demo-user"
    let organizationId = "demo-org"

    // Handle multipart/form-data (audio file upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      
      const audio = formData.get("audio") as File | null
      if (audio) {
        const arrayBuffer = await audio.arrayBuffer()
        audioBuffer = Buffer.from(arrayBuffer)
      }

      transcript = formData.get("transcript") as string | undefined
      userId = (formData.get("userId") as string) || userId
      organizationId = (formData.get("organizationId") as string) || organizationId
    } else {
      // Handle JSON
      const body = await req.json()
      
      if (body.audioData) {
        // Base64 encoded audio
        audioBuffer = Buffer.from(body.audioData, "base64")
      }

      transcript = body.transcript
      userId = body.userId || userId
      organizationId = body.organizationId || organizationId
    }

    // Validate input
    if (!audioBuffer && !transcript) {
      return NextResponse.json(
        { error: "Either audio file or transcript is required" },
        { status: 400 }
      )
    }

    console.log("[workflow] Starting meeting processing workflow")

    // Step 1: Transcribe if needed
    let finalTranscript = transcript

    if (!finalTranscript && audioBuffer) {
      console.log("[workflow] Transcribing audio...")
      
      const formData = new FormData()
      const uint8Array = new Uint8Array(audioBuffer)
      const blob = new Blob([uint8Array], { type: "audio/wav" })
      formData.append("audio", blob, "recording.wav")

      const transcribeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/transcribe`,
        {
          method: "POST",
          body: formData,
        }
      )

      if (!transcribeResponse.ok) {
        throw new Error("Transcription failed")
      }

      const transcribeData = await transcribeResponse.json()
      finalTranscript = transcribeData.transcription

      if (!finalTranscript) {
        throw new Error("No transcript generated")
      }
    }

    console.log("[workflow] Transcript:", finalTranscript?.substring(0, 100))

    // Step 2: Series detection
    console.log("[workflow] Detecting series...")
    
    const seriesResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meetings/series`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcripts: [finalTranscript],
        }),
      }
    )

    const seriesData = await seriesResponse.json()
    const seriesName = seriesData.seriesName || "New Meeting Series"

    console.log("[workflow] Series:", seriesName)

    // Step 3: Generate title and description
    console.log("[workflow] Generating title...")
    
    const titleResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/generate-title`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: finalTranscript }),
      }
    )

    const titleData = await titleResponse.json()

    // Step 4: Generate summary
    console.log("[workflow] Generating summary...")
    
    const summaryResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/summarize`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: finalTranscript,
          contextType: "meeting",
        }),
      }
    )

    const summaryData = await summaryResponse.json()

    // Step 5: Generate agenda
    console.log("[workflow] Generating agenda...")
    
    const agendaResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meetings/generate-agenda`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: finalTranscript }),
      }
    )

    const agendaData = await agendaResponse.json()

    // Step 6: Extract discussions and decisions
    console.log("[workflow] Extracting decisions...")
    
    const decisionsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meetings/extract-decisions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: finalTranscript }),
      }
    )

    const decisionsData = await decisionsResponse.json()

    // Step 7: Save to database
    console.log("[workflow] Saving to database...")
    
    const meetingData = {
      title: titleData.title || seriesName,
      description: titleData.description || "Meeting discussion",
      transcript: finalTranscript,
      summary: summaryData.summary || "",
      agenda: agendaData.agenda || [],
      discussions: decisionsData.discussions || [],
      decisions: decisionsData.decisions || [],
      seriesName,
      userId,
      organizationId,
      date: new Date().toISOString(),
      status: "completed",
    }

    const saveResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meetings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meetingData),
      }
    )

    const saveData = await saveResponse.json()
    const meetingId = saveData.meetingId

    console.log("[workflow] Meeting saved:", meetingId)

    // Step 8: Generate PDF
    console.log("[workflow] Generating PDF...")
    
    const pdfResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meetings/generate-pdf`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          ...meetingData,
        }),
      }
    )

    let pdfUrl = ""
    if (pdfResponse.ok) {
      const pdfBlob = await pdfResponse.blob()
      // In production, upload to storage and return URL
      // For now, we'll indicate PDF is generated
      pdfUrl = `/api/meetings/${meetingId}/pdf`
      console.log("[workflow] PDF generated")
    }

    return NextResponse.json({
      success: true,
      meetingId,
      transcript: finalTranscript,
      seriesName,
      analysis: {
        title: meetingData.title,
        description: meetingData.description,
        summary: meetingData.summary,
        agenda: meetingData.agenda,
        discussions: meetingData.discussions,
        decisions: meetingData.decisions,
      },
      pdfUrl,
    })
  } catch (error: any) {
    console.error("[workflow] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Workflow processing failed",
      },
      { status: 500 }
    )
  }
}
