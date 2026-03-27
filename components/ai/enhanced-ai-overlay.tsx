"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sparkles,
  X,
  Loader2,
  FileText,
  Mic,
  Download,
  Database,
  Eye,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import {
  collectActiveContext,
  setupContextMonitoring,
  type ContextSummary,
} from "@/lib/services/context-collector.service"
import {
  generateCrossContextSummary,
  exportSummaryAsPDF,
  saveSummaryToDatabase,
  type ComprehensiveSummary,
} from "@/lib/services/cross-context-summarizer.service"

interface EnhancedAIOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export default function EnhancedAIOverlay({ isOpen, onClose }: EnhancedAIOverlayProps) {
  const [contextData, setContextData] = useState<ContextSummary | null>(null)
  const [summary, setSummary] = useState<ComprehensiveSummary | null>(null)
  const [isCollecting, setIsCollecting] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null)
  const [autoDetect, setAutoDetect] = useState(true)
  const [progress, setProgress] = useState(0)
  const [savedId, setSavedId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Auto-collect context when overlay opens
  useEffect(() => {
    if (isOpen && autoDetect) {
      handleCollectContext()
    }
  }, [isOpen, autoDetect])

  // Setup context monitoring
  useEffect(() => {
    if (!autoDetect) return

    const cleanup = setupContextMonitoring((newContext) => {
      console.log("[AI Overlay] Context changed:", newContext.totalSources, "sources")
      setContextData(newContext)
    })

    return cleanup
  }, [autoDetect])

  // Keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        handleCollectContext()
      }

      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  const handleCollectContext = async () => {
    setIsCollecting(true)
    setProgress(10)

    try {
      const context = await collectActiveContext()
      setContextData(context)
      setProgress(100)

      // Auto-summarize if we have content
      if (context.totalSources > 0) {
        setTimeout(() => handleGenerateSummary(context), 500)
      }
    } catch (error) {
      console.error("[AI Overlay] Context collection failed:", error)
    } finally {
      setIsCollecting(false)
    }
  }

  const handleGenerateSummary = async (context?: ContextSummary) => {
    const contextToUse = context || contextData
    if (!contextToUse) return

    setIsSummarizing(true)
    setProgress(0)

    try {
      setProgress(20)
      const generated = await generateCrossContextSummary(contextToUse, voiceTranscript || undefined)
      setProgress(80)
      setSummary(generated)
      setProgress(100)
    } catch (error) {
      console.error("[AI Overlay] Summarization failed:", error)
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)

      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/wav" })
        await transcribeAudio(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      mediaRecorderRef.current = mediaRecorder
    } catch (error) {
      console.error("[AI Overlay] Recording failed:", error)
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.wav")

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setVoiceTranscript(data.transcription)

        // Re-generate summary with voice transcript
        if (contextData) {
          handleGenerateSummary(contextData)
        }
      }
    } catch (error) {
      console.error("[AI Overlay] Transcription failed:", error)
    }
  }

  const handleExportPDF = async () => {
    if (!summary) return

    try {
      const pdfBlob = await exportSummaryAsPDF(summary)
      if (pdfBlob) {
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${summary.title.replace(/\s+/g, "_")}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("[AI Overlay] PDF export failed:", error)
    }
  }

  const handleSaveToDatabase = async () => {
    if (!summary) return

    try {
      const id = await saveSummaryToDatabase(summary)
      if (id) {
        setSavedId(id)
      }
    } catch (error) {
      console.error("[AI Overlay] Database save failed:", error)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-100"
            onClick={onClose}
          />

          {/* Overlay Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[5%] left-1/2 -translate-x-1/2 w-full max-w-5xl z-101 px-4 max-h-[90vh] overflow-auto"
          >
            <Card className="border-accent/50 shadow-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-accent" />
                    <div>
                      <h2 className="text-xl font-bold">AI Context Analyzer</h2>
                      <p className="text-sm text-muted-foreground">
                        Automatically detects and summarizes all visible content
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAutoDetect(!autoDetect)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {autoDetect ? "Auto" : "Manual"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {contextData && (
                    <>
                      <Badge variant="secondary">
                        {contextData.totalSources} Sources
                      </Badge>
                      {contextData.detectedTypes.map((type) => (
                        <Badge key={type} variant="outline">
                          {type}
                        </Badge>
                      ))}
                    </>
                  )}
                  {voiceTranscript && (
                    <Badge variant="default">
                      <Mic className="w-3 h-3 mr-1" />
                      Voice Added
                    </Badge>
                  )}
                </div>

                {/* Progress Bar */}
                {(isCollecting || isSummarizing) && (
                  <Progress value={progress} className="mt-3" />
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleCollectContext}
                    disabled={isCollecting || isSummarizing}
                    variant="outline"
                  >
                    {isCollecting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Collect Context
                  </Button>

                  <Button
                    onClick={() => handleGenerateSummary()}
                    disabled={!contextData || isSummarizing}
                    variant="default"
                  >
                    {isSummarizing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Summary
                  </Button>

                  <Button
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    variant={isRecording ? "destructive" : "outline"}
                  >
                    <Mic className={`w-4 h-4 mr-2 ${isRecording ? "animate-pulse" : ""}`} />
                    {isRecording ? "Stop Recording" : "Add Voice"}
                  </Button>

                  {summary && (
                    <>
                      <Button onClick={handleExportPDF} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>

                      <Button
                        onClick={handleSaveToDatabase}
                        variant="outline"
                        disabled={!!savedId}
                      >
                        {savedId ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4 mr-2" />
                            Save to DB
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>

                {/* Content Tabs */}
                <Tabs defaultValue="summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="sources">Sources</TabsTrigger>
                  </TabsList>

                  {/* Summary Tab */}
                  <TabsContent value="summary" className="space-y-4 mt-4">
                    {summary ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-2xl font-bold mb-2">{summary.title}</h3>
                          <p className="text-muted-foreground">{summary.description}</p>
                        </div>

                        <Card className="bg-muted/50">
                          <CardHeader>
                            <h4 className="font-semibold">Executive Summary</h4>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{summary.summary}</p>
                          </CardContent>
                        </Card>

                        {summary.agenda.length > 0 && (
                          <Card className="bg-muted/50">
                            <CardHeader>
                              <h4 className="font-semibold">Agenda</h4>
                            </CardHeader>
                            <CardContent>
                              <ol className="list-decimal list-inside space-y-1">
                                {summary.agenda.map((item, i) => (
                                  <li key={i} className="text-sm">
                                    {item}
                                  </li>
                                ))}
                              </ol>
                            </CardContent>
                          </Card>
                        )}

                        {summary.keyPoints.length > 0 && (
                          <Card className="bg-muted/50">
                            <CardHeader>
                              <h4 className="font-semibold">Key Points</h4>
                            </CardHeader>
                            <CardContent>
                              <ul className="list-disc list-inside space-y-1">
                                {summary.keyPoints.map((point, i) => (
                                  <li key={i} className="text-sm">
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Click "Generate Summary" to analyze collected context</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Details Tab */}
                  <TabsContent value="details" className="space-y-4 mt-4">
                    {summary ? (
                      <>
                        {summary.actionItems.length > 0 && (
                          <Card className="bg-muted/50">
                            <CardHeader>
                              <h4 className="font-semibold">Action Items</h4>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {summary.actionItems.map((item, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm">
                                    <Badge variant="outline" className="mt-0.5">
                                      {i + 1}
                                    </Badge>
                                    <div className="flex-1">
                                      <p>{item.action}</p>
                                      {(item.owner || item.dueDate) && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {item.owner && `Owner: ${item.owner}`}
                                          {item.owner && item.dueDate && " • "}
                                          {item.dueDate && `Due: ${item.dueDate}`}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {summary.decisions.length > 0 && (
                          <Card className="bg-muted/50">
                            <CardHeader>
                              <h4 className="font-semibold">Decisions</h4>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {summary.decisions.map((item, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm">
                                    <Badge variant="default" className="mt-0.5">
                                      {i + 1}
                                    </Badge>
                                    <div className="flex-1">
                                      <p className="font-medium">{item.decision}</p>
                                      {item.rationale && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {item.rationale}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No details available yet</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Sources Tab */}
                  <TabsContent value="sources" className="space-y-4 mt-4">
                    {contextData && contextData.contexts.length > 0 ? (
                      <div className="space-y-3">
                        {contextData.contexts.map((context, i) => (
                          <Card key={i} className="bg-muted/50">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{context.title}</h4>
                                <Badge variant="outline">{context.type}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {context.content}
                              </p>
                              {context.url && (
                                <p className="text-xs text-muted-foreground mt-2 truncate">
                                  {context.url}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No sources collected yet</p>
                        <p className="text-sm mt-2">Click "Collect Context" to scan the page</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Keyboard Hints */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-4">
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd> Collect
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">ESC</kbd> Close
                    </span>
                  </div>
                  {summary && (
                    <span className="text-xs">
                      {summary.metadata.wordCount} words • {summary.metadata.totalSources} sources
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
