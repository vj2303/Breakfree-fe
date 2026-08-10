# Assessor Scoring UI Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/assessor/assess/[id]/score/[participantId]` to match the supplied mockup — top bar, activity rail, evidence + scoring column, competency rail — and split the 2,156-line page into focused components without changing what gets fetched or submitted.

**Architecture:** `page.tsx` keeps every existing hook, effect, and handler body verbatim and becomes a composition root. Pure helpers and shared types move to `lib/`. Eight presentational components under `components/` receive data and callbacks as props and hold no fetch logic. The rebuild is integrated progressively — each task ends with a page you can load and look at, not with orphaned components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 (stock utilities only — the project defines no theme tokens), `lucide-react` icons.

**Spec:** `docs/superpowers/specs/2026-08-10-assessor-scoring-ui-redesign-design.md`

## Global Constraints

- **No test framework exists** in this project. Every task gates on `npx tsc --noEmit` (which passes on current `main` and must keep passing) plus the named manual check. `npm run build` runs in Task 9.
- **Logic is frozen.** Do not alter the bodies of the two fetch effects, the score-initialisation effect (current `page.tsx:844-1027`), `submitScores`, `generateReport`, or `evaluateInterview`. Do not alter the `POST /api/assessors/scores` payload.
- **No new dependencies.** No new npm packages, no test framework, no icon library beyond `lucide-react`.
- **Accent colour is `violet-600`.** Surfaces: `bg-gray-50` page, `bg-white` cards, `border-gray-200`, `rounded-xl`, `shadow-sm`.
- **Status colours:** amber = in progress, green = completed/submitted, blue = finalized, grey = not started.
- **Scale is dynamic.** Render one circle per `score1…scoreN` key from the descriptors. The five mockup labels render only when N is exactly 5.
- **Existing `disabled` rule is preserved:** read-only when the assignment is `SUBMITTED`/`FINALIZED` and `editMode` is false.
- **Deliberately omitted:** bookmarks/notes-with-timestamps and the autosave / "Saved 2 mins ago" indicator. Nothing in the API persists them.
- **`.scrollbar-thin`** (defined in `globals.css`) goes on every scrolling region.
- **A note on code blocks in this plan:** interfaces, types, and all non-obvious logic are given as literal code and must be used as written — names and signatures are load-bearing across tasks. JSX structure is specified as an element tree plus the classes that carry meaning, not as pasted markup; match the mockup for the rest.

**Paths.** All paths below are relative to the repo root. The route directory is
`src/app/assessor/assess/[id]/score/[participantId]/`, abbreviated **`<SCORE>/`** throughout.

---

### Task 1: Extract shared types and pure helpers into `lib/`

Pure move. No behaviour change, no visual change. This exists so later tasks can import from a stable place instead of reaching into the page.

**Files:**
- Create: `<SCORE>/lib/types.ts`
- Create: `<SCORE>/lib/rubric.ts`
- Create: `<SCORE>/lib/submissionPreview.tsx`
- Modify: `<SCORE>/page.tsx` (delete moved code, add imports)

**Interfaces:**
- Consumes: nothing.
- Produces: everything listed in the two code blocks below. Tasks 2–9 import from these three modules.

- [ ] **Step 1: Create `lib/types.ts`**

Move these interfaces out of `page.tsx` unchanged: `ParticipantDetails` (currently lines 245-328), `Evaluation` (330-334), `EvaluationResponse` (336-345), `AssessorScore` (347-375), `ActivityWithSubmissions` (377-411). Keep their JSDoc comments. Then add these new shared types:

```ts
/** A competency as rendered by the scoring UI. `createdAt`/`updatedAt` are optional so both
 *  assignment competencies and the assessment-centre competency map are assignable. */
export interface Competency {
  id: string;
  competencyName: string;
  subCompetencyNames: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type Assignment = ParticipantDetails['data']['assignments'][number];

/** One submission row as the evidence panel consumes it. */
export interface SubmissionRecord {
  id: string;
  parentSubmissionId?: string;
  textContent?: string;
  submissionType?: string;
  submissionStatus?: string;
  submittedAt?: string;
  createdAt?: string;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replies?: SubmissionRecord[];
}

export type ScoreLifecycleStatus = 'DRAFT' | 'SUBMITTED' | 'FINALIZED';

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

/** `activitySelectedScoreKeys[activityId]` — competencyId -> subCompetency -> scoreKey */
export type SelectedKeysByCompetency = Record<string, Record<string, string>>;

/** `activityCompetencyScores[activityId]` — competencyId -> subCompetency -> score */
export type ScoresByCompetency = Record<string, Record<string, number>>;

/** One row of the left activity rail, precomputed by the page. */
export interface ActivityRailItem {
  activityId: string;
  title: string;
  subtitle: string;
  activityType: string;
  interactiveActivityType?: string;
  scoredCompetencies: number;
  totalCompetencies: number;
  status: ProgressStatus;
}
```

- [ ] **Step 2: Create `lib/rubric.ts`**

Move these out of `page.tsx` **with their bodies unchanged**, adding `export` to each: `NUMERIC_SCORE_COMMENT_KEY` (line 22), `LEGACY_SCORE_COMMENT_KEY` (24), `parseScoreKeyLevel` (26), `getSortedScoreKeysFromDescriptions` (31), `legacyTenPointToLevel` (37), `normalizeStoredToLevel` (45), `averageSubCompetencyScores` (53), `formatCompetencyAverage` (66), `normalizeScoreCommentMap` (73), `mergeActivitySubCompCommentsFromApi` (81), `mergeAssignmentSubCompCommentsFromApi` (97), `getCommentForScoreKey` (110), `averageAcrossAllActivities` (123). Also move `getInteractiveActivityTypeBadge` (line 8) and export it.

Import `Competency` from `./types` and use it in `averageAcrossAllActivities`'s signature in place of the inline `Array<{ id: string; competencyName: string; subCompetencyNames: string[] }>`. The shape is identical, so no call site changes.

