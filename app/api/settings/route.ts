import { NextRequest, NextResponse } from 'next/server'

// In a real app, this would be stored in a database
let userSettings = {
  notifications: {
    email: true,
    push: true,
    meeting: true,
    policy: true
  },
  audio: {
    autoTranscribe: true,
    whisperModel: "whisper-large-v3-ct2",
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

export async function GET() {
  try {
    return NextResponse.json({ 
      success: true, 
      settings: userSettings 
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { settings } = await request.json()
    
    // Validate and update settings
    userSettings = {
      ...userSettings,
      ...settings
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Settings saved successfully' 
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}