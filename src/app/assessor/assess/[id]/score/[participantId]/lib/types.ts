export interface ParticipantDetails {
  success: boolean;
  message: string;
  data: {
    assessor: {
      id: string;
      name: string;
      email: string;
      designation: string;
      accessLevel: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    };
    participant: {
      id: string;
      name: string;
      email: string;
      designation: string;
      managerName: string;
      createdAt: string;
      updatedAt: string;
    };
    assignments: Array<{
      assignmentId: string;
      assessmentCenter: {
        id: string;
        name: string;
        description: string;
        displayName: string;
        displayInstructions: string;
        competencyIds: string[];
        documentUrl?: string;
        reportTemplateName: string;
        reportTemplateType: string;
        createdBy: string;
        createdAt: string;
        updatedAt: string;
      };
      group: {
        id: string;
        name: string;
        admin: string;
        adminEmail: string;
        participantIds: string[];
        createdAt: string;
        updatedAt: string;
      };
      activities: Array<{
        activityId: string;
        activityType: string;
        displayOrder: number;
        displayName?: string | null;
        displayInstructions?: string | null;
        competency: {
          id: string;
          competencyName: string;
          subCompetencyNames: string[];
          createdAt: string;
          updatedAt: string;
        };
        activityDetail: {
          id: string;
          name: string;
          description: string;
          instructions: string;
          videoUrl?: string;
          interactiveActivityType?: string;
        };
        submission: unknown;
      }>;
      assessorScore: unknown;
      submissionCount: number;
      totalActivities: number;
      competencies: Array<{
        id: string;
        competencyName: string;
        subCompetencyNames: string[];
        createdAt: string;
        updatedAt: string;
      }>;
    }>;
  };
}

export interface Evaluation {
  metric: string;
  reasoning: string;
  score: string;
}

export interface EvaluationResponse {
  evaluations: Evaluation[];
  filename: string;
  overall_score: string;
  success: boolean;
  summary: {
    average_score: string;
    total_metrics: number;
  };
}

export interface AssessorScore {
  status?: 'DRAFT' | 'SUBMITTED' | 'FINALIZED';
  competencyScores?: Record<string, Record<string, number>>;
  overallComments?: string;
  activityComments?: Record<string, string>; // activityId -> comment
  /**
   * activityId -> competencyId -> subCompetency -> scoreKey -> comment
   * scoreKey matches rubric descriptors: `score1`, `score2`, … For numeric-only rows use `__numeric`.
   */
  activitySubCompetencyComments?: Record<string, Record<string, Record<string, Record<string, string>>>>;
  /**
   * competencyId -> subCompetency -> scoreKey -> comment (overall section, per assignment document)
   */
  assignmentSubCompetencyComments?: Record<string, Record<string, Record<string, string>>>;
  /**
   * competencyId -> average score across all activities for that competency
   */
  competencyAverages?: Record<string, number>;
  /**
   * activityId -> competencyId -> subCompetency -> selectedScoreKey
   * Stores which rubric level/tick mark was selected (e.g., "score1", "score2")
   */
  activitySelectedScoreKeys?: Record<string, Record<string, Record<string, string>>>;
  /**
   * competencyId -> subCompetency -> selectedScoreKey
   * Stores which rubric level/tick mark was selected for assignment-level scores
   */
  assignmentSelectedScoreKeys?: Record<string, Record<string, string>>;
}

export interface ActivityWithSubmissions {
  activityId: string;
  activityType: string;
  displayOrder: number;
  displayName?: string | null;
  displayInstructions?: string | null;
  competency?: {
    id: string;
    competencyName: string;
    subCompetencyNames: string[];
    createdAt: string;
    updatedAt: string;
  };
  activityDetail: {
    id: string;
    name: string;
    description: string;
    instructions: string;
    videoUrl?: string;
    interactiveActivityType?: string;
  };
  submission: unknown;
  allSubmissions?: Array<{
    id: string;
    parentSubmissionId?: string;
    textContent?: string;
    submissionType?: string;
    submissionStatus?: string;
    submittedAt?: string;
    createdAt?: string;
    notes?: string;
    fileUrl?: string;
    fileName?: string;
  }>;
}

/**
 * A competency as rendered by the scoring UI. `createdAt`/`updatedAt` are optional so both
 * assignment competencies and the assessment-centre competency map are assignable.
 */
export interface Competency {
  id: string;
  competencyName: string;
  subCompetencyNames: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type Assignment = ParticipantDetails['data']['assignments'][number];

/** One submission row as the evidence panel consumes it. */
export interface SubmissionRecord {
  id: string;
  parentSubmissionId?: string;
  textContent?: string;
  submissionType?: string;
  submissionStatus?: string;
  submittedAt?: string;
  createdAt?: string;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replies?: SubmissionRecord[];
}

export type ScoreLifecycleStatus = 'DRAFT' | 'SUBMITTED' | 'FINALIZED';

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

/** `activitySelectedScoreKeys[activityId]` — competencyId -> subCompetency -> scoreKey */
export type SelectedKeysByCompetency = Record<string, Record<string, string>>;

/** `activityCompetencyScores[activityId]` — competencyId -> subCompetency -> score */
export type ScoresByCompetency = Record<string, Record<string, number>>;

/** One row of the left activity rail, precomputed by the page. */
export interface ActivityRailItem {
  activityId: string;
  title: string;
  subtitle: string;
  activityType: string;
  interactiveActivityType?: string;
  scoredCompetencies: number;
  totalCompetencies: number;
  status: ProgressStatus;
}
