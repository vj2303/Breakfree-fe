'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

export interface ScoringFooterBarProps {
  activityTitle: string;
  scoredCompetencies: number;
  totalCompetencies: number;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function ScoringFooterBar({
  activityTitle,
  scoredCompetencies,
  totalCompetencies,
  collapsed,
  onToggleCollapsed,
}: ScoringFooterBarProps) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-gray-200 bg-white">
      <div
        className={`flex items-center justify-between gap-3 px-4 ${collapsed ? 'py-1.5' : 'py-3'}`}
      >
        {!collapsed && (
          <p className="min-w-0 truncate text-xs text-gray-600">
            You are scoring: <span className="font-medium text-black">{activityTitle || '—'}</span>
          </p>
        )}
        <p className="ml-auto text-xs tabular-nums text-gray-600">
          {scoredCompetencies} of {totalCompetencies} competencies scored
        </p>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand footer' : 'Collapse footer'}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
    </div>
  );
}
