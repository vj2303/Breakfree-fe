# BreakFree Frontend

**SkillSight AI** — Frontend for the BreakFree assessment platform: admin dashboard, assessor portal, and participant portal for case studies and inbox activities.

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **State:** React Context (AuthContext)
- **UI:** Radix UI, Lucide Icons | Forms: React Hook Form, Zod

## Prerequisites

- Node.js 18+
- Backend API running (see [breakfree-server](https://github.com/Gajender401/breakfree-server))

## Getting started

```bash
# Install dependencies
npm install

# Run development server (default: http://localhost:3000)
npm run dev
```

## Backend / API

The app talks to the BreakFree backend API. Set the base URL as needed:

- **Local:** `http://localhost:3001` (default in config)
- **Production:** Set via env (e.g. `NEXT_PUBLIC_API_URL` or your `apiConfig`)

See `src/lib/apiConfig.ts` and `.env*` for configuration.

## Scripts

| Command   | Description              |
|----------|--------------------------|
| `npm run dev`   | Start dev server (Next.js) |
| `npm run build` | Production build          |
| `npm run start` | Start production server    |
| `npm run lint`  | Run ESLint                |

## Routes (overview)

| Path | Role        | Description                    |
|------|-------------|--------------------------------|
| `/`  | All         | Landing, account type select   |
| `/login` | Admin    | Admin login                    |
| `/register` | Admin  | Admin registration             |
| `/dashboard/*` | Admin | Report generation, assessment centers, AI trainer |
| `/participant/login` | Participant | Participant login      |
| `/participant/dashboard` | Participant | Assigned activities (case study & inbox) |
| `/assessor/login` | Assessor | Assessor login          |
| `/assessor/dashboard` | Assessor | Assessor dashboard   |

For detailed flows and architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## License

Proprietary — Breakfree Consulting.
