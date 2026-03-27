"""
Test faster-whisper transcription endpoint
"""
import requests
import io

# Try to import pydub (preferred); if unavailable, provide a lightweight Sine generator fallback.
try:
    from pydub import AudioSegment
    from pydub.generators import Sine
    _HAVE_PYDUB = True
except Exception:
    _HAVE_PYDUB = False
    import math
    import wave
    import struct

    class Sine:
        """Lightweight fallback Sine generator that exposes to_audio_segment(duration) with export(buffer, format)."""
        def __init__(self, freq=440):
            self.freq = freq

        def to_audio_segment(self, duration=1000, sample_rate=44100, volume=-3.0):
            # Generate mono 16-bit PCM samples
            n_samples = int(sample_rate * (duration / 1000.0))
            max_amp = 32767
            frames = bytearray()
            for i in range(n_samples):
                t = i / sample_rate
                value = int(max_amp * 0.5 * math.sin(2 * math.pi * self.freq * t))
                frames += struct.pack('<h', value)

            class _Seg:
                def __init__(self, raw, sr):
                    self._raw = raw
                    self.frame_rate = sr
                    self.channels = 1
                    self.sample_width = 2

                def export(self, buffer, format='webm'):
                    # We cannot produce webm here without ffmpeg; fallback to WAV which most servers accept.
                    wf = wave.open(buffer, 'wb')
                    wf.setnchannels(self.channels)
                    wf.setsampwidth(self.sample_width)
                    wf.setframerate(self.frame_rate)
                    wf.writeframes(self._raw)
                    wf.close()

            return _Seg(bytes(frames), sample_rate)

def test_transcription():
    """Test the /api/transcribe endpoint with faster-whisper"""
    
    # Generate a simple test audio (1 second sine wave)
    # In real scenario, this would be actual voice recording
    audio = Sine(440).to_audio_segment(duration=1000)
    
    # Convert to bytes
    buffer = io.BytesIO()
    audio.export(buffer, format='webm')
    buffer.seek(0)
    
    # Send to backend
    files = {'audio': ('test.webm', buffer, 'audio/webm')}
    response = requests.post('http://127.0.0.1:8000/api/transcribe', files=files)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n Transcription successful!")
        print(f"Text: {data.get('text', 'N/A')}")
        print(f"Language: {data.get('language', 'N/A')}")
        print(f"Duration: {data.get('duration', 'N/A')} seconds")
        print(f"Segments: {len(data.get('segments', []))}")
    else:
        print(f"\n Transcription failed: {response.text}")

if __name__ == "__main__":
    print("Testing faster-whisper transcription endpoint...")
    print("Note: This test requires pydub. If missing, test manually with voice recording.\n")
    
    try:
        test_transcription()
    except ImportError:
        print(" pydub not installed. Skipping automated test.")
        print("To test manually:")
        print("1. Open the extension")
        print("2. Start a meeting")
        print("3. Click the green 'Voice Note' button")
        print("4. Speak for a few seconds")
        print("5. Check if transcription appears faster (4x speed improvement)")
    except Exception as e:
        print(f" Test error: {e}")
        print("\nTo test manually:")
        print("1. Load the extension in Chrome")
        print("2. Join a meeting (Google Meet, Zoom, or Teams)")
        print("3. Click 'Start Meeting'")
        print("4. Click the green 'Voice Note' button")
        print("5. Speak for a few seconds")
        print("6. Verify transcription appears quickly")
        print("7. Click 'End Meeting'")
        print("8. PDF should auto-download with transcribed content")
