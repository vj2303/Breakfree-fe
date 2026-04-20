// Types for case study activity data

export interface ActivityData {
  activityId: string;
  activityType: 'CASE_STUDY' | 'INBOX_ACTIVITY';
  displayOrder: number;
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
    interactiveActivityType?: 'GD' | 'ROLEPLAY' | 'CASE_STUDY';
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    scenarios?: Scenario[];
    tasks?: Task[];
  };
  submission?: unknown;
  isSubmitted: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  readTime: number;
  exerciseTime: number;
  data: string;
  caseStudyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  readTime: number;
  exerciseTime: number;
  data: string;
  caseStudyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionData {
  textContent?: string;
  notes?: string;
  file?: File;
  submissionType: 'TEXT' | 'DOCUMENT' | 'VIDEO';
}
