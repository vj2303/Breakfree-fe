// types/assessment.ts
import type { InteractionActivityType } from '@/lib/activityTaxonomy';

/** Interaction sub-types. Re-exported from the taxonomy so there is one list. */
export type InteractiveActivityType = InteractionActivityType;

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  createdOn: string;
  allottedTo: number;
  attemptedBy: number;
  interactiveActivityType?: InteractiveActivityType;
}

export type AssessmentType = 'case-study' | 'inbox-activity';

export interface Scenario {
id: string;
title: string;
readTime: number;
exerciseTime: number;
data?: string;
}

export interface Task {
id: string;
title: string;
readTime: number;
exerciseTime: number;
data?: string;
}

export interface CaseStudy extends Assessment {
name: string;
description?: string;
instructions?: string;
videoUrl?: string;
createdAt: string;
scenarios?: Scenario[];
tasks?: Task[];
interactiveActivityType?: InteractiveActivityType;
}