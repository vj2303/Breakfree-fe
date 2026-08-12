"use client";

import React from 'react';
import { Search } from 'lucide-react';

interface CompetencyData {
  competencyId: string;
  competencyName: string;
  averageScore: number;
}

interface CompetencyCardProps {
  competencies: CompetencyData[];
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/** Scores are on a 0-5 scale, matching the gauge this table replaced. */
const MAX_SCORE = 5;

const CompetencyCard: React.FC<CompetencyCardProps> = ({
  competencies,
  searchValue,
  onSearchChange,
}) => {
  // Weakest first, so the competencies needing attention lead.
  const ranked = [...competencies].sort((a, b) => a.averageScore - b.averageScore);

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="px-5 pb-3 pt-4">
        <h2 className="text-base font-semibold text-black">Competency</h2>
        <p className="mt-0.5 text-xs text-gray-600">
          Average score of the competency, lowest first
        </p>
      </div>

      <div className="px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Competency name"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-black focus:border-black focus:outline-none"
          />
        </div>
      </div>

      <div className="px-5 pb-5 pt-3">
        {ranked.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] font-medium text-gray-600">
                <th className="pb-2">Competency</th>
                <th className="w-24 pb-2 text-right">Avg. Score</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((competency) => {
                const pct = Math.min(
                  Math.max((competency.averageScore / MAX_SCORE) * 100, 0),
                  100
                );
                return (
                  <tr key={competency.competencyId} className="border-b border-gray-100 last:border-0">
                    <td className="py-2.5 pr-3">
                      <p className="truncate text-sm text-black" title={competency.competencyName}>
                        {competency.competencyName}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-gray-600 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 text-right align-top">
                      <span className="text-sm font-semibold tabular-nums text-black">
                        {competency.averageScore.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400"> / {MAX_SCORE}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-6 text-center text-sm text-gray-600">No competency data available</div>
        )}
      </div>
    </div>
  );
};

export default CompetencyCard;
