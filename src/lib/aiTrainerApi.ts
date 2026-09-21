// aiTrainerApi.ts — AI for Trainers (atom pipeline) backend calls.
import { API_BASE_URL_WITH_API } from './apiConfig';

const BASE_URL = `${API_BASE_URL_WITH_API}/ai-trainer`;

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  let result: { success?: boolean; message?: string; data?: T } = {};
  try {
    result = await response.json();
  } catch {
    // Non-JSON error body (e.g. a proxy error page) — fall through to the status message.
  }
  if (!response.ok || !result.success) {
    if (response.status === 401) throw new Error('Your session has expired — log in again.');
    throw new Error(result.message || `Request failed (${response.status})`);
  }
  return result.data as T;
}

export const aiTrainerApi = {
  async complete(token: string, system: string, messages: ChatTurn[], maxTokens: number): Promise<string> {
    const data = await request<{ text: string }>(token, '/complete', {
      method: 'POST',
      body: JSON.stringify({ system, messages, maxTokens }),
    });
    return data.text;
  },

  async loadWorkspace(token: string): Promise<Record<string, unknown> | null> {
    const data = await request<{ state: Record<string, unknown> | null }>(token, '/workspace');
    return data.state;
  },

  async saveWorkspace(token: string, state: Record<string, unknown>): Promise<void> {
    await request(token, '/workspace', { method: 'PUT', body: JSON.stringify({ state }) });
  },
};
