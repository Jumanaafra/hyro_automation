# HYRO Automation --- Spec-Driven Development (SDD)

## 1. Project Overview

### Project Name

**HYRO Automation**

### HYRO Meaning

**HYRO = Hybrid Robotics Orchestration**

In this product context, HYRO represents a platform that combines
AI/automation technologies and coordinates multiple intelligent agents
to execute digital workflows.

### Product Vision

HYRO Automation is an AI-powered agentic workflow automation platform.
Users describe what they want to automate in natural language through a
conversational RAG-based assistant. HYRO understands the request,
retrieves relevant knowledge when needed, generates a structured visual
workflow, validates it, asks for approval when appropriate, executes it
through coordinated agents, recovers from supported failures, and
reports the result in real time.

### Core Experience

``` text
User Prompt
   ↓
Understand Intent
   ↓
RAG Retrieval (when needed)
   ↓
Generate Workflow
   ↓
Validate Workflow
   ↓
Visual Preview
   ↓
User Approval
   ↓
Agentic Execution
   ↓
Validation
   ↓
Recovery / Retry / Escalation
   ↓
Real-Time Monitoring
   ↓
Result + Audit Trail
```

------------------------------------------------------------------------

# 2. Product Goals

HYRO must:

1.  Convert natural-language requests into executable workflows.
2.  Provide a RAG-based conversational assistant.
3.  Automatically generate visual workflows.
4.  Allow manual workflow editing.
5.  Execute workflows through cooperating AI agents.
6.  Validate outputs before continuing.
7.  Recover from supported failures.
8.  Provide live execution monitoring.
9.  Integrate with Gmail, Google Sheets, Slack and Discord.
10. Provide smart Gmail classification for jobs, certificates,
    internships and related career emails.
11. Support LinkedIn content generation and scheduling using officially
    supported LinkedIn API capabilities.
12. Provide week and month content-calendar views.
13. Maintain execution history and audit logs.
14. Keep OAuth credentials encrypted and server-side.
15. Require human approval for configured high-impact actions.

------------------------------------------------------------------------

# 3. Primary User

The primary user is an operator who wants to automate repetitive digital
work without learning workflow syntax.

The user should be able to say:

> "Whenever I receive a job-related email in Gmail, identify the
> company, role, sender and date, save it to my Job Tracker Google
> Sheet, and notify me on Slack."

HYRO should understand this request and generate the workflow
automatically.

------------------------------------------------------------------------

# 4. Main Use Cases

## 4.1 Smart Gmail Job Tracking

Prompt:

> "Monitor my Gmail and find job-related emails. Extract company, role,
> sender and date, then save them to my Job Tracker Google Sheet."

Workflow:

``` text
Gmail Trigger
      ↓
AI Email Classification
      ↓
Job Related?
      ↓
Extract Job Details
      ↓
Validation
      ↓
Google Sheets
      ↓
Optional Slack Notification
```

Suggested extracted fields:

-   Company
-   Job Role
-   Sender
-   Email
-   Date
-   Job Link
-   Location
-   Salary
-   Status

## 4.2 Smart Gmail Certificate Tracking

Prompt:

> "Find certificate-related emails in Gmail and save the certificate
> name, provider and date to my Certificates Sheet."

Workflow:

``` text
Gmail
 ↓
AI Classification
 ↓
Certificate?
 ↓
Extract Certificate Details
 ↓
Validate
 ↓
Google Sheets
```

Suggested fields:

-   Certificate Name
-   Provider
-   Date
-   Credential Link
-   Category

## 4.3 Career Email Classification

Supported initial categories:

``` text
JOB
INTERNSHIP
INTERVIEW
OFFER
REJECTION
CERTIFICATE
COURSE
NEWSLETTER
IMPORTANT
OTHER
```

The classifier may use subject, sender, email body and relevant
attachment metadata.

## 4.4 Invoice Processing

Prompt:

> "When an invoice arrives in Gmail, extract the invoice number, vendor,
> amount and date, save it to Google Sheets and notify finance on
> Slack."

Workflow:

``` text
Gmail
 ↓
Invoice Detection
 ↓
AI Extraction
 ↓
Validation
 ↓
Google Sheets
 ↓
Slack
```

## 4.5 RAG Knowledge Assistant

Users can upload:

-   PDF
-   Markdown
-   Plain text
-   Resume
-   Certificates
-   Project documentation
-   Notes

