/**
 * Placeholder pre-assessment figures.
 *
 * There is no pre-assessment sitting in the system yet, so the pre-assessment
 * charts would otherwise be empty. These stand in for it until a real
 * pre-assessment sheet is uploaded, and every view that shows one says so.
 */

export const SAMPLE_PRE_ASSESSMENT_NOTE =
  'Pre-assessment scores shown here are sample data for demonstration — they are not read from the system. Upload a pre-assessment sheet to replace them.';

/**
 * The placeholder pre-assessment figure for a competency.
 *
 * Derived from the competency code rather than drawn at random: the same
 * competency must always show the same number — in the cohort view and in a
 * participant's — because a figure that changes on every render reads as a
 * bug rather than as sample data.
 */
export function samplePreAssessmentScore(code: string): number {
  let hash = 0;
  for (let index = 0; index < code.length; index += 1) {
    hash = (hash * 31 + code.charCodeAt(index)) % 997;
  }
  // 2.6 – 3.6, a believable baseline below a typical post-assessment score.
  return Math.round((2.6 + (hash % 11) / 10) * 10) / 10;
}
