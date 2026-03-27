"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Mic, 
  MicOff, 
  Upload, 
  Download, 
  Play, 
  Pause, 
  StopCircle,
  FileAudio,
  Zap,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"

interface AudioTranscriberProps {
  onTranscriptReady?: (transcript: string) => void
  autoProcess?: boolean
}

interface TranscriptionResult {
  text: string
  source: 'faster-whisper' | 'whisper-local' | 'openai'
  confidence?: number
  processingTime?: number
}

export default function AudioTranscriber({ onTranscriptReady, autoProcess = true }: AudioTranscriberProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptionResult | null>(null)
  const [progress, setProgress] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      })
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        
        // Create File object
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
        setAudioFile(file)
        
        stream.getTracks().forEach(track => track.stop())
        
        if (autoProcess) {
          transcribeAudio(file)
        }
      }

      mediaRecorder.start(1000) // Record in 1-second chunks
      setIsRecording(true)
      toast.success('Recording started with noise suppression')
    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error('Failed to start recording. Please check microphone permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      toast.success('Recording stopped')
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file type
      const validTypes = ['audio/wav', 'audio/mp3', 'audio/m4a', 'audio/webm', 'audio/ogg']
      if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
        toast.error('Please upload a valid audio file (WAV, MP3, M4A, WebM, OGG)')
        return
      }
      
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size too large. Please upload files smaller than 50MB.')
        return
      }

      const url = URL.createObjectURL(file)
      setAudioFile(file)
      setAudioUrl(url)
      toast.success(`Audio file loaded: ${file.name}`)
      
      if (autoProcess) {
        transcribeAudio(file)
      }
    }
  }

  const transcribeAudio = async (file: File) => {
    if (!file) return

    setIsProcessing(true)
    setProgress(0)
    setTranscript(null)

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + Math.random() * 15
      })
    }, 500)

    try {
      const startTime = Date.now()
      const formData = new FormData()
      formData.append('audio', file)

      const response = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Transcription failed: ${error}`)
      }

      const result = await response.json()
      const processingTime = Date.now() - startTime

      const transcriptionResult: TranscriptionResult = {
        text: result.text,
        source: result.source,
        processingTime
      }

      setTranscript(transcriptionResult)
      
      if (onTranscriptReady) {
        onTranscriptReady(result.text)
      }

      // Success message based on source
      const sourceMessages: Record<string, string> = {
        'faster-whisper': '🚀 Transcribed with Faster-Whisper (Local AI)',
        'whisper-local': '🔧 Transcribed with Local Whisper Service', 
        'openai': '☁️ Transcribed with OpenAI Whisper'
      }
      
      toast.success(sourceMessages[result.source] || 'Transcription completed')
      
    } catch (error) {
      console.error('Transcription error:', error)
      toast.error('Transcription failed. Please try again.')
      setTranscript(null)
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const downloadTranscript = () => {
    if (!transcript) return
    
    const content = `Memosphere Audio Transcript
Generated: ${new Date().toLocaleString()}
Source: ${transcript.source}
${transcript.processingTime ? `Processing Time: ${transcript.processingTime}ms` : ''}

Transcript:
${transcript.text}
`
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript_${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Audio Transcriber
          <Badge variant="secondary" className="ml-2">
            <Zap className="w-3 h-3 mr-1" />
            Faster-Whisper Enabled
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Recording Controls */}
        <div className="flex gap-4 items-center">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            disabled={isProcessing}
          >
            {isRecording ? <MicOff className="w-5 h-5 mr-2" /> : <Mic className="w-5 h-5 mr-2" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            disabled={isProcessing || isRecording}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Audio
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.m4a,.webm,.ogg,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={playAudio}
                variant="outline"
                size="icon"
                disabled={isProcessing}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <div className="flex-1">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full"
                  controls
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileAudio className="w-4 h-4" />
                {audioFile?.name || 'Recording'}
              </div>
            </div>
          </Card>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm font-medium">Processing with Faster-Whisper...</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Using local AI model for fast, private transcription
              </p>
            </div>
          </Card>
        )}

        {/* Transcript Results */}
        {transcript && (
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Transcription Complete</span>
                  <Badge variant="outline">
                    {transcript.source === 'faster-whisper' && '🚀 Faster-Whisper'}
                    {transcript.source === 'whisper-local' && '🔧 Local Whisper'}
                    {transcript.source === 'openai' && '☁️ OpenAI'}
                  </Badge>
                </div>
                <Button
                  onClick={downloadTranscript}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              
              {transcript.processingTime && (
                <p className="text-sm text-muted-foreground">
                  Processed in {(transcript.processingTime / 1000).toFixed(2)} seconds
                </p>
              )}
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-mono whitespace-pre-wrap">
                  {transcript.text}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Help Text */}
        <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-blue-800">
            <p className="font-medium mb-1">Audio Transcription Features:</p>
            <ul className="space-y-1 text-xs">
              <li>• Uses Faster-Whisper for local, private AI transcription</li>
              <li>• Supports WAV, MP3, M4A, WebM, and OGG formats</li>
              <li>• Automatic noise suppression during recording</li>
              <li>• Fallback to cloud services if local AI is unavailable</li>
              <li>• Maximum file size: 50MB</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}