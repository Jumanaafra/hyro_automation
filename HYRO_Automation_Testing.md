# HYRO Automation --- Testing Specification

## 1. Purpose

This document is the mandatory testing specification for **HYRO
Automation**.

Testing must happen **after every development phase** and **before the
next phase begins**.

The development sequence is:

``` text
Phase 1
   ↓
Phase 1 Testing
   ↓
PASS?
 ├── NO  → Fix → Re-test Phase 1
 └── YES
        ↓
Phase 2
   ↓
Phase 2 Testing
   ↓
PASS?
 ├── NO  → Fix → Re-test Phase 2
 └── YES
        ↓
Phase 3
   ↓
Phase 3 Testing
...
        ↓
Phase 9
   ↓
Final Regression
   ↓
Production Readiness
```

**No phase may be considered complete until its required tests pass.**

------------------------------------------------------------------------

# 2. Testing Principles

## 2.1 Phase Gate

Each phase has a mandatory gate.

A phase can have only one of these final states:

``` text
PASS
FAIL
BLOCKED
```

-   **PASS** --- all mandatory tests passed.
-   **FAIL** --- one or more mandatory tests failed and must be fixed.
-   **BLOCKED** --- testing cannot continue because a required
    dependency or environment is unavailable.

The next phase must not start while the previous phase is `FAIL` or
`BLOCKED`.

## 2.2 Test Before Feature Expansion

When a test fails:

``` text
Fail
 ↓
Identify root cause
 ↓
Fix
 ↓
Re-run failed test
 ↓
Run affected regression tests
 ↓
Phase Gate
```

Do not work around a failed test by silently weakening the requirement.

## 2.3 Regression Testing

Every later phase must preserve all previously passing behavior.

Example:

``` text
Phase 1 PASS
 ↓
Phase 2 implementation
 ↓
Phase 2 tests
 ↓
Phase 1 regression tests
 ↓
Phase 2 PASS
```

Therefore, each phase test cycle includes:

1.  New-feature tests for the current phase.
2.  Regression tests for all previously completed phases.

------------------------------------------------------------------------

# 3. Test Environment

## 3.1 Required Local Environment

The implementation should support the local development environment
defined by the SDD.

Core services:

``` text
Frontend
Next.js + React

Backend
Node.js + Express

Database
MongoDB

Authentication
JWT

State
Zustand

Workflow Canvas
React Flow
```

Later phases additionally require:

``` text
AI
OpenRouter / Gemini

RAG
Embeddings + Vector Store

Queue
Redis + BullMQ

Realtime
Socket.IO

Integrations
Gmail
Google Sheets
Slack
Discord
LinkedIn
```

## 3.2 Environment Variable Safety

Before testing, verify:

-   Required environment variables are loaded correctly.
-   Missing optional provider keys activate the documented fallback.
-   Secrets are not printed in logs.
-   `.env` files are not committed.
-   Test output does not expose OAuth tokens, JWT secrets, encryption
    keys or API keys.

## 3.3 Test Data

Use dedicated test data.

Examples:

``` text
test user
test workflow
test Gmail messages
test certificate email
test job email
test invoice email
test Google Sheet
test Slack channel
test Discord channel
test LinkedIn test content
test knowledge documents
```

Do not use real sensitive credentials or production data for automated
tests.

------------------------------------------------------------------------

# 4. Test Case Format

Every test result should use this structure:

``` text
Test ID:
Phase:
Feature:
Precondition:
Steps:
Expected Result:
Actual Result:
Status:
Evidence:
Notes:
```

Example:

``` text
Test ID: P1-AUTH-001
Phase: Phase 1
Feature: Registration
Precondition: Backend and database are running
Steps:
1. Open /register.
2. Enter valid name, email and password.
3. Submit the form.
Expected Result:
Account is created and the user is authenticated according to the SDD.
Actual Result:
...
Status:
PASS / FAIL / BLOCKED
Evidence:
...
Notes:
...
```

------------------------------------------------------------------------

# 5. Severity Rules

## Critical

A failure is Critical when it:

-   Prevents application startup.
-   Prevents authentication.
-   Causes unauthorized access.
-   Exposes credentials or secrets.
-   Corrupts workflow data.
-   Executes an action for the wrong user.
-   Causes an unsafe external action.
-   Makes the primary workflow execution impossible.

A Critical failure blocks the phase.

## High

Examples:

-   Core feature does not work.
-   Workflow graph cannot be saved.
-   Agent execution cannot complete.
-   Required integration cannot operate.
-   RAG returns incorrect source grounding.
-   Scheduled publishing cannot execute.

High failures normally block the phase.

## Medium

Examples:

-   Non-critical UI behavior is incorrect.
-   A secondary filter does not work.
-   A recoverable notification issue.

