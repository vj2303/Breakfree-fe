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

const CompetencyCard: React.FC<CompetencyCardProps> = ({
  competencies,
  searchValue,
  onSearchChange,
}) => {
  // Color palette for gauges - black and white theme
  const colors = [
    { bg: 'bg-black', text: 'text-black' },
    { bg: 'bg-gray-600', text: 'text-black' },
    { bg: 'bg-gray-400', text: 'text-black' },
    { bg: 'bg-gray-500', text: 'text-black' },
  ];

  const strokeColors = ['#000000', '#404040', '#808080', '#606060'];

  const CircularGauge: React.FC<{ score: number; color: typeof colors[0]; index: number }> = ({
    score,
    color,
    index,
  }) => {
    const maxScore = 5; // Assuming max score is 5
    const percentage = (score / maxScore) * 100;
    const circumference = 2 * Math.PI * 45; // radius = 45
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-20 h-20">
          <svg className="transform -rotate-90 w-20 h-20">
            <circle
              cx="40"
              cy="40"
              r="37"
              stroke="#d1d5db"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="40"
              cy="40"
              r="37"
              stroke={strokeColors[index]}
              strokeWidth="4"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-bold ${color.text}`}>{score.toFixed(1)}</span>
          </div>
        </div>
        <p className="text-xs text-black mt-1.5 text-center max-w-[100px] truncate">
          {competencies[index]?.competencyName || 'Competency'}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-black">Competency</h2>
        <p className="text-sm text-gray-600 mt-1">Average score of the competency</p>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-gray-200 relative">
        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by Competency name"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black bg-white"
        />
      </div>

      {/* Competency Gauges */}
      <div className="px-4 py-3">
        {competencies.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {competencies.slice(0, 4).map((competency, index) => (
              <CircularGauge
                key={competency.competencyId}
                score={competency.averageScore}
                color={colors[index % colors.length]}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-gray-600">
            No competency data available
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetencyCard;

