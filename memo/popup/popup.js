// MemoSphere AI Extension - Popup Script

document.addEventListener('DOMContentLoaded', async() => {
    initializeUI();
    loadRecentActivity();
    loadSettings();
    setupEventListeners();
});

function initializeUI() {
    const mainSection = document.getElementById('main-section');
    if (mainSection) {
        mainSection.style.display = 'block';
    }
    updateStatus('Ready');
}

function setupEventListeners() {
    document.getElementById('open-overlay') ?.addEventListener('click', openAIOverlay);
    document.getElementById('open-search') ?.addEventListener('click', openGlobalSearch);
    document.getElementById('start-meeting') ?.addEventListener('click', startMeetingCapture);
    document.getElementById('view-meetings') ?.addEventListener('click', viewMeetings);

    document.getElementById('auto-capture') ?.addEventListener('change', (e) => {
        chrome.storage.local.set({ autoCapture: e.target.checked });
    });

    document.getElementById('enable-encryption') ?.addEventListener('change', (e) => {
        chrome.storage.local.set({ enableEncryption: e.target.checked });
    });

    document.getElementById('enable-voice') ?.addEventListener('change', (e) => {
        chrome.storage.local.set({ enableVoice: e.target.checked });
    });
}

async function openAIOverlay() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await chrome.tabs.sendMessage(tab.id, { action: 'showOverlay' });
            window.close();
        }
    } catch (error) {
        console.error('Error opening overlay:', error);
        showNotification('Error opening AI overlay', 'error');
    }
}

async function openGlobalSearch() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await chrome.tabs.sendMessage(tab.id, { action: 'showSearch' });
            window.close();
        }
    } catch (error) {
        console.error('Error opening search:', error);
        showNotification('Error opening search', 'error');
    }
}

async function startMeetingCapture() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const isMeetingPlatform = tab.url.includes('meet.google.com') ||
            tab.url.includes('zoom.us') ||
            tab.url.includes('teams.microsoft.com');

        if (!isMeetingPlatform) {
            showNotification('Please open a Google Meet, Zoom, or Microsoft Teams meeting', 'warning');
            return;
        }

        await chrome.tabs.sendMessage(tab.id, { action: 'startMeetingCapture' });
        showNotification('Meeting capture started', 'success');
        updateStatus('Recording meeting...');
    } catch (error) {
        console.error('Error starting meeting capture:', error);
        showNotification('Error starting meeting capture', 'error');
    }
}

async function viewMeetings() {
    try {
        const { meetings = [] } = await chrome.storage.local.get('meetings');
        if (meetings.length === 0) {
            showNotification('No meetings found', 'info');
            return;
        }
        const meetingsHTML = generateMeetingsHTML(meetings);
        const blob = new Blob([meetingsHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        await chrome.tabs.create({ url });
        window.close();
    } catch (error) {
        console.error('Error viewing meetings:', error);
        showNotification('Error loading meetings', 'error');
    }
}

function generateMeetingsHTML(meetings) {
    return `<!DOCTYPE html><html><head><title>MemoSphere - Meetings</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:1200px;margin:0 auto;padding:20px;background:#f5f5f5}.meeting{background:white;border-radius:8px;padding:20px;margin-bottom:20px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}.meeting h2{margin-top:0}.meeting-meta{color:#666;font-size:14px;margin-bottom:10px}.section{margin-top:15px}.section h3{font-size:16px;margin-bottom:10px}ul{margin:5px 0}</style></head><body><h1> MemoSphere Meetings</h1>${meetings.map(m => `<div class="meeting"><h2>${m.title || 'Untitled Meeting'}</h2><div class="meeting-meta"> ${new Date(m.timestamp).toLocaleString()}<br> Duration: ${m.duration || 'N/A'}</div>${m.summary ? `<div class="section"><h3> Summary</h3><p>${m.summary}</p></div>` : ''}${m.decisions?.length ? `<div class="section"><h3> Key Decisions</h3><ul>${m.decisions.map(d => `<li>${d}</li>`).join('')}</ul></div>` : ''}${m.actionItems?.length ? `<div class="section"><h3> Action Items</h3><ul>${m.actionItems.map(i => `<li>${i}</li>`).join('')}</ul></div>` : ''}${m.transcript ? `<div class="section"><h3> Transcript</h3><p>${m.transcript}</p></div>` : ''}</div>`).join('')}</body></html>`;
}

async function loadRecentActivity() {
  try {
    const { recentActivity = [] } = await chrome.storage.local.get('recentActivity');
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    if (recentActivity.length === 0) {
      activityList.innerHTML = '<div class="activity-item">No recent activity</div>';
      return;
    }
    activityList.innerHTML = recentActivity.slice(0, 5).map(a => `<div class="activity-item"><div class="activity-icon">${getActivityIcon(a.type)}</div><div class="activity-text"><div class="activity-title">${a.title}</div><div class="activity-time">${formatTime(a.timestamp)}</div></div></div>`).join('');
  } catch (error) {
    console.error('Error loading recent activity:', error);
  }
}

async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get(['autoCapture', 'enableEncryption', 'enableVoice']);
    if (settings.autoCapture !== undefined) {
      const checkbox = document.getElementById('auto-capture');
      if (checkbox) checkbox.checked = settings.autoCapture;
    }
    if (settings.enableEncryption !== undefined) {
      const checkbox = document.getElementById('enable-encryption');
      if (checkbox) checkbox.checked = settings.enableEncryption;
    }
    if (settings.enableVoice !== undefined) {
      const checkbox = document.getElementById('enable-voice');
      if (checkbox) checkbox.checked = settings.enableVoice;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function getActivityIcon(type) {
  const icons = { meeting: '', search: '', ai: '', pdf: '', voice: '' };
  return icons[type] || '';
}

function formatTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function updateStatus(message, type = 'info') {
  const status = document.getElementById('status');
  if (!status) return;
  status.textContent = message;
  status.className = `status ${type}`;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon128.png',
    title: 'MemoSphere AI',
    message: message
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateActivity') loadRecentActivity();
  if (message.action === 'updateStatus') updateStatus(message.status, message.type);
  if (message.action === 'showNotification') showNotification(message.message, message.type);
});