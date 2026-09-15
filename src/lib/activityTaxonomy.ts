/**
 * Single source of truth for how assessment activities are classified.
 *
 * Two top-level categories:
 *   - Inbox Activity
 *   - Interaction Activities — Group Discussion, Case Study Presentation,
 *     Case Study Analysis and Role Play
 *
 * The stored `activityType` values are unchanged (`case-study` /
 * `inbox-activity`); only the label for the interaction family moved from
 * "Interactive Activity" to "Interaction Activities". The finer classification
 * lives in `interactiveActivityType`.
 */

/** Persisted `activityType` for the interaction family. */
export const INTERACTION_CATEGORY = 'case-study';
/** Persisted `activityType` for the inbox family. */
export const INBOX_CATEGORY = 'inbox-activity';

export type ActivityCategory = typeof INTERACTION_CATEGORY | typeof INBOX_CATEGORY;

export type InteractionActivityType =
  | 'GD'
  | 'CASE_STUDY_PRESENTATION'
  | 'CASE_STUDY_ANALYSIS'
  | 'ROLEPLAY'
  /** Pre-split records, before presentation and analysis were separated. */
  | 'CASE_STUDY';

export interface TaxonomyOption<T extends string = string> {
  value: T;
  label: string;
}

export const ACTIVITY_CATEGORIES: TaxonomyOption<ActivityCategory>[] = [
  { value: INTERACTION_CATEGORY, label: 'Interaction Activities' },
  { value: INBOX_CATEGORY, label: 'Inbox Activity' },
];

/** The four types an interaction activity can be, in the order they are offered. */
export const INTERACTION_ACTIVITY_TYPES: TaxonomyOption<InteractionActivityType>[] = [
  { value: 'GD', label: 'Group Discussion' },
  { value: 'CASE_STUDY_PRESENTATION', label: 'Case Study Presentation' },
  { value: 'CASE_STUDY_ANALYSIS', label: 'Case Study Analysis' },
  { value: 'ROLEPLAY', label: 'Role Play' },
];

/** Legacy value kept readable so existing records still display correctly. */
export const LEGACY_INTERACTION_TYPE: TaxonomyOption<InteractionActivityType> = {
  value: 'CASE_STUDY',
  label: 'Case Study',
};

/** Options plus the legacy entry — for filters, which must match old records too. */
export const INTERACTION_ACTIVITY_TYPES_WITH_LEGACY: TaxonomyOption<InteractionActivityType>[] = [
  ...INTERACTION_ACTIVITY_TYPES,
  LEGACY_INTERACTION_TYPE,
];

const BADGE_COLORS: Record<string, string> = {
  GD: 'bg-blue-50 text-blue-700 border-blue-200',
  CASE_STUDY_PRESENTATION: 'bg-green-50 text-green-700 border-green-200',
  CASE_STUDY_ANALYSIS: 'bg-teal-50 text-teal-700 border-teal-200',
  ROLEPLAY: 'bg-purple-50 text-purple-700 border-purple-200',
  CASE_STUDY: 'bg-green-50 text-green-700 border-green-200',
};

/** Short labels for space-constrained badges. */
const SHORT_LABELS: Record<string, string> = {
  GD: 'GD',
  CASE_STUDY_PRESENTATION: 'Case Study — Presentation',
  CASE_STUDY_ANALYSIS: 'Case Study — Analysis',
  ROLEPLAY: 'Role Play',
  CASE_STUDY: 'Case Study',
};

function normalizeInteractionType(type?: string | null): string {
  return (type || '').toUpperCase().replace(/[\s-]/g, '_');
}

export function isInboxActivity(activityType?: string | null): boolean {
  return normalizeCategory(activityType) === INBOX_CATEGORY;
}

export function isInteractionActivity(activityType?: string | null): boolean {
  return normalizeCategory(activityType) === INTERACTION_CATEGORY;
}

/** Accepts `CASE_STUDY`, `case_study`, `case-study` … and returns the stored form. */
export function normalizeCategory(activityType?: string | null): ActivityCategory | null {
  const norm = (activityType || '').toLowerCase().replace(/_/g, '-');
  if (norm === INBOX_CATEGORY) return INBOX_CATEGORY;
  if (norm === INTERACTION_CATEGORY) return INTERACTION_CATEGORY;
  return null;
}

/** Full label for an interaction sub-type, e.g. "Case Study Presentation". */
export function interactionTypeLabel(type?: string | null): string | null {
  const key = normalizeInteractionType(type);
  const match = INTERACTION_ACTIVITY_TYPES_WITH_LEGACY.find((option) => option.value === key);
  return match?.label ?? null;
}

/** Badge label plus its colour classes, or null when the sub-type is unknown. */
export function interactionTypeBadge(
  type?: string | null
): { label: string; color: string } | null {
  const key = normalizeInteractionType(type);
  if (!SHORT_LABELS[key]) return null;
  return { label: SHORT_LABELS[key], color: BADGE_COLORS[key] };
}

/**
 * How an activity should be named in the UI: the sub-type when it is known,
 * otherwise the category it belongs to.
 */
export function getActivityTypeLabel(
  activityType?: string | null,
  interactiveActivityType?: string | null
): string {
  const category = normalizeCategory(activityType);

  if (category === INBOX_CATEGORY) return 'Inbox Activity';

  if (category === INTERACTION_CATEGORY) {
    // Fall back to the family name so the label is at least honest about the
    // category when the sub-type has not been loaded.
    return interactionTypeLabel(interactiveActivityType) ?? 'Interaction Activity';
  }

  return activityType || 'Unknown';
}
