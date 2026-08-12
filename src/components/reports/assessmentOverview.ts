export interface OverviewData {
  totalAssessments: number;
  assigned: number;
  inProgress: number;
  completed: number;
  assignedPercentage: number;
  inProgressPercentage: number;
  completedPercentage: number;
}

export interface AssessmentStats {
  total: number;
  assignedCount: number;
  inProgressCount: number;
  completedCount: number;
  assignedPercentage: number;
  inProgressPercentage: number;
  completedPercentage: number;
}

/**
 * Derives the displayed counts and percentages from the management-reports overview payload.
 *
 * Moved verbatim out of AssessmentsCard so the stat tiles and the progress bars cannot drift
 * apart. The comments below are the original rationale for the denominator choice.
 */
export function deriveAssessmentStats(data: OverviewData | null): AssessmentStats {
  const stats = data || {
    totalAssessments: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    assignedPercentage: 0,
    inProgressPercentage: 0,
    completedPercentage: 0,
  };

  const assignedCountFromApi = stats.assigned ?? 0;
  const inProgressCount = stats.inProgress ?? 0;
  const completedCount = stats.completed ?? 0;

  // Use totalAssessments as the denominator for percentages; fall back to the
  // largest of the three counts if totalAssessments is somehow under-reported.
  const effectiveTotalForPercent =
    Math.max(stats.totalAssessments ?? 0, assignedCountFromApi, inProgressCount, completedCount) || 0;

  // Display the raw assigned count from the backend (= total activities with assessors).
  // Each of the three bars is an independent cumulative metric relative to the total:
  //   Assigned   = all activities that have been assigned to participants
  //   In progress = activities where the participant has submitted a response
  //   Completed  = activities that have been fully scored by an assessor
  const assignedCount = assignedCountFromApi;

  const clampPct = (pct: number) => Math.min(Math.max(pct, 0), 100);

  const assignedPercentageRaw = effectiveTotalForPercent
    ? clampPct((assignedCount / effectiveTotalForPercent) * 100)
    : 0;
  const inProgressPercentageRaw = effectiveTotalForPercent
    ? clampPct((inProgressCount / effectiveTotalForPercent) * 100)
    : 0;
  const completedPercentageRaw = effectiveTotalForPercent
    ? clampPct((completedCount / effectiveTotalForPercent) * 100)
    : 0;

  // Display whole numbers only (no decimals).
  const roundPct = (pct: number) => Math.round(pct);

  return {
    total: effectiveTotalForPercent,
    assignedCount,
    inProgressCount,
    completedCount,
    assignedPercentage: roundPct(assignedPercentageRaw),
    inProgressPercentage: roundPct(inProgressPercentageRaw),
    completedPercentage: roundPct(completedPercentageRaw),
  };
}
