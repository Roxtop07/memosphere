"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Calendar, Users, FileText, X, Loader2, Clock } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
  onNavigate?: (type: string, id: string) => void
  userId?: string
  userRole?: "admin" | "manager" | "viewer"
}

interface SearchResult {
  id: string
  type: "meeting" | "event" | "policy"
  title: string
  description?: string
  date?: string
  status?: string
  tags?: string[]
  relevance: number
  url: string
  icon: string
}

interface SearchResponse {
  success: boolean
  query: string
  results: SearchResult[]
  grouped: {
    meetings: SearchResult[]
    events: SearchResult[]
    policies: SearchResult[]
  }
  count: number
  totalFound: number
}

export default function GlobalSearch({ isOpen, onClose, onNavigate, userId, userRole }: GlobalSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [grouped, setGrouped] = useState<SearchResponse["grouped"]>({ meetings: [], events: [], policies: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      // Load recent searches from localStorage
      const recent = localStorage.getItem("recentSearches")
      if (recent) {
        setRecentSearches(JSON.parse(recent))
      }
    } else {
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.length < 2) {
      setResults([])
      setGrouped({ meetings: [], events: [], policies: [] })
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch(query)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, userId, userRole])

  const performSearch = async (searchQuery: string) => {
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        userId: userId || "user_1", // Match sample data user
        organizationId: "org_1", // Match sample data
        userRole: userRole || "viewer",
        limit: "50"
      })

      const response = await fetch(`/api/search?${params}`)
      const data: SearchResponse = await response.json()

      if (data.success) {
        setResults(data.results)
        setGrouped(data.grouped)
        setSelectedIndex(0)
        
        // Save to recent searches
        if (!recentSearches.includes(searchQuery)) {
          const newRecent = [searchQuery, ...recentSearches.slice(0, 4)]
          setRecentSearches(newRecent)
          localStorage.setItem("recentSearches", JSON.stringify(newRecent))
        }
      }
    } catch (error) {
      console.error("[GlobalSearch] Error:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    if (onNavigate) {
      onNavigate(result.type, result.id)
    }
    onClose()
  }

  const handleRecentSearchClick = (search: string) => {
    setQuery(search)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem("recentSearches")
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      handleResultClick(results[selectedIndex])
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case "meeting":
        return <Calendar className="w-4 h-4" />
      case "event":
        return <Users className="w-4 h-4" />
      case "policy":
        return <FileText className="w-4 h-4" />
      default:
        return <Search className="w-4 h-4" />
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    } catch {
      return ""
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search meetings, events, policies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
          />
          {isSearching && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          {query && (
            <Button variant="ghost" size="icon" onClick={() => setQuery("")}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[500px]">
          <div className="p-4">
            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent Searches
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-xs h-6"
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleRecentSearchClick(search)}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {query.length >= 2 && !isSearching && results.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No results found for "{query}"</p>
                <p className="text-sm text-muted-foreground mt-1">Try different keywords</p>
              </div>
            )}

            {/* Grouped Results */}
            {results.length > 0 && (
              <>
                {/* Meetings */}
                {grouped.meetings.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Meetings ({grouped.meetings.length})
                    </h3>
                    <div className="space-y-1">
                      {grouped.meetings.map((result, idx) => (
                        <ResultItem
                          key={result.id}
                          result={result}
                          isSelected={selectedIndex === results.indexOf(result)}
                          onClick={() => handleResultClick(result)}
                          formatDate={formatDate}
                          getIconForType={getIconForType}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Events */}
                {grouped.events.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Events ({grouped.events.length})
                    </h3>
                    <div className="space-y-1">
                      {grouped.events.map((result) => (
                        <ResultItem
                          key={result.id}
                          result={result}
                          isSelected={selectedIndex === results.indexOf(result)}
                          onClick={() => handleResultClick(result)}
                          formatDate={formatDate}
                          getIconForType={getIconForType}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Policies */}
                {grouped.policies.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Policies ({grouped.policies.length})
                    </h3>
                    <div className="space-y-1">
                      {grouped.policies.map((result) => (
                        <ResultItem
                          key={result.id}
                          result={result}
                          isSelected={selectedIndex === results.indexOf(result)}
                          onClick={() => handleResultClick(result)}
                          formatDate={formatDate}
                          getIconForType={getIconForType}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Tips */}
            {!query && recentSearches.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Search across meetings, events, and policies
                </p>
                <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                  <Badge variant="outline">⌘K to open</Badge>
                  <Badge variant="outline">↑↓ to navigate</Badge>
                  <Badge variant="outline">↵ to select</Badge>
                  <Badge variant="outline">Esc to close</Badge>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

interface ResultItemProps {
  result: SearchResult
  isSelected: boolean
  onClick: () => void
  formatDate: (date?: string) => string
  getIconForType: (type: string) => React.ReactNode
}

function ResultItem({ result, isSelected, onClick, formatDate, getIconForType }: ResultItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors ${
        isSelected ? "bg-accent" : "hover:bg-accent/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">{getIconForType(result.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium truncate">{result.title}</h4>
            {result.status && (
              <Badge variant={result.status === "active" || result.status === "scheduled" ? "default" : "secondary"} className="text-xs">
                {result.status}
              </Badge>
            )}
          </div>
          {result.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mb-1">{result.description}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {result.date && <span>{formatDate(result.date)}</span>}
            {result.tags && result.tags.length > 0 && (
              <div className="flex gap-1">
                {result.tags.slice(0, 2).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {result.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{result.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
