"use client";

import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  /** Change against the previous period, when there is history to compare. */
  delta?: { direction: 'up' | 'down'; text: string } | null;
  /** Plain supporting line used when no comparison exists. */
  caption?: string;
  /** Draws the caption in amber, for things that need someone to act. */
  needsAttention?: boolean;
}

export default function DashboardStatTiles({ stats }: { stats: DashboardStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
        >
          <p className="truncate text-sm text-gray-500">{stat.label}</p>
          <p className="mt-1 text-4xl font-bold leading-none text-black">{stat.value}</p>

          <p className="mt-2.5 flex items-center gap-1.5 text-sm">
            {stat.delta ? (
              <>
                {stat.delta.direction === 'up' ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
                <span
                  className={`font-semibold ${
                    stat.delta.direction === 'up' ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {stat.delta.text}
                </span>
                {stat.caption && <span className="text-gray-500">{stat.caption}</span>}
              </>
            ) : stat.needsAttention ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-amber-600">{stat.caption}</span>
              </>
            ) : (
              <span className="text-gray-500">{stat.caption ?? ' '}</span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
