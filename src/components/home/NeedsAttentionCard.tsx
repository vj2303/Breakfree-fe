"use client";

import React from 'react';

export type AttentionSeverity = 'high' | 'medium' | 'info';

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  context: string;
  actionLabel: string;
  onAction: () => void;
}

const DOT: Record<AttentionSeverity, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  info: 'bg-blue-500',
};

export default function NeedsAttentionCard({
  items,
  loading,
}: {
  items: AttentionItem[];
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-black">Needs your attention</h2>
        {items.length > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-50 px-2 text-xs font-semibold text-red-600">
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 space-y-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          Nothing needs your attention right now.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-4">
              <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${DOT[item.severity]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-black">{item.title}</p>
                <p className="mt-0.5 truncate text-sm text-gray-500">{item.context}</p>
              </div>
              <button
                type="button"
                onClick={item.onAction}
                className="flex-shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-50"
              >
                {item.actionLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
