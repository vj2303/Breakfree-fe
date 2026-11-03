"use client";

/**
 * The simulation as the participant plays it.
 *
 * Ported from the standalone prototype: the dark styling is kept, because the
 * simulation is meant to feel like a separate instrument rather than another
 * form in the dashboard. Nothing about judgment quality or competencies is
 * shown while the run is in progress — the participant sees only the
 * situation and the options, exactly as the prototype intended.
 *
 * The debrief is deliberately *not* shown here: the participant's run goes to
 * an assessor, and showing them their own percentages first would turn the
 * exercise into a quiz with an answer key. `onComplete` hands the run to the
 * page, which submits it.
 */

import React, { useMemo, useState } from 'react';

import type { SimulationDefinition } from '@/lib/simulations';
import type { DecisionNode, SimulationNode } from '@/lib/simulations/fredJudgment';
import { scoreRun } from '@/lib/simulations/result';
import type { RecordedDecision, SimulationResult } from '@/lib/simulations/result';

const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E'];

const isBeat = (node: SimulationNode): node is Extract<SimulationNode, { isBeat: true }> =>
  'isBeat' in node && node.isBeat === true;

export interface SimulationPlayerProps {
  simulation: SimulationDefinition;
  /** Called once, when the participant reaches the end of the run. */
  onComplete: (result: SimulationResult) => void;
  /** A run already completed in this sitting, so the player can stay closed. */
  completed?: boolean;
}