Example:

> "What projects have I worked on?"

HYRO must retrieve relevant document chunks and answer using that
knowledge, with source references where available.

## 4.6 RAG + LinkedIn Content

Prompt:

> "Based on my project documents, create three LinkedIn posts for next
> week and prepare them for scheduling."

Workflow:

``` text
User
 ↓
RAG Retrieval
 ↓
Relevant Project Knowledge
 ↓
Content Planner
 ↓
AI Content Generator
 ↓
Content Validator
 ↓
Human Approval
 ↓
Scheduler
 ↓
LinkedIn
```

## 4.7 LinkedIn Weekly Scheduling

Prompt:

> "Create three LinkedIn posts for next week based on my recent projects
> and schedule them for Monday, Wednesday and Friday."

HYRO must:

1.  Retrieve relevant knowledge when required.
2.  Generate content.
3.  Validate factual grounding.
4.  Show previews.
5.  Request approval when configured.
6.  Create scheduled jobs.
7.  Publish using approved official LinkedIn API capabilities.
8.  Track publishing status.

If direct future scheduling is not available through the approved
LinkedIn API capability, HYRO must maintain its own scheduler and
execute publishing at the scheduled time.

## 4.8 LinkedIn Monthly Planning

Prompt:

> "Create a LinkedIn content calendar for next month based on my
> projects, skills and recent learning. Generate three posts per week
> and let me approve them before scheduling."

Calendar must support:

-   Week view
-   Month view
-   Draft
-   Pending approval
-   Scheduled
-   Published
-   Failed
-   Rescheduled

------------------------------------------------------------------------

# 5. Conversational Workflow Creation

The chatbot is the main command interface.

Users should not need to know:

-   APIs
-   JSON
-   Node IDs
-   Workflow syntax
-   Agent implementation

Example:

``` text
USER:
"I want to organize my emails."

HYRO:
"What types of emails should I organize?"

USER:
"Jobs and certificates."

HYRO:
"Where should I save them?"

USER:
"Google Sheets."

HYRO:
"What details should I track?"

USER:
"Company, role, sender and date."

HYRO:
"I've created the workflow."
```

Then show:

**Preview Workflow \| Edit Workflow \| Run Workflow**

------------------------------------------------------------------------

# 6. RAG Architecture

The RAG pipeline must be:

``` text
Document Upload
      ↓
Text Extraction
      ↓
Chunking
      ↓
Embeddings
      ↓
Vector Store
      ↓
Semantic Retrieval
      ↓
Relevant Chunks
      ↓
LLM
      ↓
Grounded Answer
```

RAG requirements:

-   Store document metadata.
-   Store source references.
-   Retrieve relevant chunks.
-   Avoid unsupported claims.
-   Show sources where available.
-   Maintain conversation context.
-   Support document deletion and re-indexing.

Initial knowledge sources:

-   PDF
-   Markdown
-   Plain text
-   User-entered knowledge

------------------------------------------------------------------------

# 7. Automatic Workflow Generation

When a user submits an automation request, HYRO must return:

-   Workflow name
-   Description
-   Nodes
-   Node types
-   Node positions
-   Edges
-   Per-node configuration
-   Trigger configuration
-   Required integrations
-   Approval requirements

The generated workflow must be executable after validation.

## AI Provider Fallback

Priority:

1.  OpenRouter when `OPENROUTER_API_KEY` exists.
2.  Google Gemini when `GEMINI_API_KEY` exists.
3.  Deterministic rule-based builder when neither is configured.

The deterministic fallback should support common workflows such as:

-   Gmail processing
-   Job/certificate filtering
-   Invoice routing
-   Slack/Discord notification
-   Google Sheets append
-   Basic content scheduling

## Workflow Validation

Before execution, HYRO must verify:

-   Required fields exist.
-   Node types are valid.
-   Edges reference valid nodes.
-   Required integrations are identified.
-   Credentials are available or clearly marked missing.
-   The graph has a valid execution path.
-   High-impact actions require approval.

------------------------------------------------------------------------

# 8. Visual Workflow Builder

Use React Flow (`@xyflow/react`).