- [ ] **Step 3: Create `lib/submissionPreview.tsx`**

Move these out of `page.tsx` with bodies unchanged, adding `export`: `getFileExtensionFromNameOrUrl` (413), `DocumentPreviewMode` (419), `inferDocumentPreviewMode` (421), `TextSubmissionPreview` (434), `DocumentSubmissionPreview` (473). This file needs `'use client'` at the top because both components use hooks.

- [ ] **Step 4: Update `page.tsx` imports**

Delete the moved declarations and add:

```ts
import {
  NUMERIC_SCORE_COMMENT_KEY,
  averageSubCompetencyScores,
  formatCompetencyAverage,
  getCommentForScoreKey,
  getInteractiveActivityTypeBadge,
  getSortedScoreKeysFromDescriptions,
  mergeActivitySubCompCommentsFromApi,
  mergeAssignmentSubCompCommentsFromApi,
  normalizeStoredToLevel,
} from './lib/rubric';
import { DocumentSubmissionPreview } from './lib/submissionPreview';
import type {
  AssessorScore,
  ActivityWithSubmissions,
  EvaluationResponse,
  ParticipantDetails,
} from './lib/types';
```

`RubricScorePicker` (lines 146-239) stays in `page.tsx` for now — Task 3 replaces it. `legacyTenPointToLevel`, `averageAcrossAllActivities`, `LEGACY_SCORE_COMMENT_KEY`, `parseScoreKeyLevel`, `normalizeScoreCommentMap`, `TextSubmissionPreview`, `inferDocumentPreviewMode` and `getFileExtensionFromNameOrUrl` are used only inside the moved modules or by later tasks, so they are not imported into `page.tsx` yet.

- [ ] **Step 5: Verify types**

Run: `npx tsc --noEmit`
Expected: no output. If it reports an unused import, delete that import rather than silencing it.

- [ ] **Step 6: Manual check**

Run `npm run dev`, open a participant scoring page. Expected: pixel-identical to before this task — same two-column layout, same rubric stacks, same submissions panel.

- [ ] **Step 7: Commit**

```bash
git add "src/app/assessor/assess/[id]/score/[participantId]"
git commit -m "refactor(assessor): extract scoring page types and helpers into lib/"
```

---

### Task 2: Add label and progress helpers to `lib/rubric.ts`

Pure additions. Nothing consumes them until Task 3.

**Files:**
- Modify: `<SCORE>/lib/rubric.ts`

**Interfaces:**
- Consumes: `Competency`, `ProgressStatus`, `SelectedKeysByCompetency`, `ScoresByCompetency` from `./types`.
- Produces: `FIVE_LEVEL_LABELS`, `getLevelLabels`, `isSubCompetencyScored`, `countScoredSubCompetencies`, `getCompetencyProgress`, `getActivityProgress`, `deriveProgressStatus`. Tasks 3-9 depend on these exact names.

- [ ] **Step 1: Append the label helpers**

```ts
/** Labels from the mockup's 5-point scale. Only used when a rubric has exactly 5 levels. */
export const FIVE_LEVEL_LABELS = [
  'Does Not Demonstrate',
  'Rarely Demonstrates',
  'Sometimes Demonstrates',
  'Often Demonstrates',
  'Consistently Demonstrates',
] as const;

/** Short labels for the score circles, or null when the rubric is not 5-level. */
export function getLevelLabels(numLevels: number): readonly string[] | null {
  return numLevels === 5 ? FIVE_LEVEL_LABELS : null;
}
```

- [ ] **Step 2: Append the progress helpers**

A sub-competency counts as scored when a rubric level was picked, or — for numeric rows with no rubric — when its value is above zero. Both branches are needed: rubric rows always have a selected key, numeric rows never do.

```ts
export function isSubCompetencyScored(
  selectedScoreKey: string | undefined,
  score: number | undefined
): boolean {
  if (selectedScoreKey) return true;
  return typeof score === 'number' && score > 0;
}

export function countScoredSubCompetencies(
  subNames: string[],
  selectedKeys: Record<string, string> | undefined,
  scores: Record<string, number> | undefined
): number {
  return subNames.reduce(
    (total, sub) =>
      total + (isSubCompetencyScored(selectedKeys?.[sub], scores?.[sub]) ? 1 : 0),
    0
  );
}

export function getCompetencyProgress(
  competency: Competency,
  selectedKeys: SelectedKeysByCompetency | undefined,
  scores: ScoresByCompetency | undefined
): { scored: number; total: number; complete: boolean } {
  const total = competency.subCompetencyNames.length;
  const scored = countScoredSubCompetencies(
    competency.subCompetencyNames,
    selectedKeys?.[competency.id],
    scores?.[competency.id]
  );
  return { scored, total, complete: total > 0 && scored === total };
}

/** Activity progress counts fully-scored competencies, not sub-competencies. */
export function getActivityProgress(
  competencies: Competency[],
  selectedKeys: SelectedKeysByCompetency | undefined,
  scores: ScoresByCompetency | undefined
): { scored: number; total: number } {
  let scored = 0;
  for (const competency of competencies) {
    if (getCompetencyProgress(competency, selectedKeys, scores).complete) scored++;
  }
  return { scored, total: competencies.length };
}

export function deriveProgressStatus(scored: number, total: number): ProgressStatus {
  if (total > 0 && scored >= total) return 'completed';
  return scored > 0 ? 'in_progress' : 'not_started';
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "src/app/assessor/assess/[id]/score/[participantId]/lib/rubric.ts"
git commit -m "feat(assessor): add score label and progress helpers"
```

---

### Task 3: `ScoreLevelPicker` — mockup score circles, swapped into the existing layout

