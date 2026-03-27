"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useNotifications } from "@/hooks/use-notifications"
import type { Notification } from "@/hooks/use-notifications"

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (title: string, message: string, type?: "info" | "success" | "warning" | "error") => string
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  unreadCount: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const notifications = useNotifications()

  return <NotificationContext.Provider value={notifications}>{children}</NotificationContext.Provider>
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotificationContext must be used within NotificationProvider")
  }
  return context
}
