// Types for inbox activity data

export interface InboxActivityData {
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
    scenarios?: InboxScenario[];
    characters?: Character[];
    organizationCharts?: OrganizationChartItem[];
    contents?: EmailContent[];
  };
  submission?: unknown;
  isSubmitted: boolean;
}

export interface InboxScenario {
  id: string;
  title: string;
  readTime: number;
  exerciseTime: number;
  data: string;
  inboxActivityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  name: string;
  email: string;
  designation: string;
  inboxActivityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationChartItem {
  id: string;
  name: string;
  email: string;
  designation: string;
  parentId: string | null;
  inboxActivityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailContent {
  id: string;
  to: string[];
  from: string;
  cc: string[];
  bcc: string[];
  subject: string;
  date: string;
  emailContent: string;
  inboxActivityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionData {
  textContent?: string;
  notes?: string;
  file?: File;
  submissionType: 'TEXT' | 'DOCUMENT' | 'VIDEO';
}
