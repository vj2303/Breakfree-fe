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
