/**
 * Assessor observations captured while reviewing a submission.
 *
 * These live in component state only — nothing here is sent to or read from the API.
 * They exist so the assessor can jot timestamped notes against the evidence and map
 * them to the sub-competency they support while scoring.
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