Replaces `RubricScorePicker`. After this task the page still has its old two-column shape, but every sub-competency renders the mockup's circles, labels, descriptor panel, and a single notes box. This is the first visible change and the one most worth reviewing on its own.

**Files:**
- Create: `<SCORE>/components/ScoreLevelPicker.tsx`
- Modify: `<SCORE>/page.tsx` (delete `RubricScorePicker`, add note handlers, swap render)

**Interfaces:**
- Consumes: `getSortedScoreKeysFromDescriptions`, `parseScoreKeyLevel`, `normalizeStoredToLevel`, `getLevelLabels` from `../lib/rubric`.
- Produces: `ScoreLevelPicker` (default export) with exactly these props, and page handlers `handleSelectLevel`, `handleNumericChange`, `handleNoteChange`:

```ts
export interface ScoreLevelPickerProps {
  scoreDescriptions: Record<string, string>;
  currentScore: number;
  selectedScoreKey?: string;
  disabled?: boolean;
  onSelectLevel: (level: number, scoreKey: string) => void;
  onNumericChange: (score: number) => void;
}
```

- [ ] **Step 1: Create the component**

`'use client'`. Behaviour:

- `scoreKeys = getSortedScoreKeysFromDescriptions(scoreDescriptions)`.
- **When `scoreKeys.length === 0`** render the numeric fallback: a `<input type="number" min="0" max="10" step="0.5">` bound to `currentScore || 0`, calling `onNumericChange(parseFloat(e.target.value) || 0)`, with a `/10` suffix. Same semantics as current `page.tsx:1775-1789`, restyled.
- **Otherwise** compute the highlighted key exactly as `RubricScorePicker` does today, so stored ticks keep resolving:

```tsx
const highlightKey =
  selectedScoreKey && scoreKeys.includes(selectedScoreKey)
    ? selectedScoreKey
    : (() => {
        const level = normalizeStoredToLevel(currentScore, scoreKeys.length);
        return level >= 1 ? scoreKeys[level - 1] : undefined;
      })();
const labels = getLevelLabels(scoreKeys.length);
```

- Structure: a `flex` row of circle buttons, then a two-column area — left is the label row, right is the descriptor panel. Each circle is a `<button type="button">`, `h-12 w-12 rounded-full border text-sm font-semibold`, calling `onSelectLevel(parseScoreKeyLevel(key), key)`. Selected circle: `bg-violet-600 text-white border-violet-600`. Unselected: `bg-white text-gray-700 border-gray-300 hover:border-violet-400`. When `disabled`, add `opacity-60 cursor-not-allowed` and set the `disabled` attribute.
- Labels render under their circle from `labels[index]` when `labels` is non-null (`text-[11px] leading-tight text-gray-500 text-center`), and not at all when it is null.
- Descriptor panel (`rounded-lg border border-gray-200 bg-gray-50 p-3`): heading `Descriptor for Score {n}{label ? ' – ' + label : ''}`, body `scoreDescriptions[highlightKey]`. When nothing is selected, show `Select a score to see its descriptor.` in `text-gray-500`.
- Below it a `<details>` with `<summary>View descriptors for all scores</summary>` (`text-violet-600 text-xs`) listing every level as `Score {n}: {description}`.
- Accessibility: each circle gets `aria-pressed={isSelected}` and `aria-label={`Score ${n}${label ? ': ' + label : ''}`}`.

- [ ] **Step 2: Add the page handlers**

Add to `page.tsx` above the return. These wrap the existing setters — `updateActivityCompetencyScore` and `setActivitySubCompComment` keep their current bodies.

```tsx
const handleSelectLevel = (
  activityId: string,
  competencyId: string,
  subComp: string,
  level: number,
  scoreKey: string
) => {
  // Carry a note typed before any level was picked over to the level now chosen,
  // but never overwrite a note that level already has.
  const existing = activitySubCompComments[activityId]?.[competencyId]?.[subComp];
  const pending = existing?.[NUMERIC_SCORE_COMMENT_KEY];
  if (pending && !existing?.[scoreKey]) {
    setActivitySubCompComment(activityId, competencyId, subComp, scoreKey, pending);
  }
  updateActivityCompetencyScore(activityId, competencyId, subComp, level, scoreKey);
};

const handleNumericChange = (
  activityId: string,
  competencyId: string,
  subComp: string,
  score: number
) => {
  updateActivityCompetencyScore(activityId, competencyId, subComp, score);
};

/** Notes key off the selected level; with nothing selected yet they land on the
 *  numeric key and get carried over by handleSelectLevel. */
const handleNoteChange = (
  activityId: string,
  competencyId: string,
  subComp: string,
  value: string
) => {
  const scoreKey =
    activitySelectedScoreKeys[activityId]?.[competencyId]?.[subComp] ??
    NUMERIC_SCORE_COMMENT_KEY;
  setActivitySubCompComment(activityId, competencyId, subComp, scoreKey, value);
};
```

- [ ] **Step 3: Swap the render and delete `RubricScorePicker`**

In the sub-competency map (current `page.tsx:1713-1818`), collapse the two branches into one. Both rubric and numeric rows now render `<ScoreLevelPicker>` followed by one shared notes block, so the `scoreKeys.length > 0` conditional at line 1725 goes away:

```tsx
const effectiveNoteKey = selectedScoreKey ?? NUMERIC_SCORE_COMMENT_KEY;
const noteValue = getCommentForScoreKey(
  activitySubCompComments[activity.activityId]?.[assignedCompetency.id]?.[subComp],
  effectiveNoteKey,
  { isFirstScoreKey: effectiveNoteKey === scoreKeys[0] }
);
```