``` text
┌────────────┬───────────────────────────┬────────────────┐
│ Node       │                           │ Node           │
│ Palette    │      Workflow Canvas      │ Configuration  │
│            │                           │ Panel          │
│ Gmail      │   Gmail → AI → Sheets     │                │
│ AI Agent   │            ↓              │                │
│ Sheets     │          Slack            │                │
│ Slack      │                           │                │
│ Condition  │                           │                │
└────────────┴───────────────────────────┴────────────────┘
```

Users must be able to:

-   Add nodes.
-   Delete nodes.
-   Connect nodes.
-   Move nodes.
-   Configure nodes.
-   Edit generated workflows.
-   Save workflows.
-   Duplicate workflows.
-   Version workflows.
-   Execute workflows.

------------------------------------------------------------------------

# 9. Agentic Orchestration

HYRO uses five cooperating agents.

## Planner Agent

Responsibilities:

-   Determine execution order.
-   Identify dependencies.
-   Produce an execution plan.
-   Emit confidence score.

## Execution Agent

Responsibilities:

-   Execute workflow nodes.
-   Use the integration service.
-   Invoke approved AI operations.
-   Return structured outputs.

Agents must not directly handle HTTP routes or bypass the integration
service.

## Validation Agent

Responsibilities:

-   Check required fields.
-   Verify expected outputs.
-   Detect incomplete results.
-   Decide whether execution can continue.

## Recovery Agent

Failure categories:

``` text
MISSING_FIELDS
API_FAILURE
AUTH_EXPIRED
RATE_LIMIT
TRANSIENT
```

Decision:

``` text
Retry with Backoff
OR
Escalate
```

## Monitoring Agent

Responsibilities:

-   Emit timeline events.
-   Track execution state.
-   Record agent activity.
-   Create execution logs.
-   Support live browser updates.

LangGraph should be available as the orchestration substrate, and the
orchestrator should report:

``` text
langGraph: "available" | "not-installed"
```

with each run.

------------------------------------------------------------------------

# 10. Execution Lifecycle

Statuses:

``` text
PENDING
RUNNING
COMPLETED
FAILED
RETRYING
PAUSED
CANCELLED
```

Flow:

``` text
User
 ↓
Execute Workflow
 ↓
Create Execution
 ↓
Queue Job
 ↓
Planner
 ↓
Execution
 ↓
Validation
 ↓
 ┌───────────────┐
 │ Success       │ → Monitoring → Complete
 │               │
 │ Failure       │
 └───────┬───────┘
         ↓
     Recovery
      ↙     ↘
   Retry   Escalate
```

Every execution must store an immutable workflow snapshot.

Users must be able to pause, resume and cancel supported executions.

------------------------------------------------------------------------

# 11. Real-Time Monitoring

Socket.IO must stream agent events to the browser.

Example:

``` text
✓ Planner — Execution plan created
✓ Gmail — 8 emails fetched
✓ AI — Emails classified
✓ AI — Job details extracted
✓ Validation — Required fields verified
✓ Google Sheets — Rows added
✓ Slack — Notification sent
✓ Monitoring — Workflow completed
```

Each event should include:

-   Agent
-   Status
-   Message
-   Timestamp
-   Duration
-   Metadata where applicable

------------------------------------------------------------------------

# 12. Integrations

Initial core integrations:

-   Gmail
-   Google Sheets
-   Slack
-   Discord

Additional integration:

-   LinkedIn

All integrations must use a common abstraction such as:

``` text
baseIntegration.js
```

OAuth tokens must be encrypted at rest using:

``` text
CREDENTIAL_ENCRYPTION_KEY
```

Missing or expired credentials must produce explicit errors such as:

``` text
INTEGRATION_NOT_CONNECTED
AUTH_EXPIRED
```

## Gmail

Support:

-   OAuth.
-   Read mail.
-   Send mail.
-   Trigger-based processing.
-   Classification.
-   Extraction.
-   Relevant attachment metadata.

## Google Sheets

Support:

-   Append rows.
-   Read ranges.
-   Spreadsheet selection.
-   Worksheet selection.
-   Field mapping.

## Slack

Support:

-   OAuth.
-   Post messages.
-   Supported event subscriptions.
-   Success/failure notifications.

## Discord

Support:

-   Bot connection.
-   Post messages.
-   Workflow notifications.

## LinkedIn

Support:

-   Official OAuth/API integration.
-   AI-generated content.
-   Drafts.
-   Approval.
-   Scheduling.
-   Publishing through approved API capabilities.
-   Status tracking.

