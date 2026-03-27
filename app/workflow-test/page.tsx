"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import VoiceRecorder from "@/components/voice/voice-recorder"
import { CheckCircle2, XCircle, FileText, Sparkles, Mic } from "lucide-react"

export default function WorkflowTestPage() {
  const [testResults, setTestResults] = useState<any[]>([])

  const handleRecordingComplete = (result: any) => {
    setTestResults((prev) => [
      {
        timestamp: new Date().toISOString(),
        success: true,
        data: result,
      },
      ...prev,
    ])
  }

  const handleRecordingError = (error: string) => {
    setTestResults((prev) => [
      {
        timestamp: new Date().toISOString(),
        success: false,
        error,
      },
      ...prev,
    ])
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Sparkles className="w-10 h-10 text-accent" />
            Meeting Workflow Test Suite
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Complete end-to-end testing of the meeting workflow: Voice Recording → Transcription →
            Series Detection → AI Analysis → PDF Generation → Database Save
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="recorder" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="recorder">
              <Mic className="w-4 h-4 mr-2" />
              Recorder
            </TabsTrigger>
            <TabsTrigger value="results">
              <FileText className="w-4 h-4 mr-2" />
              Results
            </TabsTrigger>
            <TabsTrigger value="status">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Status
            </TabsTrigger>
          </TabsList>

          {/* Voice Recorder Tab */}
          <TabsContent value="recorder" className="space-y-6 mt-8">
            <VoiceRecorder
              onComplete={handleRecordingComplete}
              onError={handleRecordingError}
            />
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6 mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Test Results ({testResults.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No test results yet. Start recording to see results here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testResults.map((result, index) => (
                      <Card key={index} className="bg-muted/50">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                              {result.success ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-destructive" />
                              )}
                              <span className="font-medium">
                                {result.success ? "Success" : "Failed"}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(result.timestamp).toLocaleString()}
                            </span>
                          </div>

                          {result.success && result.data && (
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-medium mb-1">Meeting ID:</p>
                                <Badge variant="outline">{result.data.meetingId}</Badge>
                              </div>

                              <div>
                                <p className="text-sm font-medium mb-1">Title:</p>
                                <p className="text-sm">{result.data.analysis.title}</p>
                              </div>

                              <div>
                                <p className="text-sm font-medium mb-1">Series:</p>
                                <Badge variant="secondary">{result.data.seriesName}</Badge>
                              </div>

                              <div>
                                <p className="text-sm font-medium mb-1">Description:</p>
                                <p className="text-sm text-muted-foreground">
                                  {result.data.analysis.description}
                                </p>
                              </div>

                              {result.data.analysis.agenda &&
                                result.data.analysis.agenda.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium mb-1">
                                      Agenda Items: {result.data.analysis.agenda.length}
                                    </p>
                                  </div>
                                )}

                              {result.data.analysis.decisions &&
                                result.data.analysis.decisions.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium mb-1">
                                      Decisions: {result.data.analysis.decisions.length}
                                    </p>
                                  </div>
                                )}

                              {result.data.transcript && (
                                <div>
                                  <p className="text-sm font-medium mb-1">Transcript Preview:</p>
                                  <p className="text-xs text-muted-foreground bg-background p-2 rounded">
                                    {result.data.transcript.substring(0, 200)}...
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {!result.success && (
                            <div className="text-sm text-destructive">
                              <p className="font-medium mb-1">Error:</p>
                              <p>{result.error}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-6 mt-8">
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <StatusCheck
                  name="Whisper Transcription"
                  endpoint="/api/transcribe/status"
                  description="Check if Whisper.cpp is available for audio transcription"
                />
                <StatusCheck
                  name="Ollama AI Service"
                  endpoint="/api/ai/summarize"
                  method="POST"
                  body={{ content: "test", contextType: "meeting" }}
                  description="Check if Ollama is running and accessible"
                />
                <StatusCheck
                  name="Meeting Database"
                  endpoint="/api/meetings"
                  description="Check if meeting database is accessible"
                />
                <StatusCheck
                  name="PDF Generation"
                  endpoint="/api/meetings/generate-pdf"
                  method="POST"
                  body={{ title: "Test", transcript: "test" }}
                  description="Check if PDF generation is working"
                />
                <StatusCheck
                  name="Workflow API"
                  endpoint="/api/workflow/process-meeting"
                  description="Check if the main workflow endpoint is accessible"
                  skipTest={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function StatusCheck({
  name,
  endpoint,
  method = "GET",
  body,
  description,
  skipTest = false,
}: {
  name: string
  endpoint: string
  method?: string
  body?: any
  description: string
  skipTest?: boolean
}) {
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const checkStatus = async () => {
    setStatus("checking")
    setMessage("")

    try {
      const options: RequestInit = {
        method,
      }

      if (body && method === "POST") {
        options.headers = { "Content-Type": "application/json" }
        options.body = JSON.stringify(body)
      }

      const response = await fetch(endpoint, options)

      if (response.ok) {
        setStatus("success")
        setMessage("Service is operational")
      } else {
        setStatus("error")
        setMessage(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error: any) {
      setStatus("error")
      setMessage(error.message || "Service unavailable")
    }
  }

  return (
    <div className="flex items-start justify-between p-4 border rounded-lg">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{name}</h4>
          {status === "success" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
          {status === "error" && <XCircle className="w-4 h-4 text-destructive" />}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        {message && (
          <p className="text-xs text-muted-foreground mt-2">
            <Badge variant={status === "success" ? "default" : "destructive"}>{message}</Badge>
          </p>
        )}
      </div>
      <Button
        size="sm"
        onClick={checkStatus}
        disabled={status === "checking" || skipTest}
        variant={status === "success" ? "default" : "outline"}
      >
        {skipTest ? "N/A" : status === "checking" ? "Checking..." : "Test"}
      </Button>
    </div>
  )
}
