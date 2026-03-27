/**
 * MemoSphere Meeting Manager
 * Handles meeting capture, AI structuring, and PDF generation
 */

class MeetingManager {
    constructor() {
        this.currentMeeting = null;
        this.transcriptBuffer = [];
        this.isRecording = false;
        this.meetingStartTime = null;
        this.meetingEndTimer = null;
        this.backendUrl = 'http://localhost:8000';
        this.autoSendPDF = true; // Automatically send PDF when meeting ends

        this.init();
    }

    init() {
        // Listen for meeting start/end signals
        this.detectMeetingControls();
        this.setupMeetingListeners();
    }

    detectMeetingControls() {
        // Inject "End Meeting & Document" button for meeting platforms
        const url = window.location.href;

        if (url.includes('meet.google.com') || url.includes('zoom.us') || url.includes('teams.microsoft.com')) {
            this.injectMeetingControls();
        }
    }

    injectMeetingControls() {
        // Create meeting control panel
        const panel = document.createElement('div');
        panel.id = 'ms-meeting-controls';
        panel.innerHTML = `
      <div class="ms-meeting-panel">
        <div class="ms-meeting-status">
          <div class="ms-recording-indicator" id="ms-recording-indicator">
            <span class="ms-recording-dot"></span>
            <span>Recording</span>
          </div>
          <div class="ms-meeting-timer" id="ms-meeting-timer">00:00:00</div>
        </div>
                <button class="ms-meeting-btn" id="ms-enable-mic" style="display:none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                    </svg>
                    Enable Microphone
                </button>
        <button class="ms-meeting-btn" id="ms-start-meeting">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="10 8 16 12 10 16 10 8"/>
          </svg>
          Start Capture
        </button>
        <button class="ms-meeting-btn ms-btn-voice" id="ms-voice-note" style="display:none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
          </svg>
          <span id="ms-voice-note-text">Voice Note</span>
        </button>
        <button class="ms-meeting-btn ms-btn-danger" id="ms-end-meeting" style="display:none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="6" y="6" width="12" height="12"/>
          </svg>
          End & Document
        </button>
      </div>
    `;

        // Inject styles
        const style = document.createElement('style');
        style.textContent = `
      #ms-meeting-controls {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 9999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      }
      .ms-meeting-panel {
        background: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 200px;
      }
      .ms-meeting-status {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .ms-recording-indicator {
        display: none;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #dc2626;
        font-weight: 500;
      }
      .ms-recording-indicator.active {
        display: flex;
      }
      .ms-recording-dot {
        width: 8px;
        height: 8px;
        background: #dc2626;
        border-radius: 50%;
        animation: blink 1.5s infinite;
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      .ms-meeting-timer {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        font-variant-numeric: tabular-nums;
      }
      .ms-meeting-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
                min-width: 180px;
                white-space: nowrap;
      }
      .ms-meeting-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      .ms-meeting-btn svg {
        width: 16px;
        height: 16px;
        stroke-width: 2;
      }
            .ms-meeting-btn.ms-processing {
                opacity: 0.9;
                cursor: default;
            }
            .ms-spin { animation: ms-rotate 1s linear infinite; }
            @keyframes ms-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            #ms-enable-mic { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
      .ms-btn-danger {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }
      .ms-btn-danger:hover {
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      }
      .ms-btn-voice {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }
      .ms-btn-voice:hover {
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      }
      .ms-btn-voice.recording {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    `;

        document.head.appendChild(style);
        document.body.appendChild(panel);

        // Setup event listeners
        document.getElementById('ms-start-meeting').addEventListener('click', () => {
            this.startMeeting();
        });

        document.getElementById('ms-end-meeting').addEventListener('click', () => {
            this.endMeeting();
        });

        document.getElementById('ms-voice-note').addEventListener('click', () => {
            this.toggleVoiceNote();
        });

        // Mic permission button
        const enableMicBtn = document.getElementById('ms-enable-mic');
        if (enableMicBtn) {
            enableMicBtn.addEventListener('click', async() => {
                const ok = await window.VoiceRecorder.requestPermission();
                if (ok) {
                    this.showNotification('🎙️ Microphone enabled', 'You can now record voice notes');
                    enableMicBtn.style.display = 'none';
                } else {
                    this.showNotification('⚠️ Microphone blocked', 'Please allow mic access in your browser');
                }
            });
        }

        // Decide whether to show the permission button now
        this.updateMicPermissionUI();
    }

