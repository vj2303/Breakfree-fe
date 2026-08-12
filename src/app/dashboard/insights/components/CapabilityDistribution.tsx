'use client';

import { Info } from 'lucide-react';

import { LEVEL_DISTRIBUTION } from '../data';

const BANDS = [
  { key: 'high' as const, label: 'High (80-100)', swatch: 'bg-gray-800', fill: 'bg-gray-800' },
  { key: 'medium' as const, label: 'Medium (60-79)', swatch: 'bg-gray-400', fill: 'bg-gray-400' },
  { key: 'low' as const, label: 'Low (<60)', swatch: 'bg-gray-200', fill: 'bg-gray-200' },
];

const AXIS_TICKS = [0, 25, 50, 75, 100];

export default function CapabilityDistribution() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-gray-900">
          Capability Distribution by Level
          <Info size={14} className="text-gray-400" />
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {BANDS.map((band) => (
            <span key={band.key} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className={`h-2.5 w-2.5 rounded-sm ${band.swatch}`} />
              {band.label}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {LEVEL_DISTRIBUTION.map((row) => (
          <div key={row.level} className="flex items-center gap-3">
            <span className="w-36 flex-shrink-0 text-xs text-gray-600">{row.level}</span>
            <div className="flex h-7 min-w-0 flex-1 overflow-hidden rounded">
              {BANDS.map((band) => {
                const value = row[band.key];
                if (value <= 0) return null;
                return (
                  <div
                    key={band.key}
                    className={`flex items-center justify-center ${band.fill}`}
                    style={{ width: `${value}%` }}
                    title={`${row.level} — ${band.label}: ${value}%`}
                  >
                    <span
                      className={`text-[11px] font-medium ${
                        band.key === 'low' ? 'text-gray-700' : 'text-white'
                      }`}
                    >
                      {value}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-3">
        <span className="w-36 flex-shrink-0" />
        <div className="flex min-w-0 flex-1 justify-between text-[11px] text-gray-400">
          {AXIS_TICKS.map((tick) => (
            <span key={tick}>{tick}%</span>
          ))}
        </div>
      </div>
      <p className="mt-1 pl-[9.75rem] text-[11px] text-gray-500">% of Participants</p>
    </section>
  );
}
