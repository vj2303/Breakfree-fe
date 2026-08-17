/** Shared shapes for the admin-side Participant Overview. */

export interface OverviewParticipant {
  id: string;
  userCode: string;
  name: string;
  email: string;
  designation: string;
  contactNo?: string;
  managerName: string;
}

export interface OverviewAssessmentCenter {
  id: string;
  name: string;
  displayName?: string;
}

/** One row of the Assessment Completion Status table. */
export interface CompletionRow {
  activityId: string;
  name: string;
  description: string;
  activityType: string;
  /** Minutes, when the activity carries a duration. */
  durationMinutes: number | null;
  /** Assessors who have scored this activity. */
  assessors: string[];
  isSubmitted: boolean;
  completedAt: string | null;
}

/** A competency as shown in the key and the scoring table. */
export interface OverviewCompetency {
  id: string;
  /** "K1", "K2", … — parsed from the name when present, otherwise positional. */
  code: string;
  /** Name without the K-code prefix. */
  label: string;
  /** Full name as stored. */
  fullName: string;
  subCompetencyNames: string[];
}

export interface OverviewActivity {
  activityId: string;
  name: string;
  description: string;
  activityType: string;
  competencyIds: string[];
}

export interface AssessorRecord {
  id: string;
  name: string;
  email: string;
  status: 'DRAFT' | 'SUBMITTED' | 'FINALIZED';
  /** activityId -> competencyId -> subCompetency -> score */
  activityCompetencyScores: Record<string, Record<string, Record<string, number>>>;
  /** activityId -> competencyId -> subCompetency -> scoreKey */
  activitySelectedScoreKeys: Record<string, Record<string, Record<string, string>>>;
  /** activityId -> competencyId -> subCompetency -> scoreKey -> comment */
  activitySubCompetencyComments: Record<
    string,
    Record<string, Record<string, Record<string, string>>>
  >;
  activityComments: Record<string, string>;
  overallComments: string;
}

/** One competency's point in the three progress charts. */
export interface ProgressPoint {
  code: string;
  competencyName: string;
  preReadiness: number | null;
  preApplication: number | null;
  postReadiness: number | null;
  postApplication: number | null;
  readinessDelta: number | null;
  applicationDelta: number | null;
}
