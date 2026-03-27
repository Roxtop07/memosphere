"use client"

import { Calendar, LayoutDashboard, Settings, FileText, Clock, Shield, Briefcase, Home } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { sidebarVariants, itemVariants } from "@/lib/animations"

interface SidebarProps {
  user: { role: "admin" | "manager" | "viewer" }
  activeTab: "overview" | "meetings" | "events" | "policies" | "audit" | "settings" | "admin" | "manage" | "home"
  setActiveTab: (tab: "overview" | "meetings" | "events" | "policies" | "audit" | "settings" | "admin" | "manage" | "home") => void
  isOpen: boolean
}

export default function Sidebar({ user, activeTab, setActiveTab, isOpen }: SidebarProps) {
  // Role-specific menu items
  const getRoleSpecificItems = () => {
    const baseItems = [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "meetings", label: "Meetings", icon: Calendar },
      { id: "events", label: "Events", icon: Calendar },
      { id: "policies", label: "Policies", icon: FileText },
    ]

    if (user.role === "admin") {
      return [
        { id: "admin", label: "Admin Panel", icon: Shield },
        ...baseItems,
        { id: "audit", label: "Audit Trail", icon: Clock },
        { id: "settings", label: "Settings", icon: Settings },
      ]
    } else if (user.role === "manager") {
      return [
        { id: "manage", label: "Manager Dashboard", icon: Briefcase },
        ...baseItems,
        { id: "settings", label: "Settings", icon: Settings },
      ]
    } else {
      return [
        { id: "home", label: "Home", icon: Home },
        ...baseItems,
        { id: "settings", label: "Settings", icon: Settings },
      ]
    }
  }

  const menuItems = getRoleSpecificItems()

  return (
    <motion.aside
      className="bg-sidebar border-r border-sidebar-border overflow-hidden"
      initial={false}
      animate={isOpen ? "open" : "closed"}
      variants={sidebarVariants}
    >
      <div className="h-full flex flex-col p-4 space-y-8">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img 
              src="/MEMOSPHERE.png" 
              alt="Memosphere Logo" 
              className="w-8 h-8 object-contain"
            />
          </div>
          {isOpen && <span className="font-bold text-sidebar-foreground">Memosphere</span>}
        </motion.div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                activeTab === item.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/20",
              )}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span className="text-sm font-medium">{item.label}</span>}
            </motion.button>
          ))}
        </nav>

        <motion.div
          className="border-t border-sidebar-border pt-4 text-xs text-sidebar-foreground/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen && (
            <div>
              <p className="font-semibold text-sidebar-foreground mb-2">
                {user.role === "admin" ? "ADMINISTRATOR" : user.role === "manager" ? "MANAGER" : "VIEWER"}
              </p>
              <p>Role-based access enabled</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.aside>
  )
}