    setupMeetingListeners() {
        // Listen for transcript updates from content script
        chrome.runtime.onMessage.addListener((message, sender) => {
            if (message.type === 'TRANSCRIPT_UPDATE') {
                this.addTranscript(message.payload);
            }
        });
    }

    async startMeeting() {
        // No authentication required anymore
        this.isRecording = true;
        this.meetingStartTime = new Date();
        this.transcriptBuffer = [];

        // Initialize meeting object
        this.currentMeeting = {
            id: this.generateMeetingId(),
            title: document.title || 'Untitled Meeting',
            start_time: this.meetingStartTime.toISOString(),
            url: window.location.href,
            platform: this.detectPlatform(),
            participants: [],
            transcript: [],
            notes: []
        };

        // Initialize voice recorder (will ask for mic if not already granted)
        if (!this.voiceRecorder && window.VoiceRecorder && VoiceRecorder.isSupported()) {
            this.voiceRecorder = new VoiceRecorder();
            await this.voiceRecorder.initialize().catch(err => {
                console.warn('Voice recorder initialization failed:', err);
            });
        }

        // Update UI
        document.getElementById('ms-start-meeting').style.display = 'none';
        document.getElementById('ms-end-meeting').style.display = 'flex';
        document.getElementById('ms-voice-note').style.display = 'flex';
        document.getElementById('ms-recording-indicator').classList.add('active');

        // Start timer
        this.startTimer();

        // Notify user
        this.showNotification('Meeting capture started', 'Recording transcript and generating AI insights');
    }

    async updateMicPermissionUI() {
        try {
            const enableMicBtn = document.getElementById('ms-enable-mic');
            if (!enableMicBtn || !window.VoiceRecorder) return;
            const state = await window.VoiceRecorder.checkPermission();
            // Show the button when permission is not yet granted
            if (state === 'granted') {
                enableMicBtn.style.display = 'none';
            } else {
                enableMicBtn.style.display = 'flex';
            }
        } catch (_) { /* ignore */ }
    }

