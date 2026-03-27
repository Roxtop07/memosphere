export type AuditAction =
  | "login"
  | "logout"
  | "create_meeting"
  | "update_meeting"
  | "delete_meeting"
  | "create_event"
  | "update_event"
  | "delete_event"
  | "create_policy"
  | "update_policy"
  | "delete_policy"
  | "view_policy"
  | "export_data"
  | "theme_change"
  | "2fa_enable"
  | "role_change"

export interface AuditLog {
  id: string
  timestamp: Date
  userId: string
  userName: string
  action: AuditAction
  resourceType: "meeting" | "event" | "policy" | "user" | "system"
  resourceId?: string
  resourceName?: string
  changes?: {
    field: string
    oldValue: any
    newValue: any
  }[]
  ipAddress?: string
  userAgent?: string
  status: "success" | "failure"
  details?: string
}

class AuditLogger {
  private logs: AuditLog[] = []
  private maxLogs = 1000

  log(
    userId: string,
    userName: string,
    action: AuditAction,
    resourceType: "meeting" | "event" | "policy" | "user" | "system",
    options?: {
      resourceId?: string
      resourceName?: string
      changes?: AuditLog["changes"]
      details?: string
      status?: "success" | "failure"
    },
  ): AuditLog {
    const auditLog: AuditLog = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date(),
      userId,
      userName,
      action,
      resourceType,
      resourceId: options?.resourceId,
      resourceName: options?.resourceName,
      changes: options?.changes,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      status: options?.status || "success",
      details: options?.details,
    }

    this.logs.push(auditLog)

    // Keep only the latest maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Save to localStorage for persistence
    this.saveLogs()

    return auditLog
  }

  getLogs(): AuditLog[] {
    return [...this.logs]
  }

  getLogsByUser(userId: string): AuditLog[] {
    return this.logs.filter((log) => log.userId === userId)
  }

  getLogsByAction(action: AuditAction): AuditLog[] {
    return this.logs.filter((log) => log.action === action)
  }

  getLogsByResource(resourceType: string, resourceId?: string): AuditLog[] {
    return this.logs.filter(
      (log) => log.resourceType === resourceType && (!resourceId || log.resourceId === resourceId),
    )
  }

  getLogsBetween(startDate: Date, endDate: Date): AuditLog[] {
    return this.logs.filter((log) => log.timestamp >= startDate && log.timestamp <= endDate)
  }

  clearLogs(): void {
    this.logs = []
    if (typeof window !== "undefined") {
      localStorage.removeItem("auditLogs")
    }
  }

  private saveLogs(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("auditLogs", JSON.stringify(this.logs))
      } catch (e) {
        console.error("Failed to save audit logs:", e)
      }
    }
  }

  loadLogs(): void {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("auditLogs")
        if (stored) {
          this.logs = JSON.parse(stored).map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp),
          }))
        }
      } catch (e) {
        console.error("Failed to load audit logs:", e)
      }
    }
  }

  exportLogs(format: "json" | "csv" = "json"): string {
    if (format === "csv") {
      const headers = [
        "ID",
        "Timestamp",
        "User ID",
        "User Name",
        "Action",
        "Resource Type",
        "Resource ID",
        "Resource Name",
        "Status",
        "Details",
      ]
      const rows = this.logs.map((log) => [
        log.id,
        log.timestamp.toISOString(),
        log.userId,
        log.userName,
        log.action,
        log.resourceType,
        log.resourceId || "",
        log.resourceName || "",
        log.status,
        log.details || "",
      ])

      return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    }

    return JSON.stringify(this.logs, null, 2)
  }
}

export const auditLogger = new AuditLogger()
