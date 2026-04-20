import * as React from 'react';

export interface CompetencyData {
  id: string;
  name: string;
}

export interface Activity {
  id: string;
  name: string;
  type: string;
  activityType: string;
  activityContent: string;
  displayName: string;
  displayInstructions: string;
}

// Updated Assignment interface to support multiple assessors per activity
export interface ActivityAssignment {
  activityId: string;
  assessorIds: string[]; // Multiple assessors per activity
}

export interface AssignmentParticipant {
  participantId: string;
  activities: ActivityAssignment[]; // Array of activity assignments with assessors
}

export interface GroupAssignment {
  groupId: string;
  participants: AssignmentParticipant[];
}

export interface CompetencyDescriptor {
  [scoreKey: string]: string; // Dynamic scores: { score1: '...', score2: '...', score3: '...', score4: '...', ... }
}

export interface Descriptors {
  [activityId: string]: {
    [competencyId: string]: {
      [subCompetency: string]: CompetencyDescriptor;
    };
  };
}

export interface FormData {
  name: string;
  description: string;
  displayName: string;
  displayInstructions: string;
  competencyIds: string[];
  selectedCompetenciesData: CompetencyData[];
  reportTemplateName: string;
  reportTemplateType: string;
  activities: Activity[];
  assignments: GroupAssignment[]; // Updated to use GroupAssignment
  document: File | null;
  // When editing, holds the previously uploaded document URL (if any)
  existingDocumentUrl?: string | null;
  descriptors?: Descriptors; // Descriptors for competencies
  matrix?: boolean[][]; // Matrix for Subject-Exercise mapping: rows = competencies, cols = activities
  competencyLibraryList?: Array<{ id: string; name?: string; subCompetencyNames?: string[] }>; // Full competency library data
}

export interface AssessmentFormContextType {
  formData: FormData;
  updateFormData: (field: string, value: unknown) => void;
  isLoading?: boolean;
}

export const AssessmentFormContext = React.createContext<AssessmentFormContextType | null>(null);
export const useAssessmentForm = () => {
  const context = React.useContext(AssessmentFormContext);
  if (!context) {
    throw new Error('useAssessmentForm must be used within an AssessmentFormProvider');
  }
  return context;
}; 