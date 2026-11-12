'use client';

import { AlertTriangle, Check, CircleDashed, Loader2 } from 'lucide-react';

import type { ScoreLifecycleStatus } from '../lib/types';

export interface RailActivity {
  activityId: string;
  label: string;
  typeLabel: string;
  scored: number;
  total: number;
}

export interface ActivityRailProps {
  activities: RailActivity[];
  selectedActivityId: string | null;
  onSelectActivity: (activityId: string) => void;
  /** Submission state for the whole assignment — one submit covers every activity. */
  lifecycleStatus: ScoreLifecycleStatus;
  participantName: string;
}

type RailState = 'submitted' | 'scored' | 'in_progress' | 'not_started';

const STATE_STYLE: Record<RailState, { label: string; pill: string; icon: typeof Check }> = {
  submitted: {
    label: 'Submitted',
    pill: 'border-green-200 bg-green-50 text-green-700',
    icon: Check,
  },
  scored: {
    label: 'Scored',
    pill: 'border-violet-200 bg-violet-50 text-violet-700',
    icon: Check,
  },
  in_progress: {
    label: 'In progress',
    pill: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Loader2,
  },
  not_started: {
    label: 'Not started',
    pill: 'border-gray-200 bg-gray-50 text-gray-600',
    icon: CircleDashed,
  },
};

function stateOf(activity: RailActivity, lifecycleStatus: ScoreLifecycleStatus): RailState {
  if (lifecycleStatus === 'SUBMITTED' || lifecycleStatus === 'FINALIZED') return 'submitted';
  if (activity.total > 0 && activity.scored >= activity.total) return 'scored';
  return activity.scored > 0 ? 'in_progress' : 'not_started';
}

/**
 * Every activity assigned for this participant, with its own progress.
 *
 * The only way to discover a second activity used to be opening the header
 * dropdown, so an assessor could finish one, assume they were done and leave
 * the rest unscored. One submit covers the whole assignment, so an activity
 * missed here is filed empty.
 */
export default function ActivityRail({
  activities,
  selectedActivityId,
  onSelectActivity,
  lifecycleStatus,
  participantName,
}: ActivityRailProps) {
  // A single activity is already named in the header; a rail would just repeat it.
  if (activities.length < 2) return null;

  const outstanding = activities.filter(
    (activity) => stateOf(activity, lifecycleStatus) !== 'submitted' && activity.scored < activity.total
  );
  const awaitingSubmission = lifecycleStatus !== 'SUBMITTED' && lifecycleStatus !== 'FINALIZED';

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-gray-400">
          Activities for {participantName}
        </span>
        <span className="text-[11px] text-gray-500">
          {activities.length - outstanding.length} of {activities.length} scored
        </span>
      </div>

      <div className="scrollbar-thin mt-2 flex gap-2 overflow-x-auto pb-1">
        {activities.map((activity) => {
          const state = stateOf(activity, lifecycleStatus);
          const style = STATE_STYLE[state];
          const Icon = style.icon;
          const isSelected = activity.activityId === selectedActivityId;

          return (
            <button
              key={activity.activityId}
              type="button"
              onClick={() => onSelectActivity(activity.activityId)}
              aria-current={isSelected}
              className={`flex min-w-[220px] max-w-[280px] flex-shrink-0 flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                isSelected
                  ? 'border-violet-400 bg-violet-50/60 ring-1 ring-violet-200'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-black">
                    {activity.label}
                  </span>
                  <span className="block truncate text-[11px] text-gray-500">
                    {activity.typeLabel}
                  </span>
                </span>
                <span
                  className={`flex flex-shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${style.pill}`}
                >
                  <Icon size={10} className={state === 'in_progress' ? 'animate-none' : ''} />
                  {style.label}
                </span>
              </span>

              <span className="flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <span
                    className={`block h-full rounded-full ${
                      state === 'submitted'
                        ? 'bg-green-500'
                        : state === 'scored'
                          ? 'bg-violet-500'
                          : 'bg-amber-400'
                    }`}
                    style={{
                      width: `${activity.total > 0 ? (activity.scored / activity.total) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className="flex-shrink-0 text-[11px] tabular-nums text-gray-600">
                  {activity.scored}/{activity.total}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {awaitingSubmission && outstanding.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
          <AlertTriangle size={12} className="flex-shrink-0" />
          {outstanding.length} more {outstanding.length === 1 ? 'activity' : 'activities'} to score
          for {participantName}
          {outstanding.length <= 2 && <> — {outstanding.map((a) => a.label).join(', ')}</>}. One
          submit files every activity, so anything left unscored is filed empty.
        </p>
      )}
    </div>
  );
}
