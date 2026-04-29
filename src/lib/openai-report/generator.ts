/**
 * 3-call OpenAI report generator using Structured Outputs.
 * Runs all 3 calls in parallel for ~30s wall-clock instead of ~90s sequential.
 */

import OpenAI from "openai";
import {
  STYLE_GUIDE_SYSTEM_MESSAGE,
  INSIGHTS_ADDITIONAL_RULES,
  RECOMMENDATIONS_ADDITIONAL_RULES,
  COMPETENCY_PROFILES_USER_PROMPT,
  AI_INSIGHTS_USER_PROMPT,
  RECOMMENDATIONS_USER_PROMPT,
} from "./prompts";
import {
  COMPETENCY_PROFILES_SCHEMA,
  AI_INSIGHTS_SCHEMA,
  RECOMMENDATIONS_SCHEMA,
} from "./schemas";
import {
  validateProfiles,
  validateInsights,
  validateRecommendations,
  type CompetencyProfilesResponse,
  type AIInsightsResponse,
  type RecommendationsResponse,
} from "./validators";

/** Input shape that matches what we extract from the assessment data */
export interface ReportInput {
  participant: {
    name: string;
    designation?: string;
    department?: string;
    division?: string;
    manager?: string;
    location?: string;
    cohort?: string;
    assessment_date?: string;
  };
  programme: {
    name: string;
    scenario_summary?: string;
    activities: string[];
  };
  context: {
    other_participants?: string[];
    target_role?: string;
  };
  scoring: Record<
    string,
    Record<
      string,
      {
        score: number;
        anchor?: string;
        evidence?: string;
      }
    >
  >;
}

export interface GeneratedReport {
  profiles: CompetencyProfilesResponse;
  insights: AIInsightsResponse;
  recommendations: RecommendationsResponse;
}

function buildMessages(
  systemMessage: string,
  userPromptTemplate: string,
  inputData: ReportInput
): Array<{ role: "system" | "user"; content: string }> {
  const userContent = userPromptTemplate.replace(
    "{input_json}",
    JSON.stringify(inputData, null, 2)
  );
  return [
    { role: "system", content: systemMessage },
    { role: "user", content: userContent },
  ];
}

async function callWithRetry<T>(
  client: OpenAI,
  messages: Array<{ role: "system" | "user"; content: string }>,
  schema: Record<string, unknown>,
  schemaName: string,
  validator: (response: T) => string[],
  maxRetries = 2
): Promise<T> {
  const mutableMessages = [...messages] as Array<{
    role: "system" | "user";
    content: string;
  }>;

  let lastErrors: string[] = [];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: mutableMessages,
      response_format: {
        type: "json_schema" as const,
        json_schema: {
          name: schemaName,
          strict: true,
          schema,
        },
      },
      temperature: 0.4,
      max_tokens: 4096,
    });

    // Check for refusal
    const message = response.choices[0]?.message;
    if (message?.refusal) {
      throw new Error(`OpenAI refused the request: ${message.refusal}`);
    }

    // Check for length cutoff
    if (response.choices[0]?.finish_reason === "length") {
      throw new Error(
        "Response was cut off due to length. Increase max_tokens."
      );
    }

    const content = message?.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    const result = JSON.parse(content) as T;
    const errors = validator(result);

    if (errors.length === 0) {
      return result;
    }

    lastErrors = errors;
    console.warn(
      `[openai-report] ${schemaName} attempt ${attempt + 1} validation errors:`,
      errors
    );

    // Add error feedback for retry
    mutableMessages.push({
      role: "user",
      content: `The previous response had these issues:\n${errors.join("\n")}\n\nRegenerate the JSON with these fixed.`,
    });
  }

  // Return last result even with errors rather than failing entirely
  console.error(
    `[openai-report] ${schemaName} validation failed after ${maxRetries} attempts:`,
    lastErrors
  );
  // Re-run once more and return whatever we get
  const finalResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: mutableMessages,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    },
    temperature: 0.3,
    max_tokens: 4096,
  });

  return JSON.parse(finalResponse.choices[0]?.message?.content || "{}") as T;
}

export async function generateReport(
  inputData: ReportInput,
  apiKey: string
): Promise<GeneratedReport> {
  const client = new OpenAI({ apiKey });

  const [profiles, insights, recommendations] = await Promise.all([
    callWithRetry<CompetencyProfilesResponse>(
      client,
      buildMessages(
        STYLE_GUIDE_SYSTEM_MESSAGE,
        COMPETENCY_PROFILES_USER_PROMPT,
        inputData
      ),
      COMPETENCY_PROFILES_SCHEMA,
      "competency_profiles_response",
      validateProfiles
    ),
    callWithRetry<AIInsightsResponse>(
      client,
      buildMessages(
        STYLE_GUIDE_SYSTEM_MESSAGE + "\n" + INSIGHTS_ADDITIONAL_RULES,
        AI_INSIGHTS_USER_PROMPT,
        inputData
      ),
      AI_INSIGHTS_SCHEMA,
      "ai_insights_response",
      validateInsights
    ),
    callWithRetry<RecommendationsResponse>(
      client,
      buildMessages(
        STYLE_GUIDE_SYSTEM_MESSAGE + "\n" + RECOMMENDATIONS_ADDITIONAL_RULES,
        RECOMMENDATIONS_USER_PROMPT,
        inputData
      ),
      RECOMMENDATIONS_SCHEMA,
      "recommendations_response",
      validateRecommendations
    ),
  ]);

  return { profiles, insights, recommendations };
}
