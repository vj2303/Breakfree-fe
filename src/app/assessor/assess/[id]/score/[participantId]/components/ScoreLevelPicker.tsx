'use client';

import {
  getLevelLabels,
  getSortedScoreKeysFromDescriptions,
  normalizeStoredToLevel,
  parseScoreKeyLevel,
} from '../lib/rubric';

export interface ScoreLevelPickerProps {
  /** Unique per sub-competency so the radio group does not bleed across rows. */
  name: string;
  scoreDescriptions: Record<string, string>;
  currentScore: number;
  selectedScoreKey?: string;
  disabled?: boolean;
  onSelectLevel: (level: number, scoreKey: string) => void;
  onNumericChange: (score: number) => void;
}

export default function ScoreLevelPicker({
  name,
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
  // legacy 0–10 values keep resolving to the same option.
  const highlightKey =
    selectedScoreKey && scoreKeys.includes(selectedScoreKey)
      ? selectedScoreKey
      : (() => {
          const level = normalizeStoredToLevel(currentScore, scoreKeys.length);
          return level >= 1 ? scoreKeys[level - 1] : undefined;
        })();
  const labels = getLevelLabels(scoreKeys.length);

  return (
    <div className="space-y-1.5">
      {scoreKeys.map((key, index) => {
        const level = parseScoreKeyLevel(key);
        const isSelected = highlightKey === key;
        const label = labels ? labels[index] : null;

        return (
          <label
            key={key}
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
              isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="radio"
              name={name}
              checked={isSelected}
              disabled={disabled}
              onChange={() => onSelectLevel(level, key)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-violet-600"
            />
            <span className="min-w-0 text-xs leading-relaxed text-gray-800">
              <span className="font-semibold text-gray-900">{level}.</span>{' '}
              {scoreDescriptions[key] || 'No description'}
              {label && <span className="ml-1 text-[11px] text-gray-400">({label})</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