A Medium failure must be reviewed before phase approval.

## Low

Examples:

-   Cosmetic issue.
-   Minor spacing issue.
-   Non-functional visual inconsistency.

Low issues may remain open only if they do not violate acceptance
criteria.

------------------------------------------------------------------------

# 6. Phase 1 --- Foundation Testing

## Objective

Verify that the basic full-stack application, authentication, database
connection, client state and protected application shell work correctly.

## Mandatory Tests

### P1-001 --- Frontend Starts

Expected:

-   Next.js application starts without compilation errors.
-   Root page can be opened.

### P1-002 --- Backend Starts

Expected:

-   Express server starts without runtime errors.
-   No missing required configuration causes an unexpected crash.

### P1-003 --- Health Endpoint

Request:

``` text
GET /api/health
```

Expected:

-   Returns a successful health response.
-   Does not expose secrets.

### P1-004 --- Registration

Steps:

1.  Open `/register`.
2.  Enter valid user information.
3.  Submit.

Expected:

-   Account is created.
-   Password is not stored in plaintext.
-   Session state is established according to the SDD.

### P1-005 --- Password Validation

Test:

-   Valid password.
-   Invalid/too-short password according to implementation rules.
-   Missing password.

Expected:

-   Invalid input is rejected.
-   Clear validation feedback is shown.

### P1-006 --- Login

Steps:

1.  Open `/login`.
2.  Enter valid credentials.
3.  Submit.

Expected:

-   Authentication succeeds.
-   JWT session is established.
-   User reaches the protected application.

### P1-007 --- Invalid Login

Expected:

-   Incorrect credentials are rejected.
-   No authenticated session is created.
-   Error response does not expose sensitive information.

### P1-008 --- Logout

Expected:

-   Session is cleared.
-   Protected pages can no longer be accessed as an authenticated user.

### P1-009 --- Protected Routes

Test an unauthenticated request to protected application functionality.

Expected:

-   Access is rejected or redirected to login.
-   No protected user data is returned.

### P1-010 --- `/api/auth/me`

Expected:

-   Authenticated user receives their own profile.
-   Unauthenticated request is rejected.
-   User role is returned correctly.

### P1-011 --- Zustand Persistence

Expected:

-   Auth state persists according to the SDD.
-   Refreshing the browser does not unexpectedly lose a valid session.

### P1-012 --- Role Separation

Test:

``` text
operator
admin
```

Expected:

-   Role information is stored and returned correctly.
-   Authorization behavior follows the implemented role rules.

### P1-013 --- MongoDB Connection

Expected:

-   MongoDB connection succeeds when configured.
-   Application handles the documented local fallback correctly when
    MongoDB is unavailable.

### P1-014 --- AppShell

Expected:

-   Authenticated user sees the main application shell.
-   Navigation renders.
-   Unauthenticated user cannot use protected application content.

## Phase 1 Gate

Phase 1 = `PASS` only when:

-   All mandatory P1 tests pass.
-   No Critical/High defect remains.
-   Frontend starts.
-   Backend starts.
-   Authentication works.
-   Protected access works.
-   `/api/health` works.
-   `/api/auth/me` works.
-   Database/fallback behavior works.

------------------------------------------------------------------------

# 7. Phase 2 --- Workflow Builder Testing

## Objective

Verify workflow CRUD, React Flow editing, node configuration and
persistence.

## Mandatory Tests

### P2-001 --- Create Workflow

Expected:

-   User can create a workflow.
-   Workflow receives an owner.
-   Initial status/version are valid.

### P2-002 --- Add Node

Expected:

-   User can add a node from the palette.
-   Node appears on the canvas.

### P2-003 --- Move Node

Expected:

-   Node position changes.
-   Position persists after save/reload.

### P2-004 --- Connect Nodes

Expected:

-   Valid edges can be created.
-   Edge references valid nodes.

### P2-005 --- Invalid Connection

Expected:

-   Invalid graph state is prevented or rejected according to workflow
    validation rules.

### P2-006 --- Node Configuration

Expected:

-   Selected node configuration appears in the right-side panel.
-   Configuration changes persist.

### P2-007 --- Save Workflow

Expected:

-   Nodes, edges, metadata, trigger configuration and version are
    persisted.

### P2-008 --- Reload Workflow

Expected:

-   Saved graph is reconstructed correctly.

### P2-009 --- Edit Workflow

Expected:

-   Existing workflow can be modified and saved.

### P2-010 --- Duplicate Workflow

Expected:

-   Duplicate is created as a separate workflow.
-   Original remains unchanged.

### P2-011 --- Versioning

Expected:

-   Workflow version changes according to the defined implementation.
-   Historical execution snapshots remain independent.

### P2-012 --- Delete Workflow

Expected:

