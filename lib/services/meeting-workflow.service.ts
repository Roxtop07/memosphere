/**
 * Meeting Workflow Service
 * Orchestrates the complete meeting creation workflow:
 * 1. Voice transcription (Whisper)
 * 2. Series detection (semantic comparison)
 * 3. AI Analysis (Ollama/Mistral)
 * 4. PDF generation
 * 5. Database save
 */

export interface MeetingWorkflowInput {
  audioBuffer?: Buffer
  audioFile?: File
  transcript?: string
  userId: string
  organizationId: string
}

export interface MeetingSeriesMatch {
  seriesId?: string
  seriesName?: string
  similarity: number
  isNewSeries: boolean
  suggestedName?: string
}

export interface MeetingAnalysis {
  title: string
  description: string
  summary: string
  agenda: string[]
  discussions: Array<{
    topic: string
    participants?: string[]
    points: string[]
    timestamp?: string
  }>
  decisions: Array<{
    decision: string
    owner?: string
    dueDate?: string
    status: "pending" | "approved" | "rejected"
  }>
  sentiment?: {
    overall: "positive" | "neutral" | "negative"
    score: number
  }
}

export interface MeetingWorkflowResult {
  meetingId: string
  transcript: string
  seriesMatch: MeetingSeriesMatch
  analysis: MeetingAnalysis
  pdfPath: string
  success: boolean
  error?: string
}

/**
 * Main workflow orchestrator
 */
export async function processMeetingWorkflow(
  input: MeetingWorkflowInput
): Promise<MeetingWorkflowResult> {
  try {
    console.log("[Workflow] Starting meeting processing workflow")

    // Step 1: Get or generate transcript
    let transcript = input.transcript

    if (!transcript) {
      console.log("[Workflow] Transcribing audio...")
      const transcribed = await transcribeAudio(input.audioBuffer, input.audioFile)
      
      if (!transcribed) {
        throw new Error("Failed to transcribe audio")
      }
      
      transcript = transcribed
    }

    console.log("[Workflow] Transcript generated:", transcript.substring(0, 100))

    // Step 2: Detect series (check against existing meetings)
    console.log("[Workflow] Detecting series...")
    const seriesMatch = await detectMeetingSeries(
      transcript,
      input.userId,
      input.organizationId
    )

    console.log("[Workflow] Series detection:", seriesMatch)

    // Step 3: AI Analysis - Generate comprehensive meeting data
    console.log("[Workflow] Generating AI analysis...")
    const analysis = await generateMeetingAnalysis(transcript, seriesMatch)

    console.log("[Workflow] Analysis complete")

    // Step 4: Save to database
    console.log("[Workflow] Saving to database...")
    const meetingId = await saveMeetingToDatabase({
      transcript,
      seriesMatch,
      analysis,
      userId: input.userId,
      organizationId: input.organizationId,
    })

    console.log("[Workflow] Meeting saved with ID:", meetingId)

    // Step 5: Generate PDF
    console.log("[Workflow] Generating PDF...")
    const pdfPath = await generateMeetingPDF({
      meetingId,
      transcript,
      analysis,
    })

    console.log("[Workflow] PDF generated at:", pdfPath)

    return {
      meetingId,
      transcript,
      seriesMatch,
      analysis,
      pdfPath,
      success: true,
    }
  } catch (error: any) {
    console.error("[Workflow] Error:", error)
    return {
      meetingId: "",
      transcript: input.transcript || "",
      seriesMatch: {
        similarity: 0,
        isNewSeries: true,
      },
      analysis: {
        title: "",
        description: "",
        summary: "",
        agenda: [],
        discussions: [],
        decisions: [],
      },
      pdfPath: "",
      success: false,
      error: error.message,
    }
  }
}

/**
 * Step 1: Transcribe audio using Whisper
 */
async function transcribeAudio(
  buffer?: Buffer,
  file?: File
): Promise<string | null> {
  try {
    // Call transcription API
    const formData = new FormData()

    if (file) {
      formData.append("audio", file)
    } else if (buffer) {
      const uint8Array = new Uint8Array(buffer)
      const blob = new Blob([uint8Array], { type: "audio/wav" })
      formData.append("audio", blob, "recording.wav")
    } else {
      return null
    }

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Transcription API failed")
    }

    const data = await response.json()
    return data.transcription || null
  } catch (error) {
    console.error("[Workflow] Transcription error:", error)
    return null
  }
}

/**
 * Step 2: Detect if meeting belongs to existing series
 */