Do not implement unauthorized scraping or unsupported automation.

------------------------------------------------------------------------

# 13. Human Approval

Approval should be required for configurable high-impact actions.

Examples:

-   LinkedIn publishing.
-   Large email sends.
-   External notifications.
-   Other irreversible actions.

Flow:

``` text
Workflow
 ↓
Generate Action
 ↓
Approval Required
 ↓
PAUSED
 ↓
User Approves
 ↓
Resume
 ↓
Execute
```

Low-risk workflows may support optional auto-run when enabled by the
user.

------------------------------------------------------------------------

# 14. Frontend Pages

The application uses the Next.js Pages Router.

## `/`

Landing page with:

-   HYRO branding.
-   Product explanation.
-   Agentic workflow showcase.
-   RAG showcase.
-   CTA.
-   Responsive design.

## `/login`

-   Email/password.
-   Validation.
-   JWT handling.
-   Error states.

## `/register`

-   Registration.
-   Password validation.
-   Session persistence.

## `/dashboard`

-   Workflow metrics.
-   Running workflows.
-   Success rate.
-   Recent workflows.
-   Recent executions.
-   Quick automation prompt.
-   AI activity.
-   Notifications.

## `/workflows`

-   Search.
-   Filter.
-   Status.
-   Create.
-   Duplicate.
-   Delete.
-   Open.

## `/workflows/builder`

-   Prompt input.
-   Conversational generation.
-   Workflow preview.
-   Validation.
-   Save.
-   Execute.

## `/workflows/[id]`

-   Node palette.
-   React Flow canvas.
-   Configuration panel.
-   Save.
-   Test.
-   Execute.
-   Logs.

## `/chat`

-   RAG assistant.
-   Conversations.
-   Workflow creation.
-   Workflow modification.
-   Execution questions.
-   Automation commands.

## `/knowledge`

-   Document upload.
-   Document list.
-   Delete.
-   Indexing status.
-   Source metadata.

## `/executions`

-   Search.
-   Filters.
-   Status.
-   Duration.
-   Timeline.
-   Logs.

## `/executions/[id]`

-   Live timeline.
-   Logs.
-   Inputs.
-   Outputs.
-   Agent activity.
-   Retry information.
-   Errors.

## `/integrations`

-   Gmail.
-   Google Sheets.
-   Slack.
-   Discord.
-   LinkedIn.
-   Connection status.
-   OAuth.
-   Reconnect.
-   Health.

## `/schedules`

-   LinkedIn content.
-   Scheduled workflows.
-   Week view.
-   Month view.
-   Approval status.

## `/notifications`

-   Success alerts.
-   Failure alerts.
-   Approval requests.
-   Integration alerts.

## `/settings`

-   Profile.
-   Role.
-   Security.
-   API health.
-   Theme.
-   Preferences.

------------------------------------------------------------------------

# 15. Database Collections

## Users

``` text
name
email
password
role
lastLogin
```

Roles:

``` text
admin
operator
```

## Workflows

``` text
name
description
owner
status
triggerConfig
nodes
edges
version
tags
createdAt
updatedAt
```

## Executions

``` text
workflowId
workflowSnapshot
status
currentNode
startTime
endTime
duration
inputs
outputs
error
retryCount
```

## ExecutionLogs

``` text
executionId
workflowId
nodeId
agent
level
message
metadata
timestamp
```

## Integrations

``` text
owner
provider
isConnected
scopes
encryptedTokens
expiresAt
```

Providers:

``` text
gmail
slack
google-sheets
discord
linkedin
openrouter
gemini
```

## Notifications

``` text
owner
workflowId
executionId
type
title
message
isRead
createdAt
```

## AgentMemory

``` text
workflowId
executionId
agentId
key
value
confidenceScore
```

## KnowledgeDocuments

``` text
owner
name
type
source
status
metadata
createdAt
updatedAt
```

## KnowledgeChunks

``` text
documentId
owner
content
embedding
metadata
chunkIndex
```

## ChatConversations

``` text
owner
title
messages
createdAt
updatedAt
```

## ScheduledPosts

``` text
owner
content
status
scheduledAt
linkedinAccount
workflowId
approvalRequired
approvedAt
publishedAt
error
```

------------------------------------------------------------------------

# 16. API Endpoints

## Health and Auth

