# HYRO Automation

> **AI-powered Agentic Workflow Automation Platform**
>
> Build, run, and monitor end-to-end automation workflows using natural language — powered by AI planning, real Gmail, real Google Sheets, LinkedIn, Slack, and more.

---

## 📁 Project Structure

```
hyro_automation/                    ← Monorepo root
│
├── client/                         ← FRONTEND (Next.js 14 — deployed on Vercel)
│   ├── src/
│   │   ├── pages/                  ← Next.js pages (routes)
│   │   │   ├── index.jsx           ← Landing page
│   │   │   ├── dashboard.jsx       ← Dashboard
│   │   │   ├── workflows/
│   │   │   │   ├── builder.jsx     ← AI Workflow Builder canvas
│   │   │   │   └── [id].jsx        ← Individual workflow editor
│   │   │   ├── integrations.jsx    ← OAuth integrations manager
│   │   │   ├── executions/
│   │   │   │   ├── index.jsx       ← Execution history list
│   │   │   │   └── [id].jsx        ← Execution detail & logs
│   │   │   ├── linkedin.jsx        ← LinkedIn post scheduler
│   │   │   ├── chat.jsx            ← AI Chat assistant (RAG)
│   │   │   ├── knowledge.jsx       ← Knowledge base manager
│   │   │   ├── notifications.jsx   ← Notification center
│   │   │   ├── login.jsx           ← Login
│   │   │   └── register.jsx        ← Register
│   │   ├── components/             ← Reusable React components
│   │   ├── store/                  ← Zustand state management
│   │   ├── services/               ← API client (axios)
│   │   └── styles/                 ← Global CSS / Tailwind
│   ├── .env.local.example          ← Frontend env variable template
│   ├── next.config.js              ← Next.js configuration
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                         ← BACKEND (Express.js — deployed on Render)
│   ├── src/
│   │   ├── server.js               ← Entry point
│   │   ├── app.js                  ← Express app setup (CORS, middleware)
│   │   ├── config/
│   │   │   ├── db.js               ← MongoDB Atlas connection
│   │   │   └── env.js              ← Environment variable loader
│   │   ├── routes/                 ← API route definitions
│   │   │   ├── authRoutes.js
│   │   │   ├── workflowRoutes.js
│   │   │   ├── executionRoutes.js
│   │   │   ├── integrationRoutes.js
│   │   │   ├── linkedinRoutes.js
│   │   │   ├── gmailRoutes.js
│   │   │   ├── chatRoutes.js
│   │   │   ├── knowledgeRoutes.js
│   │   │   ├── notificationRoutes.js
│   │   │   └── healthRoutes.js
│   │   ├── controllers/            ← Request handlers
│   │   ├── models/                 ← Mongoose MongoDB schemas
│   │   ├── agents/                 ← AI Agentic execution system
│   │   │   ├── orchestrator.js     ← Execution lifecycle manager
│   │   │   ├── executionAgent.js   ← Node executor (Gmail, Sheets, AI, etc.)
│   │   │   ├── plannerAgent.js     ← Topological sort planner
│   │   │   ├── validationAgent.js  ← Output schema validator
│   │   │   ├── recoveryAgent.js    ← Retry & error recovery
│   │   │   └── monitoringAgent.js  ← Execution event logger
│   │   ├── integrations/           ← OAuth integration connectors
│   │   │   ├── gmailIntegration.js
│   │   │   ├── googleSheetsIntegration.js
│   │   │   ├── linkedinIntegration.js
│   │   │   ├── slackIntegration.js
│   │   │   └── discordIntegration.js
│   │   ├── services/               ← Business logic services
│   │   └── middleware/             ← Auth, error handling
│   ├── tests/                      ← Automated test suites (24/24 pass)
│   ├── .env.example                ← Backend env variable template
│   └── package.json
│
├── .gitignore                      ← Ignores node_modules, .env files
├── vercel.json                     ← Vercel deployment config (frontend root)
├── render.yaml                     ← Render deployment config (backend)
├── package.json                    ← Root monorepo scripts
└── README.md                       ← This file
```

---

## ✨ Features

