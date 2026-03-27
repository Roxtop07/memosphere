"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Mic, Square, Loader2, CheckCircle2, XCircle, FileText, Download } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface VoiceRecorderProps {
  onComplete?: (result: any) => void
  onError?: (error: string) => void
}

export default function VoiceRecorder({ onComplete, onError }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<
    "idle" | "recording" | "transcribing" | "analyzing" | "complete"
  >("idle")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/wav" })
        await processRecording(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(1000) // Capture in 1 second chunks
      setIsRecording(true)
      setStep("recording")
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err: any) {
      const errorMsg = "Failed to access microphone: " + err.message
      setError(errorMsg)
      onError?.(errorMsg)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const processRecording = async (audioBlob: Blob) => {
    setIsProcessing(true)
    setError(null)

    try {
      // Step 1: Transcription
      setStep("transcribing")
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.wav")
      formData.append("userId", "demo-user")
      formData.append("organizationId", "demo-org")

      // Call the workflow API
      const response = await fetch("/api/workflow/process-meeting", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Workflow processing failed")
      }

      setStep("analyzing")
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Processing failed")
      }

      setStep("complete")
      setResult(data)
      onComplete?.(data)
    } catch (err: any) {
      console.error("Processing error:", err)
      const errorMsg = err.message || "Failed to process recording"
      setError(errorMsg)
      setStep("idle")
      onError?.(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const downloadPDF = () => {
    if (result?.pdfUrl) {
      window.open(result.pdfUrl, "_blank")
    }
  }

  const reset = () => {
    setStep("idle")
    setResult(null)
    setError(null)
    setRecordingTime(0)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice Meeting Recorder
          </CardTitle>
          <Badge
            variant={
              step === "recording"
                ? "destructive"
                : step === "complete"
                  ? "default"
                  : "secondary"
            }
          >
            {step === "idle" && "Ready"}
            {step === "recording" && "Recording"}
            {step === "transcribing" && "Transcribing"}
            {step === "analyzing" && "Analyzing"}
            {step === "complete" && "Complete"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Recording Controls */}
        <div className="flex flex-col items-center gap-4">
          {step === "idle" && (
            <Button
              size="lg"
              onClick={startRecording}
              className="w-32 h-32 rounded-full"
              disabled={isProcessing}
            >
              <Mic className="w-12 h-12" />
            </Button>
          )}

          {step === "recording" && (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <Button
                size="lg"
                onClick={stopRecording}
                variant="destructive"
                className="w-32 h-32 rounded-full animate-pulse"
              >
                <Square className="w-12 h-12" />
              </Button>
              <div className="text-2xl font-mono font-bold">{formatTime(recordingTime)}</div>
            </motion.div>
          )}

          {(step === "transcribing" || step === "analyzing") && (
            <div className="flex flex-col items-center gap-4 w-full">
              <Loader2 className="w-16 h-16 animate-spin text-accent" />
              <div className="text-center space-y-2 w-full">
                <p className="font-medium">
                  {step === "transcribing" && "Transcribing audio..."}
                  {step === "analyzing" && "Analyzing meeting content..."}
                </p>
                <Progress value={step === "transcribing" ? 33 : 66} className="w-full" />
              </div>
            </div>
          )}

          {step === "complete" && result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-4"
            >
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle2 className="w-8 h-8" />
                <span className="text-lg font-semibold">Meeting Processed Successfully!</span>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{result.analysis.title}</h3>
                    <p className="text-sm text-muted-foreground">{result.analysis.description}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-1">Series:</h4>
                    <Badge variant="outline">{result.seriesName}</Badge>
                  </div>

                  {result.analysis.summary && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Summary:</h4>
                      <p className="text-sm">{result.analysis.summary}</p>
                    </div>
                  )}

                  {result.analysis.agenda && result.analysis.agenda.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Agenda:</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {result.analysis.agenda.slice(0, 3).map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.analysis.decisions && result.analysis.decisions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">
                        Decisions: {result.analysis.decisions.length}
                      </h4>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button onClick={downloadPDF} variant="default" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button onClick={reset} variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      New Recording
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
          >
            <XCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        {step === "idle" && !error && (
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>Click the microphone to start recording your meeting</p>
            <p className="text-xs">
              The system will automatically:
              <br />
              • Transcribe your speech
              <br />
              • Detect meeting series
              <br />
              • Generate summary, agenda, discussions, and decisions
              <br />
              • Create a formatted PDF
              <br />• Save to database
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
