// Transcription endpoint
// Supports two input methods:
// 1) JSON POST: { filename, mimeType, data } where data is base64 audio
// 2) multipart/form-data POST: field name 'audio' => File
// Preference order for transcription providers:
// - Faster-Whisper (local Python model)
// - Local Whisper microservice (WHISPER_LOCAL_URL)
// - OpenAI Whisper (OPENAI_API_KEY)

export const runtime = 'nodejs'

async function transcribeWithFasterWhisper(buffer: Buffer, filename: string) {
  try {
    const fs = require('fs')
    const path = require('path')
    const { spawn } = require('child_process')
    const os = require('os')
    
    // Create temporary file
    const tempDir = os.tmpdir()
    const tempFile = path.join(tempDir, `temp_audio_${Date.now()}_${filename}`)
    fs.writeFileSync(tempFile, buffer)
    
    return new Promise((resolve) => {
      const python = spawn('python', ['-c', `
import faster_whisper
import sys
import os

try:
    # Load the model
    model = faster_whisper.WhisperModel("large-v3")
    
    # Transcribe the audio file
    segments, info = model.transcribe("${tempFile.replace(/\\/g, '/')}")
    
    # Combine all segments
    transcript = ""
    for segment in segments:
        transcript += segment.text + " "
    
    print("SUCCESS:" + transcript.strip())
except Exception as e:
    print(f"ERROR:{str(e)}")
    sys.exit(1)
`])
      
      let output = ''
      let errorOutput = ''
      
      python.stdout.on('data', (data: Buffer) => {
        output += data.toString()
      })
      
      python.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString()
      })
      
      python.on('close', (code: number) => {
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile)
        } catch (e) {
          console.warn('Failed to cleanup temp file:', e)
        }
        
        if (code === 0 && output.includes('SUCCESS:')) {
          const text = output.split('SUCCESS:')[1]?.trim()
          resolve(text || null)
        } else {
          console.warn('[transcribe] faster-whisper failed:', errorOutput || output)
          resolve(null)
        }
      })
      
      python.on('error', (err: Error) => {
        console.warn('[transcribe] faster-whisper error:', err.message)
        try {
          fs.unlinkSync(tempFile)
        } catch (e) {
          console.warn('Failed to cleanup temp file:', e)
        }
        resolve(null)
      })
      
      // Timeout after 2 minutes for large files
      setTimeout(() => {
        python.kill()
        try {
          fs.unlinkSync(tempFile)
        } catch (e) {
          console.warn('Failed to cleanup temp file:', e)
        }
        console.warn('[transcribe] faster-whisper timeout')
        resolve(null)
      }, 120000)
    })
  } catch (error) {
    console.warn('[transcribe] faster-whisper setup error:', error)
    return null
  }
}

async function transcribeWithLocal(buffer: Buffer, mimeType: string, filename: string) {
  const WHISPER_LOCAL_URL = process.env.WHISPER_LOCAL_URL
  if (!WHISPER_LOCAL_URL) return null
  try {
    const resp = await fetch(WHISPER_LOCAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': mimeType, 'X-Filename': filename },
      // send as binary blob (convert Buffer to Uint8Array)
      body: new Blob([new Uint8Array(buffer)]),
    })
    if (!resp.ok) {
      console.warn('[transcribe] local whisper failed', resp.status)
      return null
    }
    const json = await resp.json()
    return json.text || json.transcription || null
  } catch (e) {
    console.warn('[transcribe] local whisper error', e)
    return null
  }
}

async function transcribeWithOpenAI(buffer: Buffer, mimeType: string, filename: string) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY
  if (!OPENAI_KEY) return null
  try {
    const form = new FormData()
    // @ts-ignore Blob used in Node/Next runtime
    form.append('file', new Blob([buffer]), filename)
    form.append('model', 'whisper-1')

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form,
    })
    if (!resp.ok) {
      const txt = await resp.text()
      console.warn('[transcribe] openai failed', resp.status, txt)
      return null
    }
    const json = await resp.json()
    return json.text || null
  } catch (err) {
    console.warn('[transcribe] openai error', err)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const contentType = (req.headers.get('content-type') || '').toLowerCase()
    let audioBuffer: Buffer | null = null
    let mimeType = 'audio/wav'
    let filename = 'recording.wav'

    if (contentType.includes('application/json')) {
      const body = await req.json()
      const { data, mimeType: m = 'audio/wav', filename: fn = 'recording.wav' } = body
      if (!data) return Response.json({ error: 'Missing audio data' }, { status: 400 })
      audioBuffer = Buffer.from(data, 'base64')
      mimeType = m
      filename = fn
    } else {
      // assume form-data
      const formData = await req.formData()
      const audioFile = formData.get('audio') || formData.get('file')
      if (!audioFile || !(audioFile instanceof Blob)) {
        return Response.json({ error: 'No audio file provided' }, { status: 400 })
      }
      mimeType = (audioFile as any).type || 'audio/wav'
      filename = (audioFile as any).name || 'recording'
      const ab = await (audioFile as Blob).arrayBuffer()
      audioBuffer = Buffer.from(ab)
      // size guard
      const maxSize = 50 * 1024 * 1024 // 50MB safety
      if (audioBuffer.length > maxSize) {
        return Response.json({ error: 'File too large' }, { status: 400 })
      }
    }

    if (!audioBuffer) return Response.json({ error: 'No audio data' }, { status: 400 })

    // 1) try faster-whisper (local Python model)
    const fasterWhisperText = await transcribeWithFasterWhisper(audioBuffer, filename)
    if (fasterWhisperText) return Response.json({ text: fasterWhisperText, source: 'faster-whisper' })

    // 2) try local whisper microservice
    const localText = await transcribeWithLocal(audioBuffer, mimeType, filename)
    if (localText) return Response.json({ text: localText, source: 'whisper-local' })

    // 3) try OpenAI Whisper
    const openaiText = await transcribeWithOpenAI(audioBuffer, mimeType, filename)
    if (openaiText) return Response.json({ text: openaiText, source: 'openai' })

    return Response.json({ error: 'No transcription provider available' }, { status: 503 })
  } catch (err) {
    console.error('[transcribe] error', err)
    return Response.json({ error: 'Failed to transcribe', details: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({
    endpoint: '/api/meetings/transcribe',
    methods: ['POST'],
    input: 'JSON with base64 (data) OR multipart/form-data with field `audio`',
    providers: ['faster-whisper (local Python)', 'local whisper (WHISPER_LOCAL_URL)', 'OpenAI (OPENAI_API_KEY)']
  })
}