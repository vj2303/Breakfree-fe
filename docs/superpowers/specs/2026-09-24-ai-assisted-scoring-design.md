# AI-assisted scoring for document submissions

Date: 2026-09-24
Status: approved, not yet implemented

## Problem

An assessor scoring a case study reads the submission, then picks one of five
BARS levels for every sub-competency — 4 competencies with several
sub-competencies each, per activity, per participant. The rubric anchors are
already in the system (`AssessmentCenter.descriptors[activityId][competencyId][subCompetency]`),
and the submission is already stored, but nothing connects the two. The
assessor does that matching by hand every time.

## What we are building

A button on the assessor scoring screen that asks a model to propose a level
for each sub-competency of the current activity, each backed by a verbatim
quote from the submission. The assessor accepts, changes or ignores each
suggestion. Nothing is scored automatically.

### Decisions

| Decision | Choice | Why |
|---|---|---|
| Authority | AI suggests, assessor decides | Keeps accountability with the assessor, and yields agreement data before trusting it further |
| Scope | Document submissions only (pptx, docx, pdf, xlsx, text) | Text extraction already exists; video needs transcription, group discussion needs speaker attribution |
| Trigger | On demand, per activity | No queue or background jobs; only pay for what is used |
| Storage | Suggestion *and* the assessor's final choice | Survives reload, and measures how often the AI agrees with humans |
| Output | Level + evidence quote + mapped observations | A quote is checkable; a bare score is not |
| Reading decks | Extracted text, no slide images | Reuses existing extraction; revisit if real submissions prove visual |
| Placement | New endpoint in the Express backend | Rubric, submissions and the model proxy already live there |

### Explicitly out of scope

Auto-running on submission; video and group-discussion activities; AI-drafted
assessor comments; AI-drafted report descriptors; any path where a score is
saved without an assessor choosing it.

## Architecture

```
Assessor screen  ──POST /api/ai-scoring/suggest {participantId, assessmentCenterId, activityId}
                          │
                          ├─ load latest AssignmentSubmission (participant + activity)
                          ├─ load rubric: AssessmentCenter.descriptors[activityId]
                          ├─ extract text (textContent, or download fileUrl → parse)
                          ├─ one model call per competency  ──→ aiTrainer.service.completeText
                          ├─ validate + verify quotes
                          ├─ upsert AiScoreSuggestion rows
                          └─ return suggestions
```

New files, following existing conventions:

- `src/services/aiScoring.service.ts` — prompt building, model call, response
  validation, quote verification. No Express or Prisma types.
- `src/services/submissionText.service.ts` — submission → plain text with
  `[Slide n]` / `[Page n]` markers. Extraction logic currently sitting inside
  `documentEvaluation.controller.ts` moves here so both callers share it.
- `src/controllers/aiScoring.controller.ts` — request validation, loading,
  persistence, HTTP shape.
- `src/routers/aiScoring.router.ts` — routes, behind `authenticateToken`.

Reused as-is: `aiTrainer.service.completeText` (Claude, OpenAI fallback),
`authenticateToken`, the existing parser dependencies.

## The model call

One call per competency, not per sub-competency — fewer round trips, and the
model sees sibling sub-competencies for context. Each call receives:

- The competency name
- Every sub-competency with all five anchors, verbatim, keyed `score1..score5`
- The extracted submission text with location markers
- The activity name and type, for framing

Prompt rules, which exist to stop the two failure modes that matter
(inventing evidence, and drifting off the rubric):

1. Choose the anchor that matches what the submission actually shows, not the
   one that seems fair.
2. Quote verbatim from the submission, 25 words or fewer, with its location.
3. If the submission does not address a sub-competency, choose the lowest
   anchor and say so in the reasoning. Never infer intent.
4. Return only JSON.

Response shape:

```json
{"suggestions":[{"subCompetency":"<exact string from the rubric>",
  "scoreKey":"score3","confidence":0.72,
  "evidenceQuote":"...","evidenceLocation":"Slide 4","reasoning":"..."}]}
```

### Validation — the part that must not be skipped

Model output is untrusted input:

- `scoreKey` must be one of the keys that sub-competency actually defines.
  Anything else: drop the suggestion.
- `subCompetency` must match a rubric string exactly (after trimming). Unknown
  ones are dropped; missing ones simply get no suggestion, never a default.
- `evidenceQuote` is searched in the extracted text with whitespace and smart
  quotes normalised. Not found → stored with `quoteVerified: false` and shown
  to the assessor with a warning. It is never silently discarded, because a
  wrong quote is itself a signal about the suggestion.
