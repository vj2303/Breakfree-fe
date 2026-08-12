'use client';

import { ChevronDown, SlidersHorizontal } from 'lucide-react';

import { FILTERS } from '../data';

/**
 * Presentational only. None of these dimensions exist on the participant model yet, so each
 * select carries a single "All …" option and changes nothing.
 */
export default function FilterBar() {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {FILTERS.map((filter) => (
        <label key={filter.id} className="min-w-[150px] flex-1">
          <span className="mb-1.5 block text-xs font-medium text-gray-500">{filter.label}</span>
          <span className="relative block">
            <select
              defaultValue={filter.options[0]}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-9 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
            >
              {filter.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </span>
        </label>
      ))}

      <button
        type="button"
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <SlidersHorizontal size={16} />
        Filters
      </button>
    </div>
  );
}
