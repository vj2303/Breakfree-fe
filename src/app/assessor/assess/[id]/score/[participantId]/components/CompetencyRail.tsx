'use client';

import { CheckCircle2 } from 'lucide-react';

import {
  getCompetencyProgress,
  isSubCompetencyScored,
  parseScoreKeyLevel,
} from '../lib/rubric';
import type { Competency, ScoresByCompetency, SelectedKeysByCompetency } from '../lib/types';

export interface CompetencyRailProps {
  competencies: Competency[];
  activeCompetencyId: string | null;
  activeSubCompIndex: number;
  selectedKeys: SelectedKeysByCompetency | undefined;
  scores: ScoresByCompetency | undefined;
  onSelectCompetency: (competencyId: string) => void;
  onSelectSubCompetency: (competencyId: string, index: number) => void;
}

/** The level to show in the active sub-competency's badge, or null when nothing is scored. */
function activeBadgeLevel(
  selectedScoreKey: string | undefined,
  score: number | undefined
): number | null {
  if (selectedScoreKey) return parseScoreKeyLevel(selectedScoreKey);
  if (typeof score === 'number' && score > 0) return Math.round(score);
  return null;
}

export default function CompetencyRail({
  competencies,
  activeCompetencyId,
  activeSubCompIndex,
  selectedKeys,
  scores,
  onSelectCompetency,
  onSelectSubCompetency,
}: CompetencyRailProps) {
  const activeIndex = Math.max(
    0,
    competencies.findIndex((c) => c.id === activeCompetencyId)
  );

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-baseline justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-black">Competencies in this Activity</h3>
        <span className="text-xs text-gray-500">{competencies.length} Total</span>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {competencies.length === 0 && (
          <p className="px-1 py-2 text-xs text-gray-500">
            No competencies are configured for this activity.
          </p>
        )}

        {competencies.map((competency, index) => {
          const isActive = index === activeIndex;
          const { scored, total, complete } = getCompetencyProgress(
            competency,
            selectedKeys,
            scores
          );
          const title = competency.competencyName.split('\t')[0] || competency.competencyName;

          return (
            <div
              key={competency.id}
              className={`rounded-lg border ${
                isActive
                  ? 'border-violet-300 bg-violet-50/40 ring-1 ring-violet-200'
                  : 'border-gray-200'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectCompetency(competency.id)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                    isActive ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-black">{title}</span>
                  <span className="block text-xs text-gray-500">
                    {scored} / {total} sub-competencies scored
                  </span>
                </span>
                {complete ? (
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-green-600" />
                ) : (
                  <span className="mt-1 h-4 w-4 flex-shrink-0 rounded-full border border-gray-300" />
                )}
              </button>

              {isActive && (
                <div className="space-y-1 border-t border-violet-200/70 px-2 py-2">
                  {competency.subCompetencyNames.map((subComp, subIndex) => {
                    const subTitle = subComp.split('\t')[0] || subComp;
                    const selectedScoreKey = selectedKeys?.[competency.id]?.[subComp];
                    const score = scores?.[competency.id]?.[subComp];
                    const isActiveSub = subIndex === activeSubCompIndex;
                    const scored = isSubCompetencyScored(selectedScoreKey, score);
                    const badgeLevel = activeBadgeLevel(selectedScoreKey, score);

                    return (
                      <button
                        key={subComp}
                        type="button"
                        onClick={() => onSelectSubCompetency(competency.id, subIndex)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left ${
                          isActiveSub ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                        }`}
                      >
                        <span className="min-w-0 flex-1 text-xs text-gray-700">
                          <span className="mr-1.5 font-medium text-gray-500">
                            {index + 1}.{subIndex + 1}
                          </span>
                          {subTitle}
                        </span>
                        {isActiveSub && badgeLevel !== null ? (
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-semibold text-white">
                            {badgeLevel}
                          </span>
                        ) : scored ? (
                          <CheckCircle2 size={16} className="flex-shrink-0 text-green-600" />
                        ) : (
                          <span className="h-4 w-4 flex-shrink-0 rounded-full border border-gray-300" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200 px-4 py-3">
        <p className="mb-1.5 text-xs font-medium text-gray-700">Legend</p>
        <div className="space-y-1 text-xs text-gray-600">
          <p className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            Completed
          </p>
          <p className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            In Progress
          </p>
          <p className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            Not Started
          </p>
        </div>
      </div>
    </div>
  );
}
