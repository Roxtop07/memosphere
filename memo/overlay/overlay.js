/**
 * MemoSphere AI Overlay
 * Notion AI-style assistant with context detection, summarization, and voice input
 */

class MemoSphereOverlay {
    constructor() {
        this.isVisible = false;
        this.isProcessing = false;
        this.backendUrl = 'http://localhost:8000';
        this.overlayElement = null;
        this.currentContext = null;
        this.recognition = null;
        this.isListening = false;

        this.init();
    }

    init() {
        this.createOverlay();
        this.setupEventListeners();
        this.detectPageContext();
        this.setupVoiceRecognition();
    }

    createOverlay() {
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'memosphere-ai-overlay';
        overlay.className = 'ms-overlay-hidden';
        overlay.innerHTML = `
      <div class="ms-overlay-backdrop"></div>
      <div class="ms-overlay-panel">
        <div class="ms-overlay-header">
          <div class="ms-overlay-title">
            <svg class="ms-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span>MemoSphere AI</span>
            <span class="ms-context-badge" id="ms-context-badge">Detecting...</span>
          </div>
          <button class="ms-close-btn" id="ms-close-overlay">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div class="ms-overlay-content">
          <div class="ms-suggestions" id="ms-suggestions">
            <button class="ms-suggestion-btn" data-action="summarize">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 6h16M4 12h16M4 18h7"/>
              </svg>
              Summarize this page
            </button>
            <button class="ms-suggestion-btn" data-action="extract-decisions">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
              Extract key decisions
            </button>
            <button class="ms-suggestion-btn" data-action="generate-agenda">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              Generate agenda
            </button>
            <button class="ms-suggestion-btn" data-action="action-items">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              List action items
            </button>
          </div>

          <div class="ms-input-container">
            <textarea 
              id="ms-input" 
              placeholder="Ask anything or press the mic to speak..."
              rows="3"
            ></textarea>
            <div class="ms-input-actions">
              <button class="ms-voice-btn" id="ms-voice-btn" title="Voice input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                </svg>
              </button>
              <button class="ms-send-btn" id="ms-send-btn" title="Send">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="ms-response" id="ms-response"></div>
          
          <div class="ms-loading" id="ms-loading">
            <div class="ms-spinner"></div>
            <span>Processing...</span>
          </div>
        </div>

        <div class="ms-overlay-footer">
          <div class="ms-status" id="ms-status">
            <svg class="ms-icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span id="ms-status-text">Ready</span>
          </div>
          <div class="ms-shortcuts">
            <kbd>Ctrl</kbd> + <kbd>Space</kbd> to toggle
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);
        this.overlayElement = overlay;
    }

    setupEventListeners() {
        // Close button
        document.getElementById('ms-close-overlay').addEventListener('click', () => {
            this.hide();
        });

        // Backdrop click
        this.overlayElement.querySelector('.ms-overlay-backdrop').addEventListener('click', () => {
            this.hide();
        });

        // Suggestion buttons
        document.querySelectorAll('.ms-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleAction(action);
            });
        });

        // Send button
        document.getElementById('ms-send-btn').addEventListener('click', () => {
            this.handleUserInput();
        });

        // Voice button
        document.getElementById('ms-voice-btn').addEventListener('click', () => {
            this.toggleVoiceInput();
        });

        // Input enter key
        document.getElementById('ms-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.handleUserInput();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        // Listen for keyboard shortcut from background script
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'TOGGLE_OVERLAY') {
                this.toggle();
            }
        });
    }

    setupVoiceRecognition() {
        // Initialize Whisper-based voice recorder
        if (VoiceRecorder.isSupported()) {
            this.voiceRecorder = new VoiceRecorder();
            this.voiceRecorder.initialize().then(() => {
                console.log('✓ Whisper voice recorder ready');
            }).catch(error => {
                console.error('Voice recorder init failed:', error);
            });
        } else {
            console.warn('Voice recording not supported in this browser');
        }
    }

    async toggleVoiceInput() {
        if (!this.voiceRecorder) {
            this.showStatus('Voice input not supported in this browser', 'error');
            return;
        }

        if (this.isListening) {
            // Stop recording
            this.voiceRecorder.stopRecording();
            this.isListening = false;
            this.showStatus('Processing...', 'info');
        } else {
            // Start recording
            this.isListening = true;
            this.showStatus('Listening... (Whisper AI)', 'info');

            await this.voiceRecorder.startRecording((transcript) => {
                // Insert transcript into input
                const input = document.getElementById('ms-input');
                if (input) {
                    input.value = transcript;
                }

                // Also push transcript into the meeting manager if active
                try {
                    if (window.meetingManager && typeof window.meetingManager.addTranscript === 'function') {
                        window.meetingManager.addTranscript({ speaker: 'Voice', text: transcript });
                    }
                } catch (e) {
                    console.warn('Could not add transcript to meetingManager:', e);
                }

                this.isListening = false;
                this.updateVoiceButton();
                this.showStatus('✓ Transcribed!', 'success');
            });
        }

        this.updateVoiceButton();
    }

    updateVoiceButton() {
        const btn = document.getElementById('ms-voice-btn');
        if (this.isListening) {
            btn.classList.add('ms-listening');
        } else {
            btn.classList.remove('ms-listening');
        }
    }

    async detectPageContext() {
        const url = window.location.href;
        const title = document.title;
        const content = document.body.innerText.substring(0, 1000);

        // Detect context based on URL and content
        let context = 'unknown';
        if (url.includes('/meeting') || title.toLowerCase().includes('meeting')) {
            context = 'meeting';
        } else if (url.includes('/event') || title.toLowerCase().includes('event')) {
            context = 'event';
        } else if (url.includes('/policy') || title.toLowerCase().includes('policy')) {
            context = 'policy';
        } else if (url.includes('meet.google.com') || url.includes('zoom.us')) {
            context = 'live-meeting';
        }

        this.currentContext = {
            type: context,
            url,
            title,
            content
        };

        // Update context badge
        const badge = document.getElementById('ms-context-badge');
        const contextLabels = {
            'meeting': '📅 Meeting',
            'event': '🎉 Event',
            'policy': '📋 Policy',
            'live-meeting': '🔴 Live Meeting',
            'unknown': '📄 Page'
        };
        badge.textContent = contextLabels[context] || '📄 Page';

        return this.currentContext;
    }

    async handleAction(action) {
        this.showLoading(true);
        this.clearResponse();

        try {
            const context = await this.detectPageContext();
            const authContext = await window.authManager.getAuthContext();

            if (!authContext.isAuthenticated) {
                throw new Error('Please log in to use AI features');
            }

            // Get page content
            const content = this.extractPageContent();

            // Encrypt content before sending
            const encryptedContent = await window.encryptionManager.encrypt(
                JSON.stringify(content),
                authContext.orgId
            );

            const response = await window.authManager.authenticatedFetch(
                `${this.backendUrl}/api/ai/${action}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        encrypted_content: encryptedContent,
                        context: context.type,
                        org_id: authContext.orgId
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to process request');
            }