| Feature | Description |
|---|---|
| **AI Workflow Builder** | Describe a workflow in plain English → AI generates the full node graph |
| **Real Gmail Integration** | OAuth2 → read, classify, and extract from real Gmail emails |
| **Real Google Sheets** | Append extracted job data as real rows into your Google Spreadsheet |
| **LinkedIn Scheduler** | Draft and schedule LinkedIn posts with a visual content calendar |
| **AI Chat (RAG)** | Ask questions about your workflow history, knowledge base |
| **Execution Engine** | Sequential node execution with retry, approval gates, and monitoring |
| **Real-time Updates** | Socket.IO live execution status updates |
| **Notifications** | In-app notification center for execution events |

---

## 🛠️ Tech Stack

### Frontend (client/)
- **Next.js 14** — React framework with SSR/SSG
- **Tailwind CSS** — utility-first styling
- **Zustand** — lightweight state management
- **React Flow (@xyflow/react)** — interactive workflow canvas
- **Axios** — HTTP client
- **Socket.IO Client** — real-time updates

### Backend (server/)
- **Express.js** — REST API server
- **MongoDB + Mongoose** — data persistence
- **JWT** — authentication
- **AES-256 encryption** — secure OAuth token storage
- **Socket.IO** — real-time event broadcasting
- **OpenRouter / Gemini AI** — workflow AI planning

### Infrastructure
| Service | Provider |
|---|---|
| Frontend | **Vercel** (free tier) |
| Backend API | **Render** (free tier) |
| Database | **MongoDB Atlas** (free M0 cluster) |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js v18+
- MongoDB running locally (or MongoDB Atlas URI)

### 1. Clone the repository
```bash
git clone https://github.com/Jumanaafra/hyro_automation.git
cd hyro_automation
```

### 2. Install all dependencies
```bash
npm run install:all
```

### 3. Configure environment variables

**Backend** — copy and fill in:
```bash
cp server/.env.example server/.env
```

**Frontend** — copy and fill in:
```bash
cp client/.env.local.example client/.env.local
```

### 4. Start development servers
```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

---

## 🌐 Deployment (Vercel + Render + MongoDB Atlas)

See the full step-by-step guide below ↓

---

## 📋 Environment Variables

### Backend (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | API port (5000 locally, set by Render in production) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Long random string for JWT signing |
| `CREDENTIAL_ENCRYPTION_KEY` | ✅ | 64-hex-char AES-256 key for OAuth token encryption |
| `CLIENT_URL` | ✅ | Frontend URL for CORS (e.g. `https://your-app.vercel.app`) |
| `OPENROUTER_API_KEY` | optional | AI workflow generation (falls back to deterministic) |
| `GEMINI_API_KEY` | optional | Alternative AI provider |
| `GMAIL_CLIENT_ID` | optional | Google OAuth for Gmail integration |
| `GMAIL_CLIENT_SECRET` | optional | Google OAuth for Gmail integration |
| `GOOGLE_SHEETS_CLIENT_ID` | optional | Google OAuth for Sheets integration |
| `GOOGLE_SHEETS_CLIENT_SECRET` | optional | Google OAuth for Sheets integration |
| `LINKEDIN_CLIENT_ID` | optional | LinkedIn OAuth for posting |
| `LINKEDIN_CLIENT_SECRET` | optional | LinkedIn OAuth for posting |

### Frontend (`client/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL (e.g. `https://your-api.onrender.com/api`) |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ | Backend WebSocket URL (e.g. `https://your-api.onrender.com`) |

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/register` | Register user |
| `POST` | `/api/auth/login` | Login user |
| `GET` | `/api/workflows` | List workflows |
| `POST` | `/api/workflows` | Create workflow |
| `POST` | `/api/workflows/generate` | AI generate workflow from prompt |
| `POST` | `/api/workflows/:id/execute` | Execute workflow |
| `GET` | `/api/executions` | List executions |
| `GET` | `/api/executions/:id` | Get execution detail |
| `GET` | `/api/integrations` | List connected integrations |
| `GET` | `/api/integrations/oauth/:provider/start` | Start OAuth flow |
| `POST` | `/api/chat` | AI Chat (RAG) |
| `GET` | `/api/linkedin/posts` | List LinkedIn posts |

---

## 🔒 Security

- OAuth tokens encrypted at rest with **AES-256-GCM**
- JWT-protected API routes
- Secrets never exposed to the browser
- `.env` files excluded from Git via `.gitignore`
- Helmet.js security headers enabled

---

## 📄 License

MIT © 2026 HYRO Automation
