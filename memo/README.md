<div align="center">
  <img src="https://img.shields.io/badge/Chrome_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Chrome Extension" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
</div>

<h1 align="center">MemoSphere Browser Extension</h1>

<p align="center">
  <strong>The companion browser extension for the SISTEC MemoSphere platform.</strong>
</p>

## ✨ Overview

This extension integrates directly with your browser to bring MemoSphere's powerful meeting and transcription capabilities to any web conferencing platform (Google Meet, Microsoft Teams, Zoom web, etc.).

### 🎯 Key Features

- **One-Click Recording:** Start recording browser audio instantly.
- **Smart Transcription:** Integrates with the MemoSphere backend to provide real-time transcriptions.
- **Seamless Sync:** Pushes meeting highlights, action items, and summaries directly to your workspace.
- **Non-Intrusive UI:** Minimalist floating widget that stays out of your way during important calls.

## 👥 Meet the Team

We are a team of 5 dedicated developers who built this extension:

- **Abhay** [<img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" width="16" alt="GitHub">]()
- **Shreya** [<img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" width="16" alt="GitHub">]()
- **Manish** [<img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" width="16" alt="GitHub">]()
- **Aakash** [<img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" width="16" alt="GitHub">]()
- **Yashvi** [<img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" width="16" alt="GitHub">]()

## 🚀 Installation & Build

### Developer Setup

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run build
```

3. Load it into your browser:
- Open `chrome://extensions/`
- Enable **Developer mode**
- Click **Load unpacked** and select the `dist` or `build` folder inside this directory.

## 🔗 Integration

The extension communicates with the main SISTEC backend via REST APIs. Ensure your local or production backend matches the configured API endpoints in the extension settings.