    async endMeeting() {
        if (!this.isRecording || !this.currentMeeting) return;
        if (this._ending) return; // guard against double clicks
        this._ending = true;

        const endBtn = document.getElementById('ms-end-meeting');
        if (endBtn) {
            endBtn.disabled = true;
            endBtn.classList.add('ms-processing');
            endBtn.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="ms-spin"><circle cx="12" cy="12" r="10"/></svg>
              Processing...`;
        }

        // Show processing notification
        this.showNotification('Processing meeting...', 'Please wait while we structure and document your meeting');

        this.isRecording = false;
        const endTime = new Date();

        // Stop voice recorder if active
        if (this.voiceRecorder && this.isRecordingVoice) {
            this.voiceRecorder.stopRecording();
            this.isRecordingVoice = false;
        }

        this.currentMeeting.end_time = endTime.toISOString();
        this.currentMeeting.duration = Math.floor((endTime - this.meetingStartTime) / 1000);
        this.currentMeeting.transcript = this.transcriptBuffer;

        try {
            // If voice recorder exists, run a final high-accuracy pass over full session audio
            if (this.voiceRecorder && typeof this.voiceRecorder.finalize === 'function') {
                try {
                    await this.voiceRecorder.finalize();
                } catch (e) {
                    console.warn('Finalize voice transcription failed:', e);
                }
            }

            // Structure meeting with AI using OpenRouter
            const structuredMeeting = await this.structureMeetingWithAI(this.currentMeeting);

            // Generate PDF from backend
            const pdfBlob = await this.generatePDFFromBackend(structuredMeeting);

            // Automatically download PDF for user
            if (this.autoSendPDF && pdfBlob) {
                this.downloadPDF(pdfBlob, structuredMeeting.title);
            }

            // Save to local storage
            await this.saveMeetingLocally(structuredMeeting);

            // Upload to backend
            await this.uploadMeeting(structuredMeeting, pdfBlob);

            // Update UI
            document.getElementById('ms-start-meeting').style.display = 'flex';
            document.getElementById('ms-end-meeting').style.display = 'none';
            document.getElementById('ms-voice-note').style.display = 'none';
            document.getElementById('ms-recording-indicator').classList.remove('active');
            this.stopTimer();

            // Success notification with PDF download link
            this.showNotification('✅ Meeting documented & PDF sent!', 'Your meeting PDF has been downloaded and saved');

            // Reset
            this.currentMeeting = null;
            this.transcriptBuffer = [];

        } catch (error) {
            console.error('Meeting documentation error:', error);
            this.showNotification('⚠️ Error documenting meeting', error.message);

            // Try to save locally even if backend fails
            try {
                await this.saveMeetingLocally(this.currentMeeting);
                this.showNotification('Meeting saved locally', 'Cloud sync failed but data is safe');
            } catch (localError) {
                alert('Failed to document meeting: ' + error.message);
            }
        } finally {
            // Always restore UI and button state
            const endBtn2 = document.getElementById('ms-end-meeting');
            if (endBtn2) {
                endBtn2.disabled = false;
                endBtn2.classList.remove('ms-processing');
                endBtn2.innerHTML = `
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="6" y="6" width="12" height="12"/>
                  </svg>
                  End & Document`;
            }
            this._ending = false;
        }
    }

    addTranscript(transcriptItem) {
        if (!this.isRecording) return;

        // Clean & filter transcript line
        const cleaned = this.cleanTranscriptLine(transcriptItem.text || '');
        if (!cleaned) return; // skip noise

        // Deduplicate consecutive identical lines
        const last = this.transcriptBuffer[this.transcriptBuffer.length - 1];
        if (last && last.text === cleaned && last.speaker === (transcriptItem.speaker || 'Unknown')) {
            return;
        }

        this.transcriptBuffer.push({
            timestamp: new Date().toISOString(),
            speaker: transcriptItem.speaker || 'Unknown',
            text: cleaned
        });
    }

    async toggleVoiceNote() {
        if (!this.voiceRecorder) {
            this.showNotification('⚠️ Voice input not available', 'Microphone access required');
            return;
        }

        if (!this.isRecording) {
            this.showNotification('⚠️ Start meeting first', 'Click "Start Capture" to begin recording');
            return;
        }
        // Keep End & Document button interactive during voice note.
        // Do not disable or replace it here; allow user to end meeting anytime.

        const button = document.getElementById('ms-voice-note');
        const textSpan = document.getElementById('ms-voice-note-text');

        if (this.isRecordingVoice) {
            // Stop recording
            this.voiceRecorder.stopRecording();
            this.isRecordingVoice = false;
            button.classList.remove('recording');
            // Show processing state while transcription finishes (can be long paragraphs)
            button.classList.add('ms-processing');
            button.disabled = true;
            button.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="ms-spin"><circle cx="12" cy="12" r="10"/></svg>
              Processing...`;
            this.showNotification('🎤 Processing voice note...', 'Transcribing your note');
            // Fallback restore in case callback doesn't fire (network error, etc.)
            clearTimeout(this._voiceProcessingTimer);
            this._voiceProcessingTimer = setTimeout(() => {
                try {
                    button.classList.remove('ms-processing');
                    button.disabled = false;
                    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg><span id="ms-voice-note-text">Voice Note</span>';
                    this.showNotification('⚠️ Voice note processing timed out', 'You can try recording again');
                } catch (_) {}
            }, 15000);
        } else {
            // Start recording
            this.isRecordingVoice = true;
            button.classList.add('recording');
            textSpan.textContent = 'Stop Recording';
            this.showNotification('🎤 Recording voice note...', 'Speak now (using Whisper AI)');

            await this.voiceRecorder.startRecording((transcript) => {
                // Add to meeting transcript
                this.addTranscript({
                    speaker: 'Voice Note',
                    text: transcript
                });

                // Stop after processing
                this.isRecordingVoice = false;
                // Restore button UI from processing state
                button.classList.remove('recording');
                button.classList.remove('ms-processing');
                button.disabled = false;
                button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg><span id="ms-voice-note-text">Voice Note</span>';
                clearTimeout(this._voiceProcessingTimer);
            });
        }
    }

