"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Key, Clock, AlertTriangle, CheckCircle2, Save } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface SecuritySettingsProps {
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

export default function SecuritySettings({ user, onBack }: SecuritySettingsProps) {
  const [settings, setSettings] = useState({
    twoFactorAuth: true,
    passwordExpiry: true,
    passwordExpiryDays: 90,
    sessionTimeout: true,
    sessionTimeoutMinutes: 30,
    ipWhitelisting: false,
    auditLogging: true,
    encryptData: true,
    requireStrongPassword: true,
    minPasswordLength: 8,
    allowedLoginAttempts: 5,
    lockoutDuration: 15,
    emailNotifications: true,
    suspiciousActivityAlerts: true,
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleNumberChange = (key: keyof typeof settings, value: string) => {
    const numValue = parseInt(value) || 0
    setSettings((prev) => ({
      ...prev,
      [key]: numValue,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      // Save to localStorage
      if (user.orgId) {
        localStorage.setItem(`security-settings-${user.orgId}`, JSON.stringify(settings))
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast.success("Security settings saved successfully!", {
        description: "Your organization's security settings have been updated.",
      })
    } catch (error) {
      console.error("Error saving security settings:", error)
      toast.error("Failed to save security settings")
    } finally {
      setIsSaving(false)
    }
  }

  const securityScore = () => {
    let score = 0
    if (settings.twoFactorAuth) score += 15
    if (settings.passwordExpiry) score += 10
    if (settings.sessionTimeout) score += 10
    if (settings.ipWhitelisting) score += 15
    if (settings.auditLogging) score += 10
    if (settings.encryptData) score += 15
    if (settings.requireStrongPassword) score += 10
    if (settings.emailNotifications) score += 5
    if (settings.suspiciousActivityAlerts) score += 10
    return score
  }

  const score = securityScore()

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Security Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure security policies for {user.orgName || "your organization"}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Security Score */}
      <Card className={`border-2 ${
        score >= 80 ? "border-green-500 bg-green-50 dark:bg-green-950" :
        score >= 60 ? "border-orange-500 bg-orange-50 dark:bg-orange-950" :
        "border-red-500 bg-red-50 dark:bg-red-950"
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Organization Security Score</p>
              <div className="flex items-center gap-3">
                <p className="text-5xl font-bold">{score}</p>
                <div className="flex items-center gap-2">
                  {score >= 80 ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <Badge className="bg-green-600">Excellent</Badge>
                    </>
                  ) : score >= 60 ? (
                    <>
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                      <Badge className="bg-orange-600">Good</Badge>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                      <Badge className="bg-red-600">Needs Improvement</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="w-32 h-32">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(score / 100) * 251.2} 251.2`}
                  className={score >= 80 ? "text-green-600" : score >= 60 ? "text-orange-600" : "text-red-600"}
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Authentication & Access Control
          </CardTitle>
          <CardDescription>Manage user authentication and access policies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="twoFactorAuth" className="text-base font-semibold">Two-Factor Authentication (2FA)</Label>
              <p className="text-sm text-muted-foreground">Require all users to enable 2FA for enhanced security</p>
            </div>
            <Switch
              id="twoFactorAuth"
              checked={settings.twoFactorAuth}
              onCheckedChange={() => handleToggle("twoFactorAuth")}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="passwordExpiry" className="text-base font-semibold">Password Expiration</Label>
                <p className="text-sm text-muted-foreground">Force users to change passwords periodically</p>
              </div>
              <Switch
                id="passwordExpiry"
                checked={settings.passwordExpiry}
                onCheckedChange={() => handleToggle("passwordExpiry")}
              />
            </div>
            {settings.passwordExpiry && (
              <div className="ml-4 flex items-center gap-4">
                <Label htmlFor="passwordExpiryDays" className="text-sm">Expire after:</Label>
                <Input
                  id="passwordExpiryDays"
                  type="number"
                  value={settings.passwordExpiryDays}
                  onChange={(e) => handleNumberChange("passwordExpiryDays", e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="sessionTimeout" className="text-base font-semibold">Session Timeout</Label>
                <p className="text-sm text-muted-foreground">Auto-logout inactive users</p>
              </div>
              <Switch
                id="sessionTimeout"
                checked={settings.sessionTimeout}
                onCheckedChange={() => handleToggle("sessionTimeout")}
              />
            </div>
            {settings.sessionTimeout && (
              <div className="ml-4 flex items-center gap-4">
                <Label htmlFor="sessionTimeoutMinutes" className="text-sm">Timeout after:</Label>
                <Input
                  id="sessionTimeoutMinutes"
                  type="number"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => handleNumberChange("sessionTimeoutMinutes", e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="ipWhitelisting" className="text-base font-semibold">IP Whitelisting</Label>
              <p className="text-sm text-muted-foreground">Restrict access to specific IP addresses</p>
            </div>
            <Switch
              id="ipWhitelisting"
              checked={settings.ipWhitelisting}
              onCheckedChange={() => handleToggle("ipWhitelisting")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password Policy
          </CardTitle>
          <CardDescription>Configure password requirements and security rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="requireStrongPassword" className="text-base font-semibold">Strong Password Required</Label>
                <p className="text-sm text-muted-foreground">Require uppercase, lowercase, numbers, and special characters</p>
              </div>
              <Switch
                id="requireStrongPassword"
                checked={settings.requireStrongPassword}
                onCheckedChange={() => handleToggle("requireStrongPassword")}
              />
            </div>
            {settings.requireStrongPassword && (
              <div className="ml-4 flex items-center gap-4">
                <Label htmlFor="minPasswordLength" className="text-sm">Minimum length:</Label>
                <Input
                  id="minPasswordLength"
                  type="number"
                  value={settings.minPasswordLength}
                  onChange={(e) => handleNumberChange("minPasswordLength", e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">characters</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Label htmlFor="allowedLoginAttempts" className="text-sm font-semibold">Failed login attempts:</Label>
              <Input
                id="allowedLoginAttempts"
                type="number"
                value={settings.allowedLoginAttempts}
                onChange={(e) => handleNumberChange("allowedLoginAttempts", e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">attempts</span>
            </div>
            <div className="flex items-center gap-4">
              <Label htmlFor="lockoutDuration" className="text-sm font-semibold">Account lockout duration:</Label>
              <Input
                id="lockoutDuration"
                type="number"
                value={settings.lockoutDuration}
                onChange={(e) => handleNumberChange("lockoutDuration", e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Data Security & Privacy
          </CardTitle>
          <CardDescription>Configure data protection and monitoring settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auditLogging" className="text-base font-semibold">Audit Logging</Label>
              <p className="text-sm text-muted-foreground">Track all user actions and system events</p>
            </div>
            <Switch
              id="auditLogging"
              checked={settings.auditLogging}
              onCheckedChange={() => handleToggle("auditLogging")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="encryptData" className="text-base font-semibold">Data Encryption</Label>
              <p className="text-sm text-muted-foreground">Encrypt sensitive data at rest and in transit</p>
            </div>
            <Switch
              id="encryptData"
              checked={settings.encryptData}
              onCheckedChange={() => handleToggle("encryptData")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="emailNotifications" className="text-base font-semibold">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Send security alerts to administrators</p>
            </div>
            <Switch
              id="emailNotifications"
              checked={settings.emailNotifications}
              onCheckedChange={() => handleToggle("emailNotifications")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="suspiciousActivityAlerts" className="text-base font-semibold">Suspicious Activity Alerts</Label>
              <p className="text-sm text-muted-foreground">Get notified of unusual login patterns or activities</p>
            </div>
            <Switch
              id="suspiciousActivityAlerts"
              checked={settings.suspiciousActivityAlerts}
              onCheckedChange={() => handleToggle("suspiciousActivityAlerts")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save All Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
