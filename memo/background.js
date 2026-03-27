/**
 * MemoSphere Background Service Worker
 * Enhanced with queue management, encryption, and command handling
 */

const BACKEND_BASE_URL = "http://localhost:8000";

// State management
const state = {
    queue: [],
    isProcessing: false,
    retryCount: 0,
    maxRetries: 3
};

/**
 * Installation handler
 */
chrome.runtime.onInstalled.addListener(() => {
    console.log('MemoSphere AI Extension installed');

    // Context menus are handled by the extension action
});

/**
 * Command handler for keyboard shortcuts
 */
chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            switch (command) {
                case '_execute_action':
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_OVERLAY' });
                    break;

                case 'global_search':
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SEARCH' });
                    break;
            }
        }
    });
});

/**
 * Enhanced queue processing
 */
async function processQueue() {
    if (state.isProcessing || state.queue.length === 0) return;

    state.isProcessing = true;

    while (state.queue.length > 0) {
        const item = state.queue[0];

        try {
            // Send to backend (no authentication required)
            const response = await fetch(`${BACKEND_BASE_URL}/api/transcripts/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(item)
            });

            if (response.ok) {
                console.log('✓ Uploaded transcript chunk');
                state.queue.shift();
                state.retryCount = 0;
            } else {
                console.warn('Server returned', response.status);
                state.retryCount++;

                if (state.retryCount >= state.maxRetries) {
                    console.error('Max retries reached, removing item');
                    state.queue.shift();
                    state.retryCount = 0;
                }
                break;
            }
        } catch (error) {
            console.error('Upload failed:', error);
            state.retryCount++;

            if (state.retryCount >= state.maxRetries) {
                console.error('Max retries reached, removing item');
                state.queue.shift();
                state.retryCount = 0;
            }
            break;
        }
    }

    state.isProcessing = false;
}

/**
 * Message handler
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'NEW_CAPTION':
            handleNewCaption(message.payload, sender);
            sendResponse({ success: true });
            break;

        case 'TRANSCRIPT_UPDATE':
            // Forward to active tabs for meeting manager
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, message).catch(() => {});
                });
            });
            break;
    }
});

/**
 * Handle new caption
 */
function handleNewCaption(payload, sender) {
    // Enhance with sender info
    const enhancedPayload = {
        ...payload,
        source: sender.tab ? {
            id: sender.tab.id,
            title: sender.tab.title,
            url: sender.tab.url
        } : null,
        captured_at: new Date().toISOString()
    };

    // Add to queue
    state.queue.push(enhancedPayload);

    // Try to process immediately
    processQueue();
}

/**
 * Periodic queue flush
 */
chrome.alarms.create('flush-queue', { periodInMinutes: 1 });
chrome.alarms.create('cleanup', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener((alarm) => {
    switch (alarm.name) {
        case 'flush-queue':
            processQueue();
            break;

        case 'cleanup':
            // Clean up old data
            if (state.queue.length > 1000) {
                console.warn('Queue too large, trimming...');
                state.queue = state.queue.slice(-500);
            }
            break;
    }
});

/**
 * Handle extension icon click
 */
chrome.action.onClicked.addListener((tab) => {
    // Toggle overlay on current tab
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' }).catch(() => {
        console.log('Could not send message to tab');
    });
});

/**
 * Network request interceptor for debugging
 */
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        // Log API requests for debugging
        if (details.url.includes('/api/')) {
            console.log('API Request:', details.method, details.url);
        }
    }, { urls: ["<all_urls>"] }
);

// Initialize
console.log('MemoSphere Background Service Worker ready');