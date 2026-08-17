'use client';

import { Loader2 } from 'lucide-react';

import type { ObservationSummary } from '../lib/observations';

export interface ProgressCompetency {
  id: string;
  name: string;
  value: number;
  max: number;
}

export interface ProgressSidebarProps {
  /** Sub-competencies scored, as a percentage of those in this activity. */
  progressPercent: number;
  /** Points awarded across the activity, out of 100. `null` before anything is scoreable. */
  overallScore: number | null;
  competencies: ProgressCompetency[];
  activeCompetencyId: string | null;
  onSelectCompetency: (competencyId: string) => void;
  observationSummary: ObservationSummary;
  onViewFinalSummary: () => void;
  isGenerating: boolean;
  isEvaluating: boolean;
  onGenerateReport: () => void;
  onEvaluate: () => void;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ScoreDial({ percent, score }: { percent: number; score: number | null }) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className="relative mx-auto h-[110px] w-[110px]">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="rgb(237 233 254)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="rgb(124 58 237)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-gray-500">Overall Score</span>
        <span className="text-lg font-bold tabular-nums text-black">
          {score === null ? '—' : `${score} / 100`}
        </span>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold tabular-nums text-black">{value}</span>
    </div>
  );
}

export default function ProgressSidebar({
  progressPercent,
  overallScore,
  competencies,
  activeCompetencyId,
  onSelectCompetency,
  observationSummary,
  onViewFinalSummary,
  isGenerating,
  isEvaluating,
  onGenerateReport,
  onEvaluate,
}: ProgressSidebarProps) {
  const busy = isGenerating || isEvaluating;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-baseline justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Overall Progress
        </h3>
        <span className="text-xs font-semibold tabular-nums text-black">
          {Math.round(progressPercent)}%
        </span>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">
        <ScoreDial percent={overallScore ?? 0} score={overallScore} />

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold text-black">Competency Scores</p>
          {competencies.length === 0 ? (
            <p className="text-xs text-gray-400">No competencies for this activity.</p>
          ) : (
            <div className="space-y-0.5">
              {competencies.map((competency) => {
                const isActive = competency.id === activeCompetencyId;
                return (
                  <button
                    key={competency.id}
                    type="button"
                    onClick={() => onSelectCompetency(competency.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                      isActive
                        ? 'border-l-2 border-violet-600 bg-violet-50'
                        : 'border-l-2 border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <span className="min-w-0 truncate text-xs text-gray-700">
                      {competency.name}
                    </span>
                    <span className="flex-shrink-0 text-xs font-medium tabular-nums text-gray-900">
                      {competency.value} / {competency.max}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Observation Summary
          </p>
          <div className="space-y-1.5">
            <SummaryRow label="Total Observations" value={observationSummary.total} />
            <SummaryRow label="Mapped" value={observationSummary.mapped} />
            <SummaryRow label="Unmapped" value={observationSummary.unmapped} />
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onGenerateReport}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate report'
            )}
          </button>
          <button
            type="button"
            onClick={onEvaluate}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Evaluating…
              </>
            ) : (
              'Evaluate'
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={onViewFinalSummary}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-50"
        >
          View Final Summary
        </button>
      </div>
    </div>
  );
}
