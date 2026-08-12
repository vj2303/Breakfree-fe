"use client";

import React from 'react';

import { deriveAssessmentStats, type OverviewData } from './assessmentOverview';

interface AssessmentsCardProps {
  data: OverviewData | null;
}

const AssessmentsCard: React.FC<AssessmentsCardProps> = ({ data }) => {
  const stats = deriveAssessmentStats(data);

  const progressBars = [
    {
      label: 'Assigned',
      count: stats.assignedCount,
      percentage: stats.assignedPercentage,
      color: 'bg-gray-600',
    },
    {
      label: 'In progress',
      count: stats.inProgressCount,
      percentage: stats.inProgressPercentage,
      color: 'bg-gray-400',
    },
    {
      label: 'Completed',
      count: stats.completedCount,
      percentage: stats.completedPercentage,
      color: 'bg-black',
    },
  ];

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="px-5 pb-3 pt-4">
        <h2 className="text-base font-semibold text-black">Assessment Progress</h2>
        <p className="mt-0.5 text-xs text-gray-600">
          Assigned, submitted and fully scored, out of {stats.total} assessments
        </p>
      </div>

      <div className="space-y-4 px-5 pb-5">
        {progressBars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-xs font-medium text-black">{bar.label}</span>
              <span className="text-xs text-gray-600">
                <span className="font-semibold tabular-nums text-black">{bar.percentage}%</span>
                <span className="ml-1.5 tabular-nums">
                  {bar.count} of {stats.total}
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`${bar.color} h-full rounded-full transition-all duration-500`}
                style={{ width: `${bar.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssessmentsCard;