Render, per sub-competency: the `<details>`/`<summary>` wrapper stays for now (Task 4 replaces it), containing `<ScoreLevelPicker>` wired to `handleSelectLevel(activity.activityId, assignedCompetency.id, subComp, level, scoreKey)` / `handleNumericChange(...)`, then the notes block — label `Evidence / Behavioural Notes`, helper text `Provide specific examples from the video to support the score.`, a `<textarea rows={4} maxLength={1000}>` bound to `noteValue` calling `handleNoteChange(...)`, and a right-aligned `Characters: {noteValue.length}/1000` counter. Set `disabled={isDisabled}` on the textarea using the existing `isDisabled` value from line 1723.

Then delete `RubricScorePicker` (lines 146-239).

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Manual check**

With `npm run dev`: circles render one per rubric level; clicking one fills it violet and swaps the descriptor panel; the five labels appear only on 5-level rubrics; a sub-competency with no descriptors shows the 0–10 input; type a note before picking a score, then pick one — the note must still be there.

- [ ] **Step 6: Commit**

```bash
git add "src/app/assessor/assess/[id]/score/[participantId]"
git commit -m "feat(assessor): mockup score circles and single notes box"
```

---

### Task 4: `CompetencyScoreCard` — one competency at a time

Replaces the stacked all-activities list in the centre column with the mockup's single-competency card and its "Next Sub-Competency" flow.

**Files:**
- Create: `<SCORE>/components/CompetencyScoreCard.tsx`
- Modify: `<SCORE>/page.tsx`

**Interfaces:**
- Consumes: `ScoreLevelPicker` from `./ScoreLevelPicker`; `getCommentForScoreKey`, `getSortedScoreKeysFromDescriptions`, `NUMERIC_SCORE_COMMENT_KEY` from `../lib/rubric`; `Competency` from `../lib/types`.
- Produces: `CompetencyScoreCard` (default export):

```ts
export interface CompetencyScoreCardProps {
  competency: Competency;
  competencyIndex: number;        // 0-based, for "Competency i of N"
  competencyCount: number;
  activeSubCompIndex: number;
  onActiveSubCompChange: (index: number) => void;
  scoreDescriptionsFor: (subComp: string) => Record<string, string>;
  scores: Record<string, number> | undefined;                 // subComp -> score
  selectedKeys: Record<string, string> | undefined;           // subComp -> scoreKey
  notes: Record<string, Record<string, string>> | undefined;  // subComp -> scoreKey -> comment
  disabled: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectLevel: (subComp: string, level: number, scoreKey: string) => void;
  onNumericChange: (subComp: string, score: number) => void;
  onNoteChange: (subComp: string, value: string) => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled: boolean;
}
```

- [ ] **Step 1: Create the component**

`'use client'`. Structure, top to bottom:

- Header row: `Competency {competencyIndex + 1} of {competencyCount}` (`text-xs text-gray-500`), the competency title — `competency.competencyName.split('\t')[0]` — as `text-lg font-semibold`, and on the right a Collapse/Expand button calling `onToggleCollapsed` with a `ChevronUp`/`ChevronDown` from `lucide-react`. The description is the portion after the first tab when present: `competency.competencyName.split('\t').slice(1).join(' ')`, rendered `text-sm text-gray-600`.
- When `collapsed`, stop here.
- Sub-competency section, one block per name in `competency.subCompetencyNames`. Only the block at `activeSubCompIndex` renders expanded; the others render as a single clickable row (`Sub-Competency {competencyIndex+1}.{i+1}` + title + a scored tick) that calls `onActiveSubCompChange(i)`.
- The expanded block shows: `Sub-Competency {competencyIndex+1}.{i+1}` (`text-xs font-medium text-gray-500`), the title `subComp.split('\t')[0]`, then `<ScoreLevelPicker>`, then the notes block.
- Notes value is computed inside this component so the legacy fallback stays correct:

```tsx
const scoreKeys = getSortedScoreKeysFromDescriptions(scoreDescriptionsFor(subComp));
const selectedScoreKey = selectedKeys?.[subComp];
const effectiveNoteKey = selectedScoreKey ?? NUMERIC_SCORE_COMMENT_KEY;
const noteValue = getCommentForScoreKey(notes?.[subComp], effectiveNoteKey, {
  isFirstScoreKey: effectiveNoteKey === scoreKeys[0],
});
```

- Footer: right-aligned primary button `{nextLabel}` with an `ArrowRight` icon, `disabled={nextDisabled}`, calling `onNext`. Classes `bg-violet-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:bg-gray-300`.

- [ ] **Step 2: Add navigation state to `page.tsx`**

```tsx
const [activeCompetencyId, setActiveCompetencyId] = useState<string | null>(null);
const [activeSubCompIndex, setActiveSubCompIndex] = useState(0);
const [competencyCardCollapsed, setCompetencyCardCollapsed] = useState(false);
```

- [ ] **Step 3: Reset navigation when the activity changes**

Replace the `skipNextLeftActivityScrollRef` effect (current lines 587-602) and its ref declaration with:

```tsx
useEffect(() => {
  setActiveCompetencyId(null);
  setActiveSubCompIndex(0);
}, [selectedActivityId]);
```

- [ ] **Step 4: Derive the active competency and the Next handler**

Place inside the `selectedAssignmentId &&` IIFE that already resolves `selectedAssignment`, after `selectedActivity` is known:

```tsx
const activityCompetencies = selectedActivity
  ? getCompetenciesForActivity(
      selectedActivity.activityId,
      selectedActivity.competency,
      selectedAssignment.competencies
    )
  : [];
const activeCompetencyIndex = Math.max(
  0,
  activityCompetencies.findIndex((c) => c.id === activeCompetencyId)
);
const activeCompetency = activityCompetencies[activeCompetencyIndex] ?? null;

// Next walks sub-competencies, then rolls into the next competency.
const advance = () => {
  if (!activeCompetency) return;
  const lastSub = activeCompetency.subCompetencyNames.length - 1;
  if (activeSubCompIndex < lastSub) {
    setActiveSubCompIndex(activeSubCompIndex + 1);
    return;
  }
  const nextCompetency = activityCompetencies[activeCompetencyIndex + 1];
  if (nextCompetency) {
    setActiveCompetencyId(nextCompetency.id);
    setActiveSubCompIndex(0);
  }
};
const isFinalSub =
  !!activeCompetency &&
  activeCompetencyIndex === activityCompetencies.length - 1 &&
  activeSubCompIndex === activeCompetency.subCompetencyNames.length - 1;
const nextLabel =
  activeCompetency && activeSubCompIndex < activeCompetency.subCompetencyNames.length - 1
    ? 'Next Sub-Competency'
    : 'Next Competency';
```

