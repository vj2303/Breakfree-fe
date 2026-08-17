'use client';

import { CheckCircle2, Loader2, X } from 'lucide-react';

export interface FinalSummaryRow {
  id: string;
  name: string;
  description: string;
  /** Every sub-competency of this competency carries a score. */
  complete: boolean;
  /** Activities in this assessment that cover the competency. */
  activityCount: number;
  /** Mean score across activities, or `null` when nothing is scored yet. */
  average: number | null;
  /** Points available per sub-competency, used to scale the bar. */
  max: number;
}

export interface FinalSummaryModalProps {
  open: boolean;
  participantName: string;
  rows: FinalSummaryRow[];
  isGenerating: boolean;
  onClose: () => void;
  onGenerateReport: () => void;
}

function ScoreBar({ average, max }: { average: number | null; max: number }) {
  const percent = average !== null && max > 0 ? Math.min(100, (average / max) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 min-w-[80px] flex-1 overflow-hidden rounded-sm bg-gray-200">
        <div className="h-full rounded-sm bg-violet-600" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-8 flex-shrink-0 text-right text-xs font-semibold tabular-nums text-black">
        {average === null ? '—' : average.toFixed(1)}
      </span>
    </div>
  );
}

export default function FinalSummaryModal({
  open,
  participantName,
  rows,
  isGenerating,
  onClose,
  onGenerateReport,
}: FinalSummaryModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Final summary"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-black">{participantName || 'Participant'}</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Competency summary across every activity in this assessment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close final summary"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-auto px-6">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] font-semibold text-gray-600">
                <th className="py-2 pr-3">Competency</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3 text-center">Complete</th>
                <th className="py-2 pr-3 text-center">Activities</th>
                <th className="py-2">Average Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-gray-500">
                    No competencies configured for this assessment.
                  </td>
                </tr>
              )}
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 align-middle ${
                    index % 2 === 1 ? 'bg-gray-50/60' : ''
                  }`}
                >
                  <td className="py-3 pr-3 text-xs font-semibold text-black">{row.name}</td>
                  <td className="py-3 pr-3 text-xs leading-relaxed text-gray-600">
                    {row.description || '—'}
                  </td>
                  <td className="py-3 pr-3 text-center">
                    {row.complete ? (
                      <CheckCircle2 size={16} className="mx-auto text-violet-600" />
                    ) : (
                      <span className="mx-auto block h-4 w-4 rounded-full border border-gray-300" />
                    )}
                  </td>
                  <td className="py-3 pr-3 text-center text-xs tabular-nums text-gray-700">
                    {row.activityCount}
                  </td>
                  <td className="py-3">
                    <ScoreBar average={row.average} max={row.max} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onGenerateReport}
            disabled={isGenerating}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-gray-300"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate Report'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
