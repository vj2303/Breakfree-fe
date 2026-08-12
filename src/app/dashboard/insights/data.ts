/**
 * Placeholder content for the Talent & Capability Insights screen.
 *
 * THIS IS A UI-ONLY SCREEN. Every number below is static and matches the approved mockup —
 * nothing here is fetched, and no API or schema was changed to build it. When the aggregate
 * endpoints exist, replace the exports in this file and the components stay as they are.
 *
 * Blocked on real data (see the review notes):
 *  - company / department / level / region do not exist on the participant model yet, so the
 *    filter bar, the department grouping and the level distribution have nothing to read;
 *  - there is no period bucketing, so every "vs previous period" delta is placeholder;
 *  - the four KPI tiles are not computed anywhere and need agreed definitions and a 0-100 scale.
 */

export type Trend = 'up' | 'down';

export interface KpiTileData {
  id: string;
  label: string;
  value: string;
  unit?: string;
  delta: string;
  trend: Trend;
  /** Normalised 0-1 points for the tile sparkline. */
  spark: number[];
}

export const KPI_TILES: KpiTileData[] = [
  {
    id: 'overall',
    label: 'Overall Capability Score',
    value: '76',
    unit: '/100',
    delta: '4.2',
    trend: 'up',
    spark: [0.35, 0.3, 0.45, 0.4, 0.55, 0.5, 0.68, 0.72, 0.65, 0.85],
  },
  {
    id: 'readiness',
    label: 'Progression Readiness',
    value: '68',
    unit: '%',
    delta: '5.6',
    trend: 'up',
    spark: [0.28, 0.42, 0.36, 0.5, 0.46, 0.62, 0.58, 0.7, 0.66, 0.82],
  },
  {
    id: 'gaps',
    label: 'Key Capability Gaps',
    value: '3',
    delta: '1',
    trend: 'down',
    spark: [0.8, 0.72, 0.78, 0.6, 0.65, 0.5, 0.55, 0.42, 0.38, 0.3],
  },
  {
    id: 'hipo',
    label: 'High Potential Talent',
    value: '24',
    unit: '%',
    delta: '3.4',
    trend: 'up',
    spark: [0.3, 0.38, 0.34, 0.48, 0.52, 0.46, 0.6, 0.64, 0.72, 0.8],
  },
];

export interface DepartmentBubble {
  id: string;
  name: string;
  participants: number;
  /** 0-1 across the Application (Execution) axis. */
  application: number;
  /** 0-1 up the Readiness axis. */
  readiness: number;
}

export const DEPARTMENT_BUBBLES: DepartmentBubble[] = [
  { id: 'sales', name: 'Sales & Marketing', participants: 28, application: 0.72, readiness: 0.7 },
  { id: 'tech', name: 'Technology', participants: 18, application: 0.6, readiness: 0.34 },
  { id: 'ops', name: 'Operations', participants: 15, application: 0.28, readiness: 0.74 },
  { id: 'corp', name: 'Corporate Functions', participants: 12, application: 0.45, readiness: 0.56 },
  { id: 'support', name: 'Customer Support', participants: 8, application: 0.22, readiness: 0.36 },
];

export interface LevelDistribution {
  level: string;
  high: number;
  medium: number;
  low: number;
}

export const LEVEL_DISTRIBUTION: LevelDistribution[] = [
  { level: 'Executive', high: 52, medium: 35, low: 13 },
  { level: 'Senior Management', high: 38, medium: 45, low: 17 },
  { level: 'Middle Management', high: 28, medium: 50, low: 22 },
  { level: 'Individual Contributor', high: 20, medium: 48, low: 32 },
];

export interface CapabilityGap {
  capability: string;
  averageScore: number;
  delta: number;
  trend: Trend;
}

export const CAPABILITY_GAPS: CapabilityGap[] = [
  { capability: 'Strategic Thinking', averageScore: 58, delta: 6, trend: 'down' },
  { capability: 'Influencing & Persuasion', averageScore: 62, delta: 4, trend: 'down' },
  { capability: 'Data & Analytical Skills', averageScore: 63, delta: 3, trend: 'down' },
];

export type ScoreTone = 'good' | 'watch';

export interface CohortRow {
  id: string;
  cohort: string;
  department: string;
  level: string;
  participants: number;
  period: string;
  overallScore: number;
  overallTone: ScoreTone;
  progressionReadiness: number;
  readinessTone: ScoreTone;
  highPotential: number;
  highPotentialTone: ScoreTone;
}

export const RECENT_COHORTS: CohortRow[] = [
  {
    id: 'leadership-excellence',
    cohort: 'Leadership Excellence Program',
    department: 'Corporate Functions',
    level: 'Senior Management',
    participants: 28,
    period: 'Apr – May 2025',
    overallScore: 82,
    overallTone: 'good',
    progressionReadiness: 72,
    readinessTone: 'good',
    highPotential: 29,
    highPotentialTone: 'good',
  },
  {
    id: 'emerging-leaders-3',
    cohort: 'Emerging Leaders Cohort 3',
    department: 'Sales & Marketing',
    level: 'Middle Management',
    participants: 35,
    period: 'Mar – Apr 2025',
    overallScore: 78,
    overallTone: 'good',
    progressionReadiness: 68,
    readinessTone: 'good',
    highPotential: 26,
    highPotentialTone: 'good',
  },
  {
    id: 'high-potential',
    cohort: 'High Potential Program',
    department: 'Technology',
    level: 'Individual Contributor',
    participants: 42,
    period: 'Feb – Mar 2025',
    overallScore: 74,
    overallTone: 'watch',
    progressionReadiness: 62,
    readinessTone: 'watch',
    highPotential: 22,
    highPotentialTone: 'watch',
  },
  {
    id: 'operations-leadership',
    cohort: 'Operations Leadership Cohort',
    department: 'Operations',
    level: 'Senior Management',
    participants: 31,
    period: 'Jan – Feb 2025',
    overallScore: 75,
    overallTone: 'good',
    progressionReadiness: 66,
    readinessTone: 'good',
    highPotential: 23,
    highPotentialTone: 'good',
  },
];

export interface FilterDefinition {
  id: string;
  label: string;
  options: string[];
}

/** Static options only — none of these dimensions exist on the participant model yet. */
export const FILTERS: FilterDefinition[] = [
  { id: 'company', label: 'Company', options: ['All Companies'] },
  { id: 'department', label: 'Department', options: ['All Departments'] },
  { id: 'level', label: 'Level', options: ['All Levels'] },
  { id: 'cohort', label: 'Cohort / Group', options: ['All Cohorts'] },
  { id: 'region', label: 'Region', options: ['All Regions'] },
];

export const ASSESSMENT_PERIOD = 'Jan 2024 – May 2025';