-   Authorized owner can delete the workflow.
-   Deleted workflow cannot be opened through normal user access.

### P2-013 --- Ownership

Expected:

-   User A cannot read or modify User B's workflow.

### P2-014 --- Placeholder Execution

Expected:

-   Execute control triggers the expected placeholder lifecycle without
    corrupting workflow data.

## Phase 2 Gate

Phase 2 = `PASS` only when:

-   Workflow CRUD works.
-   React Flow editing works.
-   Node configuration works.
-   Persistence works.
-   Duplicate/version behavior works.
-   Ownership checks work.
-   Placeholder execution works.
-   Phase 1 regression tests pass.

------------------------------------------------------------------------

# 8. Phase 3 --- AI Workflow Generation Testing

## Objective

Verify natural-language prompt → structured workflow generation.

## Mandatory Tests

### P3-001 --- Prompt Submission

Expected:

-   User can submit a natural-language automation request.

### P3-002 --- Workflow Schema

Expected generated output contains:

``` text
name
description
nodes
edges
positions
node configuration
trigger configuration
```

### P3-003 --- OpenRouter Primary

When `OPENROUTER_API_KEY` is configured:

Expected:

-   OpenRouter is preferred according to the SDD.

### P3-004 --- Gemini Fallback

When OpenRouter is unavailable and `GEMINI_API_KEY` is configured:

Expected:

-   Gemini is used.

### P3-005 --- Deterministic Fallback

When neither provider is available:

Expected:

-   Rule-based generation is used.
-   Common supported prompts still produce runnable graphs.

### P3-006 --- Gmail Workflow

Prompt example:

> "Read incoming Gmail job emails and save the details to Google
> Sheets."

Expected:

-   Gmail-related nodes are generated.
-   Google Sheets-related node is generated.
-   Graph is structurally valid.

### P3-007 --- Invoice Workflow

Expected:

-   Invoice detection/extraction flow is generated.

### P3-008 --- Slack Workflow

Expected:

-   Slack notification node/action is generated correctly.

### P3-009 --- Workflow Validation

Expected:

-   Invalid nodes or edges are rejected before execution.

### P3-010 --- Graph Preview

Expected:

-   Generated graph renders correctly in React Flow.
-   Nodes have valid positions.
-   Edges connect the correct nodes.

### P3-011 --- Malformed AI Output

Expected:

-   Malformed AI output does not crash the application.
-   User receives a clear generation/validation error.

### P3-012 --- Prompt Injection / Untrusted Instructions

Expected:

-   User-provided workflow text cannot override system safety or
    authorization rules.
-   External actions remain subject to integration and approval rules.

## Phase 3 Gate

Phase 3 = `PASS` only when:

-   All provider fallback paths work.
-   Generated graphs validate.
-   Common workflows generate correctly.
-   Graph preview works.
-   Invalid AI output is safely rejected.
-   Phase 1 and Phase 2 regression tests pass.

------------------------------------------------------------------------

# 9. Phase 4 --- RAG Assistant Testing

## Objective

Verify document ingestion, embeddings, retrieval, grounded answers and
conversational context.

## Mandatory Tests

### P4-001 --- Chat UI

Expected:

-   User can start a conversation.
-   Messages render correctly.

### P4-002 --- Document Upload

Expected:

-   Supported documents can be uploaded.
-   Document metadata is stored.
-   Processing status is visible.

### P4-003 --- Text Extraction

Expected:

-   Text is extracted from supported document types.

### P4-004 --- Chunking

Expected:

-   Documents are divided into retrievable chunks.
-   Chunk metadata references the correct document.

### P4-005 --- Embedding

Expected:

-   Chunks are embedded successfully when the embedding provider is
    available.

### P4-006 --- Vector Storage

Expected:

-   Embeddings and metadata are stored in the configured vector store.

### P4-007 --- Retrieval

Ask a question whose answer exists in an uploaded document.

Expected:

-   Relevant chunks are retrieved.

### P4-008 --- Grounded Answer

Expected:

-   Answer is based on retrieved content.
-   Source references are shown when available.

### P4-009 --- Unsupported Question

Ask something not contained in the knowledge base.

Expected:

-   HYRO does not present unsupported information as fact.
-   It clearly indicates that the available knowledge does not support
    the answer.

### P4-010 --- Multi-Turn Context

Expected:

-   Follow-up questions correctly use the current conversation context.

### P4-011 --- Document Isolation

Expected:

-   User A cannot retrieve User B's documents or knowledge.

### P4-012 --- Delete Document

Expected:

-   Deleted documents are no longer retrievable through normal RAG
    queries.

### P4-013 --- Re-index

Expected:

-   Re-indexing updates the document's retrievable content correctly.

### P4-014 --- RAG to Workflow

Prompt:

> "Use my project documents to create a LinkedIn post."

