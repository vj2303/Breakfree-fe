'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCircle, ChevronDown, ChevronLeft, Edit, Loader2 } from 'lucide-react';

import type { ProgressStatus, ScoreLifecycleStatus } from '../lib/types';

export interface TopBarActivity {
  activityId: string;
  label: string;
  sublabel: string;
}

export interface ScoringTopBarProps {
  centerName: string;
  assessorName: string;
  participantName: string;
  participantId: string;
  activities: TopBarActivity[];
  selectedActivityId: string | null;
  onSelectActivity: (activityId: string) => void;
  activityTitle: string;
  activityTypeLabel: string;
  submissionLabel: string;
  submissionSubLabel: string;
  lifecycleStatus: ScoreLifecycleStatus;
  progressStatus: ProgressStatus;
  scoredCompetencies: number;
  totalCompetencies: number;
  readOnly: boolean;
  editMode: boolean;
  editReason: string;
  onEditReasonChange: (value: string) => void;
  isSubmitting: boolean;
  isSavingDraft: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
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
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      {children}
    </div>
  );
}

function ActivityPicker({
  activities,
  selectedActivityId,
  onSelectActivity,
  activityTitle,
  activityTypeLabel,
}: Pick<
  ScoringTopBarProps,
  'activities' | 'selectedActivityId' | 'onSelectActivity' | 'activityTitle' | 'activityTypeLabel'
>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex min-w-0 max-w-[280px] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
          open
            ? 'border-violet-300 bg-violet-50'
            : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-black">
            Activity: {activityTitle || '—'}
          </span>
          <span className="block truncate text-[11px] text-gray-500">{activityTypeLabel}</span>
        </span>
        <ChevronDown size={15} className="flex-shrink-0 text-gray-500" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="scrollbar-thin absolute left-0 top-[calc(100%+4px)] z-30 max-h-72 w-[300px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {activities.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-500">No activities in this assessment.</li>
          )}
          {activities.map((activity) => {
            const isSelected = activity.activityId === selectedActivityId;
            return (
              <li key={activity.activityId} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectActivity(activity.activityId);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors ${
                    isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-black">
                      {activity.label}
                    </span>
                    {activity.sublabel && (
                      <span className="block truncate text-[11px] text-gray-500">
                        {activity.sublabel}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check size={14} className="mt-0.5 flex-shrink-0 text-violet-600" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ScoringTopBar({
  centerName,
  assessorName,
  participantName,
  participantId,
  activities,
  selectedActivityId,
  onSelectActivity,
  activityTitle,
  activityTypeLabel,
  submissionLabel,
  submissionSubLabel,
  lifecycleStatus,
  progressStatus,
  scoredCompetencies,
  totalCompetencies,
  readOnly,
  editMode,
  editReason,
  onEditReasonChange,
  isSubmitting,
  isSavingDraft,
  onBack,
  onSaveDraft,
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
      {/* Breadcrumb row */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2.5">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">
          A
        </span>
        <span className="text-sm font-semibold text-black">Assessment Center</span>

        <nav className="ml-3 hidden min-w-0 items-center gap-1.5 text-xs text-gray-500 md:flex">
          <button type="button" onClick={onBack} className="hover:text-gray-800">
            Assessments
          </button>
          <span className="text-gray-300">›</span>
          <span className="max-w-[200px] truncate">{centerName || '—'}</span>
          <span className="text-gray-300">›</span>
          <span className="font-medium text-gray-800">Score Submission</span>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="relative text-gray-400">
            <Bell size={17} />
          </span>
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-[11px] font-semibold text-gray-600">
              {(assessorName || 'A').charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-[140px] truncate text-xs text-gray-700 sm:block">
              {assessorName || 'Assessor'}
            </span>
          </span>
        </div>
      </div>

      {/* Context row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <ChevronLeft size={16} />
        </button>

        <Field label="Participant">
          <p className="truncate text-xs font-semibold text-black">{participantName}</p>
          <p className="truncate text-[11px] text-gray-500">ID: {participantId}</p>
        </Field>

        <div className="hidden h-9 w-px bg-gray-200 sm:block" />

        <ActivityPicker
          activities={activities}
          selectedActivityId={selectedActivityId}
          onSelectActivity={onSelectActivity}
          activityTitle={activityTitle}
          activityTypeLabel={activityTypeLabel}
        />

        <div className="hidden h-9 w-px bg-gray-200 sm:block" />

        <Field label="Submission">
          <p className="truncate text-xs font-semibold text-black">{submissionLabel}</p>
          <p className="truncate text-[11px] text-gray-500">{submissionSubLabel}</p>
        </Field>

        <div className="hidden h-9 w-px bg-gray-200 lg:block" />

        <Field label="Status">
          <span
            className={`inline-block rounded border px-2 py-0.5 text-[11px] font-medium ${pill.className}`}
          >
            {pill.label}
          </span>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {scoredCompetencies} / {totalCompetencies} competencies scored
          </p>
        </Field>

        <div className="ml-auto flex items-center gap-2">
          {readOnly ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              <CheckCircle className="h-4 w-4" />
              Score {lifecycleStatus === 'FINALIZED' ? 'Finalized' : 'Submitted'}
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isSavingDraft || isSubmitting}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {isSavingDraft ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save Draft'
                )}
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting || isSavingDraft || (editMode && !editReason.trim())}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:bg-gray-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit Scores'
                )}
              </button>
            </>
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
