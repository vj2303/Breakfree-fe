"use client";

import React from 'react';

export interface ActivityEntry {
  id: string;
  title: string;
  meta: string;
  /** Sort key — most recent first. */
  timestamp: number;
}

/** "2 hours ago" / "Yesterday" / "3 days ago". */
export function relativeTime(timestamp: number, now: number): string {
  const diffMs = now - timestamp;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;

  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

export default function RecentActivityCard({
  entries,
  loading,
}: {
  entries: ActivityEntry[];
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-black">Recent activity</h2>

      {loading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-8 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No activity yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
              <div className="min-w-0">
                <p className="text-sm text-black">{entry.title}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">{entry.meta}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
