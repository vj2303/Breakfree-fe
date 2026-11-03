/**
 * Scoring a simulation run, and turning it into the two things the platform
 * needs: a plain-text transcript for the AI scorer, and a structured payload
 * the assessor's evidence panel can render.
 *
 * The simulation's own percentages are evidence, not a score. The score in the
 * report is the one an assessor assigns against the centre's rubric, exactly
 * as for a case study or a role play.
 */

import {
  COMPETENCIES,
  COMPETENCY_DESCRIPTIONS,
  MAX_QUALITY,
  NODES,
} from './fredJudgment';
import type { CompetencyCode } from './fredJudgment';

/** One decision as the participant made it. */
export interface RecordedDecision {
  nodeId: string;
  /** The situation heading, e.g. "The first conversation". */
  tag: string;
  situation: string;
  choice: string;
  quality: number;
  tags: CompetencyCode[];
}

export interface CompetencyResult {
  code: CompetencyCode;
  name: string;
  /** Null when no decision in this run exercised the competency. */
  percent: number | null;
  decisions: number;
}

export interface SimulationResult {
  /** Mean judgment quality as a percentage of the maximum. */
  overall: number;
  band: 'Strong' | 'Developing' | 'Needs attention';
  epilogue: { name: string; text: string };
  competencies: CompetencyResult[];
  strongest: CompetencyResult | null;
  weakest: CompetencyResult | null;
  decisions: RecordedDecision[];
}

/** What is stored on the submission for the assessor panel to render. */
export interface SimulationPayload {
  kind: 'judgment-simulation';
  simulationKey: string;
  title: string;
  overall: number;
  band: string;
  epilogue: { name: string; text: string };
  competencies: CompetencyResult[];
  decisions: RecordedDecision[];
  completedAt: string;
}

export const SIMULATION_PAYLOAD_KIND = 'judgment-simulation';

export function bandFor(percent: number): SimulationResult['band'] {
  if (percent >= 80) return 'Strong';
  if (percent >= 50) return 'Developing';
  return 'Needs attention';
}

const round = (value: number): number => Math.round(value);

export function scoreRun(
  decisions: RecordedDecision[],
  epilogues: Array<{ min: number; name: string; text: string }>
): SimulationResult {
  const overall = decisions.length
    ? (decisions.reduce((sum, d) => sum + d.quality, 0) / decisions.length / MAX_QUALITY) * 100
    : 0;

  const competencies = (Object.keys(COMPETENCIES) as CompetencyCode[]).map<CompetencyResult>(
    (code) => {
      const exercised = decisions.filter((d) => d.tags.includes(code));
      return {
        code,
        name: COMPETENCIES[code],
        // A competency no decision touched has no result — showing it as 0%
        // would read as "did this badly" rather than "never came up".
        percent: exercised.length
          ? round(
              (exercised.reduce((sum, d) => sum + d.quality, 0) / exercised.length / MAX_QUALITY) *
                100
            )
          : null,
        decisions: exercised.length,
      };
    }
  );

  const exercised = competencies.filter((c) => c.percent !== null);
  const ranked = [...exercised].sort((a, b) => (b.percent as number) - (a.percent as number));

  return {
    overall: round(overall),
    band: bandFor(overall),
    epilogue: epilogues.find((e) => overall >= e.min) ?? epilogues[epilogues.length - 1],
    competencies,
    strongest: ranked[0] ?? null,
    weakest: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    decisions,
  };
}

/** The node's situation text, for a transcript that stands on its own. */
export function situationFor(nodeId: string): string {
  const node = NODES[nodeId];
  return node && !('isBeat' in node && node.isBeat) ? node.text : '';
}

/**
 * The plain-text record of the run.
 *
 * This is what the AI scorer reads and what an assessor can check it against,
 * so it carries the situation, the option chosen and the options rejected —
 * a choice only means something next to the alternatives.
 */
export function buildTranscript(result: SimulationResult, title: string): string {
  const lines: string[] = [];

  lines.push(title);
  lines.push('');
  lines.push(
    `The participant worked through ${result.decisions.length} management decisions. For each one, the situation, the option they chose, and the options they did not choose are given below.`
  );
  lines.push('');

  result.decisions.forEach((decision, index) => {
    const node = NODES[decision.nodeId];
    const alternatives =
      node && !('isBeat' in node && node.isBeat)
        ? node.choices.filter((c) => c.label !== decision.choice).map((c) => c.label)
        : [];

    lines.push(`Decision ${index + 1} — ${decision.tag}`);
    lines.push(`Situation: ${decision.situation}`);
    lines.push(`Chose: ${decision.choice}`);
    if (alternatives.length > 0) {
      lines.push(`Did not choose: ${alternatives.join(' | ')}`);
    }
    lines.push(
      `Competencies demonstrated: ${decision.tags.map((t) => COMPETENCIES[t]).join(', ') || 'none'}`
    );
    lines.push('');
  });

  lines.push('Simulation’s own assessment (for reference, not a rubric score)');
  lines.push(`Overall judgment: ${result.overall}% (${result.band})`);
  result.competencies.forEach((competency) => {
    lines.push(
      competency.percent === null
        ? `- ${competency.name}: not exercised in this run`
        : `- ${competency.name}: ${competency.percent}% over ${competency.decisions} decision(s) — ${COMPETENCY_DESCRIPTIONS[competency.code]}`
    );
  });
  lines.push('');
  lines.push(`Narrative outcome: ${result.epilogue.name} — ${result.epilogue.text}`);

  return lines.join('\n');
}

export function buildPayload(
  result: SimulationResult,
  simulationKey: string,
  title: string
): SimulationPayload {
  return {
    kind: SIMULATION_PAYLOAD_KIND,
    simulationKey,
    title,
    overall: result.overall,
    band: result.band,
    epilogue: result.epilogue,
    competencies: result.competencies,
    decisions: result.decisions,
    completedAt: new Date().toISOString(),
  };
}

/** Reads a submission's `notes` back, or null when it is not a simulation run. */
export function parseSimulationPayload(notes?: string | null): SimulationPayload | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    return parsed?.kind === SIMULATION_PAYLOAD_KIND ? (parsed as SimulationPayload) : null;
  } catch {
    return null;
  }
}
