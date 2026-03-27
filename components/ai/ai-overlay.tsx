"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Send, Loader2, X, Wand2, FileText } from "lucide-react"
import { useAIAssistant } from "@/hooks/use-ai-assistant"

interface AIOverlayProps {
  isOpen: boolean
  onClose: () => void
  selectedText?: string
  contextData?: {
    type: "meeting" | "event" | "policy" | "general"
    data?: any
  }
}

export default function AIOverlay({ isOpen, onClose, selectedText, contextData }: AIOverlayProps) {
  const [prompt, setPrompt] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [response, setResponse] = useState("")
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const { executeAction, isLoading } = useAIAssistant()

  // Quick action buttons
  const quickActions = [
    { id: "summarize", label: "Summarize", icon: Wand2 },
    { id: "agenda", label: "Generate Agenda", icon: Wand2 },
    { id: "decisions", label: "Extract Decisions", icon: Wand2 },
    { id: "series", label: "Detect Series", icon: Wand2 },
    { id: "simplify", label: "Simplify Policy", icon: Wand2 },
    { id: "sentiment", label: "Sentiment Analysis", icon: Wand2 },
    { id: "followups", label: "Find Follow-ups", icon: Wand2 },
    { id: "transcript", label: "Analyze Transcript", icon: FileText },
  ]

  // Auto-focus textarea when overlay opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
      if (selectedText) {
        setPrompt(`Analyze this: "${selectedText}"`)
      }
    }
  }, [isOpen, selectedText])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      // ESC to close
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }

      // Enter to submit (Shift+Enter for newline)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, prompt])

  const handleQuickAction = async (actionId: string) => {
    setActiveAction(actionId)
    setIsProcessing(true)
    setResponse("")

    try {
      const result = await executeAction(actionId, {
        selectedText,
        contextData,
        prompt,
      })
      setResponse(result)
    } catch (error) {
      setResponse("Error processing request. Please try again.")
    } finally {
      setIsProcessing(false)
      setActiveAction(null)
    }
  }

  const handleSubmit = async () => {
    if (!prompt.trim() || isProcessing) return

    setIsProcessing(true)
    setResponse("")

    try {
      const result = await executeAction("custom", {
        selectedText,
        contextData,
        prompt,
      })
      setResponse(result)
    } catch (error) {
      setResponse("Error processing request. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClear = () => {
    setPrompt("")
    setResponse("")
    setActiveAction(null)
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
            className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-3xl z-101 px-4"
          >
            <Card className="border-accent/50 shadow-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    <h2 className="text-lg font-bold">MemoSphere AI Assistant</h2>
                    {selectedText && (
                      <Badge variant="secondary" className="text-xs">
                        Text Selected
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {quickActions.map((action) => (
                    <Button
                      key={action.id}
                      variant={activeAction === action.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuickAction(action.id)}
                      disabled={isProcessing}
                      className="text-xs"
                    >
                      <action.icon className="w-3 h-3 mr-1" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Input Area */}
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask anything... (Press Enter to submit, Shift+Enter for newline)"
                    className="min-h-[100px] resize-none pr-12"
                    disabled={isProcessing}
                  />
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    {prompt && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="h-8 w-8"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="icon"
                      onClick={handleSubmit}
                      disabled={!prompt.trim() || isProcessing}
                      className="h-8 w-8"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Response Area */}
                {response && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-muted rounded-lg border"
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-accent mt-1 shrink-0" />
                      <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: formatResponse(response),
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Loading State */}
                {isProcessing && !response && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center py-8 text-muted-foreground"
                  >
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span>Processing your request...</span>
                  </motion.div>
                )}

                {/* Keyboard Hints */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-4">
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> Submit
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Shift+Enter</kbd>{" "}
                      Newline
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">ESC</kbd> Close
                    </span>
                  </div>
                  {contextData && (
                    <Badge variant="outline" className="text-xs">
                      Context: {contextData.type}
                    </Badge>
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

// Format response with markdown-like styling
function formatResponse(text: string): string {
  let formatted = text

  // Headers
  formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="font-bold text-base mt-4 mb-2">$1</h3>')
  formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="font-bold text-lg mt-4 mb-2">$1</h2>')
  formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="font-bold text-xl mt-4 mb-2">$1</h1>')

  // Bold
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Lists
  formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4" value="$1">$2</li>')

  // Line breaks
  formatted = formatted.replace(/\n\n/g, '<br/><br/>')
  formatted = formatted.replace(/\n/g, '<br/>')

  return formatted
}
