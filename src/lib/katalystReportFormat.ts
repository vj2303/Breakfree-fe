/**
 * Shared parser for report API payloads → PDF + on-screen Katalyst-style preview.
 */

export interface FormattedReportContent {
  introduction: string;
  analysis: {
    content: string;
    competencies: Array<Record<string, unknown>>;
  };
  comments: {
    strengths: string[];
    developmentAreas: string[];
  };
  ratings: { chartData: unknown };
  recommendations: { recommendations: string[] };
}

/** Minimal score shape needed to merge readiness/application into competencies */
export interface ScoreForReportMerge {
  competencyScores?: {
    [competencyId: string]: {
      [subCompetency: string]:
        | number
        | { readiness?: number; application?: number };
    };
  };
}

export function formatReportContentForPDF(
  reportContent: Record<string, unknown>,
  participantName: string,
  assessmentCenterName: string,
  score?: ScoreForReportMerge
): FormattedReportContent {
  void participantName;
  void assessmentCenterName;
  let competencies: Array<Record<string, unknown>> = [];
  const part2Analysis = reportContent.part2Analysis as
    | Record<string, unknown>
    | undefined;

  try {
    if (part2Analysis && part2Analysis.content) {
      const raw = part2Analysis.content;
      const analysisData = typeof raw === "string" ? JSON.parse(raw) : raw;

      if (Array.isArray(analysisData)) {
        competencies = analysisData;
      } else if (typeof analysisData === "object") {
        Object.keys(analysisData).forEach((key) => {
          const compData = (analysisData as Record<string, unknown>)[key];
          if (compData && typeof compData === "object") {
            competencies.push({ name: key, ...compData });
          }
        });
      }
    } else if (part2Analysis && Array.isArray(part2Analysis.competencies)) {
      competencies = part2Analysis.competencies as Array<
        Record<string, unknown>
      >;
    }
  } catch (error) {
    console.error("Error parsing analysis content", error);
  }

  if (score?.competencyScores && typeof score.competencyScores === "object") {
    competencies = competencies.map((comp: Record<string, unknown>) => {
      const compId = comp.id || comp.competencyId || comp.name;
      const compScoresObj = score.competencyScores as Record<string, unknown>;
      const compScores = compScoresObj[compId as string];

      if (compScores && typeof compScores === "object") {
        const compScoresRecord = compScores as Record<string, unknown>;
        const subCompetencies = Object.keys(compScoresRecord);
        let totalReadiness = 0,
          totalApplication = 0,
          count = 0;

        subCompetencies.forEach((subComp: string) => {
          const s = compScoresRecord[subComp];
          if (typeof s === "object" && s !== null) {
            const scoreObj = s as Record<string, unknown>;
            if (
              "readiness" in scoreObj &&
              typeof scoreObj.readiness === "number"
            ) {
              totalReadiness += scoreObj.readiness;
            }
            if (
              "application" in scoreObj &&
              typeof scoreObj.application === "number"
            ) {
              totalApplication += scoreObj.application;
            }
            count++;
          } else if (typeof s === "number") {
            totalReadiness += s;
            totalApplication += s;
            count++;
          }
        });

        const compScore = typeof comp.score === "number" ? comp.score : 5;
        const avgR = count > 0 ? totalReadiness / count : compScore;
        const avgA = count > 0 ? totalApplication / count : compScore;

        return {
          ...comp,
          score: (avgR + avgA) / 2,
          readiness: avgR,
          application: avgA,
        };
      }
      return comp;
    });
  }

  let strengths: string[] = [];
  let developmentAreas: string[] = [];
  try {
    const part3Comments = reportContent.part3Comments as
      | Record<string, unknown>
      | undefined;
    if (part3Comments && part3Comments.content) {
      const c =
        typeof part3Comments.content === "string"
          ? JSON.parse(part3Comments.content)
          : part3Comments.content;
      const cObj = c as Record<string, unknown>;
      if (cObj.Strengths)
        strengths = Object.values(cObj.Strengths) as string[];
      if (cObj["Areas of Opportunity"])
        developmentAreas = Object.values(
          cObj["Areas of Opportunity"]
        ) as string[];
    } else if (part3Comments) {
      strengths = (
        Array.isArray(part3Comments.strengths) ? part3Comments.strengths : []
      ) as string[];
      developmentAreas = (
        Array.isArray(part3Comments.developmentAreas)
          ? part3Comments.developmentAreas
          : []
      ) as string[];
    }
  } catch {}

  let recommendations: string[] = [];
  try {
    const part5Recommendation = reportContent.part5Recommendation as
      | Record<string, unknown>
      | undefined;
    if (part5Recommendation && part5Recommendation.content) {
      recommendations =
        typeof part5Recommendation.content === "string"
          ? part5Recommendation.content
              .split("\n")
              .filter((x: string) => x.trim())
          : ((Array.isArray(part5Recommendation.recommendations)
              ? part5Recommendation.recommendations
              : []) as string[]);
    } else if (part5Recommendation) {
      recommendations = (
        Array.isArray(part5Recommendation.recommendations)
          ? part5Recommendation.recommendations
          : []
      ) as string[];
    }
  } catch {}

  const part1Introduction = reportContent.part1Introduction as
    | Record<string, unknown>
    | undefined;
  const part4OverallRatings = reportContent.part4OverallRatings as
    | Record<string, unknown>
    | undefined;
  return {
    introduction:
      (part1Introduction && typeof part1Introduction.content === "string"
        ? part1Introduction.content
        : "") || "",
    analysis: {
      content:
        (part2Analysis && typeof part2Analysis.content === "string"
          ? part2Analysis.content
          : "") || "",
      competencies,
    },
    comments: { strengths, developmentAreas },
    ratings: { chartData: part4OverallRatings?.chartData },
    recommendations: { recommendations },
  };
}
