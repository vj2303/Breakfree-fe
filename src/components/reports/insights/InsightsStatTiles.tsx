"use client";

import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface InsightsStatTilesProps {
  participantCount: number;
  /** Participants who submitted every activity in scope. */
  completedCount: number;
  /** Participants whose activities have all been scored by an assessor. */
  scoredCount: number;
  /** Completed but not yet fully scored. */
  awaitingNames: string[];
  awaitingOpen: boolean;
  onToggleAwaiting: () => void;
}

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function Tile({
  label,
  children,
  caption,
}: {
  label: string;
  children: React.ReactNode;
  caption: React.ReactNode;
}) {
  return (
    <div className="flex-1 px-5 py-4">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">{children}</div>
      <div className="mt-1.5 text-sm text-gray-500">{caption}</div>
    </div>
  );
}

export default function InsightsStatTiles({
  participantCount,
  completedCount,
  scoredCount,
  awaitingNames,
  awaitingOpen,
  onToggleAwaiting,
}: InsightsStatTilesProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col divide-y divide-gray-200 sm:flex-row sm:divide-x sm:divide-y-0">
        <Tile
          label="Assessment completion"
          caption="Completed &amp; submitted all assessments"
        >
          <span className="text-4xl font-bold leading-none text-black">
            {percent(completedCount, participantCount)}%
          </span>
          <span className="text-base text-gray-400 tabular-nums">
            {completedCount} / {participantCount}
          </span>
        </Tile>

        <Tile label="Assessor scoring" caption="All required assessor scoring completed">
          <span className="text-4xl font-bold leading-none text-black">
            {percent(scoredCount, participantCount)}%
          </span>
          <span className="text-base text-gray-400 tabular-nums">
            {scoredCount} / {participantCount}
          </span>
        </Tile>

        <Tile
          label="Awaiting assessor scoring"
          caption={
            awaitingNames.length > 0 ? (
              <button
                type="button"
                onClick={onToggleAwaiting}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700"
              >
                Completed but awaiting scorer input — {awaitingOpen ? 'hide list' : 'view list'}
                <ArrowRight size={14} />
              </button>
            ) : (
              'Nothing waiting on an assessor'
            )
          }
        >
          <span
            className={`text-4xl font-bold leading-none ${
              awaitingNames.length > 0 ? 'text-amber-600' : 'text-black'
            }`}
          >
            {awaitingNames.length}
          </span>
          <span className="text-base text-gray-400">participants</span>
        </Tile>
      </div>

      {awaitingOpen && awaitingNames.length > 0 && (
        <div className="border-t border-gray-200 px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Awaiting assessor scoring
          </p>
          <div className="flex flex-wrap gap-2">
            {awaitingNames.map((name) => (
              <span
                key={name}
                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
