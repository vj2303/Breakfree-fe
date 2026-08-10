'use client';

import { CheckCircle, ChevronLeft, Edit, Loader2 } from 'lucide-react';

import type { ProgressStatus, ScoreLifecycleStatus } from '../lib/types';

export interface ScoringTopBarProps {
  participantName: string;
  participantId: string;
  activityTitle: string;
  activitySubtitle: string;
  lifecycleStatus: ScoreLifecycleStatus;
  progressStatus: ProgressStatus;
  scoredCompetencies: number;
  totalCompetencies: number;
  readOnly: boolean;
  editMode: boolean;
  editReason: string;
  onEditReasonChange: (value: string) => void;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

const PROGRESS_PILL: Record<ProgressStatus, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'border-green-200 bg-green-50 text-green-700' },
  in_progress: { label: 'In Progress', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  not_started: { label: 'Not Started', className: 'border-gray-200 bg-gray-50 text-gray-600' },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      {children}
    </div>
  );
}

export default function ScoringTopBar({
  participantName,
  participantId,
  activityTitle,
  activitySubtitle,
  lifecycleStatus,
  progressStatus,
  scoredCompetencies,
  totalCompetencies,
  readOnly,
  editMode,
  editReason,
  onEditReasonChange,
  isSubmitting,
  onBack,
  onSubmit,
}: ScoringTopBarProps) {
  const pill =
    lifecycleStatus === 'FINALIZED'
      ? { label: 'Finalized', className: 'border-blue-200 bg-blue-50 text-blue-700' }
      : lifecycleStatus === 'SUBMITTED'
        ? { label: 'Submitted', className: 'border-green-200 bg-green-50 text-green-700' }
        : PROGRESS_PILL[progressStatus];

  return (
    <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            A
          </span>
          <span className="text-sm font-semibold text-black">Assessment Center</span>
        </div>

        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="hidden h-9 w-px bg-gray-200 sm:block" />

        <Field label="Participant">
          <p className="truncate text-sm font-semibold text-black">{participantName}</p>
          <p className="truncate text-xs text-gray-500">{participantId}</p>
        </Field>

        <div className="hidden h-9 w-px bg-gray-200 sm:block" />

        <Field label="Activity">
          <p className="truncate text-sm font-semibold text-black">{activityTitle || '—'}</p>
          {activitySubtitle && (
            <p className="truncate text-xs text-gray-500">{activitySubtitle}</p>
          )}
        </Field>

        <div className="hidden h-9 w-px bg-gray-200 sm:block" />

        <Field label="Status">
          <span
            className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${pill.className}`}
          >
            {pill.label}
          </span>
          <p className="mt-0.5 text-xs text-gray-500">
            {scoredCompetencies} / {totalCompetencies} competencies scored
          </p>
        </Field>

        <div className="ml-auto">
          {readOnly ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
              <CheckCircle className="h-4 w-4" />
              Score {lifecycleStatus === 'FINALIZED' ? 'Finalized' : 'Submitted'}
            </span>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || (editMode && !editReason.trim())}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:bg-gray-400"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Scores'
              )}
            </button>
          )}
        </div>
      </div>

      {editMode && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-800">
            <Edit className="h-3.5 w-3.5" />
            Edit Mode — explain why you are changing this score
          </p>
          <textarea
            rows={2}
            value={editReason}
            onChange={(e) => onEditReasonChange(e.target.value)}
            placeholder="Please explain why you are editing this score..."
            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-black focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      )}
    </div>
  );
}
