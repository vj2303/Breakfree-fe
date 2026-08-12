'use client';

import { ArrowRight, MoreVertical } from 'lucide-react';

import { RECENT_COHORTS, type ScoreTone } from '../data';

const COLUMNS = [
  'Cohort / Group',
  'Department',
  'Level',
  'Participants',
  'Assessment Period',
  'Overall Score',
  'Progression Readiness',
  'High Potential',
  'Action',
];

function ScoreCell({ value, tone, suffix }: { value: number; tone: ScoreTone; suffix?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm tabular-nums text-gray-900">
      <span
        className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
          tone === 'good' ? 'bg-green-500' : 'bg-amber-500'
        }`}
      />
      {value}
      {suffix}
    </span>
  );
}

export default function RecentCohorts() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Recent Cohorts / Groups</h2>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          View all cohorts
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200 text-left text-[11px] font-medium text-gray-500">
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  className={`pb-2.5 ${column === 'Action' ? 'text-right' : ''}`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_COHORTS.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0">
                <td className="py-3 text-sm font-medium text-gray-900">{row.cohort}</td>
                <td className="py-3 text-sm text-gray-600">{row.department}</td>
                <td className="py-3 text-sm text-gray-600">{row.level}</td>
                <td className="py-3 text-sm tabular-nums text-gray-600">{row.participants}</td>
                <td className="py-3 text-sm text-gray-600">{row.period}</td>
                <td className="py-3">
                  <ScoreCell value={row.overallScore} tone={row.overallTone} />
                </td>
                <td className="py-3">
                  <ScoreCell
                    value={row.progressionReadiness}
                    tone={row.readinessTone}
                    suffix="%"
                  />
                </td>
                <td className="py-3">
                  <ScoreCell value={row.highPotential} tone={row.highPotentialTone} suffix="%" />
                </td>
                <td className="py-3 text-right">
                  <button
                    type="button"
                    aria-label={`Actions for ${row.cohort}`}
                    className="rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                  >
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
