"use client";

import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';

export interface HomeGroup {
  id: string;
  name: string;
  admin: string;
  memberCount: number;
  done: number;
  total: number;
  deadlineLabel: string | null;
  status: 'complete' | 'on_track' | 'at_risk' | 'not_started';
}

export interface HomeAssessor {
  id: string;
  name: string;
  email: string;
  designation: string;
  /** Scores this assessor has submitted or finalized. */
  submitted: number;
  /** Scores still sitting in draft. */
  drafts: number;
}

const STATUS_PILL: Record<HomeGroup['status'], { label: string; className: string }> = {
  complete: { label: 'Complete', className: 'bg-emerald-50 text-emerald-700' },
  on_track: { label: 'On track', className: 'bg-emerald-50 text-emerald-700' },
  at_risk: { label: 'At risk', className: 'bg-amber-50 text-amber-700' },
  not_started: { label: 'Not started', className: 'bg-gray-100 text-gray-600' },
};

const BAR_COLOR: Record<HomeGroup['status'], string> = {
  complete: 'bg-violet-600',
  on_track: 'bg-violet-600',
  at_risk: 'bg-amber-500',
  not_started: 'bg-gray-300',
};

export interface YourGroupsSectionProps {
  groups: HomeGroup[];
  assessors: HomeAssessor[];
  loading: boolean;
  tab: 'groups' | 'assessors';
  onTabChange: (tab: 'groups' | 'assessors') => void;
  onViewGroup: () => void;
  onCreateGroup: () => void;
}

export default function YourGroupsSection({
  groups,
  assessors,
  loading,
  tab,
  onTabChange,
  onViewGroup,
  onCreateGroup,
}: YourGroupsSectionProps) {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-black">
          {tab === 'groups' ? 'Your groups' : 'Your assessors'}
        </h2>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(['groups', 'assessors'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onTabChange(option)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                tab === option ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-black'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((row) => (
            <div key={row} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-gray-100" />
              <div className="mt-5 h-2 w-full animate-pulse rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      ) : tab === 'groups' ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map((group) => {
            const pill = STATUS_PILL[group.status];
            const percent = group.total > 0 ? Math.round((group.done / group.total) * 100) : 0;
            return (
              <div
                key={group.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 truncate text-base font-bold text-black" title={group.name}>
                    {group.name}
                  </h3>
                  <span
                    className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${pill.className}`}
                  >
                    {pill.label}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  Admin: {group.admin} · {group.memberCount} member
                  {group.memberCount === 1 ? '' : 's'}
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${BAR_COLOR[group.status]}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="flex-shrink-0 text-sm tabular-nums text-gray-600">
                    {group.done}/{group.total} done
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={`text-sm ${
                      group.status === 'at_risk' ? 'font-medium text-amber-600' : 'text-gray-400'
                    }`}
                  >
                    {group.deadlineLabel ?? 'No deadline set'}
                  </span>
                  <button
                    type="button"
                    onClick={onViewGroup}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-black hover:text-violet-700"
                  >
                    View
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            );
          })}

          <button
            onClick={onCreateGroup}
            className="flex min-h-[160px] items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:bg-white hover:text-black"
          >
            <Plus size={16} />
            Create new assessment group
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {assessors.length === 0 && (
            <p className="rounded-2xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 lg:col-span-2">
              No assessors yet.
            </p>
          )}
          {assessors.map((assessor) => (
            <div
              key={assessor.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h3 className="truncate text-base font-bold text-black">{assessor.name}</h3>
              <p className="mt-0.5 truncate text-sm text-gray-500">
                {assessor.designation || 'Assessor'} · {assessor.email}
              </p>
              <div className="mt-4 flex gap-6">
                <div>
                  <p className="text-xs text-gray-500">Submitted</p>
                  <p className="text-xl font-bold tabular-nums text-black">{assessor.submitted}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">In draft</p>
                  <p className="text-xl font-bold tabular-nums text-black">{assessor.drafts}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