``` text
GET  /api/health
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## Workflows

``` text
GET    /api/workflows/dashboard
GET    /api/workflows
POST   /api/workflows
POST   /api/workflows/generate
GET    /api/workflows/:id
PUT    /api/workflows/:id
POST   /api/workflows/:id/duplicate
POST   /api/workflows/:id/execute
DELETE /api/workflows/:id
```

## Executions

``` text
GET  /api/executions
GET  /api/executions/:id
GET  /api/executions/:id/timeline
POST /api/executions/:id/pause
POST /api/executions/:id/resume
POST /api/executions/:id/cancel
```

## Integrations

``` text
GET /api/integrations
GET /api/integrations/status
GET /api/integrations/oauth/:provider/start
GET /api/integrations/oauth/:provider/callback
GET /api/integrations/oauth/error
POST /api/integrations
```

## Chat / RAG

``` text
POST   /api/chat
GET    /api/chat/conversations
POST   /api/chat/conversations
GET    /api/chat/conversations/:id
DELETE /api/chat/conversations/:id
```

## Knowledge

``` text
POST   /api/knowledge/documents
GET    /api/knowledge/documents
GET    /api/knowledge/documents/:id
DELETE /api/knowledge/documents/:id
POST   /api/knowledge/documents/:id/reindex
```

## Gmail Filters

``` text
GET    /api/gmail/filters
POST   /api/gmail/filters
PUT    /api/gmail/filters/:id
DELETE /api/gmail/filters/:id
POST   /api/gmail/filters/:id/test
```

## LinkedIn Content

``` text
GET    /api/linkedin/posts
POST   /api/linkedin/posts
GET    /api/linkedin/posts/:id
PUT    /api/linkedin/posts/:id
DELETE /api/linkedin/posts/:id
POST   /api/linkedin/posts/:id/approve
POST   /api/linkedin/posts/:id/schedule
POST   /api/linkedin/posts/:id/cancel
```

## Notifications

``` text
GET /api/notifications
PUT /api/notifications/:id/read
PUT /api/notifications/read-all
```

------------------------------------------------------------------------

# 17. Technology Stack

## Frontend

-   Next.js Pages Router
-   React 19
-   Tailwind CSS
-   Zustand
-   Axios
-   React Flow (`@xyflow/react`)
-   Socket.IO Client
-   lucide-react

## Backend

-   Node.js
-   Express
-   MongoDB
-   Mongoose
-   JSON Web Tokens
-   BullMQ
-   Redis / ioredis
-   Socket.IO
-   Helmet
-   Morgan
-   Compression
-   express-validator
-   bcryptjs

## AI

-   OpenRouter
-   Google Gemini
-   LangChain
-   LangGraph

------------------------------------------------------------------------

# 18. Backend Architecture

## Routes

Handle:

-   HTTP routing.
-   Middleware.
-   Request validation.
-   Authentication.

## Controllers

Controllers must only:

-   Parse requests.
-   Call services.
-   Shape responses.

Controllers must never directly access MongoDB.

## Services

Services own:

-   Authentication.
-   Workflow CRUD.
-   Workflow generation.
-   RAG retrieval.
-   Document processing.
-   Execution lifecycle.
-   Token encryption.
-   Integration access.
-   Gmail filtering.
-   LinkedIn scheduling.
-   Retry classification.
-   Notifications.
-   Logging.

## Agents

``` text
orchestrator.js
plannerAgent.js
executionAgent.js
validationAgent.js
recoveryAgent.js
monitoringAgent.js
```

## Queues

Use BullMQ + Redis for:

-   Workflow execution.
-   Retries.
-   Scheduled workflows.
-   LinkedIn publishing jobs.
-   Document processing.

Provide an in-memory fallback for local development where specified.

------------------------------------------------------------------------

# 19. Folder Structure

## Frontend

``` text
client/
└── src/
    ├── components/
    │   ├── AppShell/
    │   ├── MetricGrid/
    │   ├── NodePalette/
    │   ├── NodeConfigPanel/
    │   ├── WorkflowCanvas/
    │   ├── ChatAssistant/
    │   ├── KnowledgeBase/
    │   ├── ExecutionTimeline/
    │   ├── ContentCalendar/
    │   └── ProtectedRoute/
    ├── pages/
    │   ├── _app.js
    │   ├── index.js
    │   ├── login.js
    │   ├── register.js
    │   ├── dashboard.js
    │   ├── chat.js
    │   ├── knowledge.js
    │   ├── integrations.js
    │   ├── schedules.js
    │   ├── notifications.js
    │   ├── settings.js
    │   ├── executions/
    │   │   ├── index.js
    │   │   └── [id].js
    │   └── workflows/
    │       ├── index.js
    │       ├── builder.js
    │       └── [id].js
    ├── store/
    │   ├── authStore.js
    │   ├── workflowStore.js
    │   └── chatStore.js
    └── services/
        ├── api.js
        └── socket.js
