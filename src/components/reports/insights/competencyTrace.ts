/**
 * Where each figure in the competency table came from, and who produced it.
 *
 * The table shows one averaged number per competency, which tells you nothing
 * about whether it came off an uploaded sheet or out of an assessor's BARS
 * rating. These shapes carry that provenance alongside the number so the row
 * can be opened and read back to its source.
 */

/** How the pre/post pair for one participant was arrived at. */
export type PrePostSource = 'uploaded' | 'inferred' | null;

export interface TraceAssessorEntry {
  assessorName: string;
  /** DRAFT / SUBMITTED / FINALIZED / NOT_STARTED. */
  status: string;
  submittedAt: string | null;
  /** This assessor's own average for the competency, across what they scored. */
  score: number | null;
}

export interface TraceParticipantEntry {
  participantName: string;
  /** Observed behaviour — the mean of the assessors' BARS ratings. */
  application: number | null;
  /** Knowledge — from the uploaded SJT / readiness sheet. */
  readiness: number | null;
  prePostSource: PrePostSource;
  assessors: TraceAssessorEntry[];
}

export interface CompetencyTrace {
  competencyId: string;
  participants: TraceParticipantEntry[];
}

/** A score of 0 on a 1–5 scale means "nothing recorded", not "scored zero". */
export const scoreOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

export const SAMPLE_PRE_ASSESSMENT_NOTE =
  'Pre-assessment score is sample data for demonstration — it is not read from the system. Upload a pre-assessment sheet to replace it.';

/**
 * The placeholder pre-assessment figure for a competency.
 *
 * Derived from the competency code rather than drawn at random: the same
 * competency must always show the same number, because a figure that changes
 * on every render reads as a bug rather than as sample data.
 */
export function samplePreAssessmentScore(code: string): number {
  let hash = 0;
  for (let index = 0; index < code.length; index += 1) {
    hash = (hash * 31 + code.charCodeAt(index)) % 997;
  }
  // 2.6 – 3.6, a believable baseline below a typical post-assessment score.
  return Math.round((2.6 + (hash % 11) / 10) * 10) / 10;
}

/** How many participants in a trace carry each kind of evidence. */
export function summariseTrace(trace: CompetencyTrace | undefined) {
  const participants = trace?.participants ?? [];
  const assessorNames = new Set<string>();
  participants.forEach((entry) =>
    entry.assessors.forEach((assessor) => {
      if (assessor.score !== null) assessorNames.add(assessor.assessorName);
    })
  );

  return {
    participantCount: participants.length,
    withApplication: participants.filter((entry) => entry.application !== null).length,
    withReadiness: participants.filter((entry) => entry.readiness !== null).length,
    uploadedPrePost: participants.filter((entry) => entry.prePostSource === 'uploaded').length,
    inferredPrePost: participants.filter((entry) => entry.prePostSource === 'inferred').length,
    assessorNames: Array.from(assessorNames).sort(),
  };
}
