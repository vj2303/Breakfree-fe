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
  roundToDisplay,
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
  const activitiesInScope = useMemo(
    () => (isOverall ? activities : activeActivity ? [activeActivity] : []),
    [isOverall, activities, activeActivity]
  );

  const scopedActivityIds = useMemo(
    () => activitiesInScope.map((activity) => activity.activityId),
    [activitiesInScope]
  );

  const rows: ScoreRow[] = useMemo(() => {
    const scoped = isOverall
      ? competencies
      : competencies.filter((c) => activeActivity?.competencyIds.includes(c.id));

    return scoped.map((competency) => {
      const competencyIndex = competencies.findIndex((c) => c.id === competency.id);

      // An exercise that does not assess this competency must not contribute
      // to its maximum or its average. The centre's own configuration says
      // which competencies an exercise covers; inferring it from the rubric
      // counted an uncovered exercise as a 10-point numeric row, which is what
      // pushed maxima above 5.
      const assessingActivityIds = activitiesInScope
        .filter((activity) => activity.competencyIds.includes(competency.id))
        .map((activity) => activity.activityId);

      const maxes = assessingActivityIds
        .map((activityId) => competencyMax(descriptors, activityId, competency))
        .filter((m) => m > 0);
      const max = maxes.length > 0 ? maxes.reduce((a, b) => a + b, 0) / maxes.length : 0;

      const perAssessor = assessors.map((assessor) =>
        isOverall
          ? assessorCompetencyAverage(assessor, assessingActivityIds, competency)
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
  }, [isOverall, competencies, activeActivity, activitiesInScope, assessors, descriptors]);

  const moderatorValue = (competencyId: string, finalScore: number | null): string => {
    const key = `${activeTab}|${competencyId}`;
    if (moderatorScores[key] !== undefined) return moderatorScores[key];
    return finalScore === null ? '' : finalScore.toFixed(1);
  };

  const totals = useMemo(() => {
    // Add the rounded figures, not the raw ones: a column of displayed numbers
    // has to add up to the displayed total.
    const sum = (values: Array<number | null>) =>
      values.some((v) => v !== null)
        ? roundToDisplay(
            values.reduce<number>((acc, v) => acc + (v === null ? 0 : roundToDisplay(v)), 0)
          )
        : null;

    return {
      max: roundToDisplay(rows.reduce((acc, row) => acc + roundToDisplay(row.max), 0)),
      perAssessor: assessors.map((_, index) => sum(rows.map((row) => row.perAssessor[index]))),
      finalScore: sum(rows.map((row) => row.finalScore)),
      moderator: roundToDisplay(
        rows.reduce((acc, row) => {
          const raw = moderatorValue(row.competency.id, row.finalScore);
          const parsed = parseFloat(raw);
          return acc + (Number.isNaN(parsed) ? 0 : parsed);
        }, 0)
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, assessors, moderatorScores, activeTab]);

  /**
   * Every assessor comment in scope, grouped by competency, so an admin can
   * read the whole picture for a tab without opening each row's icon. The
   * per-row icon stays for reading one competency in place.
   *
   * On an activity tab the activity is implied, so it is left off each entry;
   * on the overall tab the same competency carries comments from several
   * activities, so each one is labelled.
   */
  const commentGroups = useMemo(() => {
    return rows
      .map((row) => {
        const entries: Array<{
          assessorName: string;
          activityName: string | null;
          subCompetency: string;
          comment: string;
        }> = [];

        // Deliberately not filtered by the activity's configured competencies:
        // a comment that exists is evidence an assessor recorded, and skipping
        // it because the centre's configuration does not list that pairing
        // would silently hide real feedback. Groups that end up empty are
        // dropped below, so nothing shows a heading with no content.
        activitiesInScope.forEach((activity) => {
          assessors.forEach((assessor) => {
            assessorCompetencyComments(assessor, activity.activityId, row.competency).forEach(
              ({ subCompetency, comment }) => {
                entries.push({
                  assessorName: assessor.name,
                  activityName: isOverall ? activity.name : null,
                  subCompetency,
                  comment,
                });
              }
            );
          });
        });

        return { competency: row.competency, competencyIndex: row.competencyIndex, entries };
      })
      .filter((group) => group.entries.length > 0);
  }, [rows, activitiesInScope, assessors, isOverall]);

  /**
   * Comments an assessor left on the activity as a whole, or on the submission
   * overall, rather than against a competency. They are assessor feedback too,
   * and are otherwise unreachable from this screen.
   */
  const generalComments = useMemo(() => {
    const out: Array<{
      assessorName: string;
      label: string;
      comment: string;
    }> = [];

    assessors.forEach((assessor) => {
      activitiesInScope.forEach((activity) => {
        const comment = assessor.activityComments?.[activity.activityId];
        if (comment && comment.trim()) {
          out.push({
            assessorName: assessor.name,
            label: isOverall ? activity.name : 'This activity',
            comment: comment.trim(),
          });
        }
      });

      if (isOverall && assessor.overallComments && assessor.overallComments.trim()) {
        out.push({
          assessorName: assessor.name,
          label: 'Overall',
          comment: assessor.overallComments.trim(),
        });
      }
    });

    return out;
  }, [assessors, activitiesInScope, isOverall]);

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

      {assessors.length > 0 && (
        <section className="mt-8 border-t border-gray-200 pt-6">
          <h4 className="text-sm font-bold text-black">Assessor Comments</h4>
          <p className="mt-0.5 text-xs text-gray-500">
            {isOverall
              ? 'Every comment recorded across all activities, grouped by competency.'
              : `Comments recorded for ${activeActivity?.name ?? 'this activity'}, grouped by competency.`}
          </p>

          {commentGroups.length === 0 && generalComments.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
              No comments recorded.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {commentGroups.map((group) => (
                <div key={group.competency.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${badgeStyle(
                        group.competencyIndex
                      )}`}
                    >
                      {group.competency.code}
                    </span>
                    <span className="text-sm font-semibold text-black">
                      {group.competency.label}
                    </span>
                  </div>

                  <ul className="mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
                    {group.entries.map((entry, index) => (
                      <li key={`${group.competency.id}-${index}`}>
                        <p className="text-[11px] text-gray-500">
                          <span className="font-semibold text-gray-700">{entry.assessorName}</span>
                          {entry.activityName && <> · {entry.activityName}</>}
                          {' · '}
                          {entry.subCompetency}
                        </p>
                        <p className="text-sm leading-snug text-gray-800">{entry.comment}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {generalComments.length > 0 && (
                <div>
                  <span className="text-sm font-semibold text-black">General comments</span>
                  <ul className="mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
                    {generalComments.map((entry, index) => (
                      <li key={`general-${index}`}>
                        <p className="text-[11px] text-gray-500">
                          <span className="font-semibold text-gray-700">{entry.assessorName}</span>
                          {' · '}
                          {entry.label}
                        </p>
                        <p className="text-sm leading-snug text-gray-800">{entry.comment}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
