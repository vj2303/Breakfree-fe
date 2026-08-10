'use client';

import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

import {
  NUMERIC_SCORE_COMMENT_KEY,
  getCommentForScoreKey,
  getSortedScoreKeysFromDescriptions,
  isSubCompetencyScored,
} from '../lib/rubric';
import type { Competency } from '../lib/types';
import ScoreLevelPicker from './ScoreLevelPicker';

export interface CompetencyScoreCardProps {
  competency: Competency;
  competencyIndex: number; // 0-based, for "Competency i of N"
  competencyCount: number;
  activeSubCompIndex: number;
  onActiveSubCompChange: (index: number) => void;
  scoreDescriptionsFor: (subComp: string) => Record<string, string>;
  scores: Record<string, number> | undefined;
  selectedKeys: Record<string, string> | undefined;
  notes: Record<string, Record<string, string>> | undefined;
  disabled: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectLevel: (subComp: string, level: number, scoreKey: string) => void;
  onNumericChange: (subComp: string, score: number) => void;
  onNoteChange: (subComp: string, value: string) => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled: boolean;
}

export default function CompetencyScoreCard({
  competency,
  competencyIndex,
  competencyCount,
  activeSubCompIndex,
  onActiveSubCompChange,
  scoreDescriptionsFor,
  scores,
  selectedKeys,
  notes,
  disabled,
  collapsed,
  onToggleCollapsed,
  onSelectLevel,
  onNumericChange,
  onNoteChange,
  onNext,
  nextLabel,
  nextDisabled,
}: CompetencyScoreCardProps) {
  // Competency and sub-competency names may carry "\t<description>".
  const [title, ...descriptionParts] = competency.competencyName.split('\t');
  const description = descriptionParts.join(' ').trim();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">
            Competency {competencyIndex + 1} of {competencyCount}
          </p>
          <h3 className="text-lg font-semibold text-black">{title || competency.competencyName}</h3>
          {description && <p className="mt-0.5 text-sm text-gray-600">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {collapsed ? 'Expand' : 'Collapse'}
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="mt-4 space-y-2">
            {competency.subCompetencyNames.map((subComp, index) => {
              const subTitle = subComp.split('\t')[0] || subComp;
              const numbering = `${competencyIndex + 1}.${index + 1}`;
              const scored = isSubCompetencyScored(selectedKeys?.[subComp], scores?.[subComp]);

              if (index !== activeSubCompIndex) {
                return (
                  <button
                    key={subComp}
                    type="button"
                    onClick={() => onActiveSubCompChange(index)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left hover:border-gray-300 hover:bg-gray-50"
                  >
                    <span className="min-w-0 text-xs text-gray-700">
                      <span className="mr-1.5 font-medium text-gray-500">{numbering}</span>
                      {subTitle}
                    </span>
                    {scored ? (
                      <CheckCircle2 size={16} className="flex-shrink-0 text-green-600" />
                    ) : (
                      <span className="h-4 w-4 flex-shrink-0 rounded-full border border-gray-300" />
                    )}
                  </button>
                );
              }

              const scoreDescriptions = scoreDescriptionsFor(subComp);
              const scoreKeys = getSortedScoreKeysFromDescriptions(scoreDescriptions);
              const selectedScoreKey = selectedKeys?.[subComp];
              const effectiveNoteKey = selectedScoreKey ?? NUMERIC_SCORE_COMMENT_KEY;
              const noteValue = getCommentForScoreKey(notes?.[subComp], effectiveNoteKey, {
                isFirstScoreKey: effectiveNoteKey === scoreKeys[0],
              });

              return (
                <div
                  key={subComp}
                  className="rounded-lg border border-violet-200 bg-violet-50/30 p-3"
                >
                  <p className="text-xs font-medium text-gray-500">Sub-Competency {numbering}</p>
                  <p className="mb-3 text-sm text-black">{subTitle}</p>

                  <ScoreLevelPicker
                    scoreDescriptions={scoreDescriptions}
                    currentScore={scores?.[subComp] ?? 0}
                    selectedScoreKey={selectedScoreKey}
                    disabled={disabled}
                    onSelectLevel={(level, scoreKey) => onSelectLevel(subComp, level, scoreKey)}
                    onNumericChange={(score) => onNumericChange(subComp, score)}
                  />

                  <div className="mt-3 border-t border-violet-200/70 pt-3">
                    <label className="block text-xs font-semibold text-black">
                      Evidence / Behavioural Notes
                    </label>
                    <p className="mb-1.5 text-xs text-gray-500">
                      Provide specific examples from the evidence to support the score.
                    </p>
                    <textarea
                      rows={4}
                      maxLength={1000}
                      value={noteValue}
                      disabled={disabled}
                      onChange={(e) => onNoteChange(subComp, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-black focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder={`Notes for ${subTitle}…`}
                    />
                    <p className="mt-1 text-right text-[11px] text-gray-400">
                      Characters: {noteValue.length}/1000
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:bg-gray-300"
            >
              {nextLabel}
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