```

## Backend

``` text
server/
└── src/
    ├── config/
    │   ├── env.js
    │   ├── db.js
    │   ├── redis.js
    │   └── socket.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── workflowRoutes.js
    │   ├── executionRoutes.js
    │   ├── integrationRoutes.js
    │   ├── chatRoutes.js
    │   ├── knowledgeRoutes.js
    │   ├── gmailRoutes.js
    │   ├── linkedinRoutes.js
    │   └── notificationRoutes.js
    ├── controllers/
    │   ├── authController.js
    │   ├── workflowController.js
    │   ├── executionController.js
    │   ├── integrationController.js
    │   ├── chatController.js
    │   ├── knowledgeController.js
    │   └── linkedinController.js
    ├── services/
    │   ├── authService.js
    │   ├── workflowService.js
    │   ├── executionService.js
    │   ├── aiService.js
    │   ├── ragService.js
    │   ├── documentService.js
    │   ├── integrationService.js
    │   ├── gmailFilterService.js
    │   ├── linkedinService.js
    │   ├── schedulerService.js
    │   └── notificationService.js
    ├── agents/
    │   ├── orchestrator.js
    │   ├── plannerAgent.js
    │   ├── executionAgent.js
    │   ├── validationAgent.js
    │   ├── recoveryAgent.js
    │   └── monitoringAgent.js
    ├── integrations/
    │   ├── baseIntegration.js
    │   ├── gmailIntegration.js
    │   ├── googleSheetsIntegration.js
    │   ├── slackIntegration.js
    │   ├── discordIntegration.js
    │   └── linkedinIntegration.js
    ├── rag/
    │   ├── embeddings.js
    │   ├── vectorStore.js
    │   ├── retriever.js
    │   └── chunker.js
    ├── models/
    │   ├── User.js
    │   ├── Workflow.js
    │   ├── Execution.js
    │   ├── ExecutionLog.js
    │   ├── Integration.js
    │   ├── Notification.js
    │   ├── AgentMemory.js
    │   ├── KnowledgeDocument.js
    │   ├── KnowledgeChunk.js
    │   ├── ChatConversation.js
    │   └── ScheduledPost.js
    └── queues/
        ├── executionQueue.js
        ├── schedulerQueue.js
        └── documentQueue.js
