/**
 * MemoSphere Content Script
 * Enhanced caption capture with context awareness and meeting state tracking
 */

(function() {
    'use strict';

    // State management
    let lastSent = "";
    let captureEnabled = false;
    let currentSpeaker = "Unknown";
    let speakerMap = new Map();
    let captionBuffer = [];
    let meetingContext = {
        platform: detectPlatform(),
        startTime: null,
        participants: []
    };

    /**
     * Detect meeting platform
     */
    function detectPlatform() {
        const url = window.location.href;
        if (url.includes('meet.google.com')) return 'google-meet';
        if (url.includes('zoom.us')) return 'zoom';
        if (url.includes('teams.microsoft.com')) return 'teams';
        return 'unknown';
    }

    /**
     * Enhanced caption finding with platform-specific selectors
     */
    function findCaptions() {
        let captions = [];

        switch (meetingContext.platform) {
            case 'google-meet':
                captions = findGoogleMeetCaptions();
                break;
            case 'zoom':
                captions = findZoomCaptions();
                break;
            case 'teams':
                captions = findTeamsCaptions();
                break;
            default:
                captions = findGenericCaptions();
        }

        return captions;
    }

    /**
     * Google Meet caption detection
     */
    function findGoogleMeetCaptions() {
        const results = [];

        // STRICT caption selectors (avoid grabbing entire UI)
        // Google Meet live captions typically appear in aria-live regions or specific caption line containers
        const captionNodes = document.querySelectorAll('[aria-live="polite"] div, [aria-live="assertive"] div, .iOzk7');

        captionNodes.forEach(node => {
            const text = (node.innerText || '').trim();
            if (!text) return;

            if (isNoiseText(text)) return; // filter UI noise

            // Detect speaker (Google Meet often wraps name in specific spans)
            let speaker = currentSpeaker;
            const speakerNode = node.querySelector('.zs7s8d, .YTbUzc, .zWGUib');
            if (speakerNode) {
                const maybeName = speakerNode.innerText.trim();
                if (maybeName && !isNoiseText(maybeName)) speaker = maybeName;
            }

            // Split multi-line blocks into individual caption lines
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !isNoiseText(l));
            lines.forEach(line => {
                results.push({
                    text: line,
                    speaker: speaker,
                    timestamp: new Date().toISOString()
                });
            });
        });

        // Fallback: try generic live regions with filtering
        if (results.length === 0) {
            const liveNodes = document.querySelectorAll('[aria-live]');
            liveNodes.forEach(node => {
                const text = (node.innerText || '').trim();
                if (!text) return;
                const lines = text.split('\n').map(l => l.trim()).filter(l => l && !isNoiseText(l));
                lines.forEach(line => {
                    results.push({
                        text: line,
                        speaker: currentSpeaker,
                        timestamp: new Date().toISOString()
                    });
                });
            });
        }

        return results;
    }

    /**
     * Zoom caption detection
     */
    function findZoomCaptions() {
        const results = [];

        // Zoom caption selectors
        const captionElements = document.querySelectorAll('.caption-line, [data-is-caption]');

        captionElements.forEach(elem => {
            const text = (elem.innerText || '').trim();
            if (!text) return;

            const speaker = elem.getAttribute('data-speaker') || currentSpeaker;

            results.push({
                text: text,
                speaker: speaker,
                timestamp: new Date().toISOString()
            });
        });

        return results;
    }

    /**
     * Teams caption detection
     */
    function findTeamsCaptions() {
        const results = [];

        // Teams caption selectors
        const captionElements = document.querySelectorAll('[data-tid="closed-captions-v2"]');

        captionElements.forEach(elem => {
            const text = (elem.innerText || '').trim();
            if (!text) return;

            results.push({
                text: text,
                speaker: currentSpeaker,
                timestamp: new Date().toISOString()
            });
        });

        return results;
    }

    /**
     * Generic caption detection for other platforms
     */
    function findGenericCaptions() {
        const results = [];

        // Look for common caption patterns
        const liveNodes = document.querySelectorAll('[aria-live], [role="log"]');

        liveNodes.forEach(node => {
            const text = (node.innerText || '').trim();
            if (text && text.length > 5) {
                results.push({
                    text: text,
                    speaker: currentSpeaker,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Fallback: find large text containers
        if (results.length === 0) {
            const candidates = Array.from(document.querySelectorAll('div'))
                .filter(d => (d.innerText || "").length > 20 && (d.innerText || "").length < 500);

            if (candidates.length) {
                const recentTexts = candidates.slice(-3);
                recentTexts.forEach(elem => {
                    results.push({
                        text: elem.innerText.trim(),
                        speaker: currentSpeaker,
                        timestamp: new Date().toISOString()
                    });
                });
            }
        }

        return results;
    }

    /**
     * Detect participants in the meeting
     */
    function detectParticipants() {
        const participants = new Set();

        // Platform-specific participant detection
        switch (meetingContext.platform) {
            case 'google-meet':
                document.querySelectorAll('[data-participant-id], .ZjFb7c').forEach(elem => {
                    const name = elem.getAttribute('aria-label') || elem.innerText;
                    if (name) participants.add(name.trim());
                });
                break;
            case 'zoom':
                document.querySelectorAll('[data-participant-name]').forEach(elem => {
                    const name = elem.getAttribute('data-participant-name');
                    if (name) participants.add(name.trim());
                });
                break;
            case 'teams':
                document.querySelectorAll('[data-tid="roster-participant-name"]').forEach(elem => {
                    const name = elem.innerText;
                    if (name) participants.add(name.trim());
                });
                break;
        }

        meetingContext.participants = Array.from(participants);
    }

    /**
     * Capture loop with enhanced detection
     */
    function captureLoop() {
        if (!captureEnabled) return;

        const captions = findCaptions();

        captions.forEach(caption => {
            const captionKey = `${caption.speaker}:${caption.text}`;

            if (captionKey !== lastSent) {
                lastSent = captionKey;

                // Final noise guard (in case upstream missed it)
                if (isNoiseText(caption.text)) return;

                // Add to buffer
                captionBuffer.push(caption);

                // Send to background script
                const payload = {
                    ...caption,
                    url: location.href,
                    tabTitle: document.title,
                    platform: meetingContext.platform,
                    meetingId: meetingContext.meetingId
                };

                // Send to background script with error handling
                try {
                    chrome.runtime.sendMessage({
                        type: "NEW_CAPTION",
                        payload: payload
                    }).catch(err => console.log('Message send failed:', err));
                } catch (e) {
                    console.log('Chrome runtime not available:', e);
                }

                // Also forward directly to meeting manager if available (reliable, same context)
                if (window.meetingManager && typeof window.meetingManager.addTranscript === 'function') {
                    try {
                        window.meetingManager.addTranscript(caption);
                    } catch (e) {
                        console.log('Meeting manager addTranscript failed:', e);
                    }
                }
            }
        });

        // Periodically detect participants
        if (Math.random() < 0.1) { // 10% of the time
            detectParticipants();
        }
    }

    /**
     * Enable/disable capture
     */
    function setCapture(enabled) {
        captureEnabled = enabled;
        updateIndicator();

        if (enabled && !meetingContext.startTime) {
            meetingContext.startTime = new Date().toISOString();
            meetingContext.meetingId = generateMeetingId();
        }
    }

    /**
     * Update visual indicator
     */
    function updateIndicator() {
        let indicator = document.getElementById('ms-capture-indicator');

        if (!indicator && captureEnabled) {
            indicator = document.createElement('div');
            indicator.id = 'ms-capture-indicator';
            indicator.style.cssText = `
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 999999;
        background: rgba(102, 126, 234, 0.95);
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
      `;

            indicator.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <span>MemoSphere Capturing</span>
      `;

            document.body.appendChild(indicator);
        } else if (indicator && !captureEnabled) {
            indicator.remove();
        }
    }

    /**
     * Generate unique meeting ID
     */
    function generateMeetingId() {
        return `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Listen for messages from background/popup
     */
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
            case 'START_CAPTURE':
                setCapture(true);
                sendResponse({ success: true });
                break;

            case 'STOP_CAPTURE':
                setCapture(false);
                sendResponse({ success: true, buffer: captionBuffer });
                break;

            case 'GET_CONTEXT':
                detectParticipants();
                sendResponse({
                    context: meetingContext,
                    bufferSize: captionBuffer.length
                });
                break;
        }
    });

    /**
     * Initialize
     */
    function init() {
        console.log('MemoSphere content script loaded on', meetingContext.platform);

        // Auto-start capture on meeting platforms
        if (meetingContext.platform !== 'unknown') {
            setCapture(true);
        }

        // Start capture loop
        setInterval(captureLoop, 1500);

        // Detect participants every 10 seconds
        setInterval(detectParticipants, 10000);

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // -------------------- Noise Filtering Utilities --------------------
    const BANNED_TOKENS = new Set([
        'keyboard_arrow_up', 'meeting_room', 'mic', 'videocam_off', 'computer_arrow_up', 'mood', 'closed_caption_off', 'back_hand', 'more_vert', 'call_end', 'info', 'people', 'chat', 'apps', 'domain_disabled', 'pen_spark_io25', 'spark_off', 'frame_person', 'visual_effects', 'backgrounds and effects', 'learn more', 'dismiss', 'video settings', 'audio settings', 'share screen', 'send a reaction', 'raise hand', 'meeting details', 'visitors are in this meeting', 'gemini isn\'t taking notes', 'reframe'
    ]);

    const SINGLE_WORD_UI = [/^[a-z_]+$/i];

    function isNoiseText(text) {
        if (!text) return true;
        const t = text.trim().toLowerCase();
        if (t.length < 2) return true;

        // Direct banned tokens or phrases
        if (BANNED_TOKENS.has(t)) return true;

        // Unknown prefix with UI token
        if (t.startsWith('unknown:')) {
            const remainder = t.replace(/^unknown:/, '').trim();
            if (BANNED_TOKENS.has(remainder)) return true;
            // if remainder very short or matches UI style
            if (remainder.split(/\s+/).every(w => BANNED_TOKENS.has(w))) return true;
        }

        // Too many UI tokens ratio
        const words = t.split(/\s+/);
        const uiCount = words.filter(w => BANNED_TOKENS.has(w)).length;
        if (uiCount > 0 && uiCount / words.length >= 0.6) return true;

        // Single word that looks like icon identifier
        if (words.length === 1 && SINGLE_WORD_UI.some(r => r.test(words[0])) && BANNED_TOKENS.has(words[0])) return true;

        // Repeated meeting code (e.g. zvx-mnbc-rzo pattern) treat as noise unless part of sentence
        if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(t)) return true;

        return false;
    }

    // Inject overlay script only (meeting.js & search.js already loaded via manifest)
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('overlay/overlay.js');
    document.head.appendChild(script);


})();