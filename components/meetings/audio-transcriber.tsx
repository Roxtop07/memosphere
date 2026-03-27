"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Mic, FileAudio, Download, Loader2 } from "lucide-react"

interface TranscriptionResult {
  transcript: string
  language: string
  duration: number
  wordCount: number
  confidence: number | null
  source: string
  timestamp: string
}

export default function AudioTranscriber() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<TranscriptionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState("auto")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const languages = [
    { code: "auto", name: "Auto-detect" },
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese" },
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('audio', file)
      if (language !== 'auto') {
        formData.append('language', language)
      }

      // Simulate progress (since we can't track real upload progress easily)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const transcriptionResult = await response.json()
      setResult(transcriptionResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  const downloadTranscript = () => {
    if (!result) return
    
    const blob = new Blob([result.transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Audio Transcription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.webm,.mp4,.mpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {file ? file.name : 'Select Audio File'}
            </Button>
          </div>

          {/* Language Selection */}
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">Language:</label>
            <Select value={language} onValueChange={setLanguage} disabled={isUploading}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Info */}
          {file && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <FileAudio className="w-4 h-4" />
                <span>{file.name}</span>
                <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Transcribing audio... {progress}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Transcribing...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Start Transcription
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-destructive text-sm font-medium">Error: {error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcription Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transcription Result</span>
              <Button variant="outline" size="sm" onClick={downloadTranscript}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Language:</span>
                <p className="font-medium">{result.language.toUpperCase()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <p className="font-medium">{formatDuration(result.duration)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Words:</span>
                <p className="font-medium">{result.wordCount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Confidence:</span>
                <p className="font-medium">
                  {result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Transcript Text */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Transcript:</label>
              <Textarea
                value={result.transcript}
                readOnly
                className="mt-1 min-h-32"
                placeholder="Transcription will appear here..."
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Generate agenda from this transcript
                  // This would call the agenda generation API
                }}
              >
                Generate Agenda
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Extract decisions from this transcript
                  // This would call the decisions extraction API
                }}
              >
                Extract Decisions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Generate PDF from this transcript
                  // This would call the PDF generation API
                }}
              >
                Export PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}