Expected:

-   Relevant knowledge is retrieved.
-   Retrieved content can be passed to the workflow/content generation
    layer.

## Phase 4 Gate

Phase 4 = `PASS` only when:

-   Upload works.
-   Retrieval works.
-   Grounding works.
-   Source references work.
-   Unsupported claims are controlled.
-   User data is isolated.
-   RAG-to-workflow handoff works.
-   Earlier phase regression tests pass.

------------------------------------------------------------------------

# 10. Phase 5 --- Agentic Execution Testing

## Objective

Verify Planner, Execution, Validation, Recovery, Monitoring and
execution lifecycle behavior.

## Mandatory Tests

### P5-001 --- Planner Agent

Expected:

-   Planner determines valid node ordering.
-   Confidence score is emitted.

### P5-002 --- Execution Agent

Expected:

-   Correct workflow nodes are executed in the planned order.

### P5-003 --- Validation Agent

Expected:

-   Required outputs are checked.
-   Missing required fields are detected.

### P5-004 --- Recovery Agent --- Missing Fields

Expected:

``` text
MISSING_FIELDS
```

is classified correctly and the defined recovery decision is made.

### P5-005 --- Recovery Agent --- API Failure

Expected:

``` text
API_FAILURE
```

is classified correctly.

### P5-006 --- Recovery Agent --- Auth Expired

Expected:

``` text
AUTH_EXPIRED
```

is classified correctly and escalates when retry cannot resolve
authentication.

### P5-007 --- Recovery Agent --- Rate Limit

Expected:

``` text
RATE_LIMIT
```

is classified correctly and follows retry/backoff policy where
applicable.

### P5-008 --- Recovery Agent --- Transient

Expected:

``` text
TRANSIENT
```

is classified correctly and uses retry with backoff when appropriate.

### P5-009 --- Monitoring Agent

Expected:

-   Agent events are created.
-   Timeline data is complete.

### P5-010 --- Successful Execution

Expected:

``` text
PENDING
 ↓
RUNNING
 ↓
COMPLETED
```

### P5-011 --- Failed Execution

Expected:

``` text
PENDING
 ↓
RUNNING
 ↓
FAILED
```

when the failure cannot be recovered.

### P5-012 --- Retry Lifecycle

Expected:

``` text
RUNNING
 ↓
RETRYING
 ↓
RUNNING
 ↓
COMPLETED
```

when retry succeeds.

### P5-013 --- Pause

Expected:

-   Supported execution pauses.
-   State is persisted as `PAUSED`.

### P5-014 --- Resume

Expected:

-   Paused execution resumes without duplicating already completed
    unsafe actions.

### P5-015 --- Cancel

Expected:

-   Running execution can be cancelled where supported.
-   Cancelled execution becomes `CANCELLED`.

### P5-016 --- Immutable Snapshot

Expected:

-   Execution stores the workflow snapshot used at runtime.
-   Later workflow edits do not modify historical execution data.

### P5-017 --- Execution Logs

Expected:

-   One granular log is recorded for each relevant agent event.

### P5-018 --- LangGraph Availability

Expected:

-   Orchestrator reports:

``` text
langGraph: "available"
```

or:

``` text
langGraph: "not-installed"
```

according to runtime availability.

### P5-019 --- Cross-User Execution Security

Expected:

-   User A cannot view, pause, resume or cancel User B's execution.

## Phase 5 Gate

Phase 5 = `PASS` only when:

-   All five agents operate correctly.
-   Execution lifecycle is correct.
-   Recovery classification works.
-   Retry/escalation works.
-   Pause/resume/cancel works.
-   Execution snapshots are immutable.
-   Logs are complete.
-   LangGraph status is reported.
-   Previous phases pass regression testing.

------------------------------------------------------------------------

# 11. Phase 6 --- Gmail + Google Sheets Testing

## Objective

Verify Gmail OAuth, smart email classification, extraction and Google
Sheets routing.

## Mandatory Tests

### P6-001 --- Gmail OAuth Start

Expected:

-   OAuth flow starts correctly.
-   Required scopes are requested.

### P6-002 --- Gmail OAuth Callback

Expected:

-   Successful callback stores encrypted credentials.
-   Connection status becomes connected.

### P6-003 --- Gmail Connected Status

Expected:

-   Integrations page shows Gmail as connected.

### P6-004 --- Gmail Disconnected Status

Expected:

-   Disconnected account is clearly identified.

### P6-005 --- Job Email Classification

Test email:

> "Interview Invitation --- Full Stack Developer"

Expected:

``` text
JOB
```

or the appropriate more specific supported career classification.

### P6-006 --- Certificate Classification

Test email:

> "Your Python Programming Certificate is Ready"

Expected:

``` text
CERTIFICATE
```

