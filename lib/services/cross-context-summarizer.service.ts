/**
 * Cross-Context Summarization Service
 * Combines content from multiple sources and generates comprehensive summaries
 */

import type { CollectedContext, ContextSummary } from "./context-collector.service"

export interface ComprehensiveSummary {
  title: string
  description: string
  summary: string
  agenda: string[]
  keyPoints: string[]
  actionItems: Array<{
    action: string
    owner?: string
    dueDate?: string
    priority?: "high" | "medium" | "low"
  }>
  decisions: Array<{
    decision: string
    rationale?: string
    owner?: string
  }>
  sources: string[]
  metadata: {
    totalSources: number
    contentTypes: string[]
    generatedAt: string
    wordCount: number
  }
}

/**
 * Generate comprehensive summary from collected contexts
 */
export async function generateCrossContextSummary(
  contextData: ContextSummary,
  voiceTranscript?: string
): Promise<ComprehensiveSummary> {
  // Combine written and spoken content
  let fullContent = contextData.combinedContent

  if (voiceTranscript) {
    fullContent = `[VOICE TRANSCRIPT]\n${voiceTranscript}\n\n---\n\n${fullContent}`
  }

  // Generate different aspects in parallel for speed
  const [title, description, summary, agenda, keyPoints, actionItems, decisions] =
    await Promise.all([
      generateTitle(fullContent, contextData),
      generateDescription(fullContent, contextData),
      generateSummary(fullContent, contextData),
      generateAgenda(fullContent, contextData),
      extractKeyPoints(fullContent, contextData),
      extractActionItems(fullContent, contextData),
      extractDecisions(fullContent, contextData),
    ])

  const wordCount = fullContent.split(/\s+/).length

  return {
    title,
    description,
    summary,
    agenda,
    keyPoints,
    actionItems,
    decisions,
    sources: contextData.contexts.map((c) => c.title),
    metadata: {
      totalSources: contextData.totalSources,
      contentTypes: contextData.detectedTypes,
      generatedAt: new Date().toISOString(),
      wordCount,
    },
  }
}

/**
 * Generate title from context
 */
async function generateTitle(
  content: string,
  contextData: ContextSummary
): Promise<string> {
  try {
    const response = await fetch("/api/ai/generate-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: content.substring(0, 3000),
        contexts: contextData.detectedTypes,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.title || "Context Summary"
    }
  } catch (error) {
    console.error("[Cross-Context] Title generation failed:", error)
  }

  // Fallback: Use first context title or generate from content
  return contextData.contexts[0]?.title || "Multi-Context Summary"
}

/**
 * Generate description from context
 */
async function generateDescription(
  content: string,
  contextData: ContextSummary
): Promise<string> {
  try {
    const response = await fetch("/api/ai/generate-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: content.substring(0, 3000),
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.description || `Summary of ${contextData.totalSources} sources`
    }
  } catch (error) {
    console.error("[Cross-Context] Description generation failed:", error)
  }

  return `Comprehensive summary combining ${contextData.totalSources} sources: ${contextData.detectedTypes.join(", ")}`
}

/**
 * Generate summary from context
 */
async function generateSummary(
  content: string,
  contextData: ContextSummary
): Promise<string> {
  try {
    const response = await fetch("/api/ai/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.substring(0, 5000),
        contextType: "general",
        sources: contextData.totalSources,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.summary || "Unable to generate summary"
    }
  } catch (error) {
    console.error("[Cross-Context] Summary generation failed:", error)
  }

  // Fallback summary
  return `This summary combines content from ${contextData.totalSources} sources including ${contextData.detectedTypes.join(", ")}.`
}

/**
 * Generate agenda from context
 */
async function generateAgenda(
  content: string,
  contextData: ContextSummary
): Promise<string[]> {
  try {
    const response = await fetch("/api/ai/generate-agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Context Analysis",
        content: content.substring(0, 4000),
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data.agenda)) {
        return data.agenda
      }
      // Parse agenda from string response
      if (typeof data.agenda === "string") {
        return data.agenda
          .split("\n")
          .filter((line: string) => line.trim())
          .map((line: string) => line.replace(/^\d+\.\s*/, "").trim())
      }
    }
  } catch (error) {
    console.error("[Cross-Context] Agenda generation failed:", error)
  }

  // Fallback: Generate simple agenda from context types
  return contextData.detectedTypes.map(
    (type) => `Review ${type} content`
  )
}

/**
 * Extract key points from context
 */
async function extractKeyPoints(
  content: string,
  contextData: ContextSummary
): Promise<string[]> {
  try {
    const response = await fetch("/api/ai/extract-key-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.substring(0, 5000),
        maxPoints: 7,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data.keyPoints)) {
        return data.keyPoints
      }
    }
  } catch (error) {
    console.error("[Cross-Context] Key points extraction failed:", error)
  }

  // Fallback: Extract first sentences from each context
  return contextData.contexts
    .slice(0, 5)
    .map((ctx) => {
      const firstSentence = ctx.content.split(/[.!?]/)[0]
      return firstSentence ? firstSentence.trim() : ctx.title
    })
    .filter((point) => point.length > 10)
}

/**
 * Extract action items from context
 */
async function extractActionItems(
  content: string,
  contextData: ContextSummary
): Promise<ComprehensiveSummary["actionItems"]> {
  try {
    const response = await fetch("/api/ai/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.substring(0, 5000),
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data.followUps)) {
        return data.followUps.map((item: any) => ({
          action: item.action || item,
          owner: item.owner,
          dueDate: item.dueDate,
          priority: item.priority || "medium",
        }))
      }
    }
  } catch (error) {
    console.error("[Cross-Context] Action items extraction failed:", error)
  }

  return []
}

/**
 * Extract decisions from context
 */
async function extractDecisions(
  content: string,
  contextData: ContextSummary
): Promise<ComprehensiveSummary["decisions"]> {
  try {
    const response = await fetch("/api/ai/extract-decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.substring(0, 5000),
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data.decisions)) {
        return data.decisions.map((item: any) => ({
          decision: item.decision || item,
          rationale: item.rationale,
          owner: item.owner,
        }))
      }
    }
  } catch (error) {
    console.error("[Cross-Context] Decisions extraction failed:", error)
  }

  return []
}

/**
 * Export summary as PDF
 */
export async function exportSummaryAsPDF(
  summary: ComprehensiveSummary
): Promise<Blob | null> {
  try {
    const response = await fetch("/api/ai/export-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(summary),
    })

    if (response.ok) {
      return await response.blob()
    }
  } catch (error) {
    console.error("[Cross-Context] PDF export failed:", error)
  }

  return null
}

/**
 * Save summary to database
 */
export async function saveSummaryToDatabase(
  summary: ComprehensiveSummary,
  userId: string = "demo-user",
  organizationId: string = "demo-org"
): Promise<string | null> {
  try {
    const response = await fetch("/api/summaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...summary,
        userId,
        organizationId,
        type: "cross-context",
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.summaryId || data.id
    }
  } catch (error) {
    console.error("[Cross-Context] Database save failed:", error)
  }

  return null
}
