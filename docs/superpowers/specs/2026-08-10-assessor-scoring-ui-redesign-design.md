# Assessor Scoring Page UI Redesign

**Date:** 2026-08-10
**Target:** `src/app/assessor/assess/[id]/score/[participantId]/page.tsx`
**Driver:** A supplied mockup of a four-region scoring console (top bar, activity rail, evidence + scoring column, competency rail).

## Goal

Rebuild the assessor scoring screen to match the supplied mockup, and split the current
2,156-line single-file page into focused components. This is a presentation change: data
fetching, score initialisation, and submission keep their current behaviour.

## Non-goals

- No backend or API-shape changes. The `POST /api/assessors/scores` payload is byte-for-byte
  what it is today.
- No bookmarks/notes-with-timestamps feature, and no autosave or "Saved 2 mins ago" indicator.
  The mockup shows both; nothing in the API persists them, so they are omitted rather than
  faked. Scores still save only on submit.
- No fix for the two known data bugs (per-activity scores not restored on load, and submit
  sending every assignment's activity maps). They are deliberately left for a separate pass so
  this change stays reviewable as a pure UI diff. Two display-only defects *are* fixed in
  passing because the rewrite touches exactly those lines: the evidence panel's missing
  `submission` fallback, and the in-place `.sort()` of the activities state array. Neither
  changes anything that is persisted.
- No changes to the other assessor pages (`/assessor/dashboard`, `/assessor/assess`,
  `/assessor/assess/[id]`). The mockup only covers scoring.

## Layout

Four regions replace the current two-column body. Region names below are the component names.

### ScoringTopBar

Back chevron (`router.back()`), Participant (name + id), Activity (name + description), a
status pill, an "N / M competencies scored" line, and the primary **Submit Scores** button.

- Status pill: `FINALIZED` → "Finalized" (blue), `SUBMITTED` → "Submitted" (green), otherwise
  "In Progress" (amber) when at least one sub-competency in the activity is scored, else
  "Not Started" (grey).
- Submit button calls the existing `submitScores(selectedAssignmentId, 'SUBMITTED')`.
- When status is `SUBMITTED`/`FINALIZED` and `editMode` is false, the button is replaced by a
  read-only status pill — matching today's behaviour.
- When `editMode` is true, an amber banner renders directly beneath the bar containing the
  existing edit-reason textarea; Submit stays disabled until it is non-empty, as today.

### ActivityRail (left)

- Activity list for the selected assignment, sorted by `displayOrder` over a **copy** of the
  array (the current code sorts the state array in place). Each row: type icon, display name,
  activity detail name as subtitle, status badge, and `scored/total` competency count. Clicking
  a row sets the existing `selectedActivityId`.
- **ParticipantOverview** card below: name, participant id, program (assessment centre
  `displayName`), total competencies, activity count.
- The existing *Generate report* and *Evaluate* buttons move into this card's footer as
  secondary buttons. They are absent from the mockup but are working features and are kept.

### Centre column

**EvidencePanel** on top:

- `VIDEO` → `<video controls>` plus an "Open in Fullscreen" button calling
  `requestFullscreen()` on the player container.
- `DOCUMENT` → existing `DocumentSubmissionPreview`.
- `TEXT` → existing sanitised-as-today prose block.
- `INBOX_ACTIVITY` → existing threaded reply renderer.
- When an activity has more than one submission, a chip row above the viewer selects between
  them; a single submission renders with no chips.
- Submissions come from `allSubmissions`, falling back to the single `submission` object when
  `allSubmissions` is absent. This is the one behavioural fix included: without it an activity
  can read "Submitted" in the left rail and "No submissions yet" in the evidence panel. It
  affects display only and changes nothing that is persisted.
- Empty state preserved: "No submissions yet for this activity".

**CompetencyScoreCard** below it, showing one competency at a time:

- Header: "Competency i of N", competency name (title portion before `\t`), description,
  collapse toggle.
- One **ScoreLevelPicker** per sub-competency of the active competency, with the active
  sub-competency expanded.
- **Next Sub-Competency** button advances `activeSubCompIndex` within the competency, then rolls
  to the next competency's first sub-competency. On the final sub-competency of the final
  competency it is disabled.

### CompetencyRail (right)

- Header: "Competencies in this Activity" + total.
- One row per competency returned by the existing `getCompetenciesForActivity(activityId, …)`,
  numbered, showing `scored/total sub-competencies scored` and a completion circle.
- The active competency expands to numbered sub-competency rows (`1.1`, `1.2`, …). The active
  sub-competency shows its selected level in a filled accent badge; the others show a check
  when scored and a hollow circle when not.
- Clicking a competency row or a sub-competency row sets `activeCompetencyId` /
  `activeSubCompIndex`. This is also how the assessor navigates backwards — there is no
  "Previous" button, matching the mockup.
- Legend: Completed / In Progress / Not Started.

### ScoringFooterBar

Sticky: "You are scoring: <activity display name>", "N of M competencies scored", and a chevron
that collapses the bar to a slim strip (`footerCollapsed`).

## Score picker

`ScoreLevelPicker` renders circular numbered buttons, one per `score1…scoreN` key returned by
the existing `getScoreDescriptions` + `getSortedScoreKeysFromDescriptions` — **N is dynamic**,
driven by the assessment centre's descriptors.

- When N is exactly 5, the mockup's labels render beneath the circles: Does Not Demonstrate,
  Rarely Demonstrates, Sometimes Demonstrates, Often Demonstrates, Consistently Demonstrates.
  For any other N, numbers render without labels.
- Selecting a level calls the existing `updateActivityCompetencyScore(activityId, competencyId,
  subComp, level, scoreKey)` — unchanged signature and semantics.
- The selected level's descriptor renders in a side panel, with a "View descriptors for all
  scores" expander listing every level's text.
- Sub-competencies with no rubric descriptors keep today's 0–10 `<input type="number">`
  fallback, restyled to match.
- The existing `disabled` rule is preserved: read-only when the assignment is
  `SUBMITTED`/`FINALIZED` and `editMode` is false.

## Notes model

One "Evidence / Behavioural Notes" textarea per sub-competency with a `chars/1000` counter,
replacing today's one-textarea-per-score-level stack.

- It writes through the existing `setActivitySubCompComment(activityId, competencyId, subComp,
  scoreKey, text)` using the **currently selected score key**, so previously stored per-level
  comments still load and the payload shape is unchanged.
- Reads use the existing `getCommentForScoreKey`, which already falls back to the legacy flat
  string.
- When no level is selected yet there is no key to write to, so text is written under the
  existing `NUMERIC_SCORE_COMMENT_KEY` (`__numeric`). On the first level selection, that text is
  copied to the newly selected level's key **only if that level's comment is empty**, and the
  `__numeric` entry is left in place. Without this carry-over, notes typed before scoring would
  appear to vanish on the first click.
- Consequence, accepted: changing the selected level swaps which comment the box displays.

## Progress rules

Single source of truth, used by the top bar, both rails, and the footer:

- **Sub-competency is scored** when `activitySelectedScoreKeys[activityId]?.[competencyId]?.[subComp]`
  is set, or its value in `activityCompetencyScores` is greater than 0 (covers numeric rows).
- **Competency progress** = scored sub-competencies / `subCompetencyNames.length`; complete when
  all are scored.
- **Activity progress** = fully-scored competencies / competencies in that activity.
- **Status derivation**: none scored → Not Started; some → In Progress; all → Completed.

## State

Unchanged: every existing `useState`, the two fetch effects, the initialisation effect,
`submitScores`, `generateReport`, `evaluateInterview`, and `editMode`/`editReason`.

Added, UI-only and not persisted:

- `activeCompetencyId: string | null`
- `activeSubCompIndex: number`
- `footerCollapsed: boolean`
- `activeSubmissionId: string | null` (evidence chip selection)

`activeCompetencyId` / `activeSubCompIndex` reset to the first competency and index 0 whenever
`selectedActivityId` changes. The existing `skipNextLeftActivityScrollRef` scroll-into-view
effect is removed — the rails no longer scroll a long stacked list.

## File structure

```
src/app/assessor/assess/[id]/score/[participantId]/
  page.tsx                       data fetching, state, submit (logic unchanged), composes layout
  components/
    ScoringTopBar.tsx
    ActivityRail.tsx
    ParticipantOverview.tsx
    EvidencePanel.tsx
    CompetencyScoreCard.tsx
    ScoreLevelPicker.tsx
    CompetencyRail.tsx
    ScoringFooterBar.tsx
  lib/
    rubric.ts                    existing pure helpers, moved verbatim
    submissionPreview.tsx        existing preview helpers + components, moved verbatim
```

`lib/rubric.ts` receives, unchanged: `NUMERIC_SCORE_COMMENT_KEY`, `LEGACY_SCORE_COMMENT_KEY`,
`parseScoreKeyLevel`, `getSortedScoreKeysFromDescriptions`, `legacyTenPointToLevel`,
`normalizeStoredToLevel`, `averageSubCompetencyScores`, `formatCompetencyAverage`,
`normalizeScoreCommentMap`, `mergeActivitySubCompCommentsFromApi`,
`mergeAssignmentSubCompCommentsFromApi`, `getCommentForScoreKey`,
`averageAcrossAllActivities`. It also gains `FIVE_LEVEL_LABELS` and the progress helpers
described above.

`lib/submissionPreview.tsx` receives, unchanged: `getFileExtensionFromNameOrUrl`,
`inferDocumentPreviewMode`, `TextSubmissionPreview`, `DocumentSubmissionPreview`.

Shared TypeScript interfaces (`ParticipantDetails`, `AssessorScore`, `ActivityWithSubmissions`,
`Evaluation`, `EvaluationResponse`) move to `lib/types.ts` so components and page share them.

All child components are presentational: they receive data and callbacks as props and hold no
fetch logic. `ParticipantCard` and `EvaluationResults`, currently declared inside the page
component body (and therefore remounted every render), become proper module-level components.

## Styling

Tailwind v4 with stock utilities — the project defines no theme tokens beyond
`--background`/`--foreground` in `globals.css`, so no new tokens are introduced.

- Accent: `violet-600` for selected states, active rail items, and the primary button, matching
  the mockup.
- Surfaces: `bg-gray-50` page, `bg-white` cards, `border-gray-200`, `rounded-xl`, `shadow-sm`.
- Status colours: amber (in progress), green (completed/submitted), blue (finalized), grey
  (not started).
- Existing `.scrollbar-thin` utility used on all scrolling regions.

## Responsive behaviour

- `≥1280px` (`xl`): three columns side by side, each independently scrolling, page itself does
  not scroll horizontally.
- `1024–1280px` (`lg`): competency rail moves beneath the centre column.
- `<1024px`: activity rail collapses to a horizontal scrolling chip row above the evidence
  panel; participant overview moves to the bottom of the page.

## Error handling

Unchanged from today: the loading spinner, the "Error Loading Participant" panel with a Go Back
button, and the inline error banner fed by the existing `error` state. The error banner moves
directly beneath the top bar so it is visible without scrolling.

## Verification

No test framework is configured in this project (`package.json` has no test script), so
verification is:

1. `npx tsc --noEmit` passes — it passes on the current code, so it must keep passing.
2. `npm run build` succeeds.
3. Manual pass against a real participant: select each activity; score a rubric
   sub-competency and confirm the circle, right-rail badge, and all three progress counters
   update; type notes and confirm they persist across sub-competency navigation; confirm the
   0–10 fallback renders for a sub-competency with no descriptors; confirm video, document,
   text, and inbox evidence all render; submit and confirm the request body matches what the
   current page sends for the same inputs; reopen a `SUBMITTED` score and confirm read-only
   state, then `?mode=edit` and confirm the edit-reason gate.

Step 3's payload comparison is the important one: it is what proves this stayed a UI change.
