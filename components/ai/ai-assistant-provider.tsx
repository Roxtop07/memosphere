"use client"

import { useState, useEffect, useCallback } from "react"
import AIOverlay from "@/components/ai/ai-overlay"

interface AIAssistantProviderProps {
  children: React.ReactNode
}

export default function AIAssistantProvider({ children }: AIAssistantProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedText, setSelectedText] = useState<string>()
  const [contextData, setContextData] = useState<any>()

  // Handle global keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()

        // Get selected text
        const selection = window.getSelection()
        const text = selection?.toString().trim()

        setSelectedText(text || undefined)
        setIsOpen(true)

        // Try to extract context from page
        extractPageContext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const extractPageContext = () => {
    // Try to detect context from current page
    const pathname = window.location.pathname

    if (pathname.includes("/meetings")) {
      setContextData({ type: "meeting" as const })
    } else if (pathname.includes("/events")) {
      setContextData({ type: "event" as const })
    } else if (pathname.includes("/policies")) {
      setContextData({ type: "policy" as const })
    } else {
      setContextData({ type: "general" as const })
    }
  }

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setSelectedText(undefined)
    // Keep context data for quick re-open
  }, [])

  return (
    <>
      {children}
      <AIOverlay
        isOpen={isOpen}
        onClose={handleClose}
        selectedText={selectedText}
        contextData={contextData}
      />
    </>
  )
}
