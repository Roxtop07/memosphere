"use client"

import { useEffect } from "react"
import { auditLogger, type AuditAction } from "@/lib/audit-logger"

export function useAudit() {
  useEffect(() => {
    // Load logs on mount
    auditLogger.loadLogs()
  }, [])

  const logAction = (
    userId: string,
    userName: string,
    action: AuditAction,
    resourceType: "meeting" | "event" | "policy" | "user" | "system",
    options?: {
      resourceId?: string
      resourceName?: string
      changes?: any[]
      details?: string
      status?: "success" | "failure"
    },
  ) => {
    return auditLogger.log(userId, userName, action, resourceType, options)
  }

  return {
    logAction,
    getLogs: () => auditLogger.getLogs(),
    getLogsByUser: (userId: string) => auditLogger.getLogsByUser(userId),
    getLogsByAction: (action: AuditAction) => auditLogger.getLogsByAction(action),
    exportLogs: (format?: "json" | "csv") => auditLogger.exportLogs(format),
  }
}
