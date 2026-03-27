"use client"

import { useEffect } from "react"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"
import type { Notification } from "@/hooks/use-notifications"

interface NotificationToastProps {
  notification: Notification
  onRemove: () => void
}

export default function NotificationToast({ notification, onRemove }: NotificationToastProps) {
  useEffect(() => {
    if (notification.type !== "error") {
      const timer = setTimeout(onRemove, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification.type, onRemove])

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getBgColor = () => {
    switch (notification.type) {
      case "success":
        return "bg-green-50 border-green-200 dark:bg-green-950"
      case "error":
        return "bg-red-50 border-red-200 dark:bg-red-950"
      case "warning":
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950"
      case "info":
      default:
        return "bg-blue-50 border-blue-200 dark:bg-blue-950"
    }
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${getBgColor()} animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      {getIcon()}
      <div className="flex-1">
        <h3 className="font-semibold text-sm">{notification.title}</h3>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
      </div>
      <button onClick={onRemove} className="text-muted-foreground hover:text-foreground transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
