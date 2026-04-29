/**
 * Semantic validators for OpenAI report responses.
 * Structured Outputs guarantees JSON schema compliance — these check content quality.
 */

const BANNED_PHRASES = [
  /demonstrated the strength of/i,
  /exhibited the strength of/i,
  /showed a strength in/i,
  /there are areas of opportunity in/i,
  /there is a development opportunity to/i,
  /made attempts to.*moderate impact/i,
  /this is essential for higher management roles/i,
  /this is crucial for effective leadership/i,
];

const BANNED_OPENINGS = [/^In the \w+ /, /^\w+ demonstrated /, /^\w+ showed /];

function checkParagraph(text: string, location: string): string[] {
  const errors: string[] = [];
  for (const pattern of BANNED_PHRASES) {
    if (pattern.test(text)) {
      errors.push(`${location}: banned phrase detected`);
      break;
    }
  }
  for (const pattern of BANNED_OPENINGS) {
    if (pattern.test(text)) {
      errors.push(`${location}: banned opening pattern`);
      break;
    }
  }
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 40) {
    errors.push(`${location}: too short (${wordCount} words)`);
  }
  if (wordCount > 220) {
    errors.push(`${location}: too long (${wordCount} words)`);
  }
  return errors;
}

export interface CompetencyProfile {
  competency_name: string;
  strengths: string;
  development: string;
}

export interface CompetencyProfilesResponse {
  overall_intro: string;
  overall_strengths: Array<{ title: string; body: string }>;
  overall_development_areas: Array<{ title: string; body: string }>;
  competency_profiles: CompetencyProfile[];
}

export function validateProfiles(
  response: CompetencyProfilesResponse
): string[] {
  const errors: string[] = [];

  errors.push(...checkParagraph(response.overall_intro, "overall_intro"));

  for (let i = 0; i < response.overall_strengths.length; i++) {
    errors.push(
      ...checkParagraph(response.overall_strengths[i].body, `strengths[${i}].body`)
    );
  }
  for (let i = 0; i < response.overall_development_areas.length; i++) {
    errors.push(
      ...checkParagraph(
        response.overall_development_areas[i].body,
        `dev_areas[${i}].body`
      )
    );
  }
  for (const profile of response.competency_profiles) {
    errors.push(
      ...checkParagraph(profile.strengths, `${profile.competency_name}.strengths`)
    );
    errors.push(
      ...checkParagraph(profile.development, `${profile.competency_name}.development`)
    );
  }

  return errors;
}

export interface AIInsightsResponse {
  archetype: {
    name: string;
    description: string;
    core_strengths: string[];
    watchouts: string[];
    deployment_best: string;
    deployment_caution: string;
  };
  cross_competency_patterns: Array<{
    title: string;
    description: string;
    risk: string;
    opportunity: string;
  }>;
  predictive_indicators: Array<{
    indicator: string;
    type: "RISK" | "OPPORTUNITY";
    timeframe: string;
    likelihood: number;
    mitigation: string;
  }>;
  role_fit: {
    title: string;
    current_fit: number;
    potential_fit: number;
    timeline: string;
    narrative: string;
    critical_gaps: string[];
  };
}

export function validateInsights(response: AIInsightsResponse): string[] {
  const errors: string[] = [];
  const role = response.role_fit;

  if (role.potential_fit <= role.current_fit) {
    errors.push(
      `role_fit: potential (${role.potential_fit}) must exceed current (${role.current_fit})`
    );
  }

  const hasOpportunity = response.predictive_indicators.some(
    (p) => p.type === "OPPORTUNITY"
  );
  if (!hasOpportunity) {
    errors.push(
      "predictive_indicators: must include at least one OPPORTUNITY"
    );
  }

  return errors;
}

export interface RecommendationEntry {
  competency_name: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  score: number;
  intro: string;
  on_the_job: string[];
  coaching: string[];
  formal_learning: string[];
}

export interface RecommendationsResponse {
  recommendations: RecommendationEntry[];
  next_steps: string[];
}

export function validateRecommendations(
  response: RecommendationsResponse
): string[] {
  const errors: string[] = [];

  for (const rec of response.recommendations) {
    const score = rec.score;
    const expectedPriority =
      score < 2.6 ? "HIGH" : score < 3.5 ? "MEDIUM" : "LOW";
    if (rec.priority !== expectedPriority) {
      errors.push(
        `${rec.competency_name}: priority ${rec.priority} doesn't match score ${score} (expected ${expectedPriority})`
      );
    }
    for (const strand of ["on_the_job", "coaching", "formal_learning"] as const) {
      for (let i = 0; i < rec[strand].length; i++) {
        if (rec[strand][i].split(/\s+/).length < 8) {
          errors.push(
            `${rec.competency_name}.${strand}[${i}]: too short, likely generic`
          );
        }
      }
    }
  }

  return errors;
}
