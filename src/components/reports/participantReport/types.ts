/** The participant report document's data, as the backend assembles it. */

export type Band = 'Needs Focus' | 'Developing' | 'Proficient' | 'Strong' | 'Outstanding';
export type Alignment = 'Aligned' | 'Needs Grounding' | 'Needs Practice';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExerciseView {
  activityId: string;
  code: string;
  name: string;
  blurb: string | null;
}

export interface EvidenceHighlight {
  score: number;
  exerciseName: string;
  descriptor: string;
}

export interface SubCompetencyView {
  key: string;
  name: string;
  description: string | null;
  score: number | null;
  band: Band | null;
  tag: 'strength' | 'development' | null;
  perExercise: Record<string, number | null>;
  highest: EvidenceHighlight | null;
  lowest: EvidenceHighlight | null;
}

export interface CompetencyView {
  competencyId: string;
  name: string;
  description: string | null;
  application: number | null;
  band: Band | null;
  readiness: number | null;
  alignment: Alignment | null;
  subCompetencies: SubCompetencyView[];
}

export interface HighlightCard {
  subCompetency: string;
  competencyName: string;
  score: number | null;
  priority: Priority;
}

export interface StrengthCopy {
  subCompetency: string;
  headline: string;
  observed: string;
  howToUse: string;
}

export interface DevelopmentCopy {
  subCompetency: string;
  headline: string;
  observed: string;
  nextLevel: string;
  priority: Priority;
}

export interface CompetencyCopy {
  competencyId: string;
  strengths: StrengthCopy[];
  developments: DevelopmentCopy[];
  evidenceThin: boolean;
}

/** Which sections to render — mirrors the saved Report Structure. */
export interface ReportStructureFlags {
  reportName: string;
  cover: { reportName?: boolean; candidateName?: boolean; date?: boolean } | null;
  introduction: boolean;
  analysis: { detailObservation?: boolean; overallCompetencyRating?: boolean } | null;
  readinessVsApplication: boolean;
  comments: { areasOfStrength?: boolean; areasOfDevelopment?: boolean } | null;
  overallRatings: {
    interpretingScoreTable?: boolean;
    competenciesScoreMatrix?: boolean;
    chartType?: string;
  } | null;
  recommendation: boolean;
}

export interface ReportView {
  structure: ReportStructureFlags | null;
  meta: { assessmentDate: string | null; reportDate: string };
  exercises: ExerciseView[];
  competencies: CompetencyView[];
  keyStrengths: HighlightCard[];
  developmentAreas: HighlightCard[];
  overallSummary: string;
  matrixPattern: string;
  subCompetencyOneLiners: Record<string, string>;
  competencyCopy: CompetencyCopy[];
}

export interface ReportParticipant {
  name: string;
  designation?: string | null;
  department?: string | null;
  division?: string | null;
  location?: string | null;
  batchNo?: string | null;
  managerName?: string | null;
}
