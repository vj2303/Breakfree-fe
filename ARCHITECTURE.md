# Breakfree Frontend Architecture

> **SkillSight AI** — An intelligent platform for assessments, AI-powered training, and report generation.

---

## 1. Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| State | React Context (AuthContext) |
| UI Components | Radix UI, Lucide Icons |
| Forms | React Hook Form, Zod |
| Charts | Recharts |
| Rich Text | TipTap |
| HTTP | Fetch API, Axios |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BREAKFREE FRONTEND                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │   Root      │    │   Auth      │    │   Toast     │    │   Global    │       │
│  │   Layout    │───▶│   Provider  │───▶│   Container │───▶│   Styles    │       │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘       │
│         │                   │                                                      │
│         ▼                   ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        ROUTE TREE (App Router)                               │ │
│  │  /               Landing (Join Us - Account Type Selection)                  │ │
│  │  /login          Admin Login                                                  │ │
│  │  /register       Admin Registration (2-step)                                 │ │
│  │  /assessor/*     Assessor Portal (login, dashboard, assess, feedback)        │ │
│  │  /participant/*  Participant Portal (login, dashboard, case-study, inbox)     │ │
│  │  /dashboard/*    Admin Portal (AI Trainer, Report Generation)                 │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                         │
│         ▼                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    Next.js API Routes (BFF Layer)                            │ │
│  │  /api/auth/* | /api/assignments/* | /api/assessment-centers/* | etc.         │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│         │                                                                         │
│         ▼                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    Backend API (External - localhost:3001)                    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Frontend Flow

### 3.1 Entry & Authentication Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   User visits    │     │  Account Type    │     │  Role-specific   │
│   / (Root)       │────▶│  Selection       │────▶│  Login/Register  │
│   "Join Us"      │     │  (Admin/Assessor/│     │  Pages           │
└──────────────────┘     │   Participant)   │     └──────────────────┘
                         └──────────────────┘              │
                                                           ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Dashboard      │◀────│  API: /api/auth/ │◀────│  Login Form      │
│   (Role-based)   │     │  login or register│     │  Submit          │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │
         │  Token stored in localStorage
         │  AuthContext fetches /api/auth/me → sets user, participantId, assessorId
         ▼
```

**Flow Details:**

1. **Landing (`/`)**: User selects account type → routes to:
   - Admin → `/register` or `/login`
   - Assessor → `/assessor/login`
   - Participant → `/participant/login`

2. **Login (`/login`)**: Uses `AuthContext.login()` → calls `/api/auth/login` → backend returns `{ token, user }` → stored in `localStorage` → `fetchUserProfile()` called → redirects by role:
   - `ADMIN` → `/dashboard`
   - `PARTICIPANT` → `/participant/dashboard`
   - `ASSESSOR` → `/assessor/dashboard`

3. **Register (`/register`)**: 2-step form (account info → profile) → `AuthContext.register()` → `/api/auth/register` → redirect to `/login`.

4. **Session Restore**: On app load, `AuthContext` checks `localStorage.token` → if present, calls `/api/auth/me` → sets `user`, `participantId`, or `assessorId`.

5. **Email Uniqueness Contract (Frontend ↔ Backend)**:
   - The backend now enforces **global unique emails** across **all user-related models**:
     - `User` (login accounts: admin, participant, assessor, etc.)
     - `Participant`
     - `AppUser` (assessors / learners / admin-type app users)
   - This means:
     - If an email is already used for a **participant**, the frontend **must not** allow creating an assessor or admin with the same email (and vice versa).
     - Backend endpoints (`/api/auth/register`, `/api/participants`, `/api/assessors`, `/api/users`) will return **409 Conflict** when attempting to reuse an email.
   - **Frontend responsibility**:
     - Surface 409 responses as clear validation errors like _"This email is already used by another account type. Please use a different email."_.
     - Do not try to “convert” or reassign identities purely on the frontend; identity and role resolution is owned by the backend.
   - **Why this matters**:
     - Previously, using the same email for a **participant** and an **assessor** could cause the assessor bulk-login flow to silently **overwrite** the login role and password, creating confusing login behavior.
     - With global uniqueness, every email clearly maps to exactly **one identity and role path**, simplifying routing and state inside `AuthContext`.

---

### 3.2 Admin Flow (Dashboard)

```
/dashboard (Admin Home)
    │
    ├──▶ AI for Trainers → /dashboard/ai-trainer/create
    │         │
    │         ├── Create: Set content_type, audience_type, delivery_method, etc.
    │         ├── Responses: View generated prompts, select one
    │         └── Chat: Chat with selected prompt (external API: NEXT_PUBLIC_BASE_URL/generate-prompts)
    │
    └──▶ SkillSightAI (Report Generation) → /dashboard/report-generation/content
              │
              ├── Report Generation Layout (Sidebar)
              │     ├── Home
              │     ├── Content
              │     ├── Reports
              │     └── People
              │
              └── Content Management (Tabs)
                    ├── Assessment Center
                    ├── Assessment (Case Study / Inbox Activity)
                    ├── Report Structure
                    ├── AI Profile
                    └── Competency Mapping
```

---

### 3.3 Report Generation Content Flow

```
Content (/content) → redirects to /content/assessment-center

Assessment Center Page
    │
    ├── List: Assessment centers (from AuthContext.fetchAssessmentCenters)
    ├── Create: /content/assessment-center/create
    │         │
    │         └── AssessmentCenterStepper (multi-step)
    │               ├── Select Content (activities)
    │               ├── Add Framework
    │               ├── Select Competencies
    │               ├── Subject-Exercise Matrix
    │               ├── Participant & Assessor Management
    │               ├── Report Configuration
    │               └── Add Document
    │
    ├── Edit: /content/assessment-center/create?edit={id}
    ├── Assign Participants: AssignParticipantsModal
    └── Delete: Delete confirmation modal
```

**Assessment Creation Flow:**
- Case Study: `/content/assessment/case-study` (steps: Overview, Scenario, Task, Preview)
- Inbox Activity: `/content/assessment/inbox-activity` (steps: Overview, Scenario, Add Characters, Add Content, Preview)

---

### 3.4 Participant Flow

```
/participant/login → /participant/dashboard

Participant Dashboard
    │
    │  AuthContext.fetchAssignments() → /api/assignments/participant/{participantId}
    │  Maps assignments to AssessmentCards
    │
    └──▶ Click "Start" on assignment
              │
              ├── CASE_STUDY → /participant/dashboard/case-study?assignmentId={id}
              │         Steps: Overview → Scenario → Task → Review
              │
              └── INBOX_ACTIVITY → /participant/dashboard/inbox?assignmentId={id}
                        Steps: Overview → Scenario → Gmail Inbox → Task → Organization Chart
```

**Submission:** Participant submits via `/api/assignments/submit` (or equivalent).

---

### 3.5 Assessor Flow

```
/assessor/login → /assessor/dashboard

Assessor Dashboard
    │
    │  AuthContext.fetchAssessorGroups() → /api/assessors/{assessorId}/groups
    │
    ├── Management groups
    ├── Assess: /assessor/assess (list) → /assessor/assess/[id] → /assessor/assess/[id]/score/[participantId]
    └── Feedback: /assessor/feedback
```

---

## 4. Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout: AuthProvider, ToastContainer
│   ├── page.tsx                  # Landing: Join Us (account type selection)
│   ├── globals.css
│   │
│   ├── (auth)/                   # Auth route group
│   │   ├── login/page.tsx        # Admin login
│   │   └── register/page.tsx     # Admin registration (2-step)
│   │
│   ├── api/                      # BFF API routes (proxy to backend)
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── me/route.ts
│   │   ├── assignments/
│   │   ├── assessment-centers/
│   │   ├── assessors/
│   │   ├── participants/
│   │   ├── report-structures/
│   │   ├── document-evaluation/
│   │   ├── management-reports/
│   │   ├── ai-profiles/
│   │   ├── competency-libraries/
│   │   ├── competency-mappings/
│   │   └── upload/
│   │
│   ├── dashboard/                # Admin dashboard
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard home (AI Trainers | Report Generation)
│   │   ├── ai-trainer/           # AI for Trainers
│   │   │   ├── layout.tsx
│   │   │   ├── create/           # Create → Responses → Chat
│   │   │   └── evaluate/         # Evaluate content
│   │   └── report-generation/
│   │       ├── layout.tsx        # Sidebar: Home, Content, Reports, People
│   │       ├── home/page.tsx
│   │       ├── content/          # Content Management
│   │       │   ├── layout.tsx    # Tabs: Assessment Center, Assessment, etc.
│   │       │   ├── page.tsx     # Redirects to assessment-center
│   │       │   ├── assessment-center/
│   │       │   ├── assessment/   # Case Study, Inbox Activity
│   │       │   ├── report-structure/
│   │       │   ├── ai-profile/
│   │       │   └── competency-mapping/
│   │       ├── people/page.tsx   # Groups, Participants, Assessors
│   │       └── reports/page.tsx
│   │
│   ├── participant/              # Participant portal
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── page.tsx
│   │   └── dashboard/
│   │       ├── layout.tsx
│   │       ├── page.tsx          # Assignment cards
│   │       ├── case-study/       # Case study assessment
│   │       ├── inbox/            # Inbox activity assessment
│   │       └── profile/
│   │
│   └── assessor/                 # Assessor portal
│       ├── layout.tsx
│       ├── login/page.tsx
│       ├── dashboard/page.tsx
│       ├── assess/               # Assess participants
│       └── feedback/
│
├── components/                   # Shared components
│   ├── Navbar.tsx
│   ├── Dropdown.tsx, Popup.tsx, Form.tsx, etc.
│   ├── RichTextEditor/
│   ├── reports/                 # Report-specific components
│   └── ui/                       # Button, Label, Loader
│
├── context/
│   └── AuthContext.tsx           # Auth state, assignments, assessor groups, assessment centers
│
├── lib/                          # API clients & utilities
│   ├── apiConfig.ts
│   ├── aiProfileApi.ts
│   ├── caseStudyApi.ts
│   ├── inboxActivityApi.ts
│   ├── reportStructureApi.ts
│   ├── competencyLibraryApi.ts
│   ├── assignmentSubmissionApi.ts
│   └── util.ts
│
├── constants/
│   └── options.ts
│
└── utils/
    └── toast.ts
```

---

## 5. AuthContext Data Model

| State | Type | Purpose |
|-------|------|---------|
| `user` | `User \| null` | Current user profile |
| `token` | `string \| null` | JWT (localStorage) |
| `participantId` | `string \| null` | Set when user is participant |
| `assessorId` | `string \| null` | Set when user is assessor |
| `assignments` | `ParticipantAssignments \| null` | Participant's assignments |
| `assessorGroups` | `AssessorGroupsData \| null` | Assessor's groups |
| `assessmentCenters` | `AssessmentCentersData \| null` | Admin's assessment centers |

**Methods:**
- `login`, `register`, `logout`
- `fetchAssignments()` — participant
- `fetchAssessorGroups()` — assessor
- `fetchAssessmentCenters(page, limit, search)` — admin
- `updateAssessmentCenter`, `deleteAssessmentCenter`

---

## 6. API Layer

### 6.1 Next.js API Routes (BFF)

All routes under `/api/*` proxy to backend `SERVER_API_BASE_URL` (default: `http://localhost:3001/api`).

| Route | Purpose |
|-------|---------|
| `/api/auth/login` | Login |
| `/api/auth/register` | Register |
| `/api/auth/me` | Get current user + participantId/assessorId |
| `/api/assignments/participant/[id]` | Participant assignments |
| `/api/assignments/submit` | Submit assignment |
| `/api/assessment-centers` | CRUD assessment centers |
| `/api/assessors/[id]/groups` | Assessor groups |
| `/api/participants` | Participants CRUD |
| `/api/report-structures/*` | Report generation |
| `/api/document-evaluation/*` | Document evaluation |
| `/api/management-reports/*` | Management reports |
| `/api/ai-profiles/*` | AI profiles |
| `/api/competency-libraries/*` | Competency libraries |
| `/api/competency-mappings/*` | Competency mappings |
| `/api/upload` | File upload |

### 6.2 Direct Backend Calls

Some components call `API_BASE_URL_WITH_API` directly (e.g., People page, assessment center details, groups) when the BFF doesn't provide a proxy route.

---

## 7. User Roles & Routing Matrix

| Role | Login Entry | Main Dashboard | Key Features |
|------|-------------|---------------|--------------|
| **Admin** | `/login` or `/register` | `/dashboard` | AI Trainer, Report Generation, Content, People, Reports |
| **Assessor** | `/assessor/login` | `/assessor/dashboard` | Assess participants, Feedback, Management groups |
| **Participant** | `/participant/login` | `/participant/dashboard` | View assignments, Complete Case Study / Inbox Activity |

---

## 8. Key Flows Summary

| Flow | Entry | Exit |
|------|-------|------|
| **Admin creates assessment center** | Content → Assessment Center → Create | Multi-step stepper → Save |
| **Admin assigns participants** | Assessment Center card → Assign Participants | AssignParticipantsModal → Save |
| **Participant takes case study** | Dashboard → Start → case-study | Overview → Scenario → Task → Review → Submit |
| **Participant takes inbox activity** | Dashboard → Start → inbox | Overview → Scenario → Gmail Inbox → Task → Org Chart → Submit |
| **Assessor evaluates** | Assess → Select participant | Score page → Submit scores |
| **AI Trainer** | Dashboard → AI for Trainers | Create → Responses → Chat (external API) |

---

## 9. Persistence & State

- **Auth**: `localStorage.token`, in-memory `user`, `participantId`, `assessorId`
- **Assessment Center Create**: `localStorage` keys for form data, current step, edit ID (persists across refresh)
- **sessionStorage**: `assessment-center-auto-redirect` flag for tab navigation

---

## 10. Mermaid Diagrams

### Authentication Flow

```mermaid
flowchart TD
    A[/ Landing] --> B{Account Type}
    B -->|Admin| C[/register or /login]
    B -->|Assessor| D[/assessor/login]
    B -->|Participant| E[/participant/login]
    C --> F[AuthContext.login]
    F --> G[/api/auth/login]
    G --> H{Success}
    H -->|Yes| I[Set token, fetchUserProfile]
    I --> J{Role}
    J -->|ADMIN| K[/dashboard]
    J -->|PARTICIPANT| L[/participant/dashboard]
    J -->|ASSESSOR| M[/assessor/dashboard]
```

### Report Generation Flow

```mermaid
flowchart TD
    A[/dashboard] --> B[Report Generation]
    B --> C[/report-generation/content]
    C --> D[Content Tabs]
    D --> E[Assessment Center]
    D --> F[Assessment]
    D --> G[Report Structure]
    D --> H[AI Profile]
    D --> I[Competency Mapping]
    E --> J[List / Create / Edit]
    J --> K[AssessmentCenterStepper]
    K --> L[Select Content]
    K --> M[Add Framework]
    K --> N[Select Competencies]
    K --> O[Participant & Assessor]
    K --> P[Report Config]
    K --> Q[Add Document]
```

### Participant Assessment Flow

```mermaid
flowchart TD
    A[/participant/dashboard] --> B[fetchAssignments]
    B --> C[Display Assignment Cards]
    C --> D{Activity Type}
    D -->|CASE_STUDY| E[/case-study?assignmentId]
    D -->|INBOX_ACTIVITY| F[/inbox?assignmentId]
    E --> G[Overview → Scenario → Task → Review]
    F --> H[Overview → Scenario → Gmail Inbox → Task → Org Chart]
    G --> I[Submit]
    H --> I
```

---

*Last updated: March 2026 (email uniqueness & auth notes)*
