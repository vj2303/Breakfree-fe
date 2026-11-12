/**
 * Assessor observations captured while reviewing a submission.
 *
 * Two things produce them: the assessor, jotting timestamped notes against the
 * evidence and mapping them to the sub-competency they support; and the AI
 * suggestion run, whose evidence quotes are already statements taken from the
 * submission and already mapped to a sub-competency.
 *
 * They are saved with the score and restored when the submission is reopened.
 */

export interface Observation {
  id: string;
  activityId: string;
  /** Playback position the note was captured at, in seconds. `null` for untimed evidence. */
  timeSec: number | null;
  text: string;
  /** Mapping to the rubric — `null` on both means the observation is unmapped. */
  competencyId: string | null;
  subCompetency: string | null;
  createdAt: number;
  /** Who produced it. AI ones are replaced wholesale by the next suggestion run. */
  source: 'assessor' | 'ai';
}

/** `activityId -> observations` */
export type ObservationsByActivity = Record<string, Observation[]>;

let observationSeq = 0;

export function createObservationId(): string {
  observationSeq += 1;
  return `obs-${Date.now().toString(36)}-${observationSeq}`;
}

/** `m:ss` / `h:mm:ss`, matching the marker labels under the player. */
export function formatClock(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** Marker colours, cycled by observation index so each pin on the timeline is distinguishable. */
const MARKER_COLORS = [
  { dot: 'bg-violet-600', ring: 'ring-violet-200', text: 'text-violet-700' },
  { dot: 'bg-amber-500', ring: 'ring-amber-200', text: 'text-amber-700' },
  { dot: 'bg-rose-500', ring: 'ring-rose-200', text: 'text-rose-700' },
  { dot: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700' },
  { dot: 'bg-sky-500', ring: 'ring-sky-200', text: 'text-sky-700' },
  { dot: 'bg-gray-500', ring: 'ring-gray-200', text: 'text-gray-700' },
] as const;

export function markerColor(index: number) {
  return MARKER_COLORS[index % MARKER_COLORS.length];
}

export function isMapped(observation: Observation): boolean {
  return Boolean(observation.competencyId && observation.subCompetency);
}

export interface ObservationSummary {
  total: number;
  mapped: number;
  unmapped: number;
}

export function summarizeObservations(observations: Observation[]): ObservationSummary {
  const mapped = observations.filter(isMapped).length;
  return { total: observations.length, mapped, unmapped: observations.length - mapped };
}

/** Observations mapped to one sub-competency, oldest first — the "Relevant observations" list. */
export function observationsForSubCompetency(
  observations: Observation[],
  competencyId: string,
  subCompetency: string
): Observation[] {
  return observations.filter(
    (o) => o.competencyId === competencyId && o.subCompetency === subCompetency
  );
}

/** Sorted for display: timed notes in playback order, untimed ones after, by capture time. */
export function sortObservations(observations: Observation[]): Observation[] {
  return [...observations].sort((a, b) => {
    if (a.timeSec === null && b.timeSec === null) return a.createdAt - b.createdAt;
    if (a.timeSec === null) return 1;
    if (b.timeSec === null) return -1;
    if (a.timeSec === b.timeSec) return a.createdAt - b.createdAt;
    return a.timeSec - b.timeSec;
  });
}

/**
 * Turns AI suggestions into observations.
 *
 * A suggestion already carries what an observation is — a statement taken from
 * the submission, tied to one sub-competency — so the evidence the model quoted
 * is surfaced in "Relevant observations" rather than being locked inside the
 * suggestion box. Nothing is invented: a suggestion with no quote produces no
 * observation.
 *
 * `existing` is preserved. Re-running suggestions replaces only the
 * observations a previous run produced, so an assessor's own notes and their
 * edits to them are never overwritten.
 */
export function observationsFromSuggestions(
  activityId: string,
  suggestions: Array<{
    competencyId: string;
    subCompetency: string;
    evidenceQuote: string | null;
    evidenceLocation: string | null;
  }>,
  existing: Observation[]
): Observation[] {
  const manual = existing.filter((o) => o.source !== 'ai');

  const fromAi = suggestions
    .filter((s) => s.evidenceQuote && s.evidenceQuote.trim())
    .map<Observation>((s) => ({
      id: createObservationId(),
      activityId,
      timeSec: null,
      text: s.evidenceLocation?.trim()
        ? `${s.evidenceQuote!.trim()} — ${s.evidenceLocation.trim()}`
        : s.evidenceQuote!.trim(),
      competencyId: s.competencyId,
      subCompetency: s.subCompetency,
      createdAt: Date.now(),
      source: 'ai',
    }));

  // An assessor who already wrote the same sentence should not see it twice.
  const manualText = new Set(manual.map((o) => o.text.trim().toLowerCase()));
  return [...manual, ...fromAi.filter((o) => !manualText.has(o.text.trim().toLowerCase()))];
}

/** Rehydrates observations saved with a score, discarding anything malformed. */
export function parseStoredObservations(raw: unknown): ObservationsByActivity {
  if (!raw || typeof raw !== 'object') return {};
  const out: ObservationsByActivity = {};

  Object.entries(raw as Record<string, unknown>).forEach(([activityId, list]) => {
    if (!Array.isArray(list)) return;
    const parsed = list
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .filter((item) => typeof item.text === 'string' && item.text.trim().length > 0)
      .map<Observation>((item) => ({
        id: typeof item.id === 'string' && item.id ? item.id : createObservationId(),
        activityId,
        timeSec: typeof item.timeSec === 'number' && Number.isFinite(item.timeSec) ? item.timeSec : null,
        text: String(item.text),
        competencyId: typeof item.competencyId === 'string' ? item.competencyId : null,
        subCompetency: typeof item.subCompetency === 'string' ? item.subCompetency : null,
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
        source: item.source === 'ai' ? 'ai' : 'assessor',
      }));
    if (parsed.length > 0) out[activityId] = parsed;
  });

  return out;
}