export default function SimulationPlayer({
  simulation,
  onComplete,
  completed = false,
}: SimulationPlayerProps) {
  const [started, setStarted] = useState(false);
  const [currentId, setCurrentId] = useState(simulation.startNode);
  const [decisions, setDecisions] = useState<RecordedDecision[]>([]);
  const [finished, setFinished] = useState(completed);

  const node: SimulationNode | undefined = simulation.nodes[currentId];
  const decisionCount = decisions.length + 1;

  const finish = (allDecisions: RecordedDecision[]) => {
    setFinished(true);
    onComplete(scoreRun(allDecisions, simulation.epilogues));
  };

  const choose = (decisionNode: DecisionNode, choiceIndex: number) => {
    const choice = decisionNode.choices[choiceIndex];
    const recorded: RecordedDecision = {
      nodeId: currentId,
      tag: decisionNode.tag,
      situation: decisionNode.text,
      choice: choice.label,
      quality: choice.quality,
      tags: choice.tags,
    };
    const next = [...decisions, recorded];
    setDecisions(next);

    if (!simulation.nodes[choice.next]) {
      finish(next);
      return;
    }
    setCurrentId(choice.next);
  };

  const continueFromBeat = () => {
    const current = simulation.nodes[currentId];
    if (!current || !isBeat(current)) return;
    if (!simulation.nodes[current.next]) {
      finish(decisions);
      return;
    }
    setCurrentId(current.next);
  };

  const progressTag = useMemo(() => (node ? node.tag : ''), [node]);

  return (
    <div className="sim-root">
      <style>{SIMULATION_CSS}</style>

      <div className="sim-app">
        {started && !finished && (
          <div className="sim-statusbar">
            <span className="sim-progress-label">
              {node && isBeat(node) ? 'Meanwhile' : `Decision ${decisionCount}`}
            </span>
            <span className="sim-progress-tag">{progressTag}</span>
          </div>
        )}

        {/* Setup */}
        {!started && !finished && (
          <div className="sim-screen">
            <div className="sim-kicker">Managerial judgment simulation</div>
            <h1 className="sim-headline">{simulation.title}</h1>
            <div className="sim-brief">
              {simulation.brief.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
            <p className="sim-note">{simulation.note}</p>
            <button type="button" className="sim-btn" onClick={() => setStarted(true)}>
              Begin simulation
            </button>
          </div>
        )}

        {/* A decision */}
        {started && !finished && node && !isBeat(node) && (
          <div className="sim-screen">
            <div className="sim-situation">
              <div className="sim-situation-tag">{node.tag}</div>
              <p>{node.text}</p>
            </div>
            <div className="sim-choices">
              {node.choices.map((choice, index) => (
                <button
                  type="button"
                  key={choice.label}
                  className="sim-choice"
                  onClick={() => choose(node, index)}
                >
                  <span className="sim-choice-badge">{CHOICE_LETTERS[index] ?? index + 1}</span>
                  <span className="sim-choice-label">{choice.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* A narrative beat */}
        {started && !finished && node && isBeat(node) && (
          <div className="sim-screen">
            <div className="sim-beat">
              <div className="sim-beat-tag">{node.tag}</div>
              <span>{node.text}</span>
            </div>
            <button type="button" className="sim-btn" onClick={continueFromBeat}>
              Continue
            </button>
          </div>
        )}

        {/* Done — the assessment itself is not shown to the participant. */}
        {finished && (
          <div className="sim-screen">
            <div className="sim-kicker">Simulation complete</div>
            <h1 className="sim-headline">Your responses have been recorded</h1>
            <div className="sim-brief">
              <p>
                Every decision you made has been saved and will be reviewed by an assessor
                alongside the rest of your assessment centre.
              </p>
              <p>
                There is no score to see here. How your decisions were judged forms part of your
                assessment report.
              </p>
            </div>
            <p className="sim-note">
              Submit the activity below to send your run to your assessor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* Scoped to .sim-root so the dashboard's Tailwind reset cannot reach in, and
   so these rules cannot leak out into the rest of the participant app. */
const SIMULATION_CSS = `
.sim-root {
  --sim-bg: #12151c;
  --sim-panel: #1b2029;
  --sim-panel-alt: #232936;
  --sim-border: #313848;
  --sim-text: #e7e9f0;
  --sim-text-dim: #8d93a6;
  --sim-amber: #e8a33d;
  --sim-teal: #4fa88d;
  background: var(--sim-bg);
  color: var(--sim-text);
  border-radius: 10px;
  overflow: hidden;
}
.sim-root * { box-sizing: border-box; }
.sim-app {
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 28px 24px 36px;
  font-family: 'IBM Plex Sans', system-ui, -apple-system, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  min-height: 520px;
}
.sim-statusbar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--sim-border);
  margin-bottom: 24px;
}
.sim-progress-label { font-size: 13px; letter-spacing: 0.03em; color: var(--sim-text-dim); font-weight: 600; }
.sim-progress-tag { font-size: 13px; color: var(--sim-amber); font-weight: 500; }
.sim-screen { display: flex; flex-direction: column; flex: 1; }
.sim-kicker { font-size: 13px; color: var(--sim-amber); font-weight: 500; margin-bottom: 10px; }
.sim-headline {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  margin: 0 0 18px;
  color: var(--sim-text);
}
.sim-brief {
  background: var(--sim-panel);
  border: 1px solid var(--sim-border);
  border-left: 3px solid var(--sim-amber);
  padding: 20px 22px;
  margin-bottom: 20px;
}
.sim-brief p { margin: 0 0 12px; line-height: 1.65; }
.sim-brief p:last-child { margin-bottom: 0; }
.sim-note { font-size: 13px; color: var(--sim-text-dim); line-height: 1.6; margin: 0 0 24px; }
.sim-btn {
  align-self: flex-start;
  padding: 13px 26px;
  background: var(--sim-amber);
  color: #1a1305;
  border: none;
  border-radius: 2px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease;
}
.sim-btn:hover { filter: brightness(1.08); }
.sim-situation {
  background: var(--sim-panel);
  border: 1px solid var(--sim-border);
  padding: 22px 24px;
  margin-bottom: 20px;
}
.sim-situation-tag { font-size: 12px; color: var(--sim-text-dim); margin-bottom: 10px; letter-spacing: 0.03em; }
.sim-situation p { line-height: 1.7; margin: 0; font-size: 15.5px; }
.sim-choices { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (max-width: 760px) { .sim-choices { grid-template-columns: 1fr; } }
.sim-choice {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  background: var(--sim-panel);
  border: 1px solid var(--sim-border);
  color: var(--sim-text);
  padding: 18px;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
}
.sim-choice:hover { border-color: var(--sim-amber); background: var(--sim-panel-alt); transform: translateY(-2px); }
.sim-choice-badge {
  width: 26px;
  height: 26px;
  line-height: 24px;
  text-align: center;
  background: var(--sim-panel-alt);
  border: 1px solid var(--sim-border);
  font-size: 13px;
  color: var(--sim-amber);
}
.sim-choice-label { font-size: 14.5px; line-height: 1.55; }
.sim-beat {
  background: var(--sim-panel);
  border: 1px solid var(--sim-border);
  border-left: 3px solid var(--sim-teal);
  padding: 24px;
  margin-bottom: 24px;
  font-size: 15.5px;
  line-height: 1.8;
  font-style: italic;
}
.sim-beat-tag { font-size: 12px; color: var(--sim-text-dim); margin-bottom: 10px; letter-spacing: 0.03em; font-style: normal; }
`;