- A response that will not parse as JSON fails the whole competency with a
  message the assessor can act on. No partial guessing.

## Data model

```prisma
model AiScoreSuggestion {
  id                 String   @id @default(auto()) @map("_id") @db.ObjectId
  participantId      String   @db.ObjectId
  assessmentCenterId String   @db.ObjectId
  activityId         String   @db.ObjectId
  competencyId       String   @db.ObjectId
  subCompetency      String

  suggestedScoreKey  String
  confidence         Float?
  evidenceQuote      String?
  evidenceLocation   String?
  reasoning          String?
  quoteVerified      Boolean  @default(false)

  model              String   // which model produced it
  promptVersion      String   // bump when the prompt changes, so old rows stay interpretable

  acceptedScoreKey   String?  // what the assessor finally chose
  acceptedAt         DateTime?
  acceptedBy         String?  @db.ObjectId

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([participantId, activityId, competencyId, subCompetency])
  @@index([assessmentCenterId])
  @@map("ai_score_suggestions")
}
```

`acceptedScoreKey` is written when the assessor saves a draft or submits:
the scoring screen already holds `activitySelectedScoreKeys`, so the save path
sends them to `PATCH /api/ai-scoring/outcome`, which records the assessor's
choice against any suggestion for the same sub-competency. Agreement rate is
then `acceptedScoreKey == suggestedScoreKey` over rows where both are set.

## Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/ai-scoring/suggest` | `{participantId, assessmentCenterId, activityId}` | suggestions for every competency of that activity |
| GET | `/api/ai-scoring/suggestions` | query: same three ids | stored suggestions, so a reload does not re-run the model |
| PATCH | `/api/ai-scoring/outcome` | `{participantId, activityId, selectedScoreKeys}` | records what the assessor chose |

All three require authentication. `suggest` is restricted to one in-flight run
per participant+activity to stop double-clicks costing twice.

## Frontend

`src/lib/aiScoringApi.ts` for the three calls, matching `aiTrainerApi.ts`.

On `src/app/assessor/assess/[id]/score/[participantId]/page.tsx`:

- **"AI suggest scores"** button in the scoring form header, next to
  "Competency 1 of 4". Disabled with a reason when the submission is missing or
  is a type we cannot read. Shows progress while running (expect 15–30s).
- Per sub-competency, above the five options: `AI suggests level 3 · 72% confidence`,
  the quote in a small card with its location, and **Use this** / **Dismiss**.
  **Use this** selects that radio — the radio is never pre-selected by the AI.
- An unverified quote renders with a warning: *"Couldn't find this text in the
  submission — check before accepting."*
- Each suggestion also appears in the existing "Relevant observations" panel,
  mapped to its sub-competency and marked as AI-generated, so the assessor sees
  them where they already look for evidence. Observations remain UI state;
  AI ones are rebuilt from the stored suggestions on load.
- When extraction returns very little text, a banner says how much was found
  and warns that image-only slides are not read.

## Error handling

| Case | Behaviour |
|---|---|
| No submission for this activity | 400, button disabled with tooltip |
| Unsupported file type | 400 naming the supported types |
| Extraction yields under ~200 characters | Run anyway, but return the warning banner; do not pretend the deck was read |
| Model/network failure | 502 with the provider's message; nothing stored; re-runnable |
| Model returns unparseable JSON | That competency fails with a clear message; other competencies still return |
| Re-run | Replaces that activity's suggestions and clears their acceptance |

## Testing

Unit (no network):
- Prompt builder: every anchor appears verbatim; sub-competency names are exact.
- Validator: bad `scoreKey`, unknown sub-competency, missing sub-competency,
  non-JSON, JSON wrapped in markdown fences.
- Quote verification: whitespace and smart-quote normalisation; a quote that is
  genuinely absent is marked unverified.

Integration:
- `POST /api/ai-scoring/suggest` with a fixture deck, fixture rubric and a
  stubbed provider — asserts rows written and the response shape.
- Auth: unauthenticated request rejected.

Live check, once, by hand: run against Tina Gupta's real case-study submission
in AC1 and read the suggestions next to the rubric. Automated tests prove the
plumbing; only a human can say whether the levels are sensible.

## Risks

- **Rubber-stamping.** The main risk of the whole feature. Mitigated by not
  pre-selecting, requiring a quote, and storing agreement rate so drift is
  visible.
- **Image-only decks.** Text extraction returns little; the banner makes that
  explicit rather than letting the AI guess from a title slide.
- **Prompt drift.** `promptVersion` on every row keeps old suggestions
  interpretable after the prompt changes.
