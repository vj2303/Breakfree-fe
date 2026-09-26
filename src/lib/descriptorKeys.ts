/**
 * One rule for how rubric descriptors are keyed by activity.
 *
 * Descriptors live at `descriptors[activityKey][competencyId][subCompetency][scoreKey]`,
 * and the assessor scoring screen looks them up by the activity's CONTENT id
 * (`AssessmentActivity.activityId`). Anything that writes descriptors has to
 * agree on that, or the anchors quietly vanish: the BARS import hands back
 * positional `activity-<index>` keys, and the wizard used to derive its own key
 * a different way in two different files.
 */

export interface KeyedActivity {
  /** Id of the selected case study / inbox activity — the canonical key. */
  activityContent?: string;
  id?: string;
}

export const PLACEHOLDER_KEY = /^activity-(\d+)$/;

/** The key an activity's descriptors belong under. */
export function descriptorKeyForActivity(activity: KeyedActivity | undefined, index: number): string {
  return activity?.activityContent || activity?.id || `activity-${index}`;
}

/**
 * Resolves positional `activity-<index>` keys against the activity list.
 * Keys that are already real ids are left alone, and two keys resolving to the
 * same activity are merged rather than one overwriting the other.
 */
export function normalizeDescriptorKeys<T extends KeyedActivity>(
  descriptors: Record<string, any> | null | undefined,
  activities: T[]
): Record<string, any> {
  if (!descriptors || typeof descriptors !== 'object') return {};

  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(descriptors)) {
    const placeholder = PLACEHOLDER_KEY.exec(key);
    const index = placeholder ? Number(placeholder[1]) : -1;
    const resolved =
      index >= 0 && activities[index] ? descriptorKeyForActivity(activities[index], index) : key;
    out[resolved] = { ...(out[resolved] || {}), ...(value || {}) };
  }
  return out;
}