`activeCompetencyId` starting as `null` resolves to index 0 via the `Math.max`, so the first competency is active on load with no extra effect.

- [ ] **Step 5: Render the card**

Replace the whole "Score by Activity" block (current lines 1612-1827) with a single `<CompetencyScoreCard>` for `activeCompetency` (render nothing when it is null). Wire:

- `scores={activityCompetencyScores[selectedActivity.activityId]?.[activeCompetency.id]}`
- `selectedKeys={activitySelectedScoreKeys[selectedActivity.activityId]?.[activeCompetency.id]}`
- `notes={activitySubCompComments[selectedActivity.activityId]?.[activeCompetency.id]}`
- `scoreDescriptionsFor={(sub) => getScoreDescriptions(selectedActivity.activityId, activeCompetency.id, sub)}`
- `disabled={scoreStatus[selectedAssignmentId] === 'SUBMITTED' || scoreStatus[selectedAssignmentId] === 'FINALIZED' ? !editMode : false}`
- the three handlers from Task 3, partially applied with `selectedActivity.activityId` and `activeCompetency.id`
- `onNext={advance}`, `nextLabel={nextLabel}`, `nextDisabled={isFinalSub}`
- `collapsed`/`onToggleCollapsed` from `competencyCardCollapsed`

Keep the existing Competency Averages panel and the existing submit block where they are — Task 8 moves the submit block.

- [ ] **Step 6: Verify types**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 7: Manual check**

One competency card renders with "Competency 1 of N". Next Sub-Competency walks 1.1 → 1.2 → …, then rolls to the next competency and relabels itself; on the final sub-competency it is disabled. Collapse hides the body. Switching activity in the left list resets to that activity's first competency.

- [ ] **Step 8: Commit**

```bash
git add "src/app/assessor/assess/[id]/score/[participantId]"
git commit -m "feat(assessor): single-competency scoring card with next navigation"
```

---

### Task 5: `CompetencyRail` — right-hand column

**Files:**
- Create: `<SCORE>/components/CompetencyRail.tsx`
- Modify: `<SCORE>/page.tsx`

**Interfaces:**
- Consumes: `getCompetencyProgress`, `isSubCompetencyScored`, `parseScoreKeyLevel` from `../lib/rubric`; `Competency`, `SelectedKeysByCompetency`, `ScoresByCompetency` from `../lib/types`.
- Produces: `CompetencyRail` (default export):

```ts
export interface CompetencyRailProps {
  competencies: Competency[];
  activeCompetencyId: string | null;
  activeSubCompIndex: number;
  selectedKeys: SelectedKeysByCompetency | undefined;
  scores: ScoresByCompetency | undefined;
  onSelectCompetency: (competencyId: string) => void;
  onSelectSubCompetency: (competencyId: string, index: number) => void;
}
```

- [ ] **Step 1: Create the component**

`'use client'`. Structure:

- Header: `Competencies in this Activity` + `{competencies.length} Total` on the right (`text-xs text-gray-500`).
- One row per competency: a numbered square badge (`h-6 w-6 rounded-md text-xs font-semibold`; violet when active, `bg-gray-100 text-gray-600` otherwise), the title `competencyName.split('\t')[0]`, a sub-line `{scored} / {total} sub-competencies scored`, and a right-hand state circle — `CheckCircle2` in `text-green-600` when `complete`, else a hollow `border-gray-300 rounded-full h-5 w-5`. The whole row is a `<button type="button">` calling `onSelectCompetency(c.id)`; the active row gets `border-violet-300 bg-violet-50/40 ring-1 ring-violet-200`.
- The active competency expands to its sub-competency rows: `{competencyIndex+1}.{i+1}` + `subComp.split('\t')[0]`, each a button calling `onSelectSubCompetency(c.id, i)`. Trailing indicator per row:
  - the row at `activeSubCompIndex` → filled violet circle showing the selected level, computed as `parseScoreKeyLevel(selectedKeys?.[c.id]?.[sub] ?? '')` when a key exists, otherwise the rounded numeric score, and a hollow circle when neither is set;
  - other rows → green check when `isSubCompetencyScored(selectedKeys?.[c.id]?.[sub], scores?.[c.id]?.[sub])`, hollow circle when not.
- Legend at the bottom: green dot "Completed", amber dot "In Progress", grey dot "Not Started".
- Root: `flex flex-col gap-2 overflow-y-auto scrollbar-thin`.

- [ ] **Step 2: Render it as the third column**

In `page.tsx`, wrap the existing two column `<div>`s and this rail in the row container so the layout is `[centre][right]` for now — the left rail arrives in Task 7. Give the rail `w-full xl:w-80 xl:flex-shrink-0`. Wire `competencies={activityCompetencies}`, `selectedKeys={activitySelectedScoreKeys[selectedActivity.activityId]}`, `scores={activityCompetencyScores[selectedActivity.activityId]}`, `onSelectCompetency={(id) => { setActiveCompetencyId(id); setActiveSubCompIndex(0); }}`, `onSelectSubCompetency={(id, i) => { setActiveCompetencyId(id); setActiveSubCompIndex(i); }}`.

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Manual check**

The rail lists the activity's competencies with correct `scored/total`. Clicking a competency or sub-competency row moves the centre card. Scoring a sub-competency flips its row to a green check and updates the parent count. The active sub-competency's badge shows the level you picked.

