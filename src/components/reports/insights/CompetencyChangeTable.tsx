"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { formatScore } from '../participantOverview/scoring';
import type { ProgressPoint } from '../participantOverview/types';
import { summariseTrace } from './competencyTrace';
import type { CompetencyTrace } from './competencyTrace';

export interface CompetencyChangeRow extends ProgressPoint {
  /** Participants contributing a score to this competency. */
  n: number;
  /** Who produced this row's numbers; absent until the rollup has loaded. */
  trace?: CompetencyTrace;
}

export interface CompetencyChangeTableProps {
  rows: CompetencyChangeRow[];
}

/** Columns in the body, for the expanded row's colSpan. */
const COLUMN_COUNT = 8;

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

/** One named source of a figure, with how much of the cohort it covers. */
function SourceCard({
  label,
  source,
  detail,
}: {
  label: string;
  source: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-black">{source}</div>
      <div className="mt-0.5 text-xs text-gray-500">{detail}</div>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'FINALIZED':
      return 'Finalized';
    case 'SUBMITTED':
      return 'Submitted';
    case 'DRAFT':
      return 'Draft';
    default:
      return 'Not started';
  }
}

/** The dropdown: every figure in the row traced back to who recorded it. */
function TracePanel({ row }: { row: CompetencyChangeRow }) {
  const summary = summariseTrace(row.trace);
  const participants = row.trace?.participants ?? [];

  const prePostSource =
    summary.uploadedPrePost > 0 && summary.inferredPrePost > 0
      ? 'Mixed'
      : summary.uploadedPrePost > 0
        ? 'Pre/post score upload'
        : summary.inferredPrePost > 0
          ? 'Earliest vs latest assessor submission'
          : 'Not available';

  return (
    <div className="space-y-4 border-l-2 border-violet-200 bg-gray-50/70 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SourceCard
          label="Application"
          source="Assessor scoring (BARS)"
          detail={
            summary.assessorNames.length > 0
              ? `${summary.assessorNames.length} assessor${
                  summary.assessorNames.length === 1 ? '' : 's'
                } · ${summary.withApplication} of ${summary.participantCount} participants scored`
              : 'No assessor has scored this competency yet'
          }
        />
        <SourceCard
          label="Readiness"
          source="SJT / readiness upload"
          detail={`${summary.withReadiness} of ${summary.participantCount} participants have an uploaded readiness score`}
        />
        <SourceCard
          label="Pre vs post"
          source={prePostSource}
          detail={
            summary.uploadedPrePost > 0
              ? `${summary.uploadedPrePost} of ${summary.participantCount} participants from the uploaded sheet`
              : 'Derived in-platform; upload a pre/post sheet for a real baseline'
          }
        />
        <SourceCard
          label="Pre-assessment chart"
          source="As shown in this table"
          detail="Plots the pre-assessment figures in this row"
        />
      </div>

      {summary.assessorNames.length > 0 && (
        <p className="text-xs text-gray-500">
          Scored by{' '}
          <span className="font-medium text-gray-700">{summary.assessorNames.join(', ')}</span>
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="border-b border-gray-200 py-2 pr-4">Participant</th>
              <th className="border-b border-gray-200 py-2 pr-4">Assessor</th>
              <th className="border-b border-gray-200 py-2 pr-4">Status</th>
              <th className="w-24 border-b border-gray-200 py-2 text-center">Their score</th>
              <th className="w-28 border-b border-gray-200 py-2 text-center">Application</th>
              <th className="w-24 border-b border-gray-200 py-2 text-center">Readiness</th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-xs text-gray-500">
                  No participant-level detail available for this competency.
                </td>
              </tr>
            )}

            {participants.map((entry) => {
              const assessors =
                entry.assessors.length > 0
                  ? entry.assessors
                  : [{ assessorName: '—', status: 'NOT_STARTED', submittedAt: null, score: null }];

              return assessors.map((assessor, index) => (
                <tr
                  key={`${entry.participantName}-${assessor.assessorName}-${index}`}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-2 pr-4 text-xs text-black">
                    {index === 0 ? entry.participantName : ''}
                  </td>
                  <td className="py-2 pr-4 text-xs text-gray-700">{assessor.assessorName}</td>
                  <td className="py-2 pr-4 text-xs text-gray-500">
                    {statusLabel(assessor.status)}
                    {assessor.submittedAt && (
                      <span className="text-gray-400">
                        {' '}
                        · {new Date(assessor.submittedAt).toLocaleDateString()}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-center text-xs tabular-nums text-gray-900">
                    {formatScore(assessor.score)}
                  </td>
                  <td className="py-2 text-center text-xs tabular-nums text-gray-900">
                    {index === 0 ? formatScore(entry.application) : ''}
                  </td>
                  <td className="py-2 text-center text-xs tabular-nums text-gray-900">
                    {index === 0 ? formatScore(entry.readiness) : ''}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CompetencyChangeTable({ rows }: CompetencyChangeTableProps) {
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());

  const toggleRow = (code: string) =>
    setOpenRows((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

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
        side by side for each stage. Open a row to see where its numbers came from and which
        assessor recorded them.
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
                <td colSpan={COLUMN_COUNT} className="py-10 text-center text-sm text-gray-500">
                  No competency data for this selection.
                </td>
              </tr>
            )}

            {rows.map((row) => {
              // Shade the row when readiness slipped, matching the highlighted row in the design.
              const regressed = row.readinessDelta !== null && row.readinessDelta < 0;
              const isOpen = openRows.has(row.code);
              return (
                <React.Fragment key={row.code}>
                  <tr
                    className={`border-b border-gray-100 ${regressed ? 'bg-gray-50' : ''} ${
                      isOpen ? 'bg-violet-50/40' : ''
                    }`}
                  >
                    <td className="py-4 pr-4 text-sm text-black">
                      <button
                        type="button"
                        onClick={() => toggleRow(row.code)}
                        aria-expanded={isOpen}
                        className="flex items-start gap-1.5 text-left transition-colors hover:text-violet-700"
                      >
                        {isOpen ? (
                          <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-600" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                        )}
                        <span>
                          <span className="font-bold">{row.code}</span>
                          <span className="text-gray-400"> — </span>
                          {row.competencyName}
                        </span>
                      </button>
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

                  {isOpen && (
                    <tr className="border-b border-gray-100">
                      <td colSpan={COLUMN_COUNT} className="p-0">
                        <TracePanel row={row} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
