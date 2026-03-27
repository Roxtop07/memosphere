"use client"

import { useState, useCallback } from "react"

export interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  timestamp: Date
  read: boolean
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback(
    (title: string, message: string, type: "info" | "success" | "warning" | "error" = "info") => {
      const id = Date.now().toString()
      const notification: Notification = {
        id,
        title,
        message,
        type,
        timestamp: new Date(),
        read: false,
      }
      setNotifications((prev) => [notification, ...prev])

      // Auto-remove after 5 seconds for non-error notifications
      if (type !== "error") {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id))
        }, 5000)
      }

      return id
    },
    [],
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    unreadCount,
  }
}
