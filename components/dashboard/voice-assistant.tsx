"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mic, Volume2, Zap, HelpCircle } from "lucide-react"
import { useVoiceAssistant } from "@/hooks/use-voice-assistant"
import { useToast } from "@/hooks/use-toast"

interface VoiceAssistantProps {
  onNavigate?: (tab: "meetings" | "events" | "policies" | "overview") => void
  onOpenNotifications?: () => void
  onToggleTheme?: () => void
  onCreateMeeting?: () => void
  onCreateEvent?: () => void
  onCreatePolicy?: () => void
}

export default function VoiceAssistant({ 
  onNavigate, 
  onOpenNotifications, 
  onToggleTheme,
  onCreateMeeting,
  onCreateEvent,
  onCreatePolicy
}: VoiceAssistantProps) {
  const [showTranscript, setShowTranscript] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const { toast } = useToast()
  
  const { listening, transcript, isSupported, toggleListening, continuousMode, lastCommand } = useVoiceAssistant({
    enabled: true,
    debug: true,
    onCommand: (command, text) => {
      // Add to history
      setCommandHistory(prev => [text, ...prev.slice(0, 4)])
      
      // Show feedback
      toast({
        title: "Voice Command Executed",
        description: text,
        duration: 2000,
      })

      switch (command) {
        // Navigation
        case "navigate-meetings":
          onNavigate?.("meetings")
          break
        case "navigate-events":
          onNavigate?.("events")
          break
        case "navigate-policies":
          onNavigate?.("policies")
          break
        case "navigate-overview":
          onNavigate?.("overview")
          break
        case "go-home":
          onNavigate?.("overview")
          break
        
        // Create Actions
        case "create-meeting":
          onCreateMeeting?.()
          toast({ title: "Opening Meeting Form", description: "Create a new meeting" })
          break
        case "create-event":
          onCreateEvent?.()
          toast({ title: "Opening Event Form", description: "Create a new event" })
          break
        case "create-policy":
          onCreatePolicy?.()
          toast({ title: "Opening Policy Form", description: "Create a new policy" })
          break
          
        // UI Controls
        case "open-notifications":
          onOpenNotifications?.()
          break
        case "toggle-theme":
          onToggleTheme?.()
          break
        case "toggle-sidebar":
          // Implement sidebar toggle
          break
        case "scroll-up":
          window.scrollTo({ top: 0, behavior: "smooth" })
          break
        case "scroll-down":
          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
          break
        case "refresh":
          window.location.reload()
          break
        case "zoom-in":
          document.body.style.zoom = String(Number(document.body.style.zoom || 1) + 0.1)
          break
        case "zoom-out":
          document.body.style.zoom = String(Number(document.body.style.zoom || 1) - 0.1)
          break
          
        // Help
        case "help":
        case "what-can-you-do":
          setShowHelp(true)
          break
          
        // Recording
        case "start-recording":
          toast({ title: "Recording Started", description: "Voice recording in progress" })
          break
        case "stop-recording":
          toast({ title: "Recording Stopped", description: "Processing transcript..." })
          break
          
        // AI Commands
        case "generate-agenda":
          toast({ title: "Generating Agenda", description: "AI is creating your meeting agenda" })
          break
        case "extract-decisions":
          toast({ title: "Extracting Decisions", description: "Analyzing meeting transcript" })
          break
        case "summarize":
          toast({ title: "Summarizing", description: "Creating summary..." })
          break
          
        default:
          console.log("Unhandled command:", command)
      }
    },
  })

  useEffect(() => {
    if (listening || transcript) {
      setShowTranscript(true)
    }
  }, [listening, transcript])

  if (!isSupported) {
    return null
  }

  const commandSuggestions = [
    { category: "Navigation", commands: ["show meetings", "view events", "go to policies", "dashboard", "show audit"] },
    { category: "Create", commands: ["create meeting", "new event", "add policy", "schedule meeting"] },
    { category: "Edit", commands: ["edit meeting", "modify event", "delete policy", "duplicate meeting"] },
    { category: "Meeting", commands: ["start meeting", "join meeting", "end meeting", "start recording", "generate agenda"] },
    { category: "Event", commands: ["rsvp yes", "rsvp no", "rsvp maybe", "share event", "cancel event"] },
    { category: "Policy", commands: ["encrypt policy", "decrypt policy", "archive policy", "restore policy"] },
    { category: "UI Controls", commands: ["toggle theme", "toggle sidebar", "fullscreen", "scroll up", "zoom in", "refresh"] },
    { category: "Search & Filter", commands: ["search meetings", "filter today", "filter week", "clear filters", "show all"] },
    { category: "Sort & View", commands: ["sort by date", "sort by name", "list view", "grid view", "calendar view"] },
    { category: "AI Features", commands: ["generate agenda", "extract decisions", "summarize", "analyze", "generate report"] },
    { category: "System", commands: ["help", "save", "undo", "redo", "logout", "show shortcuts"] },
    { category: "Quick Actions", commands: ["next", "previous", "today", "tomorrow", "this week"] },
  ]

  return (
    <>
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleListening}
          className="relative"
          title={listening ? "Stop listening (Continuous Mode)" : "Start voice command (Microphone permission required)"}
        >
          {listening ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-8 h-8 rounded-full bg-accent/20" />
              </motion.div>
              <Mic className="w-5 h-5 text-accent relative z-10" />
            </>
          ) : (
            <Mic className="w-5 h-5" />
          )}
          {continuousMode && (
            <Badge className="absolute -top-1 -right-1 h-3 w-3 p-0 flex items-center justify-center bg-green-500">
              <Zap className="w-2 h-2" />
            </Badge>
          )}
        </Button>
      </motion.div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-2xl w-full mx-4"
            >
              <Card className="border-accent/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <HelpCircle className="w-6 h-6 text-accent" />
                    <h2 className="text-xl font-bold">Voice Commands</h2>
                  </div>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {commandSuggestions.map((category) => (
                      <div key={category.category}>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                          {category.category}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {category.commands.map((cmd) => (
                            <Badge key={cmd} variant="secondary" className="text-xs">
                              "{cmd}"
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Tip: Click the mic once to start. It will keep listening until you click again! Over 150 commands available across 12 categories.
                    </p>
                  </div>
                  <Button onClick={() => setShowHelp(false)} className="w-full mt-4">
                    Got it
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript Display */}
      <AnimatePresence>
        {showTranscript && (listening || transcript) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-20 right-6 z-50 max-w-sm"
          >
            <Card className="border-accent/50 bg-card shadow-lg">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <motion.div
                    animate={{ rotate: listening ? 360 : 0 }}
                    transition={{ repeat: listening ? Number.POSITIVE_INFINITY : 0, duration: 2 }}
                  >
                    <Volume2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {listening ? "Listening..." : "Recognized"}
                      </p>
                      {continuousMode && (
                        <Badge variant="outline" className="text-xs h-5">
                          Continuous
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {transcript || "Say a command..."}
                    </p>
                    {lastCommand && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {lastCommand.replace(/-/g, " ")}
                      </Badge>
                    )}
                    <div className="mt-3 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium">Quick commands:</p>
                      <p>"show meetings" | "create event" | "toggle theme" | "help"</p>
                      <button
                        onClick={() => setShowHelp(true)}
                        className="text-accent hover:underline"
                      >
                        View all commands
                      </button>
                    </div>
                    {commandHistory.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Recent:</p>
                        <div className="space-y-1">
                          {commandHistory.slice(0, 3).map((cmd, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">
                              {cmd}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowTranscript(false)}
                    className="text-muted-foreground hover:text-foreground text-xs font-medium"
                  >
                    Close
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
