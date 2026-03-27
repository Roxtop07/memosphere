"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, Download, Upload, Database, Clock, CheckCircle2, AlertCircle, HardDrive, Cloud, Calendar } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface BackupDataProps {
  user: {
    id?: string
    name: string
    email: string
    role: "admin" | "manager" | "viewer"
    orgId?: string
    orgName?: string
  }
  onBack: () => void
}

export default function BackupData({ user, onBack }: BackupDataProps) {
  const [backupType, setBackupType] = useState<"full" | "partial">("full")
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [backupProgress, setBackupProgress] = useState(0)
  const [lastBackup, setLastBackup] = useState<Date | null>(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)) // 2 days ago

  const backupHistory = [
    {
      id: "1",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      type: "Automatic Full Backup",
      size: "45.2 MB",
      status: "completed",
    },
    {
      id: "2",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      type: "Manual Full Backup",
      size: "43.8 MB",
      status: "completed",
    },
    {
      id: "3",
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      type: "Automatic Full Backup",
      size: "42.1 MB",
      status: "completed",
    },
  ]

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true)
    setBackupProgress(0)

    try {
      // Simulate backup progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        setBackupProgress(i)
      }

      // Gather all data
      const backupData = {
        timestamp: new Date().toISOString(),
        type: backupType,
        organization: {
          id: user.orgId,
          name: user.orgName,
        },
        meetings: JSON.parse(localStorage.getItem("meetings") || "[]"),
        events: JSON.parse(localStorage.getItem("events") || "[]"),
        policies: JSON.parse(localStorage.getItem("policies") || "[]"),
        users: JSON.parse(localStorage.getItem("users") || "[]"),
        organizations: JSON.parse(localStorage.getItem("organizations") || "[]"),
        auditLogs: JSON.parse(localStorage.getItem(`audit-logs-${user.orgId}`) || "[]"),
        securitySettings: JSON.parse(localStorage.getItem(`security-settings-${user.orgId}`) || "{}"),
      }

      // Create downloadable file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `backup-${user.orgName?.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setLastBackup(new Date())
      toast.success("Backup created successfully!", {
        description: `${backupType === "full" ? "Full" : "Partial"} backup has been downloaded.`,
      })
    } catch (error) {
      console.error("Error creating backup:", error)
      toast.error("Failed to create backup")
    } finally {
      setIsCreatingBackup(false)
      setBackupProgress(0)
    }
  }

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsRestoring(true)

    try {
      const text = await file.text()
      const backupData = JSON.parse(text)

      // Validate backup data
      if (!backupData.timestamp || !backupData.organization) {
        throw new Error("Invalid backup file format")
      }

      // Restore data
      if (backupData.meetings) {
        localStorage.setItem("meetings", JSON.stringify(backupData.meetings))
      }
      if (backupData.events) {
        localStorage.setItem("events", JSON.stringify(backupData.events))
      }
      if (backupData.policies) {
        localStorage.setItem("policies", JSON.stringify(backupData.policies))
      }
      if (backupData.users) {
        localStorage.setItem("users", JSON.stringify(backupData.users))
      }
      if (backupData.organizations) {
        localStorage.setItem("organizations", JSON.stringify(backupData.organizations))
      }
      if (backupData.auditLogs && user.orgId) {
        localStorage.setItem(`audit-logs-${user.orgId}`, JSON.stringify(backupData.auditLogs))
      }
      if (backupData.securitySettings && user.orgId) {
        localStorage.setItem(`security-settings-${user.orgId}`, JSON.stringify(backupData.securitySettings))
      }

      toast.success("Backup restored successfully!", {
        description: "All data has been restored from the backup file. Page will reload.",
      })

      // Reload page to reflect changes
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error("Error restoring backup:", error)
      toast.error("Failed to restore backup", {
        description: "The backup file may be corrupted or invalid.",
      })
    } finally {
      setIsRestoring(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const daysSinceLastBackup = lastBackup
    ? Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8 text-primary" />
            Backup & Restore
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage data backups for {user.orgName || "your organization"}
          </p>
        </div>
      </div>

      {/* Backup Status */}
      <Card className={`border-2 ${
        daysSinceLastBackup === null ? "border-red-500 bg-red-50 dark:bg-red-950" :
        daysSinceLastBackup > 7 ? "border-orange-500 bg-orange-50 dark:bg-orange-950" :
        "border-green-500 bg-green-50 dark:bg-green-950"
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {daysSinceLastBackup === null ? (
                <AlertCircle className="w-12 h-12 text-red-600" />
              ) : daysSinceLastBackup > 7 ? (
                <AlertCircle className="w-12 h-12 text-orange-600" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Backup</p>
                {lastBackup ? (
                  <>
                    <p className="text-2xl font-bold">{formatDate(lastBackup)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {daysSinceLastBackup !== null && (daysSinceLastBackup === 0 ? "Today" : `${daysSinceLastBackup} day${daysSinceLastBackup > 1 ? "s" : ""} ago`)}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold">No backups yet</p>
                )}
              </div>
            </div>
            <Badge className={
              daysSinceLastBackup === null ? "bg-red-600" :
              daysSinceLastBackup > 7 ? "bg-orange-600" :
              "bg-green-600"
            }>
              {daysSinceLastBackup === null ? "No Backup" :
               daysSinceLastBackup > 7 ? "Backup Recommended" :
               "Up to Date"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Create Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Create New Backup
          </CardTitle>
          <CardDescription>Export all your organization data to a secure backup file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Backup Type</Label>
            <RadioGroup value={backupType} onValueChange={(value: any) => setBackupType(value)}>
              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-accent transition-colors">
                <RadioGroupItem value="full" id="full" />
                <div className="flex-1">
                  <Label htmlFor="full" className="text-base font-semibold cursor-pointer">Full Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    All meetings, events, policies, users, and settings
                  </p>
                </div>
                <HardDrive className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-accent transition-colors">
                <RadioGroupItem value="partial" id="partial" />
                <div className="flex-1">
                  <Label htmlFor="partial" className="text-base font-semibold cursor-pointer">Partial Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Only meetings, events, and policies (excludes user data)
                  </p>
                </div>
                <Cloud className="w-5 h-5 text-muted-foreground" />
              </div>
            </RadioGroup>
          </div>

          {isCreatingBackup && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Creating backup...</span>
                <span>{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} className="h-2" />
            </div>
          )}

          <Button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            size="lg"
            className="w-full"
          >
            {isCreatingBackup ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Creating Backup...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Backup
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Restore Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Restore from Backup
          </CardTitle>
          <CardDescription>Import data from a previously created backup file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-accent transition-colors">
            <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload a backup file to restore your organization data
            </p>
            <Label htmlFor="restore-file">
              <Button variant="outline" disabled={isRestoring} asChild>
                <span>
                  {isRestoring ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Backup File
                    </>
                  )}
                </span>
              </Button>
            </Label>
            <input
              id="restore-file"
              type="file"
              accept=".json"
              onChange={handleRestoreBackup}
              className="hidden"
              disabled={isRestoring}
            />
          </div>
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-orange-900 dark:text-orange-100 mb-1">Warning</p>
                <p className="text-orange-800 dark:text-orange-200">
                  Restoring from a backup will replace all current data. This action cannot be undone.
                  Make sure to create a backup of your current data before restoring.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Backup History
          </CardTitle>
          <CardDescription>Recent backup records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backupHistory.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold">{backup.type}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(backup.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{backup.size}</Badge>
                  <Badge className="bg-green-600">Completed</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
