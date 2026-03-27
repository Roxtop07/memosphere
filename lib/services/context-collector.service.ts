/**
 * Context Collection Service
 * Collects and parses content from active browser tabs, web apps, and DOM elements
 */

export interface CollectedContext {
  source: string
  type: "webpage" | "meeting" | "chat" | "document" | "editor" | "dashboard"
  title: string
  url?: string
  content: string
  metadata?: {
    timestamp: string
    author?: string
    tags?: string[]
    [key: string]: any
  }
}

export interface ContextSummary {
  totalSources: number
  contexts: CollectedContext[]
  combinedContent: string
  detectedTypes: string[]
}

/**
 * Main context collection function
 */
export async function collectActiveContext(): Promise<ContextSummary> {
  const contexts: CollectedContext[] = []

  // 1. Collect from current page/tab
  const currentPageContext = collectCurrentPageContent()
  if (currentPageContext) {
    contexts.push(currentPageContext)
  }

  // 2. Collect from MemoSphere components
  const dashboardContext = collectDashboardContent()
  if (dashboardContext) {
    contexts.push(dashboardContext)
  }

  // 3. Collect from editor/form fields
  const editorContexts = collectEditorContent()
  contexts.push(...editorContexts)

  // 4. Collect from chat/messaging components
  const chatContexts = collectChatContent()
  contexts.push(...chatContexts)

  // 5. Collect from meeting components
  const meetingContexts = collectMeetingContent()
  contexts.push(...meetingContexts)

  // Combine all content
  const combinedContent = contexts
    .map((ctx) => `[${ctx.type.toUpperCase()}: ${ctx.title}]\n${ctx.content}`)
    .join("\n\n---\n\n")

  const detectedTypes = [...new Set(contexts.map((ctx) => ctx.type))]

  return {
    totalSources: contexts.length,
    contexts,
    combinedContent,
    detectedTypes,
  }
}

/**
 * Collect content from current page/tab
 */
function collectCurrentPageContent(): CollectedContext | null {
  try {
    // Get page title
    const title = document.title || "Untitled Page"

    // Get main content - try multiple strategies
    let content = ""

    // Strategy 1: Look for main content areas
    const mainSelectors = [
      "main",
      "article",
      '[role="main"]',
      "#main-content",
      ".main-content",
      ".content",
    ]

    for (const selector of mainSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        content = extractTextContent(element)
        break
      }
    }

    // Strategy 2: If no main content, get body content
    if (!content) {
      const body = document.body
      if (body) {
        content = extractTextContent(body)
      }
    }

    // Strategy 3: Extract specific content types
    if (!content) {
      // Look for paragraphs, headings, lists
      const textElements = document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, td")
      content = Array.from(textElements)
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .join("\n")
    }

    // Clean and limit content
    content = cleanContent(content)

    if (!content || content.length < 50) {
      return null
    }

    return {
      source: "current-page",
      type: detectContentType(content, title),
      title,
      url: window.location.href,
      content,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error("[Context Collector] Error collecting page content:", error)
    return null
  }
}

/**
 * Collect content from MemoSphere dashboard components
 */
function collectDashboardContent(): CollectedContext | null {
  try {
    // Look for dashboard-specific elements
    const dashboardElement = document.querySelector('[data-component="dashboard"]')
    if (!dashboardElement) {
      return null
    }

    const content = extractTextContent(dashboardElement)

    if (!content || content.length < 50) {
      return null
    }

    return {
      source: "dashboard",
      type: "dashboard",
      title: "MemoSphere Dashboard",
      content: cleanContent(content),
      metadata: {
        timestamp: new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error("[Context Collector] Error collecting dashboard content:", error)
    return null
  }
}

/**
 * Collect content from editor/form fields
 */
function collectEditorContent(): CollectedContext[] {
  const contexts: CollectedContext[] = []

  try {
    // Look for textareas
    const textareas = document.querySelectorAll("textarea")
    textareas.forEach((textarea, index) => {
      const content = textarea.value
      if (content && content.length > 20) {
        const label = findLabelForElement(textarea) || `Text Field ${index + 1}`
        contexts.push({
          source: `editor-${index}`,
          type: "editor",
          title: label,
          content: cleanContent(content),
          metadata: {
            timestamp: new Date().toISOString(),
          },
        })
      }
    })

    // Look for contenteditable elements
    const editableElements = document.querySelectorAll('[contenteditable="true"]')
    editableElements.forEach((element, index) => {
      const content = extractTextContent(element)
      if (content && content.length > 20) {
        contexts.push({
          source: `editable-${index}`,
          type: "editor",
          title: `Editable Content ${index + 1}`,
          content: cleanContent(content),
          metadata: {
            timestamp: new Date().toISOString(),
          },
        })
      }
    })

    // Look for code editors (Monaco, CodeMirror, etc.)
    const codeEditors = document.querySelectorAll(
      '.monaco-editor, .CodeMirror, [class*="editor"]'
    )
    codeEditors.forEach((editor, index) => {
      const content = extractTextContent(editor)
      if (content && content.length > 20) {
        contexts.push({
          source: `code-editor-${index}`,
          type: "editor",
          title: `Code Editor ${index + 1}`,
          content: cleanContent(content),
          metadata: {
            timestamp: new Date().toISOString(),
          },
        })
      }
    })
  } catch (error) {
    console.error("[Context Collector] Error collecting editor content:", error)
  }

  return contexts
}

/**
 * Collect content from chat/messaging components
 */
function collectChatContent(): CollectedContext[] {
  const contexts: CollectedContext[] = []

  try {
    // Look for chat containers
    const chatSelectors = [
      '[data-component="chat"]',
      '[class*="chat"]',
      '[class*="message"]',
      '[role="log"]',
    ]

    chatSelectors.forEach((selector) => {
      const chatElements = document.querySelectorAll(selector)
      chatElements.forEach((element, index) => {
        const content = extractTextContent(element)
        if (content && content.length > 50) {
          contexts.push({
            source: `chat-${index}`,
            type: "chat",
            title: `Chat Messages ${index + 1}`,
            content: cleanContent(content),
            metadata: {
              timestamp: new Date().toISOString(),
            },
          })
        }
      })
    })
  } catch (error) {
    console.error("[Context Collector] Error collecting chat content:", error)
  }

  return contexts
}

/**
 * Collect content from meeting components
 */
function collectMeetingContent(): CollectedContext[] {
  const contexts: CollectedContext[] = []

  try {
    // Look for meeting-specific elements
    const meetingElements = document.querySelectorAll(
      '[data-component="meeting"], [class*="meeting"]'
    )

    meetingElements.forEach((element, index) => {
      const content = extractTextContent(element)
      if (content && content.length > 50) {
        // Try to extract meeting title
        const titleElement = element.querySelector("h1, h2, h3, [class*='title']")
        const title = titleElement?.textContent?.trim() || `Meeting ${index + 1}`

        contexts.push({
          source: `meeting-${index}`,
          type: "meeting",
          title,
          content: cleanContent(content),
          metadata: {
            timestamp: new Date().toISOString(),
          },
        })
      }
    })

    // Look for meeting transcripts
    const transcriptElements = document.querySelectorAll('[class*="transcript"]')
    transcriptElements.forEach((element, index) => {
      const content = extractTextContent(element)
      if (content && content.length > 50) {
        contexts.push({
          source: `transcript-${index}`,
          type: "meeting",
          title: `Meeting Transcript ${index + 1}`,
          content: cleanContent(content),
          metadata: {
            timestamp: new Date().toISOString(),
          },
        })
      }
    })
  } catch (error) {
    console.error("[Context Collector] Error collecting meeting content:", error)
  }

  return contexts
}

/**
 * Extract text content from an element
 */
function extractTextContent(element: Element): string {
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as Element

  // Remove script and style elements
  clone.querySelectorAll("script, style, noscript").forEach((el) => el.remove())

  // Get text content
  let text = clone.textContent || ""

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim()

  return text
}

/**
 * Clean and normalize content
 */
function cleanContent(content: string): string {
  return content
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\n\s*\n/g, "\n") // Remove empty lines
    .trim()
    .substring(0, 10000) // Limit to 10k chars per source
}

/**
 * Detect content type based on content and title
 */
function detectContentType(
  content: string,
  title: string
): CollectedContext["type"] {
  const lowerContent = content.toLowerCase()
  const lowerTitle = title.toLowerCase()

  if (
    lowerTitle.includes("meeting") ||
    lowerContent.includes("agenda") ||
    lowerContent.includes("attendees")
  ) {
    return "meeting"
  }

  if (lowerTitle.includes("chat") || lowerContent.includes("message")) {
    return "chat"
  }

  if (
    lowerTitle.includes("document") ||
    lowerTitle.includes("doc") ||
    lowerContent.includes("paragraph")
  ) {
    return "document"
  }

  if (
    lowerTitle.includes("dashboard") ||
    lowerContent.includes("overview") ||
    lowerContent.includes("statistics")
  ) {
    return "dashboard"
  }

  return "webpage"
}

/**
 * Find label for form element
 */
function findLabelForElement(element: Element): string | null {
  // Try to find associated label
  const id = element.id
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`)
    if (label?.textContent) {
      return label.textContent.trim()
    }
  }

  // Try to find parent label
  const parentLabel = element.closest("label")
  if (parentLabel?.textContent) {
    return parentLabel.textContent.trim()
  }

  // Try to find preceding label
  const previousElement = element.previousElementSibling
  if (previousElement?.tagName === "LABEL" && previousElement.textContent) {
    return previousElement.textContent.trim()
  }

  // Try placeholder or aria-label
  const placeholder = element.getAttribute("placeholder")
  const ariaLabel = element.getAttribute("aria-label")

  return placeholder || ariaLabel || null
}

/**
 * Collect content from all open MemoSphere tabs (if multiple)
 * This would require browser extension or cross-tab communication
 */
export async function collectFromAllTabs(): Promise<CollectedContext[]> {
  // This requires browser extension API
  // For now, return empty array
  // Implementation would use chrome.tabs.query() or similar
  console.log("[Context Collector] Multi-tab collection requires browser extension")
  return []
}

/**
 * Monitor for tab/app switches
 */
export function setupContextMonitoring(callback: (context: ContextSummary) => void) {
  let lastContext: string | null = null

  const checkForChanges = async () => {
    const context = await collectActiveContext()
    const contextHash = JSON.stringify(context.contexts.map((c) => c.source))

    if (contextHash !== lastContext) {
      lastContext = contextHash
      callback(context)
    }
  }

  // Monitor visibility changes
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      checkForChanges()
    }
  })

  // Monitor focus changes
  window.addEventListener("focus", () => {
    setTimeout(checkForChanges, 500) // Delay to let page stabilize
  })

  // Poll for changes every 5 seconds
  const interval = setInterval(checkForChanges, 5000)

  // Return cleanup function
  return () => {
    clearInterval(interval)
  }
}
