"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/dashboard/sidebar"
import TopBar from "@/components/dashboard/top-bar"
import DashboardContent from "@/components/dashboard/dashboard-content"

interface DashboardProps {
  user: { 
    id: string
    name: string
    email: string
    role: "admin" | "manager" | "viewer"
    orgId?: string
    orgCode?: string
    orgName?: string
  }
  onLogout: () => void
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  // Set initial tab based on user role
  const getInitialTab = () => {
    if (user.role === "admin") return "admin"
    if (user.role === "manager") return "manage"
    return "home"
  }

  const [activeTab, setActiveTab] = useState<"overview" | "meetings" | "events" | "policies" | "audit" | "settings" | "admin" | "manage" | "home">(
    getInitialTab() as any
  )
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const handleVoiceNavigation = (tab: "overview" | "meetings" | "events" | "policies") => {
    setActiveTab(tab)
  }

  const handleToggleTheme = () => {
    // Trigger theme toggle through useTheme hook if needed
    const themeToggleButton = document.querySelector('[title*="Current theme"]') as HTMLButtonElement
    themeToggleButton?.click()
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          user={user}
          onLogout={onLogout}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigate={handleVoiceNavigation}
          onToggleTheme={handleToggleTheme}
        />
        <div className="flex-1 overflow-auto">
          <DashboardContent activeTab={activeTab} user={user} />
        </div>
      </div>
    </div>
  )
}
