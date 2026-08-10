'use client';

import { FileText, Inbox, MessageSquare, User, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { ActivityRailItem, ProgressStatus } from '../lib/types';

export interface ActivityRailProps {
  items: ActivityRailItem[];
  selectedActivityId: string | null;
  onSelectActivity: (activityId: string) => void;
}

const STATUS_STYLES: Record<ProgressStatus, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'border-green-200 bg-green-50 text-green-700' },
  in_progress: { label: 'In Progress', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  not_started: { label: 'Not Started', className: 'border-gray-200 bg-gray-50 text-gray-600' },
};

function activityIcon(item: ActivityRailItem): LucideIcon {
  const type = `${item.activityType} ${item.interactiveActivityType ?? ''}`.toUpperCase();
  if (type.includes('INBOX')) return Inbox;
  if (type.includes('GD') || type.includes('GROUP')) return Users;
  if (type.includes('ROLEPLAY') || type.includes('ROLE_PLAY')) return MessageSquare;
  if (type.includes('CASE')) return FileText;
  return User;
}

export default function ActivityRail({
  items,
  selectedActivityId,
  onSelectActivity,
}: ActivityRailProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <h3 className="px-1 text-sm font-semibold text-black">Activities</h3>
      <p className="mb-2 px-1 text-xs text-gray-500">Select an activity to score</p>

      <div className="scrollbar-thin flex gap-2 overflow-x-auto lg:flex-col lg:overflow-x-visible">
        {items.length === 0 && (
          <p className="px-1 py-2 text-xs text-gray-500">No activities in this assessment.</p>
        )}

        {items.map((item) => {
          const Icon = activityIcon(item);
          const isSelected = item.activityId === selectedActivityId;
          const status = STATUS_STYLES[item.status];

          return (
            <button
              key={item.activityId}
              type="button"
              onClick={() => onSelectActivity(item.activityId)}
              className={`flex w-56 flex-shrink-0 flex-col gap-2 rounded-lg border p-3 text-left transition-colors lg:w-auto ${
                isSelected
                  ? 'border-violet-300 bg-violet-50/50 ring-1 ring-violet-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${
                    isSelected ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-black">{item.title}</span>
                  {item.subtitle && item.subtitle !== item.title && (
                    <span className="block text-xs text-gray-500">{item.subtitle}</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${status.className}`}>
                  {status.label}
                </span>
                <span className="text-xs tabular-nums text-gray-600">
                  {item.scoredCompetencies} / {item.totalCompetencies}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
