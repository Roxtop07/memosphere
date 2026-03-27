<div align="center">
  <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</div>

<h1 align="center">SISTEC - MemoSphere</h1>

<p align="center">
  <strong>A comprehensive platform for Meetings, Events, and Policy Management.</strong>
</p>

## ✨ Features

- **Meeting Management:** Schedule, track, and manage meetings with ease. Automated voice transcription and summaries.
- **Event Organization:** Full-fledged event creation, ticketing, RSVP tracking, and notifications.
- **Policy Management:** Centralized repository for company policies with version control and tracking.
- **AI-Powered Insights:** Get real-time meeting insights, analytics, and intelligent search capabilities.
- **Multi-Tenant Architecture:** Secure and isolated environments for different organizations.
- **Real-time Collaboration:** Chat, status updates, and live document collaboration.

## 🛠️ Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, Radix UI
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL / SQLite
- **AI & Integrations:** OpenAI, Whisper (Speech-to-Text), BullMQ

## 👥 Meet the Team

We are a team of 5 dedicated developers who built this comprehensive platform:

- **Abhay** [<img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" width="16" alt="GitHub">]()
- **Shreya** [<img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" width="16" alt="GitHub">]()
- **Manish** [<img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" width="16" alt="GitHub">]()
- **Aakash** [<img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" width="16" alt="GitHub">]()
- **Yashvi** [<img src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg" width="16" alt="GitHub">]()

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (or use the built-in SQLite for dev)
- Docker (optional, for Redis and DB)

### Installation

1. Clone the repository and install dependencies for both the frontend and backend.
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

2. Set up environment variables based on `.env.example`.

3. Run the application:
```bash
# Start backend (from /backend)
npm run dev

# Start frontend (from root)
npm run dev
```

## 📝 Architecture Notes
- The core platform handles strict RBAC and multi-tenancy.
- Refer to individual modules for API structure and schemas.
- Our custom Chrome Extension provides seamless meeting integration and is available in the `extension` branch.

<div align="center">
  <p>Built with ❤️ by the team.</p>
</div>
