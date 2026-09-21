export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export interface AtomPipelineUser {
  name: string;
  email: string;
}

export interface AtomPipelineOptions {
  /** Run one model completion through the backend and return its text. */
  complete: (system: string, messages: ChatTurn[], maxTokens: number) => Promise<string>;
  /** Previously saved workspace, or null for a fresh start. */
  initialState: Record<string, unknown> | null;
  /** Persist the workspace. Rejecting marks the save as failed and retries. */
  saveState: (state: Record<string, unknown>) => Promise<void>;
  /** False when the saved workspace couldn't be loaded — never overwrite it then. */
  saveEnabled: boolean;
  getUser: () => AtomPipelineUser;
  onHome: () => void;
  onLogout: () => void;
}

export interface AtomPipelineHandle {
  refresh: () => void;
  destroy: () => void;
}

export function mountAtomPipeline(mountEl: HTMLElement, opts: AtomPipelineOptions): AtomPipelineHandle;
