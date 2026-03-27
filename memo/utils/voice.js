/**
 * Voice recording and transcription using Whisper
 */

class VoiceRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.onTranscriptCallback = null;
        this.BACKEND_URL = 'http://localhost:8000/api';
        this.preferWhisperCpp = true; // try whisper.cpp first
        // low-latency incremental processing
        this.chunkQueue = [];
        this.processing = false;
        // track already emitted segments to avoid duplicates
        this.emittedSegmentKeys = new Set();
    }

    /**
     * Initialize voice recording
     */
    async initialize() {
        try {
            // Request microphone permission
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Create MediaRecorder
            const mimeType = this.getSupportedMimeType();
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });

            // Handle data available - push to queue for incremental transcription
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    // keep all chunks for a final, higher-accuracy pass at the end
                    this.audioChunks.push(event.data);
                    this.chunkQueue.push(event.data);
                    this.processQueue();
                }
            };

            // Handle recording stop
            this.mediaRecorder.onstop = async() => {
                // drain queue quickly on stop
                await this.waitForQueueToDrain(3000);
                // do not process here; we will do a final high-accuracy pass via finalize()
            };

            console.log('✓ Voice recorder initialized with', mimeType);
            return true;

        } catch (error) {
            console.error('Failed to initialize voice recorder:', error);
            throw new Error('Microphone access denied or not available');
        }
    }

    /**
     * Check microphone permission state (best-effort)
     */
    static async checkPermission() {
        try {
            if (navigator.permissions && navigator.permissions.query) {
                // Not supported in all contexts; wrap in try/catch
                const status = await navigator.permissions.query({ name: 'microphone' });
                return status.state; // 'granted' | 'prompt' | 'denied'
            }
        } catch (_) { /* ignore */ }
        // Fallback unknown state
        return 'prompt';
    }

    /**
     * Proactively ask for microphone permission without starting a long recording
     */
    static async requestPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Immediately stop the tracks; we only needed the prompt
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
            return true;
        } catch (e) {
            console.warn('Microphone permission request failed:', e);
            return false;
        }
    }

    /**
     * Get supported MIME type for audio recording
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'audio/webm'; // fallback
    }

    /**
     * Start recording
     */
    async startRecording(onTranscript) {
        if (this.isRecording) {
            console.warn('Already recording');
            return;
        }

        if (!this.mediaRecorder) {
            await this.initialize();
        }

        this.audioChunks = [];
        this.chunkQueue = [];
        this.onTranscriptCallback = onTranscript;

        // shorter timeslice for lower latency
        // Slightly longer slices improve context for whisper decoding
        this.mediaRecorder.start(2500);
        this.isRecording = true;

        console.log('🎤 Voice recording started');
    }

    /**
     * Stop recording
     */
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return;
        }

        this.mediaRecorder.stop();
        this.isRecording = false;

        console.log('⏹️ Voice recording stopped');
    }

    /**
     * Process recorded audio and transcribe
     */
    async processRecording() {
        if (this.audioChunks.length === 0) {
            console.warn('No audio data to process');
            return;
        }

        try {
            // Create blob from chunks
            const audioBlob = new Blob(this.audioChunks, {
                type: this.mediaRecorder.mimeType
            });

            // Clear chunks for next recording
            this.audioChunks = [];

            // Transcribe using Whisper
            const transcript = await this.transcribeOnce(audioBlob);

            // Call callback with transcript
            if (this.onTranscriptCallback && transcript) {
                this.onTranscriptCallback(transcript);
            }

        } catch (error) {
            console.error('Failed to process recording:', error);
        }
    }

    /**
     * Transcribe audio using Whisper API
     */
    async transcribe(audioBlob) {
        try {
            // Create form data
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            return await this.transcribeOnce(formData);

        } catch (error) {
            console.error('Transcription error:', error);
            throw error;
        }
    }

    // Single-attempt transcription with fallback, no recursion
    async transcribeOnce(formDataOrBlob) {
        const toFormData = (input) => {
            if (input instanceof FormData) return input;
            const fd = new FormData();
            fd.append('audio', input, 'chunk.webm');
            return fd;
        };

        const formData = toFormData(formDataOrBlob);

        const doPost = async(route) => {
            const res = await fetch(`${this.BACKEND_URL}/${route}`, { method: 'POST', body: formData });
            if (!res.ok) return null;
            try { return await res.json(); } catch { return null; }
        };

        let primary, secondary;
        if (this.preferWhisperCpp) {
            primary = 'transcribe-whispercpp';
            secondary = 'transcribe';
        } else {
            primary = 'transcribe';
            secondary = 'transcribe-whispercpp';
        }

        const first = await doPost(primary);
        const result = first || await doPost(secondary);
        if (!result || typeof result.text !== 'string') {
            throw new Error('Transcription failed');
        }

        // If we got structured segments, emit them immediately (improves accuracy)
        if (Array.isArray(result.segments) && result.segments.length) {
            result.segments.forEach(seg => {
                const key = `${seg.start}|${seg.end}|${seg.text}`;
                if (!this.emittedSegmentKeys.has(key) && seg.text && seg.text.trim()) {
                    this.emittedSegmentKeys.add(key);
                    // Directly push to meeting manager to avoid callback conflation with voice notes
                    if (window.meetingManager && typeof window.meetingManager.addTranscript === 'function') {
                        try {
                            window.meetingManager.addTranscript({
                                speaker: 'Voice',
                                text: seg.text.trim(),
                                start: seg.start,
                                end: seg.end
                            });
                        } catch (e) {
                            console.warn('Segment injection failed:', e);
                        }
                    }
                }
            });
        }

        // Return full text (callback may use it for voice note summary)
        return result.text;
    }

    // Finalize: run a single high-accuracy pass over the full session audio
    async finalize() {
        try {
            // ensure queue is drained
            await this.waitForQueueToDrain(3000);
            if (!this.audioChunks || this.audioChunks.length === 0) return;
            const mime = (this.mediaRecorder && this.mediaRecorder.mimeType) || 'audio/webm';
            const fullBlob = new Blob(this.audioChunks, { type: mime });
            const text = await this.transcribeOnce(fullBlob);
            if (text && this.onTranscriptCallback) {
                // Provide a summarized voice note line (aggregated)
                this.onTranscriptCallback(text);
            }
        } catch (e) {
            console.warn('Finalize transcription failed:', e.message || e);
        }
    }

    // Sequential queue processor to avoid overlap and delays
    async processQueue() {
        if (this.processing) return;
        this.processing = true;
        try {
            while (this.chunkQueue.length > 0 && this.isRecording) {
                const chunk = this.chunkQueue.shift();
                if (!chunk || chunk.size === 0) continue;
                const text = await this.transcribeOnce(chunk);
                if (text && this.onTranscriptCallback) {
                    this.onTranscriptCallback(text);
                }
            }
        } catch (e) {
            console.warn('Chunk transcription error:', e.message || e);
        } finally {
            this.processing = false;
            if (this.chunkQueue.length > 0 && this.isRecording) {
                // new chunks came in while processing
                this.processQueue();
            }
        }
    }

    async waitForQueueToDrain(timeoutMs = 3000) {
        const start = Date.now();
        while ((this.processing || this.chunkQueue.length > 0) && (Date.now() - start) < timeoutMs) {
            await new Promise(r => setTimeout(r, 100));
        }
    }

    /**
     * Record and transcribe a single utterance
     */
    async recordSingle(durationMs = 5000) {
        return new Promise((resolve, reject) => {
            let transcript = '';

            this.startRecording((text) => {
                transcript = text;
            });

            setTimeout(() => {
                this.stopRecording();

                // Wait a bit for processing
                setTimeout(() => {
                    resolve(transcript);
                }, 1000);
            }, durationMs);
        });
    }

    /**
     * Release resources
     */
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.mediaRecorder) {
            if (this.isRecording) {
                this.mediaRecorder.stop();
            }
            this.mediaRecorder = null;
        }

        this.audioChunks = [];
        this.isRecording = false;

        console.log('✓ Voice recorder cleaned up');
    }

    /**
     * Check if recording is supported
     */
    static isSupported() {
        return !!(navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            window.MediaRecorder);
    }
}

// Export for use in extension
if (typeof window !== 'undefined') {
    window.VoiceRecorder = VoiceRecorder;
}