```

------------------------------------------------------------------------

# 20. Authentication

Authentication must support:

-   Registration.
-   Login.
-   JWT sessions.
-   Protected routes.
-   `/api/auth/me`.
-   Admin/operator roles.
-   bcrypt password hashing at cost factor 12.
-   Persistent client authentication through Zustand.

------------------------------------------------------------------------

# 21. Security Requirements

The application must:

-   Hash passwords with bcrypt cost 12.
-   Sign/verify JWTs using `JWT_SECRET`.
-   Encrypt OAuth tokens using `CREDENTIAL_ENCRYPTION_KEY`.
-   Never expose private credentials to browser code.
-   Never log decrypted tokens.
-   Use Helmet.
-   Restrict CORS to `CLIENT_URL`.
-   Rate-limit authentication endpoints.
-   Validate request bodies with express-validator.
-   Authorize access to user-owned resources.
-   Prevent cross-user access to workflows, executions, documents and
    chats.
-   Require approval for configured high-impact actions.
-   Keep secrets in environment variables.

Never commit:

``` text
.env
.env.local
API keys
OAuth secrets
Database credentials
JWT secrets
Encryption keys
```

------------------------------------------------------------------------

# 22. UI/UX Requirements

The interface must have a modern SaaS/operator-console aesthetic.

Requirements:

-   Clean light theme with optional dark theme.
-   Purple/indigo interaction accents.
-   Responsive layout.
-   Sidebar navigation.
-   Rounded cards.
-   Clear status badges.
-   Skeleton loading states.
-   Empty states.
-   Error states.
-   Accessible controls.
-   Confirmation dialogs.
-   React Flow animated edges.
-   Live agent timeline.
-   RAG source references.
-   Week/month content calendar.
-   Notification drawer.

The chatbot should feel like the central intelligence layer of HYRO.

------------------------------------------------------------------------

# 23. Development Phases

## Phase 1 --- Foundation

Build:

-   Next.js Pages Router.
-   React 19.
-   Tailwind.
-   Express.
-   MongoDB.
-   In-memory development fallback.
-   JWT authentication.
-   Zustand auth.
-   AppShell.
-   Base API.

Verify:

-   Register.
-   Login.
-   Logout.
-   Protected routes.
-   Health endpoint.
-   `/auth/me`.

## Phase 2 --- Workflow Builder

Build:

-   Workflow CRUD.
-   React Flow.
-   Node palette.
-   Configuration panel.
-   Save/update.
-   Duplicate.
-   Versioning.

Verify:

-   Create.
-   Edit.
-   Save.
-   Reload.
-   Execute placeholder.

## Phase 3 --- AI Workflow Generation

Build:

-   Prompt input.
-   OpenRouter.
-   Gemini fallback.
-   Rule-based fallback.
-   Workflow schema validation.
-   Graph preview.

Verify:

-   Gmail workflow.
-   Invoice workflow.
-   Sheets workflow.
-   Slack workflow.

## Phase 4 --- RAG Assistant

Build:

-   Chat UI.
-   Document upload.
-   Text extraction.
-   Chunking.
-   Embeddings.
-   Vector store.
-   Retrieval.
-   Source references.
-   Conversation context.

Verify:

-   Upload document.
-   Ask question.
-   Verify retrieval.
-   Verify unsupported facts are not invented.

## Phase 5 --- Agentic Execution

Build:

-   Planner.
-   Execution.
-   Validation.
-   Recovery.
-   Monitoring.
-   Orchestrator.
-   Pause/resume/cancel.
-   Execution logs.

Verify:

-   Successful run.
-   Missing-field recovery.
-   API failure recovery.
-   Retry.
-   Escalation.
-   History.

## Phase 6 --- Gmail + Google Sheets

Build:

-   Gmail OAuth.
-   Gmail reader.
-   Smart classifier.
-   Job filter.
-   Certificate filter.
-   Data extraction.
-   Google Sheets integration.
-   Field mapping.

Verify:

-   Job detection.
-   Certificate detection.
-   Correct sheet routing.
-   Correct field extraction.

## Phase 7 --- Slack + Discord

Build:

-   OAuth/bot connection.
-   Message actions.
-   Success/failure notifications.

Verify:

-   Test messages.
-   Failure alerts.
-   Success alerts.

## Phase 8 --- LinkedIn Scheduling

Build:

-   LinkedIn OAuth.
-   Content generation.
-   RAG-powered content.
-   Content validation.
-   Approval.
-   Week/month calendar.
-   Scheduling queue.
-   Publishing status.

Verify:

-   Weekly posts.
-   Monthly plan.
-   Approval.
-   Scheduling.
-   Supported publishing.
-   Failure/retry.

## Phase 9 --- Real-Time + Production Hardening

Build:

-   BullMQ.
-   Redis.
-   Socket.IO.
-   Live timeline.
-   Notifications.
-   Rate limits.
-   Security hardening.
-   Production configuration.

Verify:

-   Background execution.
-   Retry jobs.
-   Scheduled jobs.
-   Real-time events.
-   Production-like testing.

------------------------------------------------------------------------

# 24. Deployment Architecture

Production target:

``` text
                    GitHub
                   /                        ↓        ↓
              Vercel      Render
             Frontend     Backend
                            │
                ┌───────────┼───────────┐
                ↓           ↓           ↓
           MongoDB Atlas  Redis       AI APIs
                            │
                         BullMQ
```

-   Source: GitHub.
-   Frontend: Vercel.
-   Backend: Render.
-   Database: MongoDB Atlas.
-   Queue: Redis + BullMQ.
-   Secrets: hosting-provider environment variables.

The frontend communicates with the backend through HTTP/API and
Socket.IO. The backend communicates with MongoDB, Redis and external
provider APIs.

------------------------------------------------------------------------

# 25. End-to-End Example

User says:

> "Track job and certificate emails from Gmail, save them into separate
> Google Sheets, and notify me on Slack when an important one arrives."

HYRO:

``` text
Understand
   ↓