- [ ] **Step 5: Commit**

```bash
git add "src/app/assessor/assess/[id]/score/[participantId]"
git commit -m "feat(assessor): competency rail with per-sub-competency progress"
```

---

### Task 6: `EvidencePanel` — evidence viewer with submission chips and fullscreen

**Files:**
- Create: `<SCORE>/components/EvidencePanel.tsx`
- Modify: `<SCORE>/page.tsx`

**Interfaces:**
- Consumes: `DocumentSubmissionPreview` from `../lib/submissionPreview`; `SubmissionRecord` from `../lib/types`.
- Produces: `EvidencePanel` (default export):

```ts
export interface EvidencePanelProps {
  activityLabel: string;
  activityType: string;
  submissions: SubmissionRecord[];
  activeSubmissionId: string | null;
  onSelectSubmission: (submissionId: string) => void;
}
```

- [ ] **Step 1: Create the component**

`'use client'`. Move the submission-rendering logic from `page.tsx:1932-2141` into it, keeping each renderer's markup, then:

- Header row: `Evidence ({label})` where label is derived from the active submission's `submissionType` — `Video Submission`, `Document Submission`, `Text Submission`, or `Submission` — plus an **Open in Fullscreen** button (`Maximize2` icon) on the right:

```tsx
const viewerRef = useRef<HTMLDivElement>(null);
const openFullscreen = () => {
  viewerRef.current?.requestFullscreen?.();
};
```

The button renders only when there is an active submission. Put `ref={viewerRef}` on the element wrapping the media.

- Sort submissions oldest-first exactly as today: `[...submissions].sort((a, b) => new Date(a.createdAt || a.submittedAt || 0).getTime() - new Date(b.createdAt || b.submittedAt || 0).getTime())`.
- When `activityType === 'INBOX_ACTIVITY'`, render the existing thread builder and threaded reply view over the full sorted list, with no chips — a thread is one piece of evidence.
- Otherwise: when more than one submission exists, render a chip row above the viewer, one `<button>` per submission labelled `{submissionType ?? 'TEXT'} · {new Date(submittedAt || createdAt || 0).toLocaleDateString()}`, active chip `bg-violet-600 text-white`. Then render only the active submission — resolved as `submissions.find(s => s.id === activeSubmissionId) ?? sorted[0]` — using the existing `VIDEO` / `DOCUMENT` / `TEXT` branches and the existing `notes` block.
- Empty state, unchanged copy: `No submissions yet for this activity`.

- [ ] **Step 2: Derive submissions in `page.tsx`, with the single-`submission` fallback**

Add near the other derived values inside the assignment IIFE:

```tsx
const selectedActivityWithSubs = selectedActivity as ActivityWithSubmissions | undefined;
// Fall back to the single `submission` when the API omitted `allSubmissions`, so an
// activity can't read "Submitted" in the rail and "No submissions yet" here.
const evidenceSubmissions: SubmissionRecord[] =
  selectedActivityWithSubs?.allSubmissions && selectedActivityWithSubs.allSubmissions.length > 0
    ? (selectedActivityWithSubs.allSubmissions as SubmissionRecord[])
    : selectedActivity?.submission
      ? [selectedActivity.submission as SubmissionRecord]
      : [];
```

Add `const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);` alongside the other UI state, and reset it in the existing `selectedActivityId` effect from Task 4 (`setActiveSubmissionId(null)`).

- [ ] **Step 3: Render it above the competency card**

Replace the old Submissions column (current lines 1887-2144) with `<EvidencePanel>` placed **above** `<CompetencyScoreCard>` in the centre column, matching the mockup. Import `SubmissionRecord` as a type in `page.tsx`.

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Manual check**

A video activity shows the player and Open in Fullscreen works. A document activity shows the existing preview. An inbox activity shows the threaded replies. An activity with several submissions shows chips that switch the viewer. An activity whose API response has only `submission` and no `allSubmissions` shows that submission instead of the empty state.

- [ ] **Step 6: Commit**

```bash
git add "src/app/assessor/assess/[id]/score/[participantId]"
git commit -m "feat(assessor): evidence panel with submission chips and fullscreen"
```

---

### Task 7: `ActivityRail` and `ParticipantOverview` — left column

**Files:**
- Create: `<SCORE>/components/ActivityRail.tsx`
- Create: `<SCORE>/components/ParticipantOverview.tsx`
- Modify: `<SCORE>/page.tsx`

**Interfaces:**
- Consumes: `ActivityRailItem`, `ProgressStatus` from `../lib/types`; `getActivityProgress`, `deriveProgressStatus` from `../lib/rubric`.
- Produces:

```ts
export interface ActivityRailProps {
  items: ActivityRailItem[];
  selectedActivityId: string | null;
  onSelectActivity: (activityId: string) => void;
}

export interface ParticipantOverviewProps {
  name: string;
  participantId: string;
  program: string;
  totalCompetencies: number;
  activityCount: number;
  isGenerating: boolean;
  isEvaluating: boolean;
  onGenerateReport: () => void;
  onEvaluate: () => void;
}
```

- [ ] **Step 1: Create `ActivityRail`**

`'use client'`. Header `Activities` + `Select an activity to score` (`text-xs text-gray-500`). One `<button>` per item: a leading icon square, `title` (`text-sm font-medium`), `subtitle` (`text-xs text-gray-500`), a status badge, and `{scoredCompetencies} / {totalCompetencies}` on the right. Selected row: `border-violet-300 bg-violet-50/50 ring-1 ring-violet-200`. Badge copy and colour by `status`: `completed` → "Completed" green, `in_progress` → "In Progress" amber, `not_started` → "Not Started" grey. Icon by `activityType`: `Users` for group discussion, `MessageSquare` for roleplay, `FileText` for case study, `Inbox` for inbox activity, `User` for anything else — all from `lucide-react`.

- [ ] **Step 2: Create `ParticipantOverview`**

`'use client'`. Card titled `Participant Overview` with label/value rows for Name, Participant ID, Program, Total Competencies, Activities. Footer holds the two secondary buttons — `Generate report` (disabled while `isGenerating || isEvaluating`, spinner + "Generating..." when `isGenerating`) and `Evaluate` (spinner + "Evaluating..." when `isEvaluating`) — preserving today's disabled logic.

- [ ] **Step 3: Build the rail items in `page.tsx`**

```tsx
const activityItems: ActivityRailItem[] = [...selectedAssignment.activities]
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map((activity) => {
    const competencies = getCompetenciesForActivity(
      activity.activityId,
      activity.competency,
      selectedAssignment.competencies
    );
    const { scored, total } = getActivityProgress(
      competencies,
      activitySelectedScoreKeys[activity.activityId],
      activityCompetencyScores[activity.activityId]
    );
    return {
      activityId: activity.activityId,
      title: activity.displayName || activity.activityDetail.name,
      subtitle: activity.activityDetail.name,
      activityType: activity.activityType,
      interactiveActivityType: activity.activityDetail.interactiveActivityType,
      scoredCompetencies: scored,
      totalCompetencies: total,
      status: deriveProgressStatus(scored, total),
    };
  });
```

Note the spread before `.sort()` — the current code sorts the state array in place at lines 1615 and 1902. Use `activityItems` for the rail and reuse the same sorted order anywhere else activities are listed.

- [ ] **Step 4: Render the left column and delete the old header card**

Add the left column as the first child of the three-column row: `<ActivityRail>` then `<ParticipantOverview>`, `w-full xl:w-72 xl:flex-shrink-0`, wired to `setSelectedActivityId`. `program` is `selectedAssignment.assessmentCenter.displayName || selectedAssignment.assessmentCenter.name`; `totalCompetencies` is `selectedAssignment.competencies.length`; `activityCount` is `selectedAssignment.activities.length`.

Then delete the old `ParticipantCard` component (lines 1386-1449) and its `<ParticipantCard />` call — the top bar in Task 8 takes over its identity role and this card takes over its buttons.

- [ ] **Step 5: Extract `EvaluationResults` to a module-level component**

Create `<SCORE>/components/EvaluationResults.tsx` and move the body of the `EvaluationResults`
component (current `page.tsx:1451-1484`) into it unchanged, taking its data as a prop instead of
closing over state:

```ts
export interface EvaluationResultsProps {
  data: EvaluationResponse | null;   // imported as a type from '../lib/types'
}
```

It keeps the existing early return — `if (!data) return null;`. In `page.tsx`, delete the inner
declaration and render `<EvaluationResults data={evaluationData} />` where `<EvaluationResults />`
was, at the end of the centre column. Declaring it inside the page body remounted it on every
render; as a module-level component it no longer does.

- [ ] **Step 6: Verify types**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 7: Manual check**

Three columns render. Activity rows show correct `scored/total` and badges, and selecting one swaps the evidence panel, the competency card, and the rail together. Generate report and Evaluate still work from the overview card, and clicking Evaluate still renders the evaluation results block.

- [ ] **Step 8: Commit**

```bash
git add "src/app/assessor/assess/[id]/score/[participantId]"
git commit -m "feat(assessor): activity rail and participant overview column"
```

---

### Task 8: `ScoringTopBar` and `ScoringFooterBar`

**Files:**
- Create: `<SCORE>/components/ScoringTopBar.tsx`
- Create: `<SCORE>/components/ScoringFooterBar.tsx`
- Modify: `<SCORE>/page.tsx`

**Interfaces:**
- Consumes: `ScoreLifecycleStatus`, `ProgressStatus` from `../lib/types`.
- Produces:

```ts
export interface ScoringTopBarProps {
  participantName: string;
  participantId: string;
  activityTitle: string;
  activitySubtitle: string;
  lifecycleStatus: ScoreLifecycleStatus;
  progressStatus: ProgressStatus;
  scoredCompetencies: number;
  totalCompetencies: number;
  readOnly: boolean;          // submitted/finalized and not in edit mode
  editMode: boolean;
  editReason: string;
  onEditReasonChange: (value: string) => void;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export interface ScoringFooterBarProps {
  activityTitle: string;
  scoredCompetencies: number;
  totalCompetencies: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}
```

- [ ] **Step 1: Create `ScoringTopBar`**

`'use client'`. A `sticky top-0 z-20 bg-white border-b border-gray-200` row with vertical divider groups: brand (`Assessment Center`), back chevron, `Participant` label + name + id, `Activity` label + title + subtitle, `Status` label + pill + `{scored} / {total} competencies scored`, then the action.

Pill text and colour:
- `lifecycleStatus === 'FINALIZED'` → "Finalized", blue
- `lifecycleStatus === 'SUBMITTED'` → "Submitted", green
- else from `progressStatus`: `completed` → "Completed" green, `in_progress` → "In Progress" amber, `not_started` → "Not Started" grey

Action: when `readOnly`, a green `CheckCircle` pill reading `Score {lifecycleStatus === 'FINALIZED' ? 'Finalized' : 'Submitted'}`. Otherwise a `Submit Scores` button — `bg-gray-900 text-white rounded-lg px-5 py-2.5 text-sm font-medium` — disabled when `isSubmitting || (editMode && !editReason.trim())`, showing a spinner and `Submitting...` while `isSubmitting`.

When `editMode`, render a second row beneath: an amber banner (`bg-amber-50 border-amber-200 text-amber-800`) with an `Edit` icon, the copy `Edit Mode — explain why you are changing this score`, and a `<textarea rows={2}>` bound to `editReason`/`onEditReasonChange`. This preserves today's gate, where submit is blocked until a reason is given.

- [ ] **Step 2: Create `ScoringFooterBar`**

`'use client'`. `sticky bottom-0 z-20 bg-white border-t border-gray-200`. Expanded: `You are scoring: {activityTitle}` on the left, `{scored} of {total} competencies scored` centre-right, chevron button on the right calling `onToggleCollapsed`. Collapsed: a slim `py-1.5` strip with just the count and the chevron.

- [ ] **Step 3: Wire both into `page.tsx`**

Compute once, inside the assignment IIFE, and pass to top bar, footer, and nothing else:

```tsx
const assignmentProgress = getActivityProgress(
  activityCompetencies,
  activitySelectedScoreKeys[selectedActivity?.activityId ?? ''],
  activityCompetencyScores[selectedActivity?.activityId ?? '']
);
const lifecycleStatus = scoreStatus[selectedAssignmentId] ?? 'DRAFT';
const readOnly =
  (lifecycleStatus === 'SUBMITTED' || lifecycleStatus === 'FINALIZED') && !editMode;
```

Render `<ScoringTopBar>` above the three-column row with `onSubmit={() => submitScores(selectedAssignmentId, 'SUBMITTED')}`, `onBack={() => router.back()}`, and `progressStatus={deriveProgressStatus(assignmentProgress.scored, assignmentProgress.total)}`. Render `<ScoringFooterBar>` after the row, with `collapsed`/`onToggleCollapsed` backed by a new `const [footerCollapsed, setFooterCollapsed] = useState(false);`.

Then delete the old submit block (current lines 1829-1881) and the old edit-mode textarea inside it — the top bar owns both now. Move the existing error banner so it renders directly beneath the top bar.

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Manual check**

Top bar shows the right participant, activity, status pill and count. Submit still submits and still redirects to `/assessor/assess`. Open a `SUBMITTED` score: pickers are read-only and the bar shows a status pill instead of the button. Append `?mode=edit`: the amber banner appears and Submit stays disabled until a reason is typed. Footer collapses and expands.

- [ ] **Step 6: Commit**

```bash
git add "src/app/assessor/assess/[id]/score/[participantId]"
git commit -m "feat(assessor): scoring top bar and sticky footer"
```

---

### Task 9: Responsive shell, dead-code sweep, and full verification

**Files:**
- Modify: `<SCORE>/page.tsx`

- [ ] **Step 1: Set the responsive shell**

Page root: `min-h-screen bg-gray-50 flex flex-col`. Column row: `flex flex-1 min-h-0 flex-col gap-4 p-4 xl:flex-row`. Each column: `min-h-0 flex flex-col gap-4` with its scrolling child carrying `overflow-y-auto scrollbar-thin`. Left `w-full xl:w-72 xl:flex-shrink-0`, centre `flex-1 min-w-0`, right `w-full xl:w-80 xl:flex-shrink-0`. Below `xl` the rails stack: order the DOM left → centre → right and add `order-first xl:order-none` to the left rail so it stays on top when stacked. Below `lg`, `ActivityRail` switches its list container to `flex overflow-x-auto lg:flex-col lg:overflow-visible` so activities become a horizontal chip strip, and `ParticipantOverview` gets `order-last` so it drops to the bottom.

- [ ] **Step 2: Remove now-dead code**

Delete from `page.tsx`: the unused `useSearchParams` import and its `const searchParams = useSearchParams();` (current line 549 — query params are read from `window.location` in the mount effect and this call was never used), the `skipNextLeftActivityScrollRef` ref if any remnant survives Task 4, and the `Suspense` import if nothing references it. Keep `getInteractiveActivityTypeBadge` imported only if a component still uses it; if not, drop the import — it stays exported from `lib/rubric.ts`.

Do **not** remove the `console.log` calls in `submitScores` and the init effect. They sit in frozen logic and removing them widens the diff beyond a UI change.

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: build completes, no errors. `/assessor/assess/[id]/score/[participantId]` appears in the route list.

- [ ] **Step 5: Full manual pass**

Walk the spec's verification list and confirm each:

1. Select every activity in the left rail; evidence, competency card, and competency rail all follow.
2. Score a rubric sub-competency; the circle fills, the rail badge updates, and all three counters (top bar, activity row, footer) move together.
3. Type notes, navigate to another sub-competency and back; the notes are still there.
4. A sub-competency with no descriptors shows the 0–10 input.
5. Video, document, text, and inbox evidence all render.
6. **Payload check — the important one.** Open DevTools → Network, submit, and confirm the `POST /api/assessors/scores` body has the same keys and shapes as before this branch: `participantId`, `assessorId`, `assessmentCenterId`, `competencyScores`, `activityCompetencyScores`, `activityComments`, `activitySubCompetencyComments`, `assignmentSubCompetencyComments`, `overallComments`, `competencyAverages`, `activitySelectedScoreKeys`, `assignmentSelectedScoreKeys`, `editReason`, `status`.
7. Reopen a `SUBMITTED` score: read-only. Add `?mode=edit`: editable, gated on a reason.
8. Resize to 1280, 1024, and 768 px wide: columns stack in that order and the page never scrolls horizontally.

- [ ] **Step 6: Commit**

```bash
git add "src/app/assessor/assess/[id]/score/[participantId]"
git commit -m "feat(assessor): responsive scoring shell and cleanup"
```

---

## Known follow-ups, deliberately not in this plan

- Per-activity scores are never restored from `assessorScore` on load, so editing a submitted score writes untouched rows back as `0`. Needs an `activityCompetencyScores` field on `AssessorScore` and a branch in the init effect.
- `submitScores` sends the global `activityCompetencyScores`, `activityComments`, and `activitySubCompComments` maps — every assignment's data — while the row is keyed by one `assessmentCenterId`.
- The assessor layout guards on `token` only, not on `assessorId`, so a non-assessor session can render these pages.
- Participant-supplied HTML still renders through `dangerouslySetInnerHTML` in the evidence panel with no sanitisation.
