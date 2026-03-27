"use client"

import { useState } from "react"

interface AIActionParams {
  selectedText?: string
  contextData?: {
    type: "meeting" | "event" | "policy" | "general"
    data?: any
  }
  prompt?: string
}

export function useAIAssistant() {
  const [isLoading, setIsLoading] = useState(false)

  const executeAction = async (
    actionId: string,
    params: AIActionParams
  ): Promise<string> => {
    setIsLoading(true)

    try {
      // Route to appropriate handler
      switch (actionId) {
        case "summarize":
          return await summarize(params)
        case "agenda":
          return await generateAgenda(params)
        case "decisions":
          return await extractDecisions(params)
        case "series":
          return await detectSeries(params)
        case "simplify":
          return await simplifyPolicy(params)
        case "sentiment":
          return await analyzeSentiment(params)
        case "followups":
          return await findFollowUps(params)
        case "transcript":
          return await analyzeTranscript(params)
        case "custom":
          return await processCustomPrompt(params)
        default:
          return "Unknown action"
      }
    } catch (error) {
      console.error("AI Assistant error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return { executeAction, isLoading }
}

// Summarize: 5-7 key bullets with timestamps
async function summarize(params: AIActionParams): Promise<string> {
  const { selectedText, contextData } = params

  const content = selectedText || contextData?.data?.transcript || contextData?.data?.content || ""

  const response = await fetch("/api/ai/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      contextType: contextData?.type,
    }),
  })

  if (!response.ok) throw new Error("Failed to summarize")

  const data = await response.json()
  return data.summary
}

// Generate Agenda: clean, actionable agenda
async function generateAgenda(params: AIActionParams): Promise<string> {
  const { selectedText, contextData } = params

  const content = selectedText || contextData?.data?.description || ""
  const title = contextData?.data?.title || "Meeting"

  const response = await fetch("/api/ai/generate-agenda", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      content,
      contextData: contextData?.data,
    }),
  })

  if (!response.ok) throw new Error("Failed to generate agenda")

  const data = await response.json()
  return data.agenda
}

// Extract Decisions: numbered list with owners/dates
async function extractDecisions(params: AIActionParams): Promise<string> {
  const { selectedText, contextData } = params

  const transcript = selectedText || contextData?.data?.transcript || ""

  const response = await fetch("/api/ai/extract-decisions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript,
    }),
  })

  if (!response.ok) throw new Error("Failed to extract decisions")

  const data = await response.json()
  return data.decisions
}

// Detect Series: propose recurring meeting name
async function detectSeries(params: AIActionParams): Promise<string> {
  const { selectedText, contextData } = params

  const title = contextData?.data?.title || selectedText || ""
  const transcript = contextData?.data?.transcript || ""

  const response = await fetch("/api/ai/detect-series", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      transcript,
      contextData: contextData?.data,
    }),
  })

  if (!response.ok) throw new Error("Failed to detect series")

  const data = await response.json()
  return data.seriesName
}

// Simplify Policy: plain language with headings
async function simplifyPolicy(params: AIActionParams): Promise<string> {
  const { selectedText, contextData } = params

  const policy = selectedText || contextData?.data?.content || ""

  const response = await fetch("/api/ai/simplify-policy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      policy,
    }),
  })

  if (!response.ok) throw new Error("Failed to simplify policy")

  const data = await response.json()
  return data.simplified
}

// Sentiment Analysis: tone + rationale + keywords
async function analyzeSentiment(params: AIActionParams): Promise<string> {
  const { selectedText, contextData } = params

  const content = selectedText || contextData?.data?.transcript || contextData?.data?.content || ""

  const response = await fetch("/api/ai/sentiment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
    }),
  })

  if (!response.ok) throw new Error("Failed to analyze sentiment")

  const data = await response.json()
  return data.analysis
}

// Follow-ups: action items with assignees and deadlines
async function findFollowUps(params: AIActionParams): Promise<string> {
  const { selectedText, contextData } = params

  const transcript = selectedText || contextData?.data?.transcript || ""

  const response = await fetch("/api/ai/follow-ups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript,
    }),
  })

  if (!response.ok) throw new Error("Failed to find follow-ups")

  const data = await response.json()
  return data.followUps
}

// Analyze Transcript: comprehensive meeting transcript analysis
async function analyzeTranscript(params: AIActionParams): Promise<string> {
  const { selectedText, contextData } = params

  const transcript = selectedText || contextData?.data?.transcript || ""
  const title = contextData?.data?.title || "Meeting Transcript"

  const response = await fetch("/api/ai/analyze-transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript,
      title,
      includeDecisions: true,
      includeFollowups: true,
      includeSentiment: true,
    }),
  })

  if (!response.ok) throw new Error("Failed to analyze transcript")

  const data = await response.json()
  return data.analysis
}

// Custom prompt processing
async function processCustomPrompt(params: AIActionParams): Promise<string> {
  const { prompt, selectedText, contextData } = params

  const response = await fetch("/api/ai/custom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      selectedText,
      contextData,
    }),
  })

  if (!response.ok) throw new Error("Failed to process prompt")

  const data = await response.json()
  return data.response
}
