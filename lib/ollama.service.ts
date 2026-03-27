const OLLAMA_BASE_URL = "http://localhost:11434"

export interface GenerateOptions {
  model: string
  prompt: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface GenerateResponse {
  response: string
  done: boolean
}

/**
 * Generate text using Llama3 model
 */
export async function generateWithLlama3(
  prompt: string,
  options: {
    temperature?: number
    max_tokens?: number
  } = {}
): Promise<string> {
  const { temperature = 0.4, max_tokens = 1500 } = options

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3",
      prompt,
      temperature,
      max_tokens,
      stream: false,
      options: {
        num_predict: max_tokens,
        temperature,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`)
  }

  const data: GenerateResponse = await response.json()
  return data.response
}

/**
 * Generate text using Mistral model (better for structured extraction)
 */
export async function generateWithMistral(
  prompt: string,
  options: {
    temperature?: number
    max_tokens?: number
  } = {}
): Promise<string> {
  const { temperature = 0.3, max_tokens = 1500 } = options

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral",
      prompt,
      temperature,
      max_tokens,
      stream: false,
      options: {
        num_predict: max_tokens,
        temperature,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`)
  }

  const data: GenerateResponse = await response.json()
  return data.response
}

/**
 * Check if Ollama is running and models are available
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    return response.ok
  } catch {
    return false
  }
}
