"use client"

import React, { useState } from 'react'

export default function AudioUploader() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setTranscript(null)
    setError(null)
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    setLoading(true)
    try {
      const ab = await f.arrayBuffer()
      const b = new Uint8Array(ab)
      // convert to base64
      const chunkSize = 0x8000
      let index = 0
      let result = ''
      while (index < b.length) {
        const slice = b.subarray(index, Math.min(index + chunkSize, b.length))
        result += String.fromCharCode.apply(null, Array.from(slice))
        index += chunkSize
      }
      const base64 = btoa(result)

      const res = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: f.name, mimeType: f.type, data: base64 }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Transcription failed')
      } else {
        setTranscript(json.text || json.transcript || JSON.stringify(json))
      }
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Upload audio for transcription</label>
      <input type="file" accept="audio/*" onChange={handleFile} />
      {loading && <div>Transcribing…</div>}
      {error && <div className="text-destructive">{error}</div>}
      {transcript && (
        <div className="rounded bg-muted p-3">
          <strong>Transcript</strong>
          <pre className="whitespace-pre-wrap">{transcript}</pre>
        </div>
      )}
    </div>
  )
}
