import { NextRequest, NextResponse } from "next/server"

/**
 * Universal Search API - Searches across ALL content types
 * 
 * Searches:
 * - Meetings (title, description, agenda, participants)
 * - Events (title, description, location, attendees)
 * - Policies (title, description, content, type)
 * - Notifications (title, message)
 * - Comments (content)
 * - Tags (all tags across system)
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const userId = searchParams.get("userId")
    const organizationId = searchParams.get("organizationId") || "org_1" // Default to sample data org
    const userRole = searchParams.get("userRole") || "viewer"
    const limit = parseInt(searchParams.get("limit") || "50")

    if (q.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        count: 0,
        message: "Query too short"
      })
    }

    const query = q.toLowerCase()
    const results: any[] = []

    // Search Meetings - Search ALL fields comprehensively
    const meetingsResponse = await fetch(`${req.nextUrl.origin}/api/meetings?userId=${userId}&organizationId=${organizationId}`)
    if (meetingsResponse.ok) {
      const meetingsData = await meetingsResponse.json()
      const meetings = meetingsData.meetings || []
      
      meetings.forEach((m: any) => {
        // Build comprehensive search text from ALL meeting fields
        const searchText = [
          m.title,
          m.description,
          m.agenda,
          m.location,
          m.status,
          m.type,
          m.userId,
          m.organizationId,
          ...(m.participants || []),
          ...(m.tags || []),
          m.notes,
          m.outcome,
          JSON.stringify(m.metadata || {})
        ].filter(Boolean).join(" ").toLowerCase()
        
        if (matchesQuery(searchText, query)) {
          results.push({
            id: m.id,
            type: "meeting",
            title: m.title,
            description: m.description,
            date: m.scheduledDate || m.startTime,
            status: m.status,
            tags: m.tags,
            participants: m.participants,
            relevance: calculateRelevance(query, searchText, m.title),
            url: `/meetings/${m.id}`,
            icon: "calendar"
          })
        }
      })
    }

    // Search Events - Search ALL fields comprehensively
    const eventsResponse = await fetch(`${req.nextUrl.origin}/api/events?userId=${userId}&organizationId=${organizationId}`)
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json()
      const events = eventsData.events || []
      
      events.forEach((e: any) => {
        // Build comprehensive search text from ALL event fields
        const searchText = [
          e.title,
          e.description,
          e.location,
          e.status,
          e.type,
          e.category,
          e.userId,
          e.organizationId,
          ...(e.attendees || []),
          ...(e.tags || []),
          e.notes,
          JSON.stringify(e.metadata || {})
        ].filter(Boolean).join(" ").toLowerCase()
        
        if (matchesQuery(searchText, query)) {
          results.push({
            id: e.id,
            type: "event",
            title: e.title,
            description: e.description,
            date: e.date || e.startTime,
            location: e.location,
            status: e.status,
            tags: e.tags,
            attendees: e.attendees,
            relevance: calculateRelevance(query, searchText, e.title),
            url: `/events/${e.id}`,
            icon: "users"
          })
        }
      })
    }

    // Search Policies - Search ALL fields comprehensively
    const policiesResponse = await fetch(`${req.nextUrl.origin}/api/policies?userId=${userId}&organizationId=${organizationId}&userRole=${userRole}`)
    if (policiesResponse.ok) {
      const policiesData = await policiesResponse.json()
      const policies = policiesData.policies || []
      
      policies.forEach((p: any) => {
        // Build comprehensive search text from ALL policy fields
        const searchText = [
          p.title,
          p.description,
          p.content,
          p.type,
          p.category,
          p.status,
          p.version,
          p.department,
          p.userId,
          p.organizationId,
          ...(p.tags || []),
          p.summary,
          JSON.stringify(p.metadata || {})
        ].filter(Boolean).join(" ").toLowerCase()
        
        if (matchesQuery(searchText, query)) {
          results.push({
            id: p.id,
            type: "policy",
            title: p.title,
            description: p.description,
            version: p.version,
            status: p.status,
            policyType: p.type,
            tags: p.tags,
            relevance: calculateRelevance(query, searchText, p.title),
            url: `/policies/${p.id}`,
            icon: "file-text"
          })
        }
      })
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance)

    // Apply limit
    const limitedResults = results.slice(0, limit)

    // Group by type for better UI
    const grouped = {
      meetings: limitedResults.filter(r => r.type === "meeting"),
      events: limitedResults.filter(r => r.type === "event"),
      policies: limitedResults.filter(r => r.type === "policy"),
    }

    return NextResponse.json({
      success: true,
      query: q,
      results: limitedResults,
      grouped,
      count: limitedResults.length,
      totalFound: results.length,
    })
  } catch (error: any) {
    console.error("[search] Error:", error)
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    )
  }
}

/**
 * Check if text matches query (case-insensitive, supports partial matches)
 */
function matchesQuery(text: string, query: string): boolean {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  
  // Direct substring match (case-insensitive)
  if (lowerText.includes(lowerQuery)) {
    return true
  }
  
  // Word-by-word matching (all query words must be found)
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 0)
  const allWordsFound = queryWords.every(word => lowerText.includes(word))
  
  if (allWordsFound) {
    return true
  }
  
  // Fuzzy matching - allow minor typos (optional, commented out for performance)
  // return fuzzyMatch(lowerText, lowerQuery)
  
  return false
}

/**
 * Calculate relevance score based on query position, frequency, and title match
 */
function calculateRelevance(query: string, text: string, title: string): number {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const lowerTitle = title.toLowerCase()
  
  let score = 0
  
  // Title exact match (highest priority)
  if (lowerTitle === lowerQuery) {
    score += 1000
  }
  
  // Title starts with query
  if (lowerTitle.startsWith(lowerQuery)) {
    score += 500
  }
  
  // Title contains query
  if (lowerTitle.includes(lowerQuery)) {
    score += 200
  }
  
  // Text starts with query
  if (lowerText.startsWith(lowerQuery)) {
    score += 100
  }
  
  // Count exact query occurrences in full text
  const occurrences = (lowerText.match(new RegExp(lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
  score += occurrences * 10
  
  // Word-by-word matching score
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 1)
  queryWords.forEach(word => {
    // Escape special regex characters
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const wordOccurrences = (lowerText.match(new RegExp(escapedWord, 'g')) || []).length
    score += wordOccurrences * 5
    
    // Bonus for word in title
    if (lowerTitle.includes(word)) {
      score += 20
    }
  })
  
  return score
}
