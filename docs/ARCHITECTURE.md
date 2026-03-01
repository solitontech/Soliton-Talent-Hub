# Soliton Talent Hub — Architecture Document

> **Version:** 1.0  
> **Date:** 2026-02-15  
> **Status:** Living Document

---

## 1. Overview

Soliton Talent Hub is an in-house coding assessment platform designed for talent recruitment. It replaces third-party platforms like HackerRank with a self-hosted solution that gives Soliton full control over the candidate evaluation pipeline.

### 1.1 Core Capabilities

| Capability | Description |
|---|---|
| **Question Bank** | Admins create coding questions with boilerplate code, public test cases (visible to candidates), and private test cases (hidden). |
| **Test Composition** | Tests are assembled from question bank items and include custom instructions. |
| **Candidate Invitations** | Admins bulk-invite candidates via email. Each invite creates a one-time personalised link tied to a specific date/time and duration. |
| **Proctored Test Session** | Tab-switch / browser-close / copy-paste detection. Violations auto-fail the test. |
| **Code Execution** | Candidate code is compiled and run server-side against test case inputs. Output is compared to expected output. |
| **Submission Analysis** | Per-candidate report: pass/fail per test case, submitted code, time taken, proctoring violations. |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 14+** (App Router) |
| Language | **TypeScript** (strict mode) |
| UI | **shadcn/ui** + **Tailwind CSS v3** |
| State Management | **TanStack Query** (server state) + **TanStack Store** (client state) |
| Database | **PostgreSQL 16** via **Prisma ORM** |
| Auth | **NextAuth.js v5** (Credentials provider for admins) |
| Email | **Nodemailer** (SMTP) / **Resend** |
| Code Execution | **Self-hosted Judge0** (Docker Compose) — Isolate sandbox (Linux namespaces + cgroups + seccomp) |
| Testing | **Vitest** (unit/integration) + **Playwright** (E2E) |
| Monorepo | Single Next.js app (no monorepo tooling needed for V1) |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Next.js App                        │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Admin Pages  │  │ Candidate    │  │  API Routes   │  │
│  │  /admin/*     │  │ Pages        │  │  /api/*       │  │
│  │              │  │ /test/*      │  │              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│  ┌──────┴─────────────────┴─────────────────┴───────┐  │
│  │                  Service Layer                    │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐ │  │
│  │  │Question│ │  Test  │ │Invite  │ │  Execution │ │  │
│  │  │Service │ │Service │ │Service │ │  Client    │ │  │
│  │  └────────┘ └────────┘ └────────┘ └─────┬──────┘ │  │
│  └──────────────────────┬────────────────── │ ───────┘  │
│                         │                  │           │
│  ┌──────────────────────┴───────────────┐  │           │
│  │       Prisma ORM (Data Layer)        │  │ HTTP      │
│  └──────────────────────┬───────────────┘  │           │
└─────────────────────────┼──────────────────┼───────────┘
                          │                  │
               ┌──────────┴──────┐  ┌────────┴───────────┐
               │  PostgreSQL DB  │  │  Judge0 Service     │
               └─────────────────┘  │  (Docker Compose)  │
                                    │                    │
                                    │  ┌──────────────┐  │
                                    │  │ judge0-server│  │
                                    │  │  :2358       │  │
                                    │  ├──────────────┤  │
                                    │  │ judge0-worker│  │
                                    │  │  (Isolate)   │  │
                                    │  ├──────────────┤  │
                                    │  │  Redis       │  │
                                    │  │  :6379       │  │
                                    │  ├──────────────┤  │
                                    │  │  PostgreSQL  │  │
                                    │  │  (Judge0 DB) │  │
                                    │  └──────────────┘  │
                                    └────────────────────┘
```

> **Note:** Judge0 runs as a sidecar service on the same server, communicating with the Next.js app over HTTP on an internal port. It is not exposed to the public internet.

---

## 4. Data Models

### 4.1 Entity Relationship Diagram (Conceptual)

```
Admin ──┐
        │ creates
        ▼
   Question ──── TestCase (public / private)
        │
        │ selected into
        ▼
      Test ──── TestQuestion (join, with ordering)
        │
        │ invite
        ▼
  Invitation ──── Candidate
        │
        │ starts
        ▼
  TestSession ──── Submission (per question)
                      │
                      └── SubmissionResult (per test case)
```

### 4.2 Prisma Schema (Core Models)

```prisma
// ──── Auth & Users ────

model Admin {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  passwordHash  String
  createdAt     DateTime  @default(now())
  createdBy     String?   // admin who created this admin
}

model Candidate {
  id            String        @id @default(cuid())
  email         String        @unique
  name          String?
  createdAt     DateTime      @default(now())
  invitations   Invitation[]
  testSessions  TestSession[]
}

// ──── Question Bank ────

model Question {
  id              String          @id @default(cuid())
  title           String
  description     String          @db.Text    // Markdown
  difficulty      Difficulty      @default(MEDIUM)
  boilerplateCode String?         @db.Text
  language        Language        @default(C)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  createdById     String
  testCases       TestCase[]
  testQuestions   TestQuestion[]
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum Language {
  C
  CPP
}

model TestCase {
  id          String   @id @default(cuid())
  questionId  String
  question    Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  input       String   @db.Text
  output      String   @db.Text
  isPublic    Boolean  @default(false)
  order       Int      @default(0)
}

// ──── Tests ────

model Test {
  id            String          @id @default(cuid())
  title         String
  instructions  String          @db.Text    // Markdown shown to candidate
  durationMins  Int             // default duration in minutes
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  createdById   String
  questions     TestQuestion[]
  invitations   Invitation[]
}

model TestQuestion {
  id          String   @id @default(cuid())
  testId      String
  test        Test     @relation(fields: [testId], references: [id], onDelete: Cascade)
  questionId  String
  question    Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  order       Int      @default(0)

  @@unique([testId, questionId])
}

// ──── Invitations ────

model Invitation {
  id              String          @id @default(cuid())
  token           String          @unique @default(cuid())  // one-time link token
  testId          String
  test            Test            @relation(fields: [testId], references: [id])
  candidateId     String
  candidate       Candidate       @relation(fields: [candidateId], references: [id])
  scheduledAt     DateTime        // date + time the test opens
  durationMins    Int             // duration for this specific invite
  status          InvitationStatus @default(PENDING)
  createdAt       DateTime        @default(now())
  emailSentAt     DateTime?
  testSession     TestSession?
}

enum InvitationStatus {
  PENDING       // email sent, not started
  STARTED       // test in progress
  COMPLETED     // candidate finished
  FAILED        // proctoring violation or time expired
  EXPIRED       // scheduledAt + durationMins passed without starting
}

// ──── Test Sessions ────

model TestSession {
  id              String           @id @default(cuid())
  invitationId    String           @unique
  invitation      Invitation       @relation(fields: [invitationId], references: [id])
  candidateId     String
  candidate       Candidate        @relation(fields: [candidateId], references: [id])
  startedAt       DateTime         @default(now())
  finishedAt      DateTime?
  status          SessionStatus    @default(IN_PROGRESS)
  failReason      String?          // e.g. "TAB_SWITCH", "BROWSER_CLOSE", "TIME_EXPIRED"
  submissions     Submission[]
  proctorEvents   ProctorEvent[]
}

enum SessionStatus {
  IN_PROGRESS
  COMPLETED
  FAILED
}

model ProctorEvent {
  id            String      @id @default(cuid())
  sessionId     String
  session       TestSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  eventType     String      // VISIBILITY_CHANGE, BLUR, COPY, PASTE, BEFOREUNLOAD
  timestamp     DateTime    @default(now())
  metadata      Json?
}

// ──── Submissions ────

model Submission {
  id              String              @id @default(cuid())
  sessionId       String
  session         TestSession         @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  questionId      String
  code            String              @db.Text
  language        Language
  submittedAt     DateTime            @default(now())
  results         SubmissionResult[]

  @@unique([sessionId, questionId])  // one submission per question per session
}

model SubmissionResult {
  id              String     @id @default(cuid())
  submissionId    String
  submission      Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  testCaseId      String
  passed          Boolean
  actualOutput    String?    @db.Text
  executionTimeMs Int?
  error           String?    @db.Text   // compilation or runtime error
}
```

---

## 5. Module Breakdown

### 5.1 Directory Structure

```
src/
├── app/
│   ├── (admin)/                    # Admin layout group
│   │   ├── admin/
│   │   │   ├── dashboard/          # Admin dashboard
│   │   │   ├── questions/          # Question CRUD
│   │   │   ├── tests/              # Test composition
│   │   │   ├── invitations/        # Invite management
│   │   │   ├── candidates/         # Candidate profiles & results
│   │   │   └── settings/           # Admin management (add admins)
│   │   └── layout.tsx              # Admin sidebar layout
│   ├── (candidate)/                # Candidate layout group
│   │   ├── test/
│   │   │   ├── [token]/            # Landing page (instructions + start)
│   │   │   └── session/[sessionId] # Active test page (code editor)
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/                   # NextAuth routes
│   │   ├── questions/              # Question CRUD API
│   │   ├── tests/                  # Test CRUD API
│   │   ├── invitations/            # Invitation + bulk invite API
│   │   ├── sessions/               # Test session lifecycle API
│   │   ├── execute/                # Code execution API
│   │   └── submissions/            # Submission API
│   ├── layout.tsx
│   └── page.tsx                    # Landing / login redirect
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── admin/                      # Admin-specific components
│   ├── candidate/                  # Candidate-specific components
│   ├── code-editor/                # Monaco editor wrapper
│   └── common/                     # Shared components
├── lib/
│   ├── db.ts                       # Prisma client singleton
│   ├── auth.ts                     # NextAuth config
│   ├── email.ts                    # Email service
│   ├── execution/                  # Code execution engine
│   │   ├── index.ts                # Engine interface
│   │   ├── c-runner.ts             # C compiler + runner
│   │   ├── cpp-runner.ts           # C++ compiler + runner
│   │   └── types.ts                # Shared types
│   ├── validators/                 # Zod schemas
│   └── utils.ts                    # Utility functions
├── hooks/                          # Custom React hooks
│   ├── use-proctor.ts              # Tab switch / focus detection
│   ├── use-timer.ts                # Countdown timer
│   └── use-code-editor.ts          # Editor state management
├── stores/                         # TanStack Store definitions
│   └── test-session.ts             # Active test session state
├── types/                          # Global TypeScript types
└── __tests__/                      # Test files (mirrors src structure)
    ├── unit/
    ├── integration/
    └── e2e/
```

### 5.2 Core Modules

#### A. Code Execution Engine (`lib/execution/`)

The execution engine is a **thin HTTP client** that delegates all compilation and sandboxed running to the self-hosted **Judge0** service. This gives production-grade isolation without building custom container logic.

```typescript
// lib/execution/types.ts
export interface ExecutionRequest {
  code: string;
  language: Language;
  input: string;
  expectedOutput?: string;
  timeoutMs?: number;      // default 10000 (maps to cpu_time_limit)
  memoryLimitMb?: number;  // default 256   (maps to memory_limit in KB)
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  compileOutput: string;
  exitCode: number | null;
  executionTimeMs: number;
  memoryUsedKb: number;
  timedOut: boolean;
  status: Judge0StatusId;  // 3=Accepted, 4=Wrong Answer, 5=TLE, 6=CE, etc.
  error?: string;
}

// lib/execution/judge0-client.ts
// Judge0 language IDs for supported languages
export const JUDGE0_LANGUAGE_IDS: Record<Language, number> = {
  C:   50,   // C (GCC 9.2.0)
  CPP: 54,   // C++ (GCC 9.2.0)
};

export async function executeCode(req: ExecutionRequest): Promise<ExecutionResult> {
  const JUDGE0_URL = process.env.JUDGE0_URL; // e.g. http://localhost:2358
  const JUDGE0_AUTH = process.env.JUDGE0_AUTH_TOKEN; // optional, for security

  // Step 1: Submit to Judge0
  const submission = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': JUDGE0_AUTH },
    body: JSON.stringify({
      source_code:      req.code,
      language_id:      JUDGE0_LANGUAGE_IDS[req.language],
      stdin:            req.input,
      expected_output:  req.expectedOutput ?? null,
      cpu_time_limit:   (req.timeoutMs ?? 10000) / 1000,
      memory_limit:     (req.memoryLimitMb ?? 256) * 1024,  // Judge0 uses KB
      max_file_size:    1024,  // 1 MB max output
    }),
  }).then(r => r.json());

  const { token } = submission;

  // Step 2: Poll until complete (status.id > 2 means finished)
  let result;
  let attempts = 0;
  do {
    await new Promise(r => setTimeout(r, 300));
    result = await fetch(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,compile_output,time,memory,exit_code,status`,
      { headers: { 'X-Auth-Token': JUDGE0_AUTH } }
    ).then(r => r.json());
    attempts++;
  } while (result.status.id <= 2 && attempts < 40); // max ~12s wait

  // Step 3: Map to internal ExecutionResult
  return {
    stdout:         result.stdout ?? '',
    stderr:         result.stderr ?? '',
    compileOutput:  result.compile_output ?? '',
    exitCode:       result.exit_code ?? null,
    executionTimeMs: parseFloat(result.time ?? '0') * 1000,
    memoryUsedKb:   result.memory ?? 0,
    timedOut:       result.status.id === 5,  // TLE
    status:         result.status.id,
    error:          result.compile_output || result.stderr || undefined,
  };
}
```

**Execution Steps (inside Judge0's Isolate sandbox):**
1. Judge0 receives the submission over HTTP
2. The **worker** picks it up from the Redis-backed queue
3. Source code is written to an isolated workspace
4. Compiled with `gcc`/`g++` inside the sandbox
5. Binary is executed with the test case `input` piped to stdin
6. Resource limits enforced by Linux cgroups (CPU time, wall time, memory, PIDs)
7. stdout is captured and compared against `expected_output`
8. Result is stored in Judge0's own PostgreSQL DB and returned via the token

#### B. Proctoring Module (`hooks/use-proctor.ts`)

Client-side proctoring hooks that detect:

| Event | Browser API | Action |
|---|---|---|
| Tab switch | `document.visibilitychange` | Log event → Fail test |
| Window blur | `window.blur` | Log event → Fail test |
| Browser close/tab close | `window.beforeunload` | Log event → Fail test |
| Copy | `document.oncopy` | Prevent + log |
| Paste | `document.onpaste` | Prevent + log |
| Right-click | `contextmenu` event | Prevent |
| Keyboard shortcuts | `keydown` (Ctrl+C/V/Tab/Alt+Tab) | Prevent + log |

All events are logged to `ProctorEvent` table for the analysis report. The first violation triggers automatic test failure and navigation to a "Test Failed" page.

#### C. Email Service (`lib/email.ts`)

- Uses Nodemailer with configurable SMTP transport
- Supports bulk sending with rate limiting
- Email templates for: invitation, test reminder, test completion
- Each email contains the one-time personalised link: `{BASE_URL}/test/{invitation.token}`

---

## 6. API Routes

### 6.1 Admin APIs (Protected — require admin session)

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create new admin (admin-only) |
| GET/POST | `/api/questions` | List / Create questions |
| GET/PUT/DELETE | `/api/questions/[id]` | Get / Update / Delete question |
| GET/POST | `/api/tests` | List / Create tests |
| GET/PUT/DELETE | `/api/tests/[id]` | Get / Update / Delete test |
| POST | `/api/invitations/bulk` | Bulk invite candidates |
| GET | `/api/invitations` | List invitations (filterable) |
| GET | `/api/candidates` | List candidates |
| GET | `/api/candidates/[id]` | Candidate profile + all test results |
| GET | `/api/candidates/[id]/sessions/[sessionId]` | Detailed session analysis |

### 6.2 Candidate APIs (Protected — require valid invitation/session)

| Method | Route | Description |
|---|---|---|
| GET | `/api/sessions/validate/[token]` | Validate invitation token |
| POST | `/api/sessions/start` | Start test session (invalidates invite link) |
| POST | `/api/execute` | Run code against public test cases ("Try") |
| POST | `/api/submissions` | Submit code for a question ("Submit") |
| POST | `/api/sessions/[id]/proctor-event` | Log proctoring event |
| POST | `/api/sessions/[id]/finish` | Finish test session |
| POST | `/api/sessions/[id]/fail` | Fail test session (proctoring violation) |

---

## 7. Key Flows

### 7.1 Admin Creates & Sends Invitations

```
Admin → Creates Questions (with test cases) 
      → Creates Test (selects questions, writes instructions)
      → Bulk Invite (uploads CSV or enters emails, picks test, sets date/time/duration)
      → System creates Candidate profiles (if needed)
      → System creates Invitation records
      → System sends emails with personalised links
```

### 7.2 Candidate Takes Test

```
Candidate clicks link → GET /test/[token]
  → Validate token (exists, not used, not expired)
  → Show landing page with instructions
  → Start button disabled until scheduledAt is reached
  
Candidate clicks Start → POST /api/sessions/start
  → Create TestSession record
  → Mark Invitation status = STARTED
  → Redirect to /test/session/[sessionId]
  → Start countdown timer
  → Activate proctoring hooks
  
During test:
  → Candidate writes code in Monaco editor
  → "Try" button → POST /api/execute (public test cases, results shown)
  → "Submit" button → Confirmation popup → POST /api/submissions (private test cases, results NOT shown)
  
Test ends:
  → All questions submitted OR timer expires
  → POST /api/sessions/[id]/finish
  → Generate analysis report
  → Show "Test Complete" page
  
Proctoring violation:
  → POST /api/sessions/[id]/proctor-event (log it)
  → POST /api/sessions/[id]/fail
  → Show "Test Failed" page
```

---

## 8. Security — Code Execution

### Self-Hosted Judge0 (Current Architecture)

Code execution is fully delegated to **Judge0**, which uses **[Isolate](https://github.com/ioi/isolate)** — the same sandbox used by the International Olympiad in Informatics (IOI). This provides production-grade security from day one, without custom container logic.

**Sandbox guarantees provided by Judge0 / Isolate:**

| Protection | Mechanism |
|---|---|
| **Process isolation** | Linux namespaces (PID, mount, network, IPC) |
| **Network access** | Completely disabled — no outbound/inbound |
| **Filesystem access** | Read-only except a private `/box` workspace, destroyed after execution |
| **CPU time limit** | Configurable per submission (default: 10 seconds) |
| **Wall time limit** | Separate wall-clock limit to catch sleeping processes |
| **Memory limit** | cgroups enforcement (default: 256 MB) |
| **Process count** | Max PIDs limit prevents fork bombs |
| **Syscall filtering** | seccomp-bpf blocks dangerous syscalls |
| **Root escalation** | Execution runs as an unprivileged user inside the sandbox |

**Application-level safeguards (on top of Judge0):**
- Judge0 runs on an internal port (`:2358`) — **not exposed to the public internet**
- Optionally secured with `X-Auth-Token` header (set `JUDGE0_AUTH_TOKEN` env var)
- `JUDGE0_URL` is a private env variable — never exposed to the client
- Rate limiting per candidate session (handled in the API route layer)
- All submission code and results are stored in the app's own PostgreSQL DB for audit

### Future Hardening (V1.1)

1. **Authentication on Judge0 API**
   - Enable Judge0's built-in `AUTHN_HEADER` + token authentication
   - Rotate tokens periodically

2. **Static Pre-Check Before Submission**
   - Scan for dangerous `#include` headers (`<sys/socket.h>`, `<unistd.h>` etc.)
   - Reject inline assembly patterns
   - Block known malicious code patterns before even sending to Judge0

3. **Rate Limiting & Execution Queue**
   - Enforce max N concurrent submissions per session at the API route level
   - Judge0's Redis-backed worker queue already handles this natively

4. **Audit Logging**
   - Log all submissions (code + input + output) with session ID for post-hoc auditing
   - Alert on anomalous patterns (very long runtimes, repeated TLE, etc.)

---

## 9. Additional Considerations

### 9.1 Concurrency & Race Conditions
- Use database transactions for critical operations (starting sessions, submitting answers)
- Optimistic locking on submission records to prevent double-submit
- Server-side timer validation (don't trust client timer alone)

### 9.2 Time Synchronisation
- Server is the source of truth for all time calculations
- Client timer is for display only; server validates session duration on every API call
- Grace period of 30 seconds on timer expiry to account for network latency

### 9.3 Code Editor
- **Monaco Editor** (VS Code's editor) embedded in the test page
- Syntax highlighting for C/C++
- No auto-complete / IntelliSense (to test candidate's knowledge)
- Disable copy-paste within the editor during tests

### 9.4 Scalability Notes (V1)
- V1 targets ~50-100 concurrent candidates
- PostgreSQL handles this easily
- Code execution is the bottleneck; sequential execution per submission is fine for V1
- V1.1 should introduce a Redis-backed execution queue for higher concurrency

### 9.5 Deployment
- Single server deployment (VM or bare metal running **Linux** — required by Judge0/Isolate)
- Judge0 runs as a Docker Compose sidecar on the same server (see §10)
- PostgreSQL can be on the same server or a managed instance
- Environment variables for all configuration (DB URL, SMTP, secrets, Judge0 URL/token)
- **`gcc` and `g++` do not need to be installed on the host** — they are bundled inside the Judge0 Docker image

---

## 10. Judge0 Self-Hosting Setup

### 10.1 Prerequisites

- Linux server (Ubuntu 22.04 LTS recommended) — **Judge0's Isolate sandbox requires Linux**
- Docker Engine + Docker Compose v2 installed
- Minimum specs: **2 vCPU, 4 GB RAM, 20 GB disk**
- Port `2358` accessible internally (do NOT open to the public internet)

### 10.2 Directory Structure

```
/opt/judge0/
├── docker-compose.yml
├── judge0.conf          # Judge0 configuration file
└── .env                 # Secrets (DB password, Redis password, auth token)
```

### 10.3 `docker-compose.yml`

```yaml
services:
  server:
    image: judge0/judge0:1.13.1
    volumes:
      - ./judge0.conf:/judge0.conf:ro
    ports:
      - "2358:2358"       # Internal only — do NOT expose publicly
    privileged: true       # Required for Isolate sandbox
    restart: always
    env_file: .env
    depends_on:
      - db
      - redis
    command: ["./scripts/server"]

  worker:
    image: judge0/judge0:1.13.1
    volumes:
      - ./judge0.conf:/judge0.conf:ro
    privileged: true       # Required for Isolate sandbox (cgroups, namespaces)
    restart: always
    env_file: .env
    depends_on:
      - db
      - redis
    command: ["./scripts/worker"]

  db:
    image: postgres:16
    env_file: .env
    volumes:
      - judge0-db-data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - judge0-redis-data:/data
    restart: always

volumes:
  judge0-db-data:
  judge0-redis-data:
```

### 10.4 `judge0.conf` (Key Settings)

```ini
# Database
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=judge0
POSTGRES_USER=judge0
# POSTGRES_PASSWORD comes from .env

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
# REDIS_PASSWORD comes from .env

# Execution limits (overridable per submission)
CPU_TIME_LIMIT=10          # seconds
WALL_TIME_LIMIT=15         # seconds (catch sleeping processes)
MEMORY_LIMIT=262144        # KB = 256 MB
STACK_LIMIT=65536          # KB = 64 MB
MAX_PROCESSES_AND_OR_THREADS=30
ENABLE_PER_PROCESS_AND_THREAD_TIME_LIMIT=true
ENABLE_PER_PROCESS_AND_THREAD_MEMORY_LIMIT=true
MAX_FILE_SIZE=1024         # KB = 1 MB max stdout

# Security
AUTHN_HEADER=X-Auth-Token
AUTHN_TOKEN=              # Set in .env — used by Next.js to authenticate requests

# Workers
NUMBER_OF_WORKERS=4       # Increase for higher concurrency
```

### 10.5 `.env` (Secrets)

```env
POSTGRES_PASSWORD=<strong-random-password>
REDIS_PASSWORD=<strong-random-password>
AUTHN_TOKEN=<strong-random-token>   # Same value goes into JUDGE0_AUTH_TOKEN in Next.js app
```

### 10.6 Deployment Steps

```bash
# 1. Clone Judge0 config
mkdir -p /opt/judge0 && cd /opt/judge0

# 2. Create docker-compose.yml, judge0.conf, .env (as above)

# 3. Pull images
docker compose pull

# 4. Start services
docker compose up -d

# 5. Verify Judge0 is healthy
curl http://localhost:2358/system_info
# Should return JSON with language list and config

# 6. Test a submission manually
curl -X POST http://localhost:2358/submissions?wait=true \
  -H 'Content-Type: application/json' \
  -H 'X-Auth-Token: <your-token>' \
  -d '{
    "source_code": "#include<stdio.h>\nint main(){printf(\"Hello\");return 0;}",
    "language_id": 50,
    "stdin": ""
  }'
# Expected: { "stdout": "Hello", "status": { "description": "Accepted" } }
```

### 10.7 Next.js App Configuration

Add to your `.env.local` / server environment:

```env
JUDGE0_URL=http://localhost:2358
JUDGE0_AUTH_TOKEN=<same-token-as-judge0-conf>
```

### 10.8 Supported Language IDs (V1)

| Language | Judge0 Language ID | Compiler |
|---|---|---|
| C | `50` | GCC 9.2.0 |
| C++ | `54` | GCC 9.2.0 |
| C++ 17 | `76` | GCC 8.4.0 |

> Additional languages (Python, Java, etc.) can be enabled simply by adding their `language_id` to `JUDGE0_LANGUAGE_IDS` in `lib/execution/judge0-client.ts` — no infrastructure changes needed.

### 10.9 Monitoring & Maintenance

```bash
# View worker logs
docker compose logs -f worker

# View server logs
docker compose logs -f server

# Check queue depth (Redis)
docker compose exec redis redis-cli -a <password> LLEN queue

# Restart after config change
docker compose restart

# Upgrade Judge0 version
docker compose pull && docker compose up -d
```

---

## 11. Testing Strategy

| Layer | Tool | What We Test |
|---|---|---|
| **Unit** | Vitest | Service functions, validators, utilities, Judge0 client mapping logic |
| **Integration** | Vitest + Prisma (test DB) | API routes, database operations, full execution pipeline (against real Judge0) |
| **E2E** | Playwright | Admin workflows, candidate test flow, proctoring behavior |
| **Component** | Vitest + React Testing Library | UI components in isolation |

### Key Test Scenarios
1. Complete admin flow: login → create question → create test → invite candidate
2. Complete candidate flow: open link → start test → write code → try → submit → finish
3. Proctoring: tab switch detection, browser close detection, copy-paste prevention
4. Edge cases: expired invitations, reused links, timer expiry, concurrent submissions
5. Code execution: successful compilation, compilation errors, runtime errors, TLE, correct/incorrect output
6. Judge0 client: correct language ID mapping, polling behaviour, timeout handling, error mapping

---

*This is a living document. Update it as the architecture evolves.*
