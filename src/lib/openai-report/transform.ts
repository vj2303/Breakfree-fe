/**
 * Transforms raw assessment data from the backend into the ReportInput shape
 * expected by the OpenAI 3-call generator.
 */

import type { ReportInput } from "./generator";

interface RawAssessmentData {
  participant?: {
    id?: string;
    name?: string;
    email?: string;
    designation?: string;
    department?: string;
    managerName?: string;
    contactNo?: string;
    userCode?: string;
  };
  assessmentCenter?: {
    id?: string;
    name?: string;
    displayName?: string;
  };
  reportContent?: Record<string, unknown>;
  scores?: Array<{
    competencyScores?: Record<
      string,
      Record<string, number | { readiness?: number; application?: number }>
    >;
    overallComments?: string;
    individualComments?: Record<string, string> | null;
    assessor?: { name?: string };
  }>;
  competencies?: Array<{
    id?: string;
    competencyName?: string;
    subCompetencyNames?: string[];
  }>;
  activities?: Array<{
    activityType?: string;
    displayName?: string;
  }>;
}

/**
 * Build the scoring block from assessor scores + competency metadata.
 * Groups sub-competency scores under their parent competency name.
 */
function buildScoring(
  data: RawAssessmentData
): ReportInput["scoring"] {
  const scoring: ReportInput["scoring"] = {};

  if (!data.scores || data.scores.length === 0) return scoring;

  // Build a map from competency ID to competency name
  const compIdToName = new Map<string, string>();
  const compIdToSubs = new Map<string, string[]>();
  if (data.competencies) {
    for (const comp of data.competencies) {
      if (comp.id && comp.competencyName) {
        compIdToName.set(comp.id, comp.competencyName);
        compIdToSubs.set(comp.id, comp.subCompetencyNames || []);
      }
    }
  }

  // Aggregate scores across all assessors (average them)
  const aggregated = new Map<
    string,
    Map<string, { total: number; count: number; evidence: string }>
  >();

  for (const scoreEntry of data.scores) {
    if (!scoreEntry.competencyScores) continue;

    for (const [compId, subScores] of Object.entries(
      scoreEntry.competencyScores
    )) {
      const compName = compIdToName.get(compId) || compId;
      if (!aggregated.has(compName)) {
        aggregated.set(compName, new Map());
      }
      const compMap = aggregated.get(compName)!;

      for (const [subName, value] of Object.entries(subScores)) {
        let numericScore: number;
        if (typeof value === "number") {
          numericScore = value;
        } else if (typeof value === "object" && value !== null) {
          const r = (value as { readiness?: number }).readiness ?? 0;
          const a = (value as { application?: number }).application ?? 0;
          numericScore = (r + a) / 2;
        } else {
          continue;
        }

        if (!compMap.has(subName)) {
          compMap.set(subName, { total: 0, count: 0, evidence: "" });
        }
        const entry = compMap.get(subName)!;
        entry.total += numericScore;
        entry.count += 1;
      }

      // Merge individual comments as evidence
      if (scoreEntry.individualComments?.[compId]) {
        for (const [subName] of Object.entries(subScores)) {
          const entry = compMap.get(subName);
          if (entry && scoreEntry.individualComments[compId]) {
            entry.evidence = scoreEntry.individualComments[compId];
          }
        }
      }
    }
  }

  // Convert aggregated scores to the ReportInput scoring format
  for (const [compName, subMap] of aggregated.entries()) {
    scoring[compName] = {};
    for (const [subName, { total, count, evidence }] of subMap.entries()) {
      const avgScore = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
      scoring[compName][subName] = {
        score: avgScore,
        anchor: `Score ${avgScore}/10`,
        evidence: evidence || `Assessed with a score of ${avgScore}/10.`,
      };
    }
  }

  return scoring;
}

export function transformToReportInput(
  data: RawAssessmentData
): ReportInput {
  const participantName = data.participant?.name || "Unknown Participant";
  const assessmentCenterName =
    data.assessmentCenter?.displayName ||
    data.assessmentCenter?.name ||
    "Assessment Centre";

  const activities = (data.activities || [])
    .map(
      (a) =>
        a.displayName ||
        (a.activityType
          ? a.activityType.replace(/_/g, " ").toLowerCase()
          : "activity")
    )
    .filter(Boolean);

  // Build overall comments from all assessors as scenario summary
  const overallComments = (data.scores || [])
    .map((s) => s.overallComments)
    .filter(Boolean)
    .join(" ");

  return {
    participant: {
      name: participantName,
      designation: data.participant?.designation || "",
      department: data.participant?.department || "",
      manager: data.participant?.managerName || "",
      assessment_date: new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    },
    programme: {
      name: assessmentCenterName,
      scenario_summary: overallComments || `Assessment at ${assessmentCenterName}`,
      activities: activities.length > 0 ? activities : ["Assessment Activity"],
    },
    context: {
      target_role: data.participant?.designation || "Leadership Role",
    },
    scoring: buildScoring(data),
  };
}
