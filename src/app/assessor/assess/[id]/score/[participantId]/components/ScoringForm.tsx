'use client';

import { ArrowRight, ChevronDown, ChevronUp, Pencil, RotateCcw } from 'lucide-react';

import {
  NUMERIC_SCORE_COMMENT_KEY,
  getCommentForScoreKey,
  getCompetencyScoreTotals,
  getSortedScoreKeysFromDescriptions,
  getSubCompetencyScore,
} from '../lib/rubric';
import { formatClock } from '../lib/observations';
import type { Observation } from '../lib/observations';
import type { Competency } from '../lib/types';
import ScoreLevelPicker from './ScoreLevelPicker';

export interface ReportDescriptorState {
  text: string;
  include: boolean;
  /** True once the assessor has hand-edited the generated text. */
  edited: boolean;
}

export interface ScoringFormProps {
  competency: Competency;
  competencyIndex: number; // 0-based, drives the "1.2" numbering
  competencyCount: number;
  activeSubCompIndex: number;
  onActiveSubCompChange: (index: number) => void;
  scoreDescriptionsFor: (subComp: string) => Record<string, string>;
  scores: Record<string, number> | undefined;
  selectedKeys: Record<string, string> | undefined;
  notes: Record<string, Record<string, string>> | undefined;
  disabled: boolean;
  observationsFor: (subComp: string) => Observation[];
  reportDescriptorFor: (subComp: string) => ReportDescriptorState;
  onReportDescriptorChange: (subComp: string, text: string) => void;
  onReportDescriptorReset: (subComp: string) => void;
  onReportDescriptorIncludeChange: (subComp: string, include: boolean) => void;
  onSelectLevel: (subComp: string, level: number, scoreKey: string) => void;
  onNumericChange: (subComp: string, score: number) => void;
  onNoteChange: (subComp: string, value: string) => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs font-semibold text-black">{children}</p>
  );
}

export default function ScoringForm({
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
  observationsFor,
  reportDescriptorFor,
  onReportDescriptorChange,
  onReportDescriptorReset,
  onReportDescriptorIncludeChange,
  onSelectLevel,
  onNumericChange,
  onNoteChange,
  onNext,
  nextLabel,
  nextDisabled,
}: ScoringFormProps) {
  // Competency and sub-competency names may carry "\t<description>".
  const [title, ...descriptionParts] = competency.competencyName.split('\t');
  const competencyDescription = descriptionParts.join(' ').trim();
  const totals = getCompetencyScoreTotals(
    competency,
    scoreDescriptionsFor,
    selectedKeys,
    scores
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Scoring Form
          </p>
          <p className="text-[11px] text-gray-400">
            Competency {competencyIndex + 1} of {competencyCount}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-black">
            {title || competency.competencyName}
          </h3>
          <p className="text-xs font-medium text-gray-600">
            Competency Score:{' '}
            <span className="font-semibold tabular-nums text-black">
              {totals.value} / {totals.max}
            </span>
          </p>
        </div>
        {competencyDescription && (
          <p className="mt-1 text-xs text-gray-500">{competencyDescription}</p>
        )}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {competency.subCompetencyNames.map((subComp, index) => {
          const [subTitle, ...subDescriptionParts] = subComp.split('\t');
          const behaviouralDescriptor = subDescriptionParts.join(' ').trim();
          const numbering = `${competencyIndex + 1}.${index + 1}`;
          const scoreDescriptions = scoreDescriptionsFor(subComp);
          const { value, max } = getSubCompetencyScore(
            scoreDescriptions,
            selectedKeys?.[subComp],
            scores?.[subComp]
          );
          const isOpen = index === activeSubCompIndex;

          if (!isOpen) {
            return (
              <button
                key={subComp}
                type="button"
                onClick={() => onActiveSubCompChange(index)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                <span className="min-w-0 text-xs text-gray-800">
                  <span className="mr-1.5 font-medium text-gray-500">{numbering}</span>
                  {subTitle || subComp}
                </span>
                <span className="flex flex-shrink-0 items-center gap-2 text-xs text-gray-600">
                  <span className="tabular-nums">
                    Score {value} / {max}
                  </span>
                  <ChevronDown size={15} className="text-gray-400" />
                </span>
              </button>
            );
          }

          const scoreKeys = getSortedScoreKeysFromDescriptions(scoreDescriptions);
          const selectedScoreKey = selectedKeys?.[subComp];
          const effectiveNoteKey = selectedScoreKey ?? NUMERIC_SCORE_COMMENT_KEY;
          const noteValue = getCommentForScoreKey(notes?.[subComp], effectiveNoteKey, {
            isFirstScoreKey: effectiveNoteKey === scoreKeys[0],
          });
          const relevantObservations = observationsFor(subComp);
          const reportDescriptor = reportDescriptorFor(subComp);

          return (
            <div
              key={subComp}
              className="rounded-lg border-2 border-violet-300 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-xs font-semibold text-black">
                  <span className="mr-1.5 font-medium text-gray-500">{numbering}</span>
                  {subTitle || subComp}
                </p>
                <span className="flex flex-shrink-0 items-center gap-2 text-xs text-gray-600">
                  <span className="tabular-nums">
                    Score {value} / {max}
                  </span>
                  <ChevronUp size={15} className="text-gray-400" />
                </span>
              </div>

              {behaviouralDescriptor && (
                <div className="mt-3">
                  <SectionLabel>Behavioural descriptor</SectionLabel>
                  <p className="text-xs leading-relaxed text-gray-600">{behaviouralDescriptor}</p>
                </div>
              )}

              <div className="mt-3">
                <ScoreLevelPicker
                  name={`${competency.id}-${index}`}
                  scoreDescriptions={scoreDescriptions}
                  currentScore={scores?.[subComp] ?? 0}
                  selectedScoreKey={selectedScoreKey}
                  disabled={disabled}
                  onSelectLevel={(level, scoreKey) => onSelectLevel(subComp, level, scoreKey)}
                  onNumericChange={(score) => onNumericChange(subComp, score)}
                />
              </div>

              <div className="mt-4">
                <SectionLabel>Relevant observations</SectionLabel>
                {relevantObservations.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No observations mapped to this sub-competency yet.
                  </p>
                ) : (
                  <ul className="list-disc space-y-1 pl-4">
                    {relevantObservations.map((observation) => (
                      <li key={observation.id} className="text-xs leading-relaxed text-gray-700">
                        {observation.timeSec !== null && (
                          <span className="mr-1.5 font-medium tabular-nums text-violet-600">
                            {formatClock(observation.timeSec)}
                          </span>
                        )}
                        {observation.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4">
                <SectionLabel>Assessor&apos;s Comments</SectionLabel>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={noteValue}
                  disabled={disabled}
                  onChange={(e) => onNoteChange(subComp, e.target.value)}
                  placeholder="Assessor's Comments"
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs text-black focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-1 text-right text-[11px] text-gray-400">
                  {noteValue.length}/1000
                </p>
              </div>

              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <SectionLabel>Report Descriptor</SectionLabel>
                  {reportDescriptor.edited ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onReportDescriptorReset(subComp)}
                      className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50"
                    >
                      <RotateCcw size={12} />
                      Reset to rubric text
                    </button>
                  ) : (
                    <span className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-gray-400">
                      <Pencil size={12} />
                      Edit / Refine
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={reportDescriptor.text}
                  disabled={disabled}
                  onChange={(e) => onReportDescriptorChange(subComp, e.target.value)}
                  placeholder="Pick a score to generate the report descriptor, or write your own."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs leading-relaxed text-gray-800 focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={reportDescriptor.include}
                    disabled={disabled}
                    onChange={(e) => onReportDescriptorIncludeChange(subComp, e.target.checked)}
                    className="h-3.5 w-3.5 accent-violet-600"
                  />
                  This descriptor will be included in the final report
                </label>
              </div>
            </div>
          );
        })}

        <div className="flex justify-end pt-2">
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
      </div>
    </div>
  );
}
