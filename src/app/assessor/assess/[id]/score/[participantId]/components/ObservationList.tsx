'use client';

import { useState } from 'react';
import { Check, Link2Off, Pencil, Trash2, X } from 'lucide-react';

import { formatClock, isMapped, markerColor } from '../lib/observations';
import type { Observation } from '../lib/observations';

export interface ObservationListProps {
  observations: Observation[];
  /** Pills shown on a mapped observation: competency short title + sub-competency short title. */
  labelsFor: (observation: Observation) => { competency: string; subCompetency: string } | null;
  disabled: boolean;
  onSeek: (timeSec: number) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  /** Map an unmapped note onto the sub-competency currently open in the scoring form. */
  onMapToActive: (id: string) => void;
  activeMappingLabel: string | null;
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
      {children}
    </span>
  );
}

export default function ObservationList({
  observations,
  labelsFor,
  disabled,
  onSeek,
  onEdit,
  onDelete,
  onMapToActive,
  activeMappingLabel,
}: ObservationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  if (observations.length === 0) {
    return (
      <p className="px-1 py-4 text-xs text-gray-500">
        No observations yet. Capture what you see in the evidence and map it to a sub-competency.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {observations.map((observation, index) => {
        const color = markerColor(index);
        const labels = labelsFor(observation);
        const editing = editingId === observation.id;

        return (
          <li key={observation.id} className="flex items-start gap-2.5 py-2.5">
            <button
              type="button"
              onClick={() => observation.timeSec !== null && onSeek(observation.timeSec)}
              disabled={observation.timeSec === null}
              className={`mt-0.5 flex flex-shrink-0 items-center gap-1.5 text-[11px] font-medium tabular-nums ${
                observation.timeSec === null
                  ? 'cursor-default text-gray-400'
                  : `${color.text} hover:underline`
              }`}
              title={observation.timeSec === null ? undefined : 'Jump to this moment'}
            >
              <span className={`h-2 w-2 rounded-full ${color.dot}`} />
              {formatClock(observation.timeSec)}
            </button>

            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex items-start gap-1.5">
                  <textarea
                    rows={2}
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full rounded-lg border border-violet-300 px-2 py-1.5 text-xs text-black focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    aria-label="Save observation"
                    onClick={() => {
                      onEdit(observation.id, draft);
                      setEditingId(null);
                    }}
                    className="mt-0.5 rounded-md p-1 text-green-600 hover:bg-green-50"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel edit"
                    onClick={() => setEditingId(null)}
                    className="mt-0.5 rounded-md p-1 text-gray-400 hover:bg-gray-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  {labels ? (
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      <Tag>{labels.competency}</Tag>
                      <Tag>{labels.subCompetency}</Tag>
                    </div>
                  ) : (
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Link2Off size={12} />
                      Unmapped
                      {activeMappingLabel && !disabled && (
                        <button
                          type="button"
                          onClick={() => onMapToActive(observation.id)}
                          className="font-medium text-violet-600 hover:text-violet-700 hover:underline"
                        >
                          · map to {activeMappingLabel}
                        </button>
                      )}
                    </div>
                  )}
                  <p className="break-words text-xs leading-relaxed text-gray-800">
                    {observation.text}
                  </p>
                </>
              )}
            </div>

            {!editing && (
              <div className="flex flex-shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Edit observation"
                  disabled={disabled}
                  onClick={() => {
                    setEditingId(observation.id);
                    setDraft(observation.text);
                  }}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Delete observation"
                  disabled={disabled}
                  onClick={() => onDelete(observation.id)}
                  className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
