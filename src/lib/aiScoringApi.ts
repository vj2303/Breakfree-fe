// aiScoringApi.ts — AI-assisted scoring suggestions for the assessor screen.
// The AI proposes a BARS level per sub-competency; the assessor decides.
import { API_BASE_URL_WITH_API } from './apiConfig';

const BASE_URL = `${API_BASE_URL_WITH_API}/ai-scoring`;

export interface AiSuggestion {
  competencyId: string;
  subCompetency: string;
  suggestedScoreKey: string;
  confidence: number | null;
  evidenceQuote: string | null;
  evidenceLocation: string | null;
  reasoning: string | null;
  /** False when the quote could not be found in the submission text. */
  quoteVerified: boolean;
  acceptedScoreKey: string | null;
  createdAt: string;
}

export interface SuggestResult {
  suggestions: AiSuggestion[];
  warnings: string[];
  meta: { charCount: number; sections: number; provider: string | null; promptVersion: string };
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  let result: { success?: boolean; message?: string; data?: T } = {};
  try {
    result = await response.json();
  } catch {
    // Non-JSON body — fall through to the status-based message.
  }
  if (!response.ok || !result.success) {
    if (response.status === 401) throw new Error('Your session has expired — log in again.');
    throw new Error(result.message || `Request failed (${response.status})`);
  }
  return result.data as T;
}

export const aiScoringApi = {
  /** Runs the model over this activity's submission. Takes 15–30s. */
  suggest(
    token: string,
    body: { participantId: string; assessmentCenterId: string; activityId: string }
  ): Promise<SuggestResult> {
    return request<SuggestResult>(token, '/suggest', { method: 'POST', body: JSON.stringify(body) });
  },

  /** Previously generated suggestions, so a reload does not re-run the model. */
  async list(token: string, participantId: string, activityId: string): Promise<AiSuggestion[]> {
    const params = new URLSearchParams({ participantId, activityId });
    const data = await request<{ suggestions: AiSuggestion[] }>(token, `/suggestions?${params}`);
    return data.suggestions;
  },

  /** Records what the assessor actually chose, for AI-vs-assessor agreement. */
  recordOutcome(
    token: string,
    body: {
      participantId: string;
      activityId: string;
      selectedScoreKeys: Record<string, Record<string, string>>;
    }
  ): Promise<{ updated: number }> {
    return request<{ updated: number }>(token, '/outcome', { method: 'PATCH', body: JSON.stringify(body) });
  },
};
