"use client";

import React from 'react';
import { Check, FileText, Inbox, MessageSquare, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { formatDateTime, initials } from './scoring';
import type { CompletionRow } from './types';

export interface AssessmentCompletionTableProps {
  rows: CompletionRow[];
}

/** Icon + tint per activity type, mirroring the blue/orange split in the design. */
function activityVisual(activityType: string): { Icon: LucideIcon; className: string } {
  const type = (activityType || '').toUpperCase().replace(/-/g, '_');
  if (type.includes('INBOX')) return { Icon: Inbox, className: 'bg-blue-50 text-blue-600' };
  if (type.includes('CASE')) return { Icon: FileText, className: 'bg-blue-50 text-blue-600' };
  if (type.includes('GD') || type.includes('GROUP'))
    return { Icon: Users, className: 'bg-orange-50 text-orange-600' };
  if (type.includes('ROLE'))
    return { Icon: Users, className: 'bg-orange-50 text-orange-600' };
  return { Icon: MessageSquare, className: 'bg-gray-100 text-gray-600' };
}

export default function AssessmentCompletionTable({ rows }: AssessmentCompletionTableProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-bold text-black">Assessment Completion Status</h3>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="py-3 pr-4">Activity</th>
              <th className="py-3 pr-4">Description</th>
              <th className="py-3 pr-4">Duration</th>
              <th className="py-3 pr-4">Assessors Assigned</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3">Completed On</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                  No activities found for this assessment center.
                </td>
              </tr>
            )}

            {rows.map((row) => {
              const { Icon, className } = activityVisual(row.activityType);
              return (
                <tr key={row.activityId} className="border-b border-gray-100 last:border-0">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${className}`}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="text-sm font-semibold text-black">{row.name}</span>
                    </div>
                  </td>
                  <td className="max-w-[280px] py-4 pr-4 text-sm text-gray-500">
                    <span className="line-clamp-2" title={row.description}>
                      {row.description || '—'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-4 pr-4 text-sm text-gray-600">
                    {row.durationMinutes ? `${row.durationMinutes} min` : '—'}
                  </td>
                  <td className="py-4 pr-4">
                    {row.assessors.length === 0 ? (
                      <span className="text-sm text-gray-400">—</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {row.assessors.map((assessor) => (
                          <span
                            key={assessor}
                            title={assessor}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-700"
                          >
                            {initials(assessor)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-4 pr-4">
                    {row.isSubmitted ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                        <Check size={15} />
                        Completed
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-gray-400">Pending</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-4 text-sm text-gray-600">
                    {row.isSubmitted ? formatDateTime(row.completedAt) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