### P6-007 --- Internship Classification

Expected:

``` text
INTERNSHIP
```

for an appropriate internship email.

### P6-008 --- Interview Classification

Expected:

``` text
INTERVIEW
```

when the email represents an interview invitation/update.

### P6-009 --- Offer Classification

Expected:

``` text
OFFER
```

when the email represents a job offer.

### P6-010 --- Rejection Classification

Expected:

``` text
REJECTION
```

when appropriate.

### P6-011 --- Job Field Extraction

Expected fields may include:

``` text
Company
Job Role
Sender
Email
Date
Job Link
Location
Salary
Status
```

Only fields supported by the actual email should be populated.

### P6-012 --- Certificate Field Extraction

Expected:

``` text
Certificate Name
Provider
Date
Credential Link
Category
```

### P6-013 --- Google Sheets Connection

Expected:

-   OAuth connection works.
-   Connected status is visible.

### P6-014 --- Field Mapping

Expected:

``` text
company → selected sheet column
role → selected sheet column
sender → selected sheet column
date → selected sheet column
```

### P6-015 --- Correct Sheet Routing

Expected:

``` text
JOB → Job Sheet
CERTIFICATE → Certificate Sheet
```

according to configured workflow routing.

### P6-016 --- Slack Notification Path

When configured:

Expected:

-   Important classified email produces the configured Slack
    notification.

### P6-017 --- Expired Gmail Credential

Expected:

``` text
AUTH_EXPIRED
```

appears in the execution timeline.

### P6-018 --- Missing Gmail Connection

Expected:

``` text
INTEGRATION_NOT_CONNECTED
```

appears instead of a generic server error.

### P6-019 --- Token Security

Expected:

-   Access/refresh tokens are encrypted at rest.
-   Tokens are never exposed in browser responses or logs.

## Phase 6 Gate

Phase 6 = `PASS` only when:

-   Gmail OAuth works.
-   Classification works.
-   Job/certificate routing works.
-   Field extraction works.
-   Sheets mapping works.
-   Credential errors are explicit.
-   Credential security passes.
-   Previous phases pass regression testing.

------------------------------------------------------------------------

# 12. Phase 7 --- Slack + Discord Testing

## Objective

Verify external notifications and messaging.

## Mandatory Tests

### P7-001 --- Slack Connection

Expected:

-   OAuth connection works.
-   Status is displayed.

### P7-002 --- Slack Message

Expected:

-   HYRO can post the configured message.

### P7-003 --- Slack Success Notification

Expected:

-   Successful workflow can generate a success notification when
    configured.

### P7-004 --- Slack Failure Notification

Expected:

-   Failed/escalated workflow can generate a failure notification.

### P7-005 --- Discord Connection

Expected:

-   Bot integration can be configured.

### P7-006 --- Discord Message

Expected:

-   HYRO can post a bot message.

### P7-007 --- Integration Failure

Expected:

-   Provider failure is recorded.
-   User receives a clear error.

### P7-008 --- Notification Persistence

Expected:

-   Notification is stored.
-   Notification appears in the notification drawer.

### P7-009 --- Notification Ownership

Expected:

-   User A cannot read User B's notifications.

## Phase 7 Gate

Phase 7 = `PASS` only when:

-   Slack works.
-   Discord works.
-   Notifications persist.
-   Failures are visible.
-   Security checks pass.
-   Previous phases pass regression testing.

------------------------------------------------------------------------

# 13. Phase 8 --- LinkedIn Scheduling Testing

## Objective

Verify LinkedIn integration, AI content generation, RAG grounding,
approval and scheduling.

## Mandatory Tests

### P8-001 --- LinkedIn OAuth

Expected:

-   OAuth starts correctly.
-   Only required approved scopes are requested.
-   Credentials are stored securely.

### P8-002 --- LinkedIn Connection Status

Expected:

-   Connected/disconnected state is visible.

### P8-003 --- AI Content Generation

Prompt:

> "Create a professional LinkedIn post about my recent project."

Expected:

-   Post draft is generated.
-   Content is editable.

### P8-004 --- RAG-Grounded Content

Prompt:

> "Create a LinkedIn post using my uploaded project documentation."

Expected:

-   Relevant project information is retrieved.
-   Generated content is grounded in the retrieved information.

### P8-005 --- Unsupported Claim Protection

Expected:

-   Content validation identifies or prevents unsupported claims when
    the workflow requires grounded content.

### P8-006 --- Weekly Calendar

Expected:

-   User can view a week.
-   Scheduled posts appear on the correct dates/times.

### P8-007 --- Monthly Calendar

Expected:

-   User can view a month.
-   Scheduled posts appear correctly.

### P8-008 --- Approval

Expected:

``` text
DRAFT
 ↓
PENDING_APPROVAL
 ↓
APPROVED
```

