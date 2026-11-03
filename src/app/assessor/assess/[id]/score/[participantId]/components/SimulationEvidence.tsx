import React from 'react';

import type { SimulationPayload } from '@/lib/simulations/result';

/**
 * A simulation run, as the assessor reads it.
 *
 * The decision-by-decision path is the evidence: the situation the
 * participant faced and the option they picked. The simulation's own
 * percentages are shown underneath, clearly marked as the instrument's
 * reading rather than a rubric score — the assessor still assigns the
 * competency scores that reach the report.
 */

function qualityTone(quality: number): string {
  if (quality >= 3) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (quality === 2) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (quality === 1) return 'border-amber-200 bg-amber-50 text-amber-600';
  return 'border-red-200 bg-red-50 text-red-700';
}

function bandTone(band: string): string {
  if (band === 'Strong') return 'text-emerald-700';
  if (band === 'Developing') return 'text-amber-700';
  return 'text-red-700';
}

export default function SimulationEvidence({ payload }: { payload: SimulationPayload }) {
  const exercised = payload.competencies.filter((c) => c.percent !== null);

  return (
    <div className="bg-white p-3 text-xs text-gray-800">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 pb-2">
        <span className="text-sm font-semibold text-black">{payload.title}</span>
        <span className="text-gray-500">
          {payload.decisions.length} decisions ·{' '}
          <span className={`font-semibold ${bandTone(payload.band)}`}>
            {payload.overall}% {payload.band}
          </span>
        </span>
      </div>

      <ol className="space-y-2.5">
        {payload.decisions.map((decision, index) => (
          <li key={`${decision.nodeId}-${index}`} className="rounded border border-gray-200 p-2.5">
            <div className="mb-1 flex items-start justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wide text-gray-400">
                {index + 1}. {decision.tag}
              </span>
              <span
                className={`flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${qualityTone(
                  decision.quality
                )}`}
              >
                Quality {decision.quality}/3
              </span>
            </div>
            <p className="mb-1.5 text-[11px] leading-relaxed text-gray-500">{decision.situation}</p>
            <p className="font-medium text-black">{decision.choice}</p>
          </li>
        ))}
      </ol>

      <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-2.5">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Simulation&rsquo;s own reading — reference only
        </div>
        <div className="grid gap-1 sm:grid-cols-2">
          {exercised.map((competency) => (
            <div key={competency.code} className="flex items-baseline justify-between gap-2">
              <span className="text-gray-700">{competency.name}</span>
              <span className="tabular-nums font-semibold text-gray-900">
                {competency.percent}%
                <span className="ml-1 font-normal text-gray-400">
                  ({competency.decisions} dec.)
                </span>
              </span>
            </div>
          ))}
        </div>
        {payload.competencies.length > exercised.length && (
          <p className="mt-1.5 text-[11px] text-gray-500">
            Not exercised in this run:{' '}
            {payload.competencies
              .filter((c) => c.percent === null)
              .map((c) => c.name)
              .join(', ')}
          </p>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
          <span className="font-semibold text-gray-700">{payload.epilogue.name}</span> —{' '}
          {payload.epilogue.text}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
          These percentages come from the simulation itself. Score the competencies against this
          centre&rsquo;s rubric as you would for any other activity.
        </p>
      </div>
    </div>
  );
}
