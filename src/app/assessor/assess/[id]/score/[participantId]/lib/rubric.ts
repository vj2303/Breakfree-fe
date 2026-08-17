import type {
  Competency,
  ProgressStatus,
  ScoresByCompetency,
  SelectedKeysByCompetency,
} from './types';

export const getInteractiveActivityTypeBadge = (type?: string) => {
  switch (type) {
    case 'GD':
      return { label: 'GD', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'ROLEPLAY':
      return { label: 'Roleplay', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'CASE_STUDY':
      return { label: 'Case Study', color: 'bg-green-50 text-green-700 border-green-200' };
    default:
      return null;
  }
};

/** Single comment for numeric (non-rubric) sub-competency rows */
export const NUMERIC_SCORE_COMMENT_KEY = '__numeric';
/** Legacy flat string migrated from older API shape */
export const LEGACY_SCORE_COMMENT_KEY = '__legacy';

export function parseScoreKeyLevel(key: string): number {
  const n = parseInt(key.replace(/^score/i, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export function getSortedScoreKeysFromDescriptions(scoreDescriptions: Record<string, string>): string[] {
  return Object.keys(scoreDescriptions)
    .filter((key) => key.startsWith('score'))
    .sort((a, b) => parseScoreKeyLevel(a) - parseScoreKeyLevel(b));
}

export function legacyTenPointToLevel(score: number, numLevels: number): number {
  if (numLevels < 1) return 1;
  const clamped = Math.max(0, Math.min(10, score));
  const level = Math.round((clamped / 10) * numLevels);
  return Math.min(numLevels, Math.max(1, level || 1));
}

/** Maps stored value to rubric level: 0 = none, 1..N = explicit level; legacy 0–10 maps into levels. */
export function normalizeStoredToLevel(stored: number, numLevels: number): number {
  if (numLevels < 1) return 0;
  if (stored === 0 || stored === null || stored === undefined || Number.isNaN(Number(stored))) return 0;
  const n = Number(stored);
  if (Number.isInteger(n) && n >= 1 && n <= numLevels) return n;
  return legacyTenPointToLevel(n, numLevels);
}

export function averageSubCompetencyScores(
  subNames: string[],
  scoresBySub: Record<string, number> | undefined
): number | null {
  if (subNames.length === 0) return null;
  let sum = 0;
  for (const name of subNames) {
    const v = scoresBySub?.[name];
    sum += typeof v === 'number' && !Number.isNaN(v) ? v : 0;
  }
  return sum / subNames.length;
}

export function formatCompetencyAverage(avg: number | null): string {
  if (avg === null) return '—';
  const rounded = Math.round(avg * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Normalize API value to per–score-key comment map (handles legacy string). */
export function normalizeScoreCommentMap(
  val: string | Record<string, string> | undefined
): Record<string, string> {
  if (val === undefined || val === null) return {};
  if (typeof val === 'string') return { [LEGACY_SCORE_COMMENT_KEY]: val };
  return { ...val };
}

export function mergeActivitySubCompCommentsFromApi(
  raw: Record<string, Record<string, Record<string, unknown>>>
): Record<string, Record<string, Record<string, Record<string, string>>>> {
  const out: Record<string, Record<string, Record<string, Record<string, string>>>> = {};
  Object.entries(raw).forEach(([aid, compMap]) => {
    out[aid] = {};
    Object.entries(compMap).forEach(([cid, subMap]) => {
      out[aid][cid] = {};
      Object.entries(subMap).forEach(([sub, val]) => {
        out[aid][cid][sub] = normalizeScoreCommentMap(val as string | Record<string, string>);
      });
    });
  });
  return out;
}

export function mergeAssignmentSubCompCommentsFromApi(
  raw: Record<string, Record<string, unknown>>
): Record<string, Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, Record<string, string>>> = {};
  Object.entries(raw).forEach(([cid, subMap]) => {
    out[cid] = {};
    Object.entries(subMap as Record<string, unknown>).forEach(([sub, val]) => {
      out[cid][sub] = normalizeScoreCommentMap(val as string | Record<string, string>);
    });
  });
  return out;
}

export function getCommentForScoreKey(
  map: Record<string, string> | undefined,
  scoreKey: string,
  opts?: { isFirstScoreKey?: boolean }
): string {
  if (!map) return '';
  if (map[scoreKey]) return map[scoreKey];
  if (opts?.isFirstScoreKey && map[LEGACY_SCORE_COMMENT_KEY]) return map[LEGACY_SCORE_COMMENT_KEY];
  if (scoreKey === NUMERIC_SCORE_COMMENT_KEY && map[LEGACY_SCORE_COMMENT_KEY]) return map[LEGACY_SCORE_COMMENT_KEY];
  return '';
}

/** Mean of each activity’s sub-competency average (one value per activity). */
export function averageAcrossAllActivities(
  activities: Array<{ activityId: string }>,
  competencies: Competency[],
  activityCompetencyScores: Record<string, Record<string, Record<string, number>>>,
  getCompetencyForActivity: (
    activityId: string,
    available: Competency[]
  ) => Competency | null
): number | null {
  const avgs: number[] = [];
  for (const activity of activities) {
    const ac = getCompetencyForActivity(activity.activityId, competencies);
    if (!ac || ac.subCompetencyNames.length === 0) continue;
    const a = averageSubCompetencyScores(
      ac.subCompetencyNames,
      activityCompetencyScores[activity.activityId]?.[ac.id]
    );
    if (a !== null) avgs.push(a);
  }
  if (avgs.length === 0) return null;
  return avgs.reduce((x, y) => x + y, 0) / avgs.length;
}

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

/**
 * A sub-competency counts as scored when a rubric level was picked, or — for numeric rows with
 * no rubric — when its value is above zero. Rubric rows always have a selected key; numeric
 * rows never do, so both branches are needed.
 */
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
    (total, sub) => total + (isSubCompetencyScored(selectedKeys?.[sub], scores?.[sub]) ? 1 : 0),
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

/** Sub-competencies with no rubric descriptors fall back to a plain 0–10 score. */
export const NUMERIC_SCORE_MAX = 10;

export interface ScoreTotals {
  /** Points awarded so far. */
  value: number;
  /** Points available. */
  max: number;
  /** Sub-competencies that carry a score. */
  scored: number;
  /** Sub-competencies in scope. */
  total: number;
}

/**
 * Points for one sub-competency: the picked rubric level out of the number of levels,
 * or the raw value out of 10 when the sub-competency has no descriptors.
 * Display only — it re-reads the same state the pickers write.
 */
export function getSubCompetencyScore(
  scoreDescriptions: Record<string, string>,
  selectedScoreKey: string | undefined,
  score: number | undefined
): { value: number; max: number; scored: boolean } {
  const keys = getSortedScoreKeysFromDescriptions(scoreDescriptions);
  const scored = isSubCompetencyScored(selectedScoreKey, score);

  if (keys.length === 0) {
    return { value: score ?? 0, max: NUMERIC_SCORE_MAX, scored };
  }

  const level = selectedScoreKey
    ? parseScoreKeyLevel(selectedScoreKey)
    : normalizeStoredToLevel(score ?? 0, keys.length);
  return { value: level, max: keys.length, scored };
}

/** Points across every sub-competency of a competency, for the "Competency Score: x / y" header. */
export function getCompetencyScoreTotals(
  competency: Competency,
  scoreDescriptionsFor: (subComp: string) => Record<string, string>,
  selectedKeys: Record<string, string> | undefined,
  scores: Record<string, number> | undefined
): ScoreTotals {
  return competency.subCompetencyNames.reduce<ScoreTotals>(
    (totals, subComp) => {
      const { value, max, scored } = getSubCompetencyScore(
        scoreDescriptionsFor(subComp),
        selectedKeys?.[subComp],
        scores?.[subComp]
      );
      return {
        value: totals.value + value,
        max: totals.max + max,
        scored: totals.scored + (scored ? 1 : 0),
        total: totals.total + 1,
      };
    },
    { value: 0, max: 0, scored: 0, total: 0 }
  );
}

/** Sum of competency totals, for the overall score dial. */
export function sumScoreTotals(totals: ScoreTotals[]): ScoreTotals {
  return totals.reduce<ScoreTotals>(
    (acc, t) => ({
      value: acc.value + t.value,
      max: acc.max + t.max,
      scored: acc.scored + t.scored,
      total: acc.total + t.total,
    }),
    { value: 0, max: 0, scored: 0, total: 0 }
  );
}

/** Totals expressed out of 100, rounded — `null` when nothing is scoreable yet. */
export function toPercent(value: number, max: number): number | null {
  if (max <= 0) return null;
  return Math.round((value / max) * 100);
}
