'use client';

import { Loader2 } from 'lucide-react';

export interface ParticipantOverviewProps {
  name: string;
  participantId: string;
  program: string;
  totalCompetencies: number;
  activityCount: number;
  isGenerating: boolean;
  isEvaluating: boolean;
  onGenerateReport: () => void;
  onEvaluate: () => void;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-black">{value}</span>
    </div>
  );
}

export default function ParticipantOverview({
  name,
  participantId,
  program,
  totalCompetencies,
  activityCount,
  isGenerating,
  isEvaluating,
  onGenerateReport,
  onEvaluate,
}: ParticipantOverviewProps) {
  const busy = isGenerating || isEvaluating;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2.5 text-sm font-semibold text-black">Participant Overview</h3>
      <div className="space-y-2">
        <Row label="Name" value={name} />
        <Row label="Participant ID" value={participantId} />
        <Row label="Program" value={program} />
        <Row label="Total Competencies" value={totalCompetencies} />
        <Row label="Activities" value={activityCount} />
      </div>

      <div className="mt-3 flex gap-2 border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={onGenerateReport}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate report'
          )}
        </button>
        <button
          type="button"
          onClick={onEvaluate}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isEvaluating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Evaluating...
            </>
          ) : (
            'Evaluate'
          )}
        </button>
      </div>
    </div>
  );
}