Classify
   ↓
Generate Workflow
   ↓
Validate
   ↓
Preview
   ↓
Approval
   ↓
Planner
   ↓
Execution
   ↓
Validation
   ↓
Recovery if needed
   ↓
Monitoring
   ↓
Result
```

Generated workflow:

``` text
                    Gmail
                      ↓
              AI Classification
                      ↓
       ┌──────────────┼──────────────┐
       ↓              ↓              ↓
      JOB        CERTIFICATE     INTERNSHIP
       ↓              ↓              ↓
  Job Sheet     Cert Sheet      Internship Sheet
       └──────────────┼──────────────┘
                      ↓
                  Validation
                      ↓
                Slack Notification
```

Example result:

> "Processed 12 emails. 8 job emails and 3 certificate emails were added
> to Sheets. 1 important email notification was sent."

------------------------------------------------------------------------

# 26. Final Product Definition

**HYRO Automation** is an:

> **AI-powered agentic workflow automation platform with a RAG knowledge
> assistant, automatic workflow generation, smart Gmail intelligence,
> LinkedIn content scheduling, multi-agent execution, failure recovery
> and real-time monitoring.**

Core product loop:

``` text
Conversation
    ↓
Knowledge
    ↓
Understanding
    ↓
Planning
    ↓
Workflow Generation
    ↓
Approval
    ↓
Execution
    ↓
Validation
    ↓
Recovery
    ↓
Monitoring
    ↓
Result
```

### Brand

**HYRO Automation**

### Expansion

**Hybrid Robotics Orchestration**

### Positioning

**AI-Powered Agentic Workflow Automation**

### Core Promise

> **Tell HYRO what you want to automate. HYRO understands it, uses your
> knowledge when needed, builds the workflow, coordinates the agents,
> executes the work, handles supported failures, and shows you what
> happened.**

------------------------------------------------------------------------

# 27. Codex / AI Coding Agent Instructions

The coding agent must:

1.  Read this SDD before implementation.
2.  Build strictly phase by phase.
3.  Never implement the entire project in one uncontrolled change.
4.  Verify each phase before starting the next.
5.  Keep controllers thin.
6.  Keep business logic inside services.
7.  Never access MongoDB directly from controllers.
8.  Never call external integrations directly from agents.
9.  Route provider operations through the integration service.
10. Keep agents independent from HTTP.
11. Preserve the defined workflow schema.
12. Maintain naming consistency.
13. Use environment variables for secrets.
14. Never commit `.env`.
15. Validate generated workflows before execution.
16. Preserve immutable workflow snapshots.
17. Write one execution log per agent event.
18. Emit Socket.IO events for agent steps.
19. Require approval for configured high-impact actions.
20. Respect official provider APIs and permissions.
21. Never implement unauthorized scraping.
22. Provide fallbacks where explicitly specified.
23. At the end of every phase, list created/modified files.
24. Report tests performed and their results.
25. Do not silently replace the approved architecture.

# 28. Success Criteria

HYRO is successful when:

-   Authentication works.
-   RAG answers are grounded in uploaded knowledge.
-   Natural-language prompts generate valid workflows.
-   Generated workflows render in React Flow.
-   Users can edit and save workflows.
-   Gmail OAuth works.
-   Gmail emails can be intelligently classified.
-   Job/certificate emails can be routed to Google Sheets.
-   Slack and Discord notifications work.
-   LinkedIn content can be generated and scheduled through supported
    official capabilities.
-   Five agents operate according to the defined responsibilities.
-   Supported failures can retry or escalate.
-   Executions can be paused/resumed/cancelled where supported.
-   Socket.IO streams live events.
-   Notifications persist.
-   Execution history is auditable.
-   Credentials remain encrypted.
-   Production deployment works with Vercel, Render, MongoDB Atlas and
    Redis/BullMQ.

# 29. Closing Principle

HYRO Automation must not behave like a simple collection of API buttons.

Its core principle is:

**Conversation → Knowledge → Understanding → Planning → Workflow →
Approval → Execution → Validation → Recovery → Monitoring → Result**

This specification is the single source of truth for implementation. Any
change to architecture, capabilities, integrations or execution behavior
should be intentionally reflected in this SDD before implementation.
