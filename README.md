<div align="center">

<img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
<img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
<img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
<img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />

<br/><br/>

# 🌐 SISTEC — MemoSphere

**A comprehensive platform for Meetings, Events, and Policy Management.**

*Built with ❤️ by five students who believe better tools make better builders.*

</div>

---

## 📖 Table of Contents

- [About the Project](#about-the-project)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Architecture](#-architecture-notes)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [Project Structure](#-project-structure)
- [Team](#-meet-the-team)

---

## About the Project

**MemoSphere** is a hackathon project built by Team SISTEC. It unifies three pillars of organizational productivity — meetings, events, and policies — into a single AI-powered platform. With automated transcription, intelligent search, real-time collaboration, and strict multi-tenancy, MemoSphere is designed to make institutional knowledge accessible, searchable, and actionable.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📅 **Meeting Management** | Schedule, track, and manage meetings with ease. Automated voice transcription and AI-generated summaries. |
| 🎟️ **Event Organization** | Full-fledged event creation, ticketing, RSVP tracking, and smart notifications. |
| 📋 **Policy Management** | Centralized repository for company policies with version control and change tracking. |
| ✨ **AI-Powered Insights** | Real-time meeting analytics, intelligent search, and automated summaries via OpenAI & Whisper. |
| 🏢 **Multi-Tenant Architecture** | Secure and isolated environments for different organizations with strict RBAC. |
| 💬 **Real-time Collaboration** | Live chat, status updates, and concurrent document collaboration. |
| 🔌 **Chrome Extension** | Seamless meeting integration directly from the browser (available on the `extension` branch). |

---

## 🛠️ Tech Stack

**Frontend**
- [Next.js](https://nextjs.org/) — React framework with SSR and file-based routing
- [React](https://reactjs.org/) — UI component library
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) — Accessible, unstyled UI primitives

**Backend**
- [Node.js](https://nodejs.org/) — JavaScript runtime
- [Express](https://expressjs.com/) — HTTP server framework
- [Prisma ORM](https://www.prisma.io/) — Type-safe database client

**Database**
- [PostgreSQL](https://www.postgresql.org/) — Production relational database
- [SQLite](https://www.sqlite.org/) — Lightweight option for local development

**AI & Integrations**
- [OpenAI API](https://platform.openai.com/) — AI insights and intelligent search
- [Whisper](https://openai.com/research/whisper) — Speech-to-text transcription
- [BullMQ](https://bullmq.io/) — Background job queue (Redis-backed)

---

## 🏗️ Architecture Notes

- **Multi-tenancy** — Each organization operates in a fully isolated environment with its own data boundaries.
- **RBAC** — Role-based access control is enforced at every API layer.
- **Background Jobs** — BullMQ handles async tasks like transcription processing, email notifications, and report generation.
- **Chrome Extension** — Available in the `extension` branch. Provides in-browser meeting capture and seamless integration with the core platform.
- Refer to individual module folders for API structure, route definitions, and Prisma schemas.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed before proceeding:

- **Node.js** v18 or higher
- **npm** v9 or higher
- **PostgreSQL** (or use the built-in SQLite for local development)
- **Docker** *(optional)* — for running Redis and PostgreSQL in containers
- **Redis** — required for BullMQ background jobs

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/memosphere.git
cd memosphere
```

2. **Install frontend dependencies**

```bash
npm install
```

3. **Install backend dependencies**

```bash
cd backend
npm install
cd ..
```

### Environment Variables

Copy the example environment file and fill in your values:

```bash
# Frontend
cp .env.example .env.local

# Backend
cp backend/.env.example backend/.env
```

Key variables to configure:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/memosphere"

# OpenAI
OPENAI_API_KEY="sk-..."

# Redis (for BullMQ)
REDIS_URL="redis://localhost:6379"

# Auth / JWT
JWT_SECRET="your-secret-here"

# App
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### Running the App

**Start the backend** (from `/backend`):

```bash
cd backend
npm run dev
```

The API server will start on `http://localhost:4000`.

**Start the frontend** (from the project root):

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

**Optional — Run with Docker Compose** (for Redis + PostgreSQL):

```bash
docker-compose up -d
```

---

## 📁 Project Structure

```
memosphere/
├── app/                    # Next.js app directory (pages & layouts)
├── components/             # Shared React components
├── lib/                    # Utility functions & helpers
├── public/                 # Static assets
│
├── backend/
│   ├── src/
│   │   ├── routes/         # Express route handlers
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth, RBAC, validation
│   │   ├── jobs/           # BullMQ job definitions
│   │   └── services/       # AI, transcription, notification services
│   └── prisma/
│       └── schema.prisma   # Database schema
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 👥 Meet the Team

We are a team of 5 dedicated developers who built this platform during the SISTEC Hackathon.

| Name | Role | Contributions |
|---|---|---|
| **Manish Srivastava** | 🏆 Team Lead | Backend, Frontend, Chrome Extension |
| **Aakash Sarang** | 🔧 Full Stack Engineer | Full Stack Development, AI Integration |
| **Shreya Jaiswal** | 🎨 Frontend & Design | Frontend, UI/UX Design, Architecture, Chrome Extension |
| **Abhay** | 📊 Documentation | Presentation, Documentation |
| **Yashvi** | 📊 Documentation | Presentation, Documentation |

---

<div align="center">

**SISTEC · MemoSphere**

*Built with ❤️ by the team · Hackathon 2025*

</div>