    async structureMeeting(meeting) {
        const authContext = await window.authManager.getAuthContext();

        // Prepare meeting data
        const meetingData = {
            title: meeting.title,
            transcript: meeting.transcript.map(t => `[${t.speaker}]: ${t.text}`).join('\n'),
            duration: meeting.duration,
            platform: meeting.platform
        };

        // Encrypt meeting data
        const encryptedData = await window.encryptionManager.encrypt(
            JSON.stringify(meetingData),
            authContext.orgId
        );

        // Send to AI for structuring
        const response = await window.authManager.authenticatedFetch(
            `${this.backendUrl}/api/meetings/structure`, {
                method: 'POST',
                body: JSON.stringify({
                    encrypted_meeting: encryptedData,
                    org_id: authContext.orgId,
                    meeting_id: meeting.id
                })
            }
        );

        if (!response.ok) {
            throw new Error('Failed to structure meeting');
            this._ending = false;
        }

        const result = await response.json();

        // Decrypt structured data
        let structured;
        if (result.encrypted && result.data.ciphertext) {
            const decrypted = await window.encryptionManager.decrypt(result.data, authContext.orgId);
            structured = JSON.parse(decrypted);
        } else {
            structured = result.data;
        }

        // Merge with original meeting
        return {
            ...meeting,
            ...structured,
            summary: structured.summary || '',
            agenda: structured.agenda || [],
            discussions: structured.discussions || [],
            decisions: structured.decisions || [],
            action_items: structured.action_items || [],
            description: structured.description || ''
        };
    }

