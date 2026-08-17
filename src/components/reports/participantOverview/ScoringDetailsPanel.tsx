"use client";

import React, { useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';

import {
  assessorCompetencyAverage,
  assessorCompetencyComments,
  assessorCompetencyScore,
  badgeStyle,
  competencyMax,
  formatScore,
  mean,
} from './scoring';
import type { AssessorRecord, OverviewActivity, OverviewCompetency } from './types';

export const OVERALL_TAB = '__overall__';

export interface ScoringDetailsPanelProps {
  activities: OverviewActivity[];
  competencies: OverviewCompetency[];
  assessors: AssessorRecord[];
  descriptors: Record<string, unknown> | null;
}

interface ScoreRow {
  competency: OverviewCompetency;
  competencyIndex: number;
  max: number;
  perAssessor: Array<number | null>;
  finalScore: number | null;
}

export default function ScoringDetailsPanel({
  activities,
  competencies,
  assessors,
  descriptors,
}: ScoringDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<string>(
    activities[0]?.activityId ?? OVERALL_TAB
  );
  /** `tab|competencyId` -> moderator override. Held in the UI only. */
  const [moderatorScores, setModeratorScores] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<string | null>(null);

  const isOverall = activeTab === OVERALL_TAB;
  const activeActivity = activities.find((a) => a.activityId === activeTab) ?? null;

  /** Activities in scope for the current tab — one, or all of them on the overall tab. */
  const scopedActivityIds = useMemo(
    () => (isOverall ? activities.map((a) => a.activityId) : activeActivity ? [activeActivity.activityId] : []),
    [isOverall, activities, activeActivity]
  );

  const rows: ScoreRow[] = useMemo(() => {
    const scoped = isOverall
      ? competencies
      : competencies.filter((c) => activeActivity?.competencyIds.includes(c.id));

    return scoped.map((competency) => {
      const competencyIndex = competencies.findIndex((c) => c.id === competency.id);

      const maxes = scopedActivityIds
        .map((activityId) => competencyMax(descriptors, activityId, competency))
        .filter((m) => m > 0);
      const max = maxes.length > 0 ? maxes.reduce((a, b) => a + b, 0) / maxes.length : 0;

      const perAssessor = assessors.map((assessor) =>
        isOverall
          ? assessorCompetencyAverage(assessor, scopedActivityIds, competency)
          : activeActivity
            ? assessorCompetencyScore(assessor, activeActivity.activityId, competency)
            : null
      );

      return {
        competency,
        competencyIndex: competencyIndex >= 0 ? competencyIndex : 0,
        max,
        perAssessor,
        finalScore: mean(perAssessor),
      };
    });
  }, [isOverall, competencies, activeActivity, scopedActivityIds, assessors, descriptors]);

  const moderatorValue = (competencyId: string, finalScore: number | null): string => {
    const key = `${activeTab}|${competencyId}`;
    if (moderatorScores[key] !== undefined) return moderatorScores[key];
    return finalScore === null ? '' : finalScore.toFixed(1);
  };

  const totals = useMemo(() => {
    const sum = (values: Array<number | null>) =>
      values.some((v) => v !== null)
        ? values.reduce<number>((acc, v) => acc + (v ?? 0), 0)
        : null;

    return {
      max: rows.reduce((acc, row) => acc + row.max, 0),
      perAssessor: assessors.map((_, index) => sum(rows.map((row) => row.perAssessor[index]))),
      finalScore: sum(rows.map((row) => row.finalScore)),
      moderator: rows.reduce((acc, row) => {
        const raw = moderatorValue(row.competency.id, row.finalScore);
        const parsed = parseFloat(raw);
        return acc + (Number.isNaN(parsed) ? 0 : parsed);
      }, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, assessors, moderatorScores, activeTab]);

  const tabs = [
    ...activities.map((activity) => ({ id: activity.activityId, label: activity.name })),
    { id: OVERALL_TAB, label: 'Overall competency average' },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-bold text-black">Scoring Details</h3>

      <div className="mt-4 flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setOpenComments(null);
              }}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-violet-600 text-white'
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {assessors.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
          No assessor has submitted scores for this participant yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 align-bottom text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <th className="w-[28%] py-3 pr-4">Competency</th>
                <th className="py-3 pr-4">
                  Max
                  <br />
                  Score
                </th>
                {assessors.map((assessor) => {
                  const [first, ...rest] = assessor.name.split(' ');
                  return (
                    <th key={assessor.id} className="py-3 pr-4">
                      {first}
                      <br />
                      {rest.join(' ')}
                    </th>
                  );
                })}
                <th className="py-3 pr-4">
                  Final Score
                  <br />
                  (Avg.)
                </th>
                <th className="py-3 pr-4">
                  Moderator Score
                  <br />
                  (Editable)
                </th>
                <th className="py-3">Comments</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={assessors.length + 5}
                    className="py-8 text-center text-sm text-gray-500"
                  >
                    No competencies are mapped to this activity.
                  </td>
                </tr>
              )}

              {rows.map((row) => {
                const commentsKey = `${activeTab}|${row.competency.id}`;
                const isCommentsOpen = openComments === commentsKey;

                return (
                  <React.Fragment key={row.competency.id}>
                    <tr className="border-b border-gray-100">
                      <td className="py-4 pr-4">
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex-shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${badgeStyle(
                              row.competencyIndex
                            )}`}
                          >
                            {row.competency.code}
                          </span>
                          <span className="text-sm text-black">{row.competency.label}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-sm tabular-nums text-black">
                        {row.max > 0 ? formatScore(row.max, row.max % 1 === 0 ? 0 : 1) : '—'}
                      </td>
                      {row.perAssessor.map((score, index) => (
                        <td
                          key={assessors[index].id}
                          className="py-4 pr-4 text-sm tabular-nums text-black"
                        >
                          {formatScore(score)}
                        </td>
                      ))}
                      <td className="py-4 pr-4 text-sm font-bold tabular-nums text-black">
                        {formatScore(row.finalScore)}
                      </td>
                      <td className="py-4 pr-4">
                        <input
                          type="number"
                          min={0}
                          max={row.max || undefined}
                          step="0.1"
                          value={moderatorValue(row.competency.id, row.finalScore)}
                          onChange={(e) =>
                            setModeratorScores((prev) => ({
                              ...prev,
                              [`${activeTab}|${row.competency.id}`]: e.target.value,
                            }))
                          }
                          className="w-20 rounded-lg border border-violet-200 px-3 py-1.5 text-sm font-semibold tabular-nums text-violet-700 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </td>
                      <td className="py-4">
                        <button
                          type="button"
                          aria-label={`Comments for ${row.competency.label}`}
                          aria-expanded={isCommentsOpen}
                          onClick={() => setOpenComments(isCommentsOpen ? null : commentsKey)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                            isCommentsOpen
                              ? 'border-violet-300 bg-violet-50 text-violet-600'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <MessageSquare size={15} />
                        </button>
                      </td>
                    </tr>

                    {isCommentsOpen && (
                      <tr className="border-b border-gray-100 bg-gray-50/70">
                        <td colSpan={assessors.length + 5} className="px-1 py-4">
                          <div className="space-y-3">
                            {assessors.map((assessor) => {
                              const comments = scopedActivityIds.flatMap((activityId) =>
                                assessorCompetencyComments(assessor, activityId, row.competency)
                              );
                              return (
                                <div key={assessor.id}>
                                  <p className="text-xs font-semibold text-black">
                                    {assessor.name}
                                  </p>
                                  {comments.length === 0 ? (
                                    <p className="text-xs text-gray-400">No comments recorded.</p>
                                  ) : (
                                    <ul className="mt-1 space-y-1">
                                      {comments.map((entry, index) => (
                                        <li
                                          key={`${assessor.id}-${index}`}
                                          className="text-xs leading-relaxed text-gray-700"
                                        >
                                          <span className="font-medium text-gray-500">
                                            {entry.subCompetency}:
                                          </span>{' '}
                                          {entry.comment}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {rows.length > 0 && (
                <tr className="border-t-2 border-gray-200">
                  <td className="py-4 pr-4 text-sm font-bold text-black">Total</td>
                  <td className="py-4 pr-4 text-sm font-bold tabular-nums text-black">
                    {formatScore(totals.max, totals.max % 1 === 0 ? 0 : 1)}
                  </td>
                  {totals.perAssessor.map((total, index) => (
                    <td
                      key={assessors[index].id}
                      className="py-4 pr-4 text-sm font-bold tabular-nums text-black"
                    >
                      {formatScore(total)}
                    </td>
                  ))}
                  <td className="py-4 pr-4 text-sm font-bold tabular-nums text-black">
                    {formatScore(totals.finalScore)}
                  </td>
                  <td className="py-4 pr-4 text-sm font-bold tabular-nums text-black">
                    {formatScore(totals.moderator)}
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
