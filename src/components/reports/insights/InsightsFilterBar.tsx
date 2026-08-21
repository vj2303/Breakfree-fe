"use client";

import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Labelled select, styled to sit in the filter strip under the page title. */
function FilterSelect({ label, value, options, onChange, disabled }: FilterConfig) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="relative">
        <select
          value={value}
          disabled={disabled || options.length === 0}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none truncate rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-9 text-sm text-black transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </span>
    </label>
  );
}

export interface InsightsFilterBarProps {
  filters: FilterConfig[];
}

export default function InsightsFilterBar({ filters }: InsightsFilterBarProps) {
  return (
    <div className="grid grid-cols-1 gap-4 border-b border-gray-200 pb-5 sm:grid-cols-2 lg:grid-cols-4">
      {filters.map((filter) => (
        <FilterSelect key={filter.id} {...filter} />
      ))}
    </div>
  );
}