async function detectMeetingSeries(
  transcript: string,
  userId: string,
  organizationId: string
): Promise<MeetingSeriesMatch> {
  try {
    // Get existing meetings for similarity comparison
    const response = await fetch("/api/meetings/semantic-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: transcript,
        userId,
        organizationId,
        action: "similarity",
        threshold: 0.7, // 70% similarity threshold
      }),
    })

    if (!response.ok) {
      throw new Error("Series detection API failed")
    }

    const data = await response.json()

    // If we found a similar meeting, use its series
    if (data.matches && data.matches.length > 0) {
      const bestMatch = data.matches[0]
      
      if (bestMatch.similarity >= 0.7) {
        return {
          seriesId: bestMatch.seriesId,
          seriesName: bestMatch.seriesName,
          similarity: bestMatch.similarity,
          isNewSeries: false,
        }
      }
    }

    // Generate new series name
    const seriesResponse = await fetch("/api/meetings/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcripts: [transcript],
      }),
    })

    const seriesData = await seriesResponse.json()

    return {
      similarity: 0,
      isNewSeries: true,
      suggestedName: seriesData.seriesName || "New Meeting Series",
    }
  } catch (error) {
    console.error("[Workflow] Series detection error:", error)
    return {
      similarity: 0,
      isNewSeries: true,
      suggestedName: "New Meeting Series",
    }
  }
}

/**
 * Step 3: Generate comprehensive meeting analysis using AI
 */
async function generateMeetingAnalysis(
  transcript: string,
  seriesMatch: MeetingSeriesMatch
): Promise<MeetingAnalysis> {
  try {
    // Generate title and description
    const titleResponse = await fetch("/api/ai/generate-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    })

    const titleData = await titleResponse.json()

    // Generate summary
    const summaryResponse = await fetch("/api/ai/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: transcript,
        contextType: "meeting",
      }),
    })

    const summaryData = await summaryResponse.json()

    // Generate agenda
    const agendaResponse = await fetch("/api/meetings/generate-agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    })

    const agendaData = await agendaResponse.json()

    // Extract discussions and decisions
    const decisionsResponse = await fetch("/api/meetings/extract-decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    })

    const decisionsData = await decisionsResponse.json()

    // Sentiment analysis
    const sentimentResponse = await fetch("/api/meetings/sentiment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    })

    const sentimentData = await sentimentResponse.json()

    return {
      title: titleData.title || seriesMatch.seriesName || "Meeting",
      description: titleData.description || "Meeting discussion",
      summary: summaryData.summary || "",
      agenda: agendaData.agenda || [],
      discussions: decisionsData.discussions || [],
      decisions: decisionsData.decisions || [],
      sentiment: sentimentData.sentiment || undefined,
    }
  } catch (error) {
    console.error("[Workflow] Analysis error:", error)
    return {
      title: seriesMatch.seriesName || "Meeting",
      description: "Meeting discussion",
      summary: "Error generating summary",
      agenda: [],
      discussions: [],
      decisions: [],
    }
  }
}

/**
 * Step 4: Save meeting to database
 */
async function saveMeetingToDatabase(data: {
  transcript: string
  seriesMatch: MeetingSeriesMatch
  analysis: MeetingAnalysis
  userId: string
  organizationId: string
}): Promise<string> {
  try {
    const response = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.analysis.title,
        description: data.analysis.description,
        transcript: data.transcript,
        summary: data.analysis.summary,
        agenda: data.analysis.agenda,
        discussions: data.analysis.discussions,
        decisions: data.analysis.decisions,
        sentiment: data.analysis.sentiment,
        seriesId: data.seriesMatch.seriesId,
        seriesName: data.seriesMatch.isNewSeries
          ? data.seriesMatch.suggestedName
          : data.seriesMatch.seriesName,
        userId: data.userId,
        organizationId: data.organizationId,
        date: new Date().toISOString(),
        status: "completed",
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to save meeting")
    }

    const result = await response.json()
    return result.meetingId || result.id
  } catch (error) {
    console.error("[Workflow] Database save error:", error)
    throw error
  }
}

/**
 * Step 5: Generate PDF with meeting details
 */
async function generateMeetingPDF(data: {
  meetingId: string
  transcript: string
  analysis: MeetingAnalysis
}): Promise<string> {
  try {
    const response = await fetch("/api/meetings/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId: data.meetingId,
        title: data.analysis.title,
        description: data.analysis.description,
        summary: data.analysis.summary,
        agenda: data.analysis.agenda,
        discussions: data.analysis.discussions,
        decisions: data.analysis.decisions,
        transcript: data.transcript,
      }),
    })

    if (!response.ok) {
      throw new Error("PDF generation failed")
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    
    return url
  } catch (error) {
    console.error("[Workflow] PDF generation error:", error)
    throw error
  }
}