and the approved item can proceed to scheduling.

### P8-009 --- Scheduling

Expected:

``` text
APPROVED
 ↓
SCHEDULED
```

with the correct scheduled time stored.

### P8-010 --- Rescheduling

Expected:

-   User can change the scheduled time.
-   Old schedule is replaced correctly.

### P8-011 --- Cancellation

Expected:

-   Scheduled post can be cancelled.
-   It does not publish after cancellation.

### P8-012 --- Publishing

Expected:

-   Publishing uses only supported official LinkedIn API capabilities.
-   Publishing status is recorded.

### P8-013 --- Publishing Failure

Expected:

-   Failure is recorded.
-   Recovery/retry behavior follows configured policy.

### P8-014 --- High-Impact Approval

Expected:

-   Publishing cannot occur before required human approval.

### P8-015 --- Duplicate Prevention

Expected:

-   A single approved scheduled post is not published multiple times
    because of duplicate worker execution or retry.

### P8-016 --- Credential Expiry

Expected:

``` text
AUTH_EXPIRED
```

is surfaced clearly.

### P8-017 --- Unsupported LinkedIn Capability

Expected:

-   HYRO does not claim or execute an unsupported LinkedIn API action.
-   User receives a clear capability/error message.

## Phase 8 Gate

Phase 8 = `PASS` only when:

-   LinkedIn connection works.
-   Content generation works.
-   RAG grounding works.
-   Approval works.
-   Week/month scheduling works.
-   Publishing uses approved API capabilities.
-   Duplicate publishing is prevented.
-   Failure handling works.
-   Previous phases pass regression testing.

------------------------------------------------------------------------

# 14. Phase 9 --- Real-Time + Production Hardening Testing

## Objective

Verify queues, Redis, Socket.IO, notifications, security and
production-like behavior.

## Mandatory Tests

### P9-001 --- Redis Connection

Expected:

-   Redis connects when configured.

### P9-002 --- BullMQ Queue

Expected:

-   Workflow jobs are queued.
-   Workers process jobs.

### P9-003 --- Retry Backoff

Expected:

-   Retry timing follows configured backoff behavior.

### P9-004 --- Scheduled Jobs

Expected:

-   Scheduled workflow/content jobs execute at their configured time.

### P9-005 --- In-Memory Fallback

When Redis is unavailable:

Expected:

-   Documented local fallback behavior activates.
-   Application does not silently pretend that production-grade queue
    guarantees exist.

### P9-006 --- Socket.IO Connection

Expected:

-   Authenticated client connects successfully.

### P9-007 --- Live Agent Events

Expected:

-   Planner, execution, validation, recovery and monitoring events reach
    subscribed clients.

### P9-008 --- Live Timeline

Expected:

-   Browser timeline updates without manual refresh.

### P9-009 --- Notification Drawer

Expected:

-   Success, failure and escalation notifications appear.

### P9-010 --- Reconnect Behavior

Expected:

-   Temporary Socket.IO disconnection does not corrupt persisted
    execution state.
-   Client can recover live updates.

### P9-011 --- Authentication Rate Limit

Expected:

-   Excessive authentication requests are rate-limited.

### P9-012 --- CORS

Expected:

-   Only configured `CLIENT_URL` is permitted according to deployment
    configuration.

### P9-013 --- Helmet

Expected:

-   HTTP security headers are applied.

### P9-014 --- Request Validation

Expected:

-   Invalid request bodies are rejected by validation middleware.

### P9-015 --- Authorization

Expected:

-   Users cannot access another user's workflows, executions,
    notifications, documents, chats or integrations.

### P9-016 --- Secret Exposure

Verify logs, API responses and browser storage.

Expected:

-   No private API key, OAuth token, encryption key, database credential
    or JWT secret is exposed.

### P9-017 --- Production Environment

Expected:

-   Frontend can communicate with the production backend.
-   Backend can communicate with MongoDB Atlas.
-   Redis/BullMQ works where configured.
-   OAuth callback URLs are correctly configured.
-   Environment variables are provided through deployment configuration.

## Phase 9 Gate

Phase 9 = `PASS` only when:

-   Queue system works.
-   Scheduled jobs work.
-   Socket.IO works.
-   Live timeline works.
-   Security checks pass.
-   Production-like configuration works.
-   Full regression passes.

------------------------------------------------------------------------

# 15. Full Regression Testing

After Phase 9, execute the complete product flow.

## Regression Scenario A --- Authentication

``` text
Register
 ↓
Login
 ↓
Open Dashboard
 ↓
Refresh
 ↓
Logout
 ↓
Protected route blocked
```

Expected: all steps work.

## Regression Scenario B --- Gmail Career Tracker

