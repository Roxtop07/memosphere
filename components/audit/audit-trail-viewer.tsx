"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Filter, History, ArrowLeft } from "lucide-react"
import { auditLogger, type AuditLog } from "@/lib/audit-logger"
import { containerVariants, itemVariants } from "@/lib/animations"

interface AuditTrailViewerProps {
  user?: {
    id?: string
    name: string
    email: string
    role: "admin" | "manager" | "viewer"
    orgId?: string
    orgName?: string
  }
  onBack?: () => void
}

export default function AuditTrailViewer({ user, onBack }: AuditTrailViewerProps = {}) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [selectedFilter, setSelectedFilter] = useState<string>("all")

  useEffect(() => {
    auditLogger.loadLogs()
    const allLogs = auditLogger.getLogs()
    setLogs(allLogs)
    setFilteredLogs(allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()))
  }, [])

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter)
    let filtered = logs

    if (filter !== "all") {
      filtered = logs.filter((log) => log.action === filter)
    }

    setFilteredLogs(filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()))
  }

  const handleExport = () => {
    const csv = auditLogger.exportLogs("csv")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `audit-trail-${new Date().toISOString()}.csv`
    link.click()
  }

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("create")) return "default"
    if (action.includes("delete")) return "destructive"
    if (action.includes("update")) return "secondary"
    return "outline"
  }

  const getStatusColor = (status: string) => {
    return status === "success" ? "text-green-500" : "text-red-500"
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(date))
  }

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)))

  return (
    <motion.div className="space-y-6 p-6" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {onBack && (
                  <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                <History className="w-5 h-5 text-accent" />
                <div>
                  <CardTitle>Audit Trail</CardTitle>
                  <CardDescription>
                    {user?.orgName ? `${user.orgName} - ` : ""}System activity log and user actions
                  </CardDescription>
                </div>
              </div>
              <Button size="sm" className="gap-2" onClick={handleExport}>
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Button
                variant={selectedFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterChange("all")}
              >
                All Actions ({logs.length})
              </Button>
              {uniqueActions.slice(0, 5).map((action) => (
                <Button
                  key={action}
                  variant={selectedFilter === action ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange(action)}
                >
                  {action.replace(/_/g, " ")}
                </Button>
              ))}
            </div>

            <ScrollArea className="h-96 border border-border rounded-lg p-4">
              <motion.div className="space-y-3" initial="hidden" animate="visible" variants={containerVariants}>
                {filteredLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No audit logs found</p>
                ) : (
                  filteredLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      variants={itemVariants}
                      className="border border-border/50 rounded-lg p-3 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={getActionBadgeVariant(log.action)}>{log.action.replace(/_/g, " ")}</Badge>
                            <Badge variant="outline" className="text-xs">
                              {log.resourceType}
                            </Badge>
                            <span className={`text-xs font-medium ${getStatusColor(log.status)}`}>{log.status}</span>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-foreground">
                              {log.userName}
                              {log.resourceName && ` • ${log.resourceName}`}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatTimestamp(log.timestamp)}</p>
                          </div>
                          {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
                          {log.changes && log.changes.length > 0 && (
                            <div className="text-xs space-y-1 mt-2 pl-2 border-l border-border/50">
                              {log.changes.map((change, idx) => (
                                <p key={idx} className="text-muted-foreground">
                                  <span className="font-medium">{change.field}:</span> {String(change.oldValue)} →{" "}
                                  {String(change.newValue)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
