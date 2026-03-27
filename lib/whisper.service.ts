import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs/promises"

const execAsync = promisify(exec)

const WHISPER_PATH = path.join(process.cwd(), "whisper.cpp")
const WHISPER_MAIN = path.join(WHISPER_PATH, "main.exe") // Windows executable
const MODELS_PATH = path.join(WHISPER_PATH, "models")

export interface TranscriptionOptions {
  model?: "tiny" | "base" | "small" | "medium" | "large"
  language?: string // e.g., "en", "es", "fr", etc.
  translate?: boolean // Translate to English
  maxLen?: number // Max segment length
  threads?: number // Number of threads
}

export interface TranscriptionResult {
  text: string
  segments?: TranscriptionSegment[]
  language?: string
  duration?: number
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
}

/**
 * Check if Whisper.cpp is available and built
 */
export async function checkWhisperAvailable(): Promise<boolean> {
  try {
    // Check if main executable exists
    await fs.access(WHISPER_MAIN)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a specific model is downloaded
 */
export async function checkModelAvailable(model: string = "base"): Promise<boolean> {
  try {
    const modelPath = path.join(MODELS_PATH, `ggml-${model}.en.bin`)
    await fs.access(modelPath)
    return true
  } catch {
    // Try without .en suffix
    try {
      const modelPath = path.join(MODELS_PATH, `ggml-${model}.bin`)
      await fs.access(modelPath)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Get available models
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const files = await fs.readdir(MODELS_PATH)
    return files
      .filter((file) => file.startsWith("ggml-") && file.endsWith(".bin"))
      .map((file) => file.replace("ggml-", "").replace(".bin", "").replace(".en", ""))
  } catch {
    return []
  }
}

/**
 * Transcribe audio file using Whisper.cpp
 */
export async function transcribeAudio(
  audioPath: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const {
    model = "base",
    language = "en",
    translate = false,
    maxLen = 0,
    threads = 4,
  } = options

  // Check if Whisper is available
  const isAvailable = await checkWhisperAvailable()
  if (!isAvailable) {
    throw new Error(
      "Whisper.cpp not found. Please build whisper.cpp first:\n" +
        "cd whisper.cpp && mkdir build && cd build && cmake .. && cmake --build . --config Release"
    )
  }

  // Check if model is available
  const modelAvailable = await checkModelAvailable(model)
  if (!modelAvailable) {
    throw new Error(
      `Model '${model}' not found. Please download it first:\n` +
        `cd whisper.cpp && bash ./models/download-ggml-model.sh ${model}.en`
    )
  }

  // Check if audio file exists
  try {
    await fs.access(audioPath)
  } catch {
    throw new Error(`Audio file not found: ${audioPath}`)
  }

  // Determine model path (try .en first, then regular)
  let modelPath = path.join(MODELS_PATH, `ggml-${model}.en.bin`)
  try {
    await fs.access(modelPath)
  } catch {
    modelPath = path.join(MODELS_PATH, `ggml-${model}.bin`)
  }

  // Build command
  const args = [
    `-m "${modelPath}"`,
    `-f "${audioPath}"`,
    `-l ${language}`,
    `-t ${threads}`,
    `--output-txt`, // Output as text
    `--output-json`, // Also output JSON for segments
  ]

  if (translate) {
    args.push("--translate")
  }

  if (maxLen > 0) {
    args.push(`--max-len ${maxLen}`)
  }

  const command = `"${WHISPER_MAIN}" ${args.join(" ")}`

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: WHISPER_PATH,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    })

    // Parse output
    const outputDir = path.dirname(audioPath)
    const baseName = path.basename(audioPath, path.extname(audioPath))
    const txtPath = path.join(outputDir, `${baseName}.txt`)
    const jsonPath = path.join(outputDir, `${baseName}.json`)

    let text = ""
    let segments: TranscriptionSegment[] = []

    // Read text file
    try {
      text = await fs.readFile(txtPath, "utf-8")
      text = text.trim()
    } catch {
      // Fallback to stdout
      text = stdout.trim()
    }

    // Read JSON file for segments
    try {
      const jsonData = await fs.readFile(jsonPath, "utf-8")
      const parsed = JSON.parse(jsonData)
      segments = parsed.transcription || []
    } catch {
      // No segments available
    }

    return {
      text,
      segments,
      language,
    }
  } catch (error: any) {
    throw new Error(`Whisper transcription failed: ${error.message}`)
  }
}

/**
 * Transcribe audio from buffer (in-memory)
 */
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  filename: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  // Create temporary file
  const tmpDir = path.join(process.cwd(), "tmp")
  await fs.mkdir(tmpDir, { recursive: true })

  const tmpPath = path.join(tmpDir, filename)
  await fs.writeFile(tmpPath, audioBuffer)

  try {
    const result = await transcribeAudio(tmpPath, options)
    return result
  } finally {
    // Clean up temporary file
    try {
      await fs.unlink(tmpPath)
      // Also clean up output files
      const baseName = path.basename(tmpPath, path.extname(tmpPath))
      await fs.unlink(path.join(tmpDir, `${baseName}.txt`)).catch(() => {})
      await fs.unlink(path.join(tmpDir, `${baseName}.json`)).catch(() => {})
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get Whisper status and available models
 */
export async function getWhisperStatus(): Promise<{
  available: boolean
  models: string[]
  whisperPath: string
}> {
  const available = await checkWhisperAvailable()
  const models = await getAvailableModels()

  return {
    available,
    models,
    whisperPath: WHISPER_PATH,
  }
}
