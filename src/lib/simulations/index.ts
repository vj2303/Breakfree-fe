/**
 * The simulations an assessment centre can run.
 *
 * An interaction activity of type Simulation names one of these by key. A new
 * simulation is added by writing its graph and registering it here; nothing
 * else in the participant, assessor or reporting path needs to change.
 */

import {
  EPILOGUES,
  NODES,
  SIMULATION_BRIEF,
  SIMULATION_NOTE,
  SIMULATION_TITLE,
  START_NODE,
} from './fredJudgment';
import type { SimulationNode } from './fredJudgment';

export interface SimulationDefinition {
  key: string;
  /** What an admin picks from the dropdown. */
  name: string;
  /** One line about what it assesses. */
  summary: string;
  title: string;
  brief: string[];
  note: string;
  startNode: string;
  nodes: Record<string, SimulationNode>;
  epilogues: Array<{ min: number; name: string; text: string }>;
}

export const FRED_JUDGMENT: SimulationDefinition = {
  key: 'fred-judgment',
  name: 'FRED — Managerial Judgment',
  summary:
    'A manager handles six weeks of Monday lateness, an unspoken career grievance and a team that has noticed.',
  title: SIMULATION_TITLE,
  brief: SIMULATION_BRIEF,
  note: SIMULATION_NOTE,
  startNode: START_NODE,
  nodes: NODES,
  epilogues: EPILOGUES,
};

export const SIMULATIONS: SimulationDefinition[] = [FRED_JUDGMENT];

/** The simulation an activity runs. Falls back to the only one we ship. */
export function simulationFor(key?: string | null): SimulationDefinition {
  return SIMULATIONS.find((s) => s.key === key) ?? FRED_JUDGMENT;
}

export type { SimulationNode };
