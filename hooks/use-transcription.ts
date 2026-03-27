"use client"

import { useState, useCallback } from "react"

export interface TranscriptionOptions {
  model?: "tiny" | "base" | "small" | "medium" | "large"
  language?: string
  translate?: boolean
}

export interface TranscriptionResult {
  text: string
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
  language?: string
  model?: string
}

export interface WhisperStatus {
  available: boolean
  models: string[]
  whisperPath: string
}

export function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState<string>()
  const [error, setError] = useState<string>()
  const [progress, setProgress] = useState(0)

  const transcribe = useCallback(
    async (
      audioFile: File,
      options: TranscriptionOptions = {}
    ): Promise<TranscriptionResult | null> => {
      setIsTranscribing(true)
      setError(undefined)
      setProgress(0)

      try {
        const formData = new FormData()
        formData.append("audio", audioFile)
        
        if (options.model) {
          formData.append("model", options.model)
        }
        
        if (options.language) {
          formData.append("language", options.language)
        }
        
        if (options.translate) {
          formData.append("translate", "true")
        }

        setProgress(30)

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        })

        setProgress(70)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Transcription failed")
        }

        const data = await response.json()
        setProgress(100)

        if (data.success) {
          setTranscription(data.transcription)
          return {
            text: data.transcription,
            segments: data.segments,
            language: data.language,
            model: data.model,
          }
        } else {
          throw new Error(data.error || "Unknown error")
        }
      } catch (err: any) {
        console.error("Transcription error:", err)
        setError(err.message)
        return null
      } finally {
        setIsTranscribing(false)
      }
    },
    []
  )

  const checkStatus = useCallback(async (): Promise<WhisperStatus | null> => {
    try {
      const response = await fetch("/api/transcribe/status")
      
      if (!response.ok) {
        throw new Error("Failed to check Whisper status")
      }

      const data = await response.json()
      
      if (data.success) {
        return data.whisper
      } else {
        throw new Error(data.error || "Unknown error")
      }
    } catch (err: any) {
      console.error("Status check error:", err)
      setError(err.message)
      return null
    }
  }, [])

  const clearTranscription = useCallback(() => {
    setTranscription(undefined)
    setError(undefined)
    setProgress(0)
  }, [])

  return {
    transcribe,
    checkStatus,
    clearTranscription,
    isTranscribing,
    transcription,
    error,
    progress,
  }
}
