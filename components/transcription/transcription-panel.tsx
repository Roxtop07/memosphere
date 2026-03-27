"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useTranscription } from "@/hooks/use-transcription"
import { Mic, Upload, FileAudio, Copy, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export default function TranscriptionPanel() {
  const {
    transcribe,
    checkStatus,
    clearTranscription,
    isTranscribing,
    transcription,
    error,
    progress,
  } = useTranscription()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [model, setModel] = useState<"tiny" | "base" | "small" | "medium" | "large">("base")
  const [language, setLanguage] = useState("en")
  const [translate, setTranslate] = useState(false)
  const [whisperAvailable, setWhisperAvailable] = useState<boolean | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check Whisper status on mount
  useEffect(() => {
    checkStatus().then((status) => {
      if (status) {
        setWhisperAvailable(status.available)
        setAvailableModels(status.models)
      }
    })
  }, [checkStatus])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      clearTranscription()
    }
  }

  const handleTranscribe = async () => {
    if (!selectedFile) return

    await transcribe(selectedFile, {
      model,
      language,
      translate,
    })
  }

  const handleCopy = () => {
    if (transcription) {
      navigator.clipboard.writeText(transcription)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    clearTranscription()
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Audio Transcription (Whisper.cpp)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Whisper Status */}
        {whisperAvailable === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Whisper.cpp is not available. Please build it first:
              <code className="block mt-2 p-2 bg-muted rounded text-xs">
                cd whisper.cpp && mkdir build && cd build && cmake .. && cmake --build . --config Release
              </code>
            </AlertDescription>
          </Alert>
        )}

        {whisperAvailable && availableModels.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No models found. Please download a model first:
              <code className="block mt-2 p-2 bg-muted rounded text-xs">
                cd whisper.cpp && bash ./models/download-ggml-model.sh base.en
              </code>
            </AlertDescription>
          </Alert>
        )}

        {whisperAvailable && availableModels.length > 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Whisper.cpp is ready! Available models: {availableModels.join(", ")}
            </AlertDescription>
          </Alert>
        )}

        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="audio-file">Audio File</Label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              id="audio-file"
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="mr-2 h-4 w-4" />
              Choose Audio File
            </Button>
          </div>
          {selectedFile && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <FileAudio className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">{selectedFile.name}</span>
              <Badge variant="secondary">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Badge>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={(v: any) => setModel(v)}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiny">Tiny (fastest, 75MB)</SelectItem>
                <SelectItem value="base">Base (balanced, 142MB)</SelectItem>
                <SelectItem value="small">Small (better, 466MB)</SelectItem>
                <SelectItem value="medium">Medium (great, 1.5GB)</SelectItem>
                <SelectItem value="large">Large (best, 2.9GB)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="nl">Dutch</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="auto">Auto Detect</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Translate Option */}
        <div className="flex items-center space-x-2">
          <Switch id="translate" checked={translate} onCheckedChange={setTranslate} />
          <Label htmlFor="translate" className="cursor-pointer">
            Translate to English
          </Label>
        </div>

        {/* Transcribe Button */}
        <Button
          onClick={handleTranscribe}
          disabled={!selectedFile || isTranscribing || !whisperAvailable}
          className="w-full"
          size="lg"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Transcribing... {progress}%
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" />
              Transcribe Audio
            </>
          )}
        </Button>

        {/* Progress */}
        {isTranscribing && (
          <Progress value={progress} className="w-full" />
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Transcription Result */}
        {transcription && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Transcription</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="mr-2 h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  New Transcription
                </Button>
              </div>
            </div>
            <Textarea
              value={transcription}
              readOnly
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
