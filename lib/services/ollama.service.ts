/**
 * Ollama AI Service
 * Integrates Llama3 and Mistral models for different AI tasks
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434"

export interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
}

export interface StreamChunk {
  response: string
  done: boolean
}

/**
 * Generate text using Llama3 (best for general tasks, agenda generation)
 */
export async function generateWithLlama3(
  prompt: string,
  options?: {
    temperature?: number
    max_tokens?: number
    stream?: boolean
  }
): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3",
        prompt,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || 2048,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Llama3 request failed: ${response.statusText}`)
    }

    const data: OllamaResponse = await response.json()
    return data.response
  } catch (error) {
    console.error("Llama3 generation error:", error)
    throw error
  }
}

/**
 * Generate text using Mistral (best for structured extraction, decision analysis)
 */
export async function generateWithMistral(
  prompt: string,
  options?: {
    temperature?: number
    max_tokens?: number
    stream?: boolean
  }
): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral",
        prompt,
        temperature: options?.temperature || 0.3, // Lower temperature for structured tasks
        max_tokens: options?.max_tokens || 2048,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Mistral request failed: ${response.statusText}`)
    }

    const data: OllamaResponse = await response.json()
    return data.response
  } catch (error) {
    console.error("Mistral generation error:", error)
    throw error
  }
}

/**
 * Generate meeting agenda using Llama3
 */
export async function generateMeetingAgenda(meetingContext: {
  title: string
  description?: string
  attendees?: string[]
  duration?: number
}): Promise<string> {
  const prompt = `Generate a professional meeting agenda for the following meeting:

Title: ${meetingContext.title}
${meetingContext.description ? `Description: ${meetingContext.description}` : ""}
${meetingContext.attendees ? `Attendees: ${meetingContext.attendees.join(", ")}` : ""}
${meetingContext.duration ? `Duration: ${meetingContext.duration} minutes` : ""}

Create a structured agenda with:
1. Meeting objectives
2. Time-allocated topics
3. Discussion points
4. Expected outcomes
5. Action items placeholder

Format as Markdown.`

  return await generateWithLlama3(prompt, { temperature: 0.8 })
}

/**
 * Extract decisions and action items using Mistral
 */
export async function extractDecisions(meetingTranscript: string): Promise<{
  decisions: string[]
  actionItems: string[]
  keyPoints: string[]
}> {
  const prompt = `Analyze this meeting transcript and extract:
1. Key decisions made
2. Action items assigned
3. Important discussion points

Transcript:
${meetingTranscript}

Respond in JSON format:
{
  "decisions": ["decision 1", "decision 2", ...],
  "actionItems": ["action 1", "action 2", ...],
  "keyPoints": ["point 1", "point 2", ...]
}`

  const response = await generateWithMistral(prompt, { temperature: 0.2 })
  
  try {
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (err) {
    console.error("Failed to parse Mistral response as JSON:", err)
  }

  // Fallback: return empty structure
  return {
    decisions: [],
    actionItems: [],
    keyPoints: []
  }
}

/**
 * Summarize event details using Llama3
 */
export async function summarizeEvent(eventData: {
  title: string
  description: string
  category: string
}): Promise<string> {
  const prompt = `Create a concise, engaging summary for this event:

Title: ${eventData.title}
Category: ${eventData.category}
Description: ${eventData.description}

Write a 2-3 sentence summary that highlights:
- Main purpose/benefit
- Target audience
- Key takeaways

Keep it professional and inviting.`

  return await generateWithLlama3(prompt, { temperature: 0.7 })
}

/**
 * Analyze policy compliance using Mistral
 */
export async function analyzePolicyCompliance(
  policyText: string,
  scenario: string
): Promise<{
  compliant: boolean
  reasoning: string
  recommendations: string[]
}> {
  const prompt = `Analyze if the following scenario complies with this policy:

Policy:
${policyText}

Scenario:
${scenario}

Respond in JSON format:
{
  "compliant": true/false,
  "reasoning": "explanation of compliance status",
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}`

  const response = await generateWithMistral(prompt, { temperature: 0.1 })
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (err) {
    console.error("Failed to parse Mistral response:", err)
  }

  return {
    compliant: false,
    reasoning: "Unable to analyze compliance",
    recommendations: []
  }
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaStatus(): Promise<{
  available: boolean
  models: string[]
}> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
    })

    if (!response.ok) {
      return { available: false, models: [] }
    }

    const data = await response.json()
    return {
      available: true,
      models: data.models?.map((m: any) => m.name) || [],
    }
  } catch (error) {
    return { available: false, models: [] }
  }
}
