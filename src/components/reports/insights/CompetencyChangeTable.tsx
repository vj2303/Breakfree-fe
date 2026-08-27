"use client";

import React from 'react';

import { formatScore } from '../participantOverview/scoring';
import type { ProgressPoint } from '../participantOverview/types';

export interface CompetencyChangeRow extends ProgressPoint {
  /** Participants contributing a score to this competency. */
  n: number;
}

export interface CompetencyChangeTableProps {
  rows: CompetencyChangeRow[];
}

/** Plain average, one decimal. */
function Score({ value }: { value: number | null }) {
  return (
    <span
      className={`text-sm tabular-nums ${value === null ? 'text-gray-300' : 'text-gray-900'}`}
    >
      {formatScore(value)}
    </span>
  );
}

/** Signed, one-decimal delta. Negative changes drop back to gray so gains read first. */
function Delta({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) {
    return <span className="text-sm text-gray-300">—</span>;
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
  // A cohort where every figure is zero means the source data is missing, not flat.
  const hasAnyScore = rows.some((row) =>
    [row.preReadiness, row.postReadiness, row.preApplication, row.postApplication].some(
      (value) => typeof value === 'number' && value !== 0
    )
  );

  return (
    <section>
      <h2 className="text-lg font-bold text-black">
        Competency scores — pre-assessment, post-assessment and difference
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Cohort averages per competency on a 5-point scale. Readiness and application are shown
        side by side for each stage.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <th rowSpan={2} className="border-b border-gray-200 py-3 pr-4 align-bottom">
                Competency
              </th>
              <th
                rowSpan={2}
                className="w-16 border-b border-gray-200 py-3 pr-4 text-center align-bottom"
              >
                N
              </th>
              <th
                colSpan={2}
                className="border-b border-l border-gray-200 px-4 pb-2 pt-3 text-center text-gray-600"
              >
                Pre-assessment
              </th>
              <th
                colSpan={2}
                className="border-b border-l border-gray-200 px-4 pb-2 pt-3 text-center text-gray-600"
              >
                Post-assessment
              </th>
              <th
                colSpan={2}
                className="border-b border-l border-gray-200 px-4 pb-2 pt-3 text-center text-gray-600"
              >
                Difference (post – pre)
              </th>
            </tr>
            {/* Readiness and Application repeat under each group, colour-keyed to their chart lines. */}
            <tr className="text-[11px] font-semibold uppercase tracking-wide">
              <th className="w-24 border-b border-l border-gray-200 py-2 text-center text-violet-600">
                Readiness
              </th>
              <th className="w-24 border-b border-gray-200 py-2 text-center text-blue-600">
                Application
              </th>
              <th className="w-24 border-b border-l border-gray-200 py-2 text-center text-violet-600">
                Readiness
              </th>
              <th className="w-24 border-b border-gray-200 py-2 text-center text-blue-600">
                Application
              </th>
              <th className="w-24 border-b border-l border-gray-200 py-2 text-center text-violet-600">
                Readiness
              </th>
              <th className="w-24 border-b border-gray-200 py-2 text-center text-blue-600">
                Application
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-gray-500">
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

                  <td className="border-l border-gray-100 py-4 text-center">
                    <Score value={row.preReadiness} />
                  </td>
                  <td className="py-4 text-center">
                    <Score value={row.preApplication} />
                  </td>

                  <td className="border-l border-gray-100 py-4 text-center">
                    <Score value={row.postReadiness} />
                  </td>
                  <td className="py-4 text-center">
                    <Score value={row.postApplication} />
                  </td>

                  <td className="border-l border-gray-100 py-4 text-center">
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

      {rows.length > 0 && !hasAnyScore && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          Every pre and post score came back as zero for this selection — readiness scores may not
          have been uploaded for this assessment centre yet.
        </p>
      )}
    </section>
  );
}
