import { NextResponse } from 'next/server'

interface TestResult {
  success: boolean
  model?: string
  error?: string
}

export async function GET() {
  try {
    // Test if faster-whisper is available
    const testResult = await testFasterWhisper() as TestResult
    
    if (testResult.success) {
      return NextResponse.json({
        success: true,
        model: testResult.model || 'whisper-large-v3-ct2',
        message: 'Audio transcription is working correctly'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: testResult.error || 'Unknown error'
      })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Audio test failed: ${error}`
    })
  }
}

async function testFasterWhisper(): Promise<TestResult> {
  try {
    // Check if faster-whisper is installed and working
    const { spawn } = require('child_process')
    
    return new Promise<TestResult>((resolve) => {
      const python = spawn('python', ['-c', `
import faster_whisper
import sys
try:
    model = faster_whisper.WhisperModel("large-v3")
    print(f"SUCCESS:large-v3")
except Exception as e:
    print(f"ERROR:{str(e)}")
    sys.exit(1)
`])
      
      let output = ''
      python.stdout.on('data', (data: Buffer) => {
        output += data.toString()
      })
      
      python.on('close', (code: number) => {
        if (code === 0 && output.includes('SUCCESS')) {
          const model = output.split('SUCCESS:')[1]?.trim() || 'unknown'
          resolve({ success: true, model })
        } else {
          const error = output.includes('ERROR:') ? output.split('ERROR:')[1]?.trim() : 'Unknown error'
          resolve({ success: false, error })
        }
      })
      
      python.on('error', (err: Error) => {
        resolve({ success: false, error: err.message })
      })
      
      // Timeout after 10 seconds
      setTimeout(() => {
        python.kill()
        resolve({ success: false, error: 'Test timeout' })
      }, 10000)
    })
  } catch (error) {
    return { success: false, error: `Test failed: ${error}` }
  }
}