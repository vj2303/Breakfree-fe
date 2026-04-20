import { API_V1_BASE_URL } from "./apiConfig";
import type { FormattedReportContent } from "./katalystReportFormat";

const SYNTHESIZE_URL = `${API_V1_BASE_URL}/reports/synthesize-strengths-and-development`;

export interface SynthesizeStrengthsResponse {
  strengths: string[];
  developmentAreas: string[];
}

function parseSynthesizePayload(data: unknown): SynthesizeStrengthsResponse | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const strengths = d.strengths;
  const dev =
    d.developmentAreas ?? d.development_areas ?? d.areasOfOpportunity;

  const toList = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    return v
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  return {
    strengths: toList(strengths),
    developmentAreas: toList(dev),
  };
}

/** True when API uses a placeholder id like `synthetic_<ac>_<participant>_<assessor>` (no DB row yet). */
export function isSyntheticScoreId(scoreId: string | undefined): boolean {
  if (!scoreId || typeof scoreId !== "string") return true;
  return scoreId.startsWith("synthetic_");
}

/** Optional assessor score context so the backend can resolve the same row as the UI (not just AC + participant). */
export interface SynthesizeScoreContext {
  assessorId: string;
  /** Real assessor score document id. Omit for synthetic placeholders — backend should use competencyScores from body instead. */
  scoreId: string;
  status?: string;
  competencyScores?: Record<
    string,
    Record<string, number | { readiness?: number; application?: number }>
  >;
  overallComments?: string;
  individualComments?: Record<string, string> | null;
}

/**
 * When strengths and/or development priorities are missing, asks the backend (GPT) to fill them.
 * On failure, returns `content` unchanged.
 */
export async function enrichReportContentWithSynthesizedComments(
  token: string,
  assessmentCenterId: string,
  participantId: string,
  content: FormattedReportContent,
  options?: {
    onlyFillIfEmpty?: boolean;
    maxItemsPerSection?: number;
    locale?: string;
    tone?: string;
    /** Same assessor score row as in the report list — required for backend to find scores / GPT context */
    scoreContext?: SynthesizeScoreContext;
  }
): Promise<FormattedReportContent> {
  const needsStrengths = content.comments.strengths.length === 0;
  const needsDev = content.comments.developmentAreas.length === 0;
  if (!needsStrengths && !needsDev) {
    console.log(
      "[synthesize] skip: strengths and development areas already filled (no API call)"
    );
    return content;
  }

  const ctx = options?.scoreContext;
  const body: Record<string, unknown> = {
    assessmentCenterId,
    participantId,
    onlyFillIfEmpty: options?.onlyFillIfEmpty ?? true,
    maxItemsPerSection: options?.maxItemsPerSection ?? 6,
    locale: options?.locale ?? "en",
    tone: options?.tone ?? "professional coaching",
  };

  if (ctx) {
    body.assessorId = ctx.assessorId;

    const hasInlineScores =
      ctx.competencyScores != null &&
      Object.keys(ctx.competencyScores).length > 0;
    const synthetic = isSyntheticScoreId(ctx.scoreId);

    /** Placeholder row (synthetic id / not started) with no numeric data — cannot synthesize. */
    if (synthetic && !hasInlineScores) {
      console.warn(
        "[synthesize] skip (no HTTP): synthetic / placeholder scoreId with empty competencyScores — cannot call backend without a real score row or inline scores.",
        { scoreId: ctx.scoreId, assessmentCenterId, participantId }
      );
      return content;
    }

    if (synthetic) {
      // Do not send placeholder id — backend DB lookup fails with NO_ASSESSOR_SCORES
      body.inlineCompetencyContext = true;
    } else {
      body.scoreId = ctx.scoreId;
    }

    if (ctx.status) {
      body.scoreStatus = ctx.status;
    }

    if (hasInlineScores) {
      body.competencyScores = ctx.competencyScores;
    }
    if (ctx.overallComments != null && ctx.overallComments !== "") {
      body.overallComments = ctx.overallComments;
    }
    if (ctx.individualComments != null) {
      body.individualComments = ctx.individualComments;
    }
  }

  try {
    const requestPayload = JSON.stringify(body);
    console.log("[synthesize] POST", SYNTHESIZE_URL);
    console.log("[synthesize] request body", requestPayload);

    const res = await fetch(SYNTHESIZE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: requestPayload,
    });

    const rawText = await res.text().catch(() => "");
    let json: { success?: boolean; data?: unknown; message?: string; code?: string };
    try {
      json = rawText ? (JSON.parse(rawText) as typeof json) : {};
    } catch {
      console.error("[synthesize] invalid JSON response", {
        httpStatus: res.status,
        rawText: rawText?.slice(0, 2000),
      });
      return content;
    }

    console.log("[synthesize] response", {
      httpStatus: res.status,
      ok: res.ok,
      success: json.success,
      code: json.code,
      message: json.message,
      hasData: json.data != null,
    });

    if (!res.ok) {
      console.error("[synthesize] HTTP error", {
        httpStatus: res.status,
        body: rawText?.slice(0, 2000),
      });
      return content;
    }

    if (!json.success || json.data == null) {
      console.error("[synthesize] API returned success=false", {
        code: json.code,
        message: json.message,
        fullResponse: json,
        hint:
          json.code === "NO_ASSESSOR_SCORES"
            ? "Backend found no SUBMITTED score for this assessmentCenterId + participantId (+ assessor). Compare request body with a working curl (same ids + real scoreId)."
            : undefined,
      });
      return content;
    }

    const parsed = parseSynthesizePayload(json.data);
    if (!parsed) return content;

    return {
      ...content,
      comments: {
        ...content.comments,
        strengths:
          needsStrengths && parsed.strengths.length > 0
            ? parsed.strengths
            : content.comments.strengths,
        developmentAreas:
          needsDev && parsed.developmentAreas.length > 0
            ? parsed.developmentAreas
            : content.comments.developmentAreas,
      },
    };
  } catch (e) {
    console.error("[synthesize] fetch threw", e);
    return content;
  }
}
