"use client"

import { useState, useEffect } from "react"
import { Menu, Bell, User, LogOut, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import NotificationCenter from "@/components/notifications/notification-center"
import { useNotificationContext } from "@/components/notifications/notification-provider"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import VoiceAssistant from "@/components/dashboard/voice-assistant"
import GlobalSearch from "@/components/search/global-search"

interface TopBarProps {
  user: { id?: string; name: string; email: string; role: "admin" | "manager" | "viewer" }
  onLogout: () => void
  onToggleSidebar: () => void
  onNavigate?: (tab: "overview" | "meetings" | "events" | "policies") => void
  onToggleTheme?: () => void
}

export default function TopBar({ user, onLogout, onToggleSidebar, onNavigate, onToggleTheme }: TopBarProps) {
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const { unreadCount } = useNotificationContext()

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowGlobalSearch(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchNavigation = (type: string, id: string) => {
    // Navigate to the appropriate tab when a search result is clicked
    if (type === "meeting" && onNavigate) {
      onNavigate("meetings")
    } else if (type === "event" && onNavigate) {
      onNavigate("events")
    } else if (type === "policy" && onNavigate) {
      onNavigate("policies")
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img 
              src="/MEMOSPHERE.png" 
              alt="Memosphere Logo" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-2xl font-bold text-foreground">Memosphere</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="gap-2 hidden md:flex"
            onClick={() => setShowGlobalSearch(true)}
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setShowGlobalSearch(true)}
          >
            <Search className="w-5 h-5" />
          </Button>

          <VoiceAssistant
            onNavigate={onNavigate}
            onOpenNotifications={() => setShowNotificationCenter(true)}
            onToggleTheme={onToggleTheme}
          />

          <ThemeToggle />

          <Button variant="ghost" size="icon" className="relative" onClick={() => setShowNotificationCenter(true)}>
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-accent rounded-full text-xs text-accent-foreground flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <span className="text-sm font-bold">{user.name.charAt(0).toUpperCase()}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                <User className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showNotificationCenter && <NotificationCenter onClose={() => setShowNotificationCenter(false)} />}
      
      <GlobalSearch 
        isOpen={showGlobalSearch} 
        onClose={() => setShowGlobalSearch(false)}
        onNavigate={handleSearchNavigation}
        userId={user.id || user.email}
        userRole={user.role}
      />
    </>
  )
}