``` text
Gmail
 ↓
Receive job email
 ↓
AI classification
 ↓
Extract fields
 ↓
Google Sheets
 ↓
Slack notification
 ↓
Execution timeline
```

Expected: complete workflow succeeds.

## Regression Scenario C --- Certificate Tracker

``` text
Gmail
 ↓
Certificate email
 ↓
Classification
 ↓
Extraction
 ↓
Certificate Sheet
```

Expected: correct routing and fields.

## Regression Scenario D --- Failure Recovery

``` text
Workflow
 ↓
External API failure
 ↓
Recovery Agent
 ↓
Retry
 ↓
Success
```

Expected: retry is logged and final status is correct.

## Regression Scenario E --- Authentication Failure

``` text
Expired OAuth
 ↓
AUTH_EXPIRED
 ↓
Recovery / Escalation
 ↓
Notification
```

Expected: no silent failure.

## Regression Scenario F --- RAG Chat

``` text
Upload document
 ↓
Index
 ↓
Ask question
 ↓
Retrieve chunks
 ↓
Grounded answer
 ↓
Source reference
```

Expected: answer is supported by the uploaded document.

## Regression Scenario G --- RAG to LinkedIn

``` text
Project Documents
 ↓
RAG
 ↓
Content Generation
 ↓
Validation
 ↓
Approval
 ↓
Schedule
 ↓
LinkedIn
```

Expected: content remains grounded and publishing requires configured
approval.

## Regression Scenario H --- Visual Workflow

``` text
Natural-language prompt
 ↓
Workflow generation
 ↓
Graph preview
 ↓
Edit
 ↓
Save
 ↓
Execute
 ↓
Live timeline
```

Expected: complete flow works.

------------------------------------------------------------------------

# 16. Security Regression Suite

Run after every major release.

Verify:

-   Passwords are hashed.
-   JWT verification works.
-   Unauthorized requests fail.
-   Cross-user access fails.
-   OAuth credentials are encrypted.
-   Tokens are not logged.
-   API keys are not exposed.
-   `.env` is not committed.
-   CORS is restricted.
-   Auth endpoints are rate-limited.
-   Request validation is active.
-   High-impact actions require approval.
-   Unsupported provider operations are rejected.
-   Deleted resources cannot be accessed through normal endpoints.

A single confirmed credential exposure is a release blocker.

------------------------------------------------------------------------

# 17. Data Integrity Tests

Verify:

-   Workflow ownership is correct.
-   Workflow nodes/edges remain consistent.
-   Execution snapshots are immutable.
-   Execution status transitions are valid.
-   Retry count is accurate.
-   Execution logs reference the correct execution.
-   Notifications reference the correct workflow/execution.
-   RAG chunks reference the correct document.
-   Scheduled posts belong to the correct user.
-   User data cannot cross tenant boundaries.

------------------------------------------------------------------------

# 18. API Testing Checklist

For every endpoint verify:

1.  Correct HTTP method.
2.  Authentication requirement.
3.  Authorization.
4.  Valid input.
5.  Invalid input.
6.  Missing required fields.
7.  Non-existent resource.
8.  Wrong user's resource.
9.  Correct success status.
10. Correct error response.
11. No secret leakage.
12. No unexpected server crash.

------------------------------------------------------------------------

# 19. UI Testing Checklist

For every page verify:

-   Page loads.
-   Navigation works.
-   Responsive layout works.
-   Loading state appears.
-   Empty state appears.
-   Error state appears.
-   Form validation works.
-   Buttons have correct enabled/disabled states.
-   Success feedback appears.
-   Failure feedback appears.
-   Authentication state is respected.
-   User-owned data is displayed only to the correct user.

Important pages:

``` text
/
 /login
 /register
 /dashboard
 /chat
 /knowledge
 /workflows
 /workflows/builder
 /workflows/[id]
 /executions
 /executions/[id]
 /integrations
 /schedules
 /notifications
 /settings
```

------------------------------------------------------------------------

# 20. Workflow Safety Tests

Before any workflow is executed, verify:

``` text
Workflow valid?
Required integrations available?
Required credentials available?
Required configuration present?
Dangerous/high-impact action?
Approval required?
```

If any mandatory requirement is missing:

``` text
Do not execute
 ↓
Show clear reason
```

Examples:

``` text
Gmail not connected
→ INTEGRATION_NOT_CONNECTED

OAuth expired
→ AUTH_EXPIRED

Required node field missing
→ Validation error

LinkedIn publishing requires approval
→ PENDING_APPROVAL
```

------------------------------------------------------------------------

# 21. AI Reliability Tests

AI-generated output must be treated as untrusted structured input until
validated.

Test:

