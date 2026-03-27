"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Mic, 
  Volume2, 
  Moon, 
  Sun, 
  Monitor,
  Save,
  RefreshCw,
  Key,
  Database,
  Cpu,
  Zap
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

interface SettingsProps {
  user: { role: "admin" | "manager" | "viewer" }
}

interface AppSettings {
  notifications: {
    email: boolean
    push: boolean
    meeting: boolean
    policy: boolean
  }
  audio: {
    autoTranscribe: boolean
    whisperModel: string
    language: string
    noiseReduction: boolean
  }
  ai: {
    provider: "openrouter" | "ollama" | "local"
    model: string
    temperature: number
    maxTokens: number
  }
  security: {
    encryptPolicies: boolean
    twoFactorAuth: boolean
    sessionTimeout: number
    auditLog: boolean
  }
  appearance: {
    theme: "light" | "dark" | "system"
    compactMode: boolean
    animations: boolean
  }
}

const defaultSettings: AppSettings = {
  notifications: {
    email: true,
    push: true,
    meeting: true,
    policy: true
  },
  audio: {
    autoTranscribe: true,
    whisperModel: "large-v3",
    language: "en",
    noiseReduction: true
  },
  ai: {
    provider: "openrouter",
    model: "deepseek/deepseek-chat",
    temperature: 0.7,
    maxTokens: 2048
  },
  security: {
    encryptPolicies: true,
    twoFactorAuth: false,
    sessionTimeout: 30,
    auditLog: true
  },
  appearance: {
    theme: "system",
    compactMode: false,
    animations: true
  }
}

export default function Settings({ user }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({ ...defaultSettings, ...data.settings })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    setIsLoading(false)
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })
      
      if (response.ok) {
        toast.success('Settings saved successfully!')
        // Apply theme change immediately
        setTheme(settings.appearance.theme)
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    }
    setIsSaving(false)
  }

  const updateSetting = (section: keyof AppSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  const testAudioTranscription = async () => {
    try {
      const response = await fetch('/api/settings/test-audio')
      const data = await response.json()
      if (data.success) {
        toast.success(`Audio transcription test successful! Model: ${data.model}`)
      } else {
        toast.error(`Audio test failed: ${data.error}`)
      }
    } catch (error) {
      toast.error('Audio test failed')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Settings</h2>
        </div>
        <Button 
          onClick={saveSettings} 
          disabled={isSaving}
          className="bg-primary hover:bg-primary/90"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notif">Email Notifications</Label>
            <Switch
              id="email-notif"
              checked={settings.notifications.email}
              onCheckedChange={(checked) => updateSetting('notifications', 'email', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="push-notif">Push Notifications</Label>
            <Switch
              id="push-notif"
              checked={settings.notifications.push}
              onCheckedChange={(checked) => updateSetting('notifications', 'push', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="meeting-notif">Meeting Reminders</Label>
            <Switch
              id="meeting-notif"
              checked={settings.notifications.meeting}
              onCheckedChange={(checked) => updateSetting('notifications', 'meeting', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="policy-notif">Policy Updates</Label>
            <Switch
              id="policy-notif"
              checked={settings.notifications.policy}
              onCheckedChange={(checked) => updateSetting('notifications', 'policy', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audio & Transcription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Audio & Transcription
            <Badge variant="secondary" className="ml-2">Faster-Whisper Enabled</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-transcribe">Auto-transcribe Audio</Label>
            <Switch
              id="auto-transcribe"
              checked={settings.audio.autoTranscribe}
              onCheckedChange={(checked) => updateSetting('audio', 'autoTranscribe', checked)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="whisper-model">Whisper Model</Label>
            <select 
              id="whisper-model"
              value={settings.audio.whisperModel}
              onChange={(e) => updateSetting('audio', 'whisperModel', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="large-v3">Whisper Large v3 (Best Quality)</option>
              <option value="medium">Whisper Medium (Balanced)</option>
              <option value="base">Whisper Base (Fast)</option>
              <option value="small">Whisper Small (Fastest)</option>
              <option value="tiny">Whisper Tiny (Ultra Fast)</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select 
              id="language"
              value={settings.audio.language}
              onChange={(e) => updateSetting('audio', 'language', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="auto">Auto-detect</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="noise-reduction">Noise Reduction</Label>
            <Switch
              id="noise-reduction"
              checked={settings.audio.noiseReduction}
              onCheckedChange={(checked) => updateSetting('audio', 'noiseReduction', checked)}
            />
          </div>

          <Button 
            variant="outline" 
            onClick={testAudioTranscription}
            className="w-full mt-4"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Test Audio Transcription
          </Button>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-provider">AI Provider</Label>
            <select 
              id="ai-provider"
              value={settings.ai.provider}
              onChange={(e) => updateSetting('ai', 'provider', e.target.value as any)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="openrouter">OpenRouter (Cloud)</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="local">Local Transformers</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="ai-model">Model</Label>
            <Input
              id="ai-model"
              value={settings.ai.model}
              onChange={(e) => updateSetting('ai', 'model', e.target.value)}
              placeholder="deepseek/deepseek-chat"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature: {settings.ai.temperature}</Label>
            <input
              type="range"
              id="temperature"
              min="0"
              max="1"
              step="0.1"
              value={settings.ai.temperature}
              onChange={(e) => updateSetting('ai', 'temperature', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="max-tokens">Max Tokens</Label>
            <Input
              id="max-tokens"
              type="number"
              value={settings.ai.maxTokens}
              onChange={(e) => updateSetting('ai', 'maxTokens', parseInt(e.target.value))}
              min="256"
              max="8192"
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      {(user.role === "admin" || user.role === "manager") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="encrypt-policies">Encrypt Policy Documents</Label>
              <Switch
                id="encrypt-policies"
                checked={settings.security.encryptPolicies}
                onCheckedChange={(checked) => updateSetting('security', 'encryptPolicies', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="two-factor">Two-Factor Authentication</Label>
              <Switch
                id="two-factor"
                checked={settings.security.twoFactorAuth}
                onCheckedChange={(checked) => updateSetting('security', 'twoFactorAuth', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={settings.security.sessionTimeout}
                onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                min="5"
                max="120"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="audit-log">Audit Logging</Label>
              <Switch
                id="audit-log"
                checked={settings.security.auditLog}
                onCheckedChange={(checked) => updateSetting('security', 'auditLog', checked)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={settings.appearance.theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => updateSetting('appearance', 'theme', 'light')}
              >
                <Sun className="w-4 h-4 mr-1" />
                Light
              </Button>
              <Button
                variant={settings.appearance.theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => updateSetting('appearance', 'theme', 'dark')}
              >
                <Moon className="w-4 h-4 mr-1" />
                Dark
              </Button>
              <Button
                variant={settings.appearance.theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => updateSetting('appearance', 'theme', 'system')}
              >
                <Monitor className="w-4 h-4 mr-1" />
                System
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="compact-mode">Compact Mode</Label>
            <Switch
              id="compact-mode"
              checked={settings.appearance.compactMode}
              onCheckedChange={(checked) => updateSetting('appearance', 'compactMode', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="animations">Animations</Label>
            <Switch
              id="animations"
              checked={settings.appearance.animations}
              onCheckedChange={(checked) => updateSetting('appearance', 'animations', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}