    async generatePDF(meeting) {
        // Request PDF generation from backend (no auth required)
        const response = await fetch(`${this.backendUrl}/api/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: meeting.title,
                description: meeting.description,
                summary: meeting.summary,
                agenda: meeting.agenda,
                discussions: meeting.discussions,
                decisions: meeting.decisions,
                action_items: meeting.actionItems || meeting.action_items || [],
                duration: meeting.duration,
                date: meeting.start_time,
                transcript: (typeof meeting.transcript === 'string') ? meeting.transcript : meeting.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }

        return await response.blob();
    }

    async uploadMeeting(meeting, pdfBlob) {
        try {
            // Create form data
            const formData = new FormData();
            formData.append('meeting_data', JSON.stringify(meeting));
            formData.append('pdf', pdfBlob, `${meeting.id}.pdf`);

            const response = await fetch(`${this.backendUrl}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                console.warn('Failed to upload to backend, saved locally');
                return null;
            }

            return await response.json();
        } catch (error) {
            console.warn('Backend upload failed:', error);
            return null;
        }
    }

    async structureMeetingWithAI(meeting) {
        try {
            // Use OpenRouter to structure the meeting
            const openRouterClient = new window.OpenRouterClient();

            const transcript = meeting.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');

            // Get summary
            const summary = await openRouterClient.summarize(transcript);

            // Extract decisions
            const decisions = await openRouterClient.extractDecisions(transcript);

            // Extract action items
            const actionItems = await openRouterClient.extractActionItems(transcript);

            // Structure the meeting
            const structured = await openRouterClient.structureMeeting({
                title: meeting.title,
                transcript: transcript,
                duration: meeting.duration
            });

            return {
                ...meeting,
                summary: summary,
                decisions: decisions,
                actionItems: actionItems,
                structuredData: structured
            };
        } catch (error) {
            console.error('AI structuring failed:', error);
            // Return ONLY what was captured - no fake data
            return {
                ...meeting,
                summary: '', // Empty if AI fails - don't fake it
                decisions: [], // Empty array - only real decisions
                actionItems: [], // Empty array - only real action items
                structuredData: null
            };
        }
    }

    async generatePDFFromBackend(meeting) {
        try {
            // Only send data that was actually captured during live meeting
            // Include ALL captured lines (voice notes + captions), skip only noise
            const transcriptText = (typeof meeting.transcript === 'string') ?
                meeting.transcript :
                (Array.isArray(meeting.transcript) ?
                    meeting.transcript
                    .map(t => {
                        if (!t) return null;
                        const speaker = (t.speaker || 'Unknown').toString();
                        const cleanedLine = this.cleanTranscriptLine(t.text || '');
                        return cleanedLine ? `${speaker}: ${cleanedLine}` : null;
                    })
                    .filter(Boolean)
                    .join('\n') :
                    '');

            // Filter out empty/default values
            const pdfData = {
                title: meeting.title || 'Meeting Notes',
                date: meeting.start_time,
                duration: meeting.duration || 0
            };

            // Only include if actually captured
            if (meeting.summary && meeting.summary.trim() && meeting.summary !== 'Meeting captured successfully') {
                pdfData.summary = meeting.summary.trim();
            }

            // Only include decisions that were actually extracted
            if (meeting.decisions && Array.isArray(meeting.decisions) && meeting.decisions.length > 0) {
                pdfData.decisions = meeting.decisions.filter(d => d && d.trim());
            }

            // Only include action items that were actually extracted
            if (meeting.actionItems && Array.isArray(meeting.actionItems) && meeting.actionItems.length > 0) {
                pdfData.action_items = meeting.actionItems.filter(item => item && item.trim());
            }

            // Only include transcript if it has content after cleaning
            if (typeof transcriptText === 'string' && transcriptText.trim()) {
                pdfData.transcript = transcriptText.trim();
            }

            const response = await fetch(`${this.backendUrl}/api/generate-pdf`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pdfData)
            });

            if (!response.ok) {
                throw new Error('Backend PDF generation failed');
            }

            return await response.blob();
        } catch (error) {
            console.error('Backend PDF generation failed:', error);
            // Fallback to client-side PDF generation
            return this.generatePDFClientSide(meeting);
        }
    }

    async generatePDFClientSide(meeting) {
        // Simple fallback - create HTML and convert to PDF using browser print
        const pdfContent = this.generatePDFHTML(meeting);
        const blob = new Blob([pdfContent], { type: 'text/html' });
        return blob;
    }

    generatePDFHTML(meeting) {
            return `
<!DOCTYPE html>
<html>
<head>
    <title>${meeting.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
        h2 { color: #764ba2; margin-top: 30px; }
        .meta { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .section { margin: 20px 0; }
        ul { margin: 10px 0; padding-left: 20px; }
        li { margin: 8px 0; }
        .transcript { background: #f9fafb; padding: 15px; border-left: 4px solid #667eea; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>📝 ${meeting.title}</h1>
    
    <div class="meta">
        <strong>Date:</strong> ${new Date(meeting.start_time).toLocaleString()}<br>
        <strong>Duration:</strong> ${this.formatDuration(meeting.duration)}<br>
        <strong>Platform:</strong> ${meeting.platform}
    </div>

    ${meeting.summary ? `
    <div class="section">
        <h2>📋 Summary</h2>
        <p>${meeting.summary}</p>
    </div>
    ` : ''}

    ${meeting.decisions && meeting.decisions.length > 0 ? `
    <div class="section">
        <h2>✅ Key Decisions</h2>
        <ul>
            ${meeting.decisions.map(d => `<li>${d}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${meeting.actionItems && meeting.actionItems.length > 0 ? `
    <div class="section">
        <h2>📌 Action Items</h2>
        <ul>
            ${meeting.actionItems.map(item => `<li>${item}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${meeting.transcript && meeting.transcript.length > 0 ? `
    <div class="section">
        <h2>💬 Full Transcript</h2>
        <div class="transcript">${meeting.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n')}</div>
    </div>
    ` : ''}
</body>
</html>
        `;
    }

    downloadPDF(blob, title) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show success message
        this.showNotification('📄 PDF Downloaded!', `${title} has been saved to your downloads`);
    }

    async saveMeetingLocally(meeting) {
        try {
            const { meetings = [] } = await chrome.storage.local.get('meetings');
            meetings.unshift(meeting); // Add to beginning
            
            // Keep only last 50 meetings
            if (meetings.length > 50) {
                meetings.length = 50;
            }
            
            await chrome.storage.local.set({ meetings });
            
            // Update recent activity
            await this.updateRecentActivity({
                type: 'meeting',
                title: meeting.title,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to save meeting locally:', error);
            throw error;
        }
    }

    async updateRecentActivity(activity) {
        try {
            const { recentActivity = [] } = await chrome.storage.local.get('recentActivity');
            recentActivity.unshift(activity);
            
            // Keep only last 20 activities
            if (recentActivity.length > 20) {
                recentActivity.length = 20;
            }
            
            await chrome.storage.local.set({ recentActivity });
        } catch (error) {
            console.error('Failed to update recent activity:', error);
        }
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.meetingStartTime) return;

            const elapsed = Math.floor((new Date() - this.meetingStartTime) / 1000);
            const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');

            const timer = document.getElementById('ms-meeting-timer');
            if (timer) {
                timer.textContent = `${hours}:${minutes}:${seconds}`;
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        const timer = document.getElementById('ms-meeting-timer');
        if (timer) {
            timer.textContent = '00:00:00';
        }
    }

    detectPlatform() {
        const url = window.location.href;
        if (url.includes('meet.google.com')) return 'Google Meet';
        if (url.includes('zoom.us')) return 'Zoom';
        if (url.includes('teams.microsoft.com')) return 'Microsoft Teams';
        return 'Unknown';
    }

    generateMeetingId() {
        return `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    showNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: chrome.runtime.getURL('icons/icon48.png')
            });
        }
    }

    // ---------------- Transcript Cleaning ----------------
    cleanTranscriptLine(line) {
        if (!line) return null;
        const raw = line.trim();
        if (!raw) return null;

        const lower = raw.toLowerCase();
        const banned = [
            'keyboard_arrow_up','meeting_room','mic','videocam_off','computer_arrow_up','mood','closed_caption_off','back_hand','more_vert','call_end','info','people','chat','apps','domain_disabled','pen_spark_io25','spark_off','frame_person','visual_effects','backgrounds and effects','learn more','dismiss','video settings','audio settings','share screen','send a reaction','raise hand','meeting details','visitors are in this meeting','gemini isn\'t taking notes','reframe'
        ];

        // Meeting code pattern (e.g. abc-defg-hij)
        if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(raw)) return null;

        // Unknown UI prefix
        if (lower.startsWith('unknown:')) {
            const remainder = lower.replace(/^unknown:/,'').trim();
            if (banned.includes(remainder)) return null;
        }

        if (banned.includes(lower)) return null;

        // High ratio of banned tokens
        const words = lower.split(/\s+/);
        const bannedCount = words.filter(w => banned.includes(w)).length;
        if (bannedCount && bannedCount / words.length >= 0.6) return null;

        // Very short non-speech tokens
        if (words.length === 1 && banned.includes(words[0])) return null;

        // Reject blocks that are just interface clutter (multiple icon names)
        if (words.length <= 6 && bannedCount >= 3) return null;

        // Remove leading "Unknown:" if remaining content looks valid
        if (raw.startsWith('Unknown:')) {
            const after = raw.replace(/^Unknown:/,'').trim();
            if (after && !this.cleanTranscriptLine._recursing) {
                this.cleanTranscriptLine._recursing = true;
                const cleanedAfter = this.cleanTranscriptLine(after);
                this.cleanTranscriptLine._recursing = false;
                return cleanedAfter;
            }
        }

        // Collapse repeated whitespace
        return raw.replace(/\s+/g,' ');
    }
}

// Initialize meeting manager
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.meetingManager = new MeetingManager();
    });
} else {
    window.meetingManager = new MeetingManager();
}