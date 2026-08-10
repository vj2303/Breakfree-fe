'use client';

import {
  getLevelLabels,
  getSortedScoreKeysFromDescriptions,
  normalizeStoredToLevel,
  parseScoreKeyLevel,
} from '../lib/rubric';

export interface ScoreLevelPickerProps {
  scoreDescriptions: Record<string, string>;
  currentScore: number;
  selectedScoreKey?: string;
  disabled?: boolean;
  onSelectLevel: (level: number, scoreKey: string) => void;
  onNumericChange: (score: number) => void;
}

export default function ScoreLevelPicker({
  scoreDescriptions,
  currentScore,
  selectedScoreKey,
  disabled,
  onSelectLevel,
  onNumericChange,
}: ScoreLevelPickerProps) {
  const scoreKeys = getSortedScoreKeysFromDescriptions(scoreDescriptions);

  // No rubric descriptors for this sub-competency: fall back to a plain 0–10 score.
  if (scoreKeys.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={currentScore || 0}
            disabled={disabled}
            onChange={(e) => onNumericChange(parseFloat(e.target.value) || 0)}
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span className="text-sm text-gray-500">/ 10</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          No rubric descriptors are configured for this sub-competency, so it is scored out of 10.
        </p>
      </div>
    );
  }

  // Resolve the highlighted level the same way the previous picker did, so stored ticks and
  // legacy 0–10 values keep resolving to the same circle.
  const highlightKey =
    selectedScoreKey && scoreKeys.includes(selectedScoreKey)
      ? selectedScoreKey
      : (() => {
          const level = normalizeStoredToLevel(currentScore, scoreKeys.length);
          return level >= 1 ? scoreKeys[level - 1] : undefined;
        })();
  const labels = getLevelLabels(scoreKeys.length);
  const highlightIndex = highlightKey ? scoreKeys.indexOf(highlightKey) : -1;
  const highlightLabel = labels && highlightIndex >= 0 ? labels[highlightIndex] : null;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
      <div className="flex flex-wrap gap-3 lg:flex-1">
        {scoreKeys.map((key, index) => {
          const level = parseScoreKeyLevel(key);
          const isSelected = highlightKey === key;
          const label = labels ? labels[index] : null;
          return (
            <div key={key} className="flex w-[104px] flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSelectLevel(level, key)}
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={`Score ${level}${label ? `: ${label}` : ''}`}
                className={`flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'border-violet-600 bg-violet-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-violet-400'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {level}
              </button>
              {label && (
                <span className="text-center text-[11px] leading-tight text-gray-500">{label}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="lg:w-80 lg:flex-shrink-0">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          {highlightKey ? (
            <>
              <p className="mb-1 text-xs font-semibold text-black">
                Descriptor for Score {parseScoreKeyLevel(highlightKey)}
                {highlightLabel ? ` – ${highlightLabel}` : ''}
              </p>
              <p className="text-xs leading-relaxed text-gray-700">
                {scoreDescriptions[highlightKey] || 'No description'}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-500">Select a score to see its descriptor.</p>
          )}
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-violet-600 hover:text-violet-700">
            View descriptors for all scores
          </summary>
          <div className="mt-2 space-y-2">
            {scoreKeys.map((key) => (
              <p key={key} className="text-xs leading-relaxed text-gray-700">
                <span className="font-medium text-gray-900">
                  Score {parseScoreKeyLevel(key)}:{' '}
                </span>
                {scoreDescriptions[key] || 'No description'}
              </p>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
