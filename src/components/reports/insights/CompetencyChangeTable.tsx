"use client";

import React from 'react';

import type { ProgressPoint } from '../participantOverview/types';

export interface CompetencyChangeRow extends ProgressPoint {
  /** Participants contributing a score to this competency. */
  n: number;
}

export interface CompetencyChangeTableProps {
  rows: CompetencyChangeRow[];
}

/** Signed, one-decimal delta. Negative changes drop back to gray so gains read first. */
function Delta({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) {
    return <span className="text-sm text-gray-400">—</span>;
  }
  const text = `${value > 0 ? '+' : value < 0 ? '−' : '+'}${Math.abs(value).toFixed(1)}`;
  return (
    <span
      className={`text-sm font-semibold tabular-nums ${
        value < 0 ? 'text-gray-400' : 'text-black'
      }`}
    >
      {text}
    </span>
  );
}

export default function CompetencyChangeTable({ rows }: CompetencyChangeTableProps) {
  return (
    <section>
      <h2 className="text-lg font-bold text-black">Competency change summary (post – pre)</h2>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="py-3 pr-4">Competency</th>
              <th className="w-20 py-3 pr-4 text-center">N</th>
              <th className="w-44 py-3 pr-4 text-center">Readiness change</th>
              <th className="w-44 py-3 text-center">Application change</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-gray-500">
                  No competency data for this selection.
                </td>
              </tr>
            )}

            {rows.map((row) => {
              // Shade the row when readiness slipped, matching the highlighted row in the design.
              const regressed = row.readinessDelta !== null && row.readinessDelta < 0;
              return (
                <tr
                  key={row.code}
                  className={`border-b border-gray-100 last:border-0 ${
                    regressed ? 'bg-gray-50' : ''
                  }`}
                >
                  <td className="py-4 pr-4 text-sm text-black">
                    <span className="font-bold">{row.code}</span>
                    <span className="text-gray-400"> — </span>
                    {row.competencyName}
                  </td>
                  <td className="py-4 pr-4 text-center text-sm tabular-nums text-gray-600">
                    {row.n}
                  </td>
                  <td className="py-4 pr-4 text-center">
                    <Delta value={row.readinessDelta} />
                  </td>
                  <td className="py-4 text-center">
                    <Delta value={row.applicationDelta} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
