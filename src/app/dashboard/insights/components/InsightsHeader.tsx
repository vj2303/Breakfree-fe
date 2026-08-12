'use client';

import { Calendar, ChevronDown, Download, RefreshCw } from 'lucide-react';

import { ASSESSMENT_PERIOD } from '../data';

interface InsightsHeaderProps {
  userName: string;
  userEmail: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function InsightsHeader({ userName, userEmail }: InsightsHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 pb-5 pt-4">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-gray-50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-xs font-semibold text-white">
            {initials(userName)}
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-medium text-gray-900">{userName}</span>
            <span className="block text-xs text-gray-500">{userEmail}</span>
          </span>
          <ChevronDown size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight text-gray-900">
            Talent &amp; Capability Insights
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Organizational view of assessment outcomes, capability and progression readiness
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={16} />
            Export
          </button>

          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <Calendar size={16} className="text-gray-500" />
            <span className="leading-tight">
              <span className="block text-[11px] text-gray-500">Assessment Period</span>
              <span className="block font-medium text-gray-900">{ASSESSMENT_PERIOD}</span>
            </span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          <button
            type="button"
            aria-label="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