            const data = await response.json();

            // Decrypt response if encrypted
            let result = data.result;
            if (data.encrypted && data.result.ciphertext) {
                result = await window.encryptionManager.decrypt(data.result, authContext.orgId);
                result = JSON.parse(result);
            }

            this.displayResponse(result, action);
        } catch (error) {
            console.error('Action error:', error);
            this.displayError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async handleUserInput() {
        const input = document.getElementById('ms-input').value.trim();
        if (!input) return;

        this.showLoading(true);
        this.clearResponse();

        try {
            const authContext = await window.authManager.getAuthContext();
            if (!authContext.isAuthenticated) {
                throw new Error('Please log in to use AI features');
            }

            const context = await this.detectPageContext();
            const content = this.extractPageContent();

            // Encrypt input and content
            const encryptedInput = await window.encryptionManager.encrypt(input, authContext.orgId);
            const encryptedContent = await window.encryptionManager.encrypt(
                JSON.stringify(content),
                authContext.orgId
            );

            const response = await window.authManager.authenticatedFetch(
                `${this.backendUrl}/api/ai/query`, {
                    method: 'POST',
                    body: JSON.stringify({
                        encrypted_query: encryptedInput,
                        encrypted_content: encryptedContent,
                        context: context.type,
                        org_id: authContext.orgId
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to process query');
            }

            const data = await response.json();

            // Decrypt response
            let result = data.result;
            if (data.encrypted && data.result.ciphertext) {
                result = await window.encryptionManager.decrypt(data.result, authContext.orgId);
            }

            this.displayResponse(result, 'query');
            document.getElementById('ms-input').value = '';
        } catch (error) {
            console.error('Query error:', error);
            this.displayError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    extractPageContent() {
        // Extract meaningful content from the page
        const content = {
            title: document.title,
            url: window.location.href,
            text: '',
            headings: [],
            lists: []
        };

        // Get main content
        const mainContent = document.querySelector('main, article, #content, .content') || document.body;
        content.text = mainContent.innerText.substring(0, 5000);

        // Extract headings
        mainContent.querySelectorAll('h1, h2, h3').forEach(h => {
            content.headings.push(h.innerText.trim());
        });

        // Extract lists
        mainContent.querySelectorAll('ul, ol').forEach(list => {
            const items = Array.from(list.querySelectorAll('li')).map(li => li.innerText.trim());
            if (items.length > 0) {
                content.lists.push(items);
            }
        });

        return content;
    }

    displayResponse(result, action) {
            const responseDiv = document.getElementById('ms-response');
            responseDiv.innerHTML = '';
            responseDiv.style.display = 'block';

            if (typeof result === 'string') {
                responseDiv.innerHTML = `<div class="ms-response-text">${this.formatMarkdown(result)}</div>`;
            } else {
                // Format structured response
                let html = '<div class="ms-response-structured">';

                if (result.summary) {
                    html += `<div class="ms-section">
          <h4>📝 Summary</h4>
          <p>${this.formatMarkdown(result.summary)}</p>
        </div>`;
                }

                if (result.decisions && result.decisions.length > 0) {
                    html += `<div class="ms-section">
          <h4>✅ Key Decisions</h4>
          <ul>${result.decisions.map(d => `<li>${d}</li>`).join('')}</ul>
        </div>`;
      }

      if (result.action_items && result.action_items.length > 0) {
        html += `<div class="ms-section">
          <h4>📌 Action Items</h4>
          <ul>${result.action_items.map(a => `<li>${a}</li>`).join('')}</ul>
        </div>`;
      }

      if (result.agenda && result.agenda.length > 0) {
        html += `<div class="ms-section">
          <h4>📋 Agenda</h4>
          <ol>${result.agenda.map(item => `<li>${item}</li>`).join('')}</ol>
        </div>`;
      }

      html += '</div>';
      responseDiv.innerHTML = html;
    }

    // Add copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'ms-copy-btn';
    copyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
      </svg>
      Copy
    `;
    copyBtn.onclick = () => this.copyToClipboard(responseDiv.innerText);
    responseDiv.appendChild(copyBtn);
  }

  displayError(message) {
    const responseDiv = document.getElementById('ms-response');
    responseDiv.innerHTML = `
      <div class="ms-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        <span>${message}</span>
      </div>
    `;
    responseDiv.style.display = 'block';
  }

  formatMarkdown(text) {
    // Simple markdown formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showStatus('Copied to clipboard!', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }

  clearResponse() {
    document.getElementById('ms-response').innerHTML = '';
    document.getElementById('ms-response').style.display = 'none';
  }

  showLoading(show) {
    const loading = document.getElementById('ms-loading');
    loading.style.display = show ? 'flex' : 'none';
    this.isProcessing = show;
  }

  showStatus(message, type = 'info') {
    const statusText = document.getElementById('ms-status-text');
    statusText.textContent = message;
    statusText.className = `ms-status-${type}`;
    
    setTimeout(() => {
      statusText.textContent = 'Ready';
      statusText.className = '';
    }, 3000);
  }

  show() {
    this.overlayElement.classList.remove('ms-overlay-hidden');
    this.overlayElement.classList.add('ms-overlay-visible');
    this.isVisible = true;
    document.getElementById('ms-input').focus();
    this.detectPageContext();
  }

  hide() {
    this.overlayElement.classList.remove('ms-overlay-visible');
    this.overlayElement.classList.add('ms-overlay-hidden');
    this.isVisible = false;
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Initialize overlay when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.memoSphereOverlay = new MemoSphereOverlay();
  });
} else {
  window.memoSphereOverlay = new MemoSphereOverlay();
}