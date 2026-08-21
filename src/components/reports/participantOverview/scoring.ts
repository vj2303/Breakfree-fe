import type { AssessorRecord, OverviewCompetency, ProgressPoint } from './types';

/** Sub-competencies with no rubric descriptors are scored 0–10. */
export const NUMERIC_SCORE_MAX = 10;

/** Competency names may be stored as "K3 - Boldly Innovate\t<description>". */
export function parseCompetencyName(
  fullName: string,
  index: number
): { code: string; label: string } {
  const title = (fullName || '').split('\t')[0].trim();
  const match = title.match(/^(K\s*\d+)\s*[-–:]?\s*(.*)$/i);
  if (match) {
    return {
      code: match[1].replace(/\s+/g, '').toUpperCase(),
      label: match[2].trim() || title,
    };
  }
  return { code: `K${index + 1}`, label: title };
}

export function shortSubCompetency(subComp: string): string {
  return subComp.split('\t')[0].trim() || subComp;
}

export function parseScoreKeyLevel(key: string): number {
  const n = parseInt(key.replace(/^score/i, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export function sortedScoreKeys(descriptions: Record<string, string>): string[] {
  return Object.keys(descriptions)
    .filter((key) => key.toLowerCase().startsWith('score'))
    .sort((a, b) => parseScoreKeyLevel(a) - parseScoreKeyLevel(b));
}

/**
 * Rubric descriptors arrive in either shape:
 *   descriptors[activityId][competencyId][subCompetency]
 *   descriptors[activityId]["activity-0"][competencyId][subCompetency]
 */
export function getScoreDescriptions(
  descriptors: Record<string, unknown> | null,
  activityId: string,
  competencyId: string,
  subCompetency: string
): Record<string, string> {
  const activityNode = descriptors?.[activityId];
  if (!activityNode || typeof activityNode !== 'object') return {};

  const direct = (activityNode as Record<string, any>)[competencyId]?.[subCompetency];
  if (direct && typeof direct === 'object') return direct as Record<string, string>;

  for (const nested of Object.values(activityNode as Record<string, any>)) {
    if (!nested || typeof nested !== 'object') continue;
    const hit = nested[competencyId]?.[subCompetency];
    if (hit && typeof hit === 'object') return hit as Record<string, string>;
  }
  return {};
}

/** Points available for one sub-competency: rubric levels, or 10 when it has no rubric. */
export function subCompetencyMax(
  descriptors: Record<string, unknown> | null,
  activityId: string,
  competencyId: string,
  subCompetency: string
): number {
  const keys = sortedScoreKeys(getScoreDescriptions(descriptors, activityId, competencyId, subCompetency));
  return keys.length > 0 ? keys.length : NUMERIC_SCORE_MAX;
}

/**
 * Max score for a competency in one activity — the mean of its sub-competency maxima, so a
 * competency scored on a 5-level rubric reads "5" however many sub-competencies it has.
 */
export function competencyMax(
  descriptors: Record<string, unknown> | null,
  activityId: string,
  competency: OverviewCompetency
): number {
  if (competency.subCompetencyNames.length === 0) return 0;
  const total = competency.subCompetencyNames.reduce(
    (sum, subComp) => sum + subCompetencyMax(descriptors, activityId, competency.id, subComp),
    0
  );
  return total / competency.subCompetencyNames.length;
}

/**
 * One assessor's score for a competency in one activity: the mean of the sub-competency
 * scores they recorded. `null` when they scored none of them.
 */
export function assessorCompetencyScore(
  assessor: AssessorRecord,
  activityId: string,
  competency: OverviewCompetency
): number | null {
  const scores = assessor.activityCompetencyScores?.[activityId]?.[competency.id];
  const selected = assessor.activitySelectedScoreKeys?.[activityId]?.[competency.id];
  if (!scores && !selected) return null;

  let sum = 0;
  let count = 0;
  competency.subCompetencyNames.forEach((subComp) => {
    const key = selected?.[subComp];
    const raw = scores?.[subComp];
    const value = key ? parseScoreKeyLevel(key) : typeof raw === 'number' ? raw : null;
    if (value !== null && !Number.isNaN(value)) {
      sum += value;
      count += 1;
    }
  });

  return count > 0 ? sum / count : null;
}

/** Mean of an assessor's per-activity scores for a competency, across every activity given. */
export function assessorCompetencyAverage(
  assessor: AssessorRecord,
  activityIds: string[],
  competency: OverviewCompetency
): number | null {
  const values = activityIds
    .map((activityId) => assessorCompetencyScore(assessor, activityId, competency))
    .filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function mean(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null && !Number.isNaN(v));
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0) / present.length;
}

export function formatScore(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

/** Every comment an assessor left on a competency in one activity, keyed by sub-competency. */
export function assessorCompetencyComments(
  assessor: AssessorRecord,
  activityId: string,
  competency: OverviewCompetency
): Array<{ subCompetency: string; comment: string }> {
  const byScoreKey = assessor.activitySubCompetencyComments?.[activityId]?.[competency.id];
  const selected = assessor.activitySelectedScoreKeys?.[activityId]?.[competency.id];
  if (!byScoreKey) return [];

  const out: Array<{ subCompetency: string; comment: string }> = [];
  competency.subCompetencyNames.forEach((subComp) => {
    const comments = byScoreKey[subComp];
    if (!comments) return;
    // Prefer the note tied to the level the assessor picked; fall back to any note present.
    const key = selected?.[subComp];
    const comment =
      (key && comments[key]) ||
      Object.values(comments).find((c) => typeof c === 'string' && c.trim().length > 0);
    if (comment && comment.trim()) {
      out.push({ subCompetency: shortSubCompetency(subComp), comment: comment.trim() });
    }
  });
  return out;
}

/** Palette for the K-code badges, cycled by competency index. */
const BADGE_STYLES = [
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
] as const;

export function badgeStyle(index: number): string {
  return BADGE_STYLES[index % BADGE_STYLES.length];
}

export function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  GD: 'Group Discussion',
  GROUP_DISCUSSION: 'Group Discussion',
  ROLEPLAY: 'Role Play',
  ROLE_PLAY: 'Role Play',
  CASE_STUDY: 'Case Study',
  INBOX_ACTIVITY: 'Inbox Exercise',
  INTERVIEW: 'Interview',
  PRESENTATION: 'Presentation',
};

export function readableActivityType(activityType: string): string {
  const key = (activityType || '').toUpperCase().replace(/-/g, '_');
  if (!key) return 'Activity';
  return (
    ACTIVITY_TYPE_LABELS[key] ??
    key
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "10 – 20 Mar 2026" from the first and last completion timestamps. */
export function formatDateRange(dates: string[]): string {
  const valid = dates
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (valid.length === 0) return '—';

  const first = valid[0];
  const last = valid[valid.length - 1];
  const monthYear = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  if (first.getTime() === last.getTime()) {
    return `${first.getDate()} ${monthYear(first)}`;
  }
  if (monthYear(first) === monthYear(last)) {
    return `${first.getDate()} – ${last.getDate()} ${monthYear(first)}`;
  }
  return `${first.getDate()} ${monthYear(first)} – ${last.getDate()} ${monthYear(last)}`;
}

/**
 * Maps one participant's `pre-post-assessment` and `application-readiness` rows onto the
 * four series the progress charts draw, plus the two deltas.
 *
 * Shared by the participant overview and the cohort-level insights screen so both read the
 * backend the same way — change the field pairing here and every chart follows.
 */
export function buildProgressPoints(
  competencies: OverviewCompetency[],
  prePost: Array<Record<string, unknown>>,
  readiness: Array<Record<string, unknown>>
): ProgressPoint[] {
  const prePostById = new Map(prePost.map((row) => [row.competencyId as string, row]));
  const readinessById = new Map(readiness.map((row) => [row.competencyId as string, row]));

  const num = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  const delta = (post: number | null, pre: number | null): number | null =>
    post === null || pre === null ? null : Number((post - pre).toFixed(2));

  return competencies.map((competency) => {
    const pp = prePostById.get(competency.id) || {};
    const ar = readinessById.get(competency.id) || {};

    const preApplication = num(pp.preAssessmentApp);
    const postApplication = num(pp.preAssessmentApp2) ?? num(ar.applicationAverage);
    const postReadiness = num(pp.postAssessmentReadiness) ?? num(ar.readiness);
    const improvement = num(pp.improvement);
    const preReadiness =
      postReadiness !== null && improvement !== null
        ? Number((postReadiness - improvement).toFixed(2))
        : num(ar.readiness);

    return {
      code: competency.code,
      competencyName: competency.label,
      preReadiness,
      preApplication,
      postReadiness,
      postApplication,
      readinessDelta: delta(postReadiness, preReadiness),
      applicationDelta: delta(postApplication, preApplication),
    };
  });
}