-   Missing fields.
-   Extra fields.
-   Invalid node types.
-   Invalid edges.
-   Duplicate node IDs.
-   Invalid configuration.
-   Empty workflow.
-   Cyclic/invalid graph where unsupported.
-   Unexpected natural-language output.
-   Provider timeout.
-   Provider rate limit.
-   Provider unavailable.
-   Hallucinated integration.
-   Unsupported action.

Expected:

-   Invalid output is rejected safely.
-   Application does not crash.
-   User receives a useful error.
-   No unauthorized action executes.

------------------------------------------------------------------------

# 22. Test Evidence

Every completed phase should produce evidence.

Acceptable evidence:

-   Test output.
-   API response.
-   Screenshot.
-   Browser recording.
-   Server log excerpt with secrets removed.
-   Database verification.
-   Queue job result.
-   Socket.IO event trace.
-   Execution timeline.

Never include:

-   API keys.
-   OAuth access tokens.
-   Refresh tokens.
-   Passwords.
-   JWT secrets.
-   Encryption keys.

------------------------------------------------------------------------

# 23. Phase Completion Report

At the end of every phase, the coding agent must produce:

``` text
PHASE:
Status: PASS / FAIL / BLOCKED

Implemented:
- ...

Tests Executed:
- Test ID — PASS
- Test ID — PASS
- Test ID — FAIL

Regression Tests:
- ...

Known Issues:
- ...

Files Created:
- ...

Files Modified:
- ...

Environment Requirements:
- ...

Evidence:
- ...

Next Phase:
- Allowed / Blocked
```

If status is not `PASS`, the agent must not start the next phase.

------------------------------------------------------------------------

# 24. Final Release Gate

HYRO Automation is release-ready only when:

## Functional

-   Authentication works.
-   Workflow creation works.
-   Workflow editing works.
-   AI workflow generation works.
-   RAG chatbot works.
-   Gmail classification works.
-   Google Sheets routing works.
-   Slack works.
-   Discord works.
-   LinkedIn scheduling works within supported official API
    capabilities.
-   Five-agent execution works.
-   Recovery works.
-   Notifications work.
-   Real-time monitoring works.

## Reliability

-   Successful executions work.
-   Failed executions are handled.
-   Retry works.
-   Escalation works.
-   Scheduled jobs work.
-   Duplicate execution/publishing is controlled.
-   Historical execution snapshots remain correct.

## Security

-   Authentication is secure.
-   Authorization is enforced.
-   Credentials are encrypted.
-   Secrets are not exposed.
-   Rate limits work.
-   CORS is restricted.
-   Request validation works.

## Data Integrity

-   User isolation works.
-   Execution history is accurate.
-   Logs are complete.
-   RAG sources remain associated with the correct documents.
-   Scheduled posts belong to the correct user.

## Deployment

-   Frontend works in production.
-   Backend works in production.
-   MongoDB Atlas works.
-   Redis/BullMQ works where configured.
-   OAuth callbacks work.
-   Production environment variables are configured.
-   No secrets are committed to GitHub.

------------------------------------------------------------------------

# 25. Final Acceptance Scenario

The most important end-to-end acceptance test is:

### User Prompt

> "Monitor my Gmail for job-related emails and certificates. Extract the
> important details and save jobs and certificates into separate Google
> Sheets. Notify me on Slack when an important career email arrives."

HYRO must:

``` text
User
 ↓
HYRO Chat
 ↓
Understand Intent
 ↓
Generate Workflow
 ↓
Validate Workflow
 ↓
Show Graph Preview
 ↓
Approval
 ↓
Planner Agent
 ↓
Execution Agent
 ↓
Gmail
 ↓
AI Classification
 ↓
Data Extraction
 ↓
Validation Agent
 ↓
Google Sheets
 ↓
Slack
 ↓
Monitoring Agent
 ↓
Live Timeline
 ↓
Execution Result
 ↓
Audit Trail
```

Expected final result:

-   Correct emails are classified.
-   Correct details are extracted.
-   Job emails reach the Job Sheet.
-   Certificate emails reach the Certificate Sheet.
-   Important notifications reach Slack.
-   Every agent step appears in the execution timeline.
-   Execution is persisted.
-   Any failure follows the recovery policy.
-   No secret is exposed.

------------------------------------------------------------------------

# 26. Final Testing Rule

**NEVER move from one phase to the next simply because the code was
generated successfully.**

The correct sequence is:

``` text
IMPLEMENT
   ↓
TEST
   ↓
FAIL?
 ├── YES → DEBUG → FIX → RE-TEST
 └── NO
      ↓
REGRESSION TEST
      ↓
PHASE PASS
      ↓
NEXT PHASE
```

The purpose of this document is to ensure that HYRO Automation is built
incrementally, verified incrementally, and never allowed to accumulate
an undetected failure across phases.

**The SDD defines what HYRO must be.\
This Testing SDD defines how each phase proves that it works.**
