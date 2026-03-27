"use client"

import { useEffect, useRef, useState } from "react"
import { VOICE_COMMAND_PATTERNS } from "@/lib/voice-command-patterns"

type VoiceCommand =
  // Navigation Commands
  | "navigate-meetings"
  | "navigate-events"
  | "navigate-policies"
  | "navigate-overview"
  | "navigate-audit"
  | "go-back"
  | "go-home"
  | "go-forward"
  | "navigate-settings"
  | "navigate-profile"
  
  // Create/Edit Commands
  | "create-meeting"
  | "create-event"
  | "create-policy"
  | "edit-meeting"
  | "edit-event"
  | "edit-policy"
  | "delete-meeting"
  | "delete-event"
  | "delete-policy"
  | "duplicate-meeting"
  | "duplicate-event"
  
  // Meeting Management
  | "start-meeting"
  | "end-meeting"
  | "join-meeting"
  | "leave-meeting"
  | "schedule-meeting"
  | "reschedule-meeting"
  | "cancel-meeting"
  | "start-recording"
  | "stop-recording"
  | "pause-recording"
  | "resume-recording"
  | "generate-agenda"
  | "extract-decisions"
  | "share-meeting"
  | "export-meeting"
  | "print-meeting"
  
  // Event Management
  | "rsvp-yes"
  | "rsvp-no"
  | "rsvp-maybe"
  | "share-event"
  | "export-event"
  | "print-event"
  | "cancel-event"
  | "remind-event"
  
  // Policy Management
  | "encrypt-policy"
  | "decrypt-policy"
  | "share-policy"
  | "export-policy"
  | "print-policy"
  | "archive-policy"
  | "restore-policy"
  
  // UI Controls
  | "toggle-theme"
  | "toggle-sidebar"
  | "toggle-fullscreen"
  | "open-notifications"
  | "close-notifications"
  | "clear-notifications"
  | "mark-all-read"
  | "scroll-up"
  | "scroll-down"
  | "scroll-top"
  | "scroll-bottom"
  | "zoom-in"
  | "zoom-out"
  | "zoom-reset"
  | "refresh"
  | "reload"
  
  // Search & Filter
  | "search"
  | "search-meetings"
  | "search-events"
  | "search-policies"
  | "filter-today"
  | "filter-week"
  | "filter-month"
  | "filter-all"
  | "clear-search"
  | "clear-filters"
  
  // Sort Commands
  | "sort-date"
  | "sort-name"
  | "sort-priority"
  | "sort-status"
  | "sort-ascending"
  | "sort-descending"
  
  // View Commands
  | "view-list"
  | "view-grid"
  | "view-calendar"
  | "view-timeline"
  | "view-kanban"
  | "show-completed"
  | "hide-completed"
  | "show-archived"
  | "hide-archived"
  
  // AI Commands
  | "summarize"
  | "summarize-meeting"
  | "summarize-event"
  | "analyze"
  | "analyze-transcript"
  | "translate"
  | "generate-report"
  | "generate-summary"
  | "extract-tasks"
  | "extract-action-items"
  | "suggest-improvements"
  
  // System Commands
  | "help"
  | "what-can-you-do"
  | "show-shortcuts"
  | "save"
  | "save-as"
  | "undo"
  | "redo"
  | "copy"
  | "paste"
  | "cut"
  | "select-all"
  | "logout"
  | "lock-screen"
  
  // Quick Actions
  | "next"
  | "previous"
  | "first"
  | "last"
  | "today"
  | "tomorrow"
  | "yesterday"
  | "this-week"
  | "next-week"
  | "last-week"

interface UseVoiceAssistantProps {
  onCommand?: (command: VoiceCommand, transcript: string) => void
  enabled?: boolean
  debug?: boolean
}

export function useVoiceAssistant({ onCommand, enabled = true, debug = false }: UseVoiceAssistantProps = {}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isSupported, setIsSupported] = useState(false)
  const [continuousMode, setContinuousMode] = useState(false)
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null)
  const recognitionRef = useRef<any>(null)
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)

    if (!SpeechRecognition) return

    recognitionRef.current = new SpeechRecognition()
    const recognition = recognitionRef.current

    recognition.continuous = true // Enable continuous listening
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onstart = () => {
      setListening(true)
      console.log("Voice assistant started listening...")
    }

    recognition.onend = () => {
      console.log("Voice recognition ended")
      setListening(false)
      
      // Auto-restart if in continuous mode
      if (continuousMode) {
        console.log("Restarting voice assistant in continuous mode...")
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start()
          } catch (err) {
            console.log("Recognition already started or error:", err)
          }
        }, 500) // Small delay before restart
      }
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptChunk = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          finalTranscript += transcriptChunk + " "
        } else {
          interimTranscript += transcriptChunk
        }
      }

      const fullTranscript = finalTranscript || interimTranscript
      setTranscript(fullTranscript.toLowerCase().trim())

      // Process commands when speech is final
      if (finalTranscript) {
        processCommand(finalTranscript.toLowerCase().trim())
      }
    }

    recognition.onerror = (event: any) => {
      // Handle microphone permission denied
      if (event.error === "not-allowed") {
        console.error("Microphone access denied. Please enable microphone permissions in your browser settings.")
        setListening(false)
        setContinuousMode(false)
        // Show user-friendly error message
        if (typeof window !== 'undefined') {
          alert("Microphone access denied.\n\nTo use voice commands:\n1. Click the 🔒 or ⓘ icon in your browser's address bar\n2. Allow microphone access for this site\n3. Reload the page\n4. Try voice commands again")
        }
        return
      }
      
      // Only log unexpected errors (no-speech and aborted are normal)
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("Speech recognition error:", event.error)
        setListening(false)
        setContinuousMode(false)
      } else if (continuousMode && event.error === "no-speech") {
        // Restart on no-speech error in continuous mode (suppress log)
        setTimeout(() => {
          try {
            recognition.start()
          } catch (err) {
            console.log("Recognition restart error:", err)
          }
        }, 500)
      }
    }

    return () => {
      if (recognition) {
        recognition.stop()
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    }
  }, [continuousMode])

  const processCommand = (text: string) => {
    if (debug) console.log("Processing command:", text)
    
    // Sort by priority (higher priority first)
    const sortedCommands = [...VOICE_COMMAND_PATTERNS].sort((a, b) => (b.priority || 0) - (a.priority || 0))

    for (const { patterns, command } of sortedCommands) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          if (debug) console.log("Matched command:", command)
          setLastCommand(command as VoiceCommand)
          onCommand?.(command as VoiceCommand, text)
          return
        }
      }
    }

    if (debug) console.log("No command matched")
  }

  const startListening = async () => {
    if (recognitionRef.current && enabled) {
      // Check microphone permission first
      try {
        // Request microphone permission
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true })
        }
      } catch (permissionError) {
        console.error("Microphone permission error:", permissionError)
        alert("Microphone access is required for voice commands.\n\nTo enable:\n1. Click the 🔒 or ⓘ icon in your browser's address bar\n2. Allow microphone access for this site\n3. Try again")
        return
      }
      
      setTranscript("")
      setContinuousMode(true)
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.log("Recognition already started or error:", err)
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      setContinuousMode(false)
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
      recognitionRef.current.stop()
    }
  }

  const toggleListening = () => {
    if (listening || continuousMode) {
      stopListening()
    } else {
      startListening()
    }
  }

  return {
    listening,
    transcript,
    isSupported,
    continuousMode,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
  }
}
