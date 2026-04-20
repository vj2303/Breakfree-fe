"use client";

import React from 'react';

interface OverviewData {
  totalAssessments: number;
  assigned: number;
  inProgress: number;
  completed: number;
  assignedPercentage: number;
  inProgressPercentage: number;
  completedPercentage: number;
}

interface AssessmentsCardProps {
  data: OverviewData | null;
}

const AssessmentsCard: React.FC<AssessmentsCardProps> = ({ data }) => {
  const defaultData = {
    totalAssessments: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    assignedPercentage: 0,
    inProgressPercentage: 0,
    completedPercentage: 0,
  };

  const stats = data || defaultData;

  const assignedCountFromApi = stats.assigned ?? 0;
  const inProgressCount = stats.inProgress ?? 0;
  const completedCount = stats.completed ?? 0;

  // Some backend responses may return an incorrect `totalAssessments` (e.g. smaller than `assigned`),
  // which makes the UI show huge percentages like `600%`.
  const effectiveTotalForPercent =
    Math.max(stats.totalAssessments ?? 0, assignedCountFromApi, inProgressCount, completedCount) || 0;

  // UI interpretation:
  // "Assigned" should represent the "not started yet" bucket (so that:
  // Assigned + In progress + Completed = Total number of assessments).
  //
  // Some backend responses return `assigned === totalAssessments` which makes
  // Assigned always 100%. In that case, derive Assigned as the remaining bucket.
  const assignedCount =
    (assignedCountFromApi === effectiveTotalForPercent &&
      effectiveTotalForPercent > 0)
      ? Math.max(effectiveTotalForPercent - inProgressCount - completedCount, 0)
      : assignedCountFromApi;

  const clampPct = (pct: number) => Math.min(Math.max(pct, 0), 100);

  const assignedPercentageRaw = effectiveTotalForPercent
    ? clampPct((assignedCount / effectiveTotalForPercent) * 100)
    : 0;
  const inProgressPercentageRaw = effectiveTotalForPercent
    ? clampPct((inProgressCount / effectiveTotalForPercent) * 100)
    : 0;
  const completedPercentageRaw = effectiveTotalForPercent
    ? clampPct((completedCount / effectiveTotalForPercent) * 100)
    : 0;

  // Display whole numbers only (no decimals).
  const roundPct = (pct: number) => Math.round(pct);

  const assignedPercentage = roundPct(assignedPercentageRaw);
  const inProgressPercentage = roundPct(inProgressPercentageRaw);
  const completedPercentage = roundPct(completedPercentageRaw);

  const progressBars = [
    {
      label: 'Assigned',
      count: assignedCount,
      percentage: assignedPercentage,
      color: 'bg-gray-600',
      textColor: 'text-black',
    },
    {
      label: 'In progress',
      count: inProgressCount,
      percentage: inProgressPercentage,
      color: 'bg-gray-400',
      textColor: 'text-black',
    },
    {
      label: 'Completed',
      count: completedCount,
      percentage: completedPercentage,
      color: 'bg-black',
      textColor: 'text-black',
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-black">Assessments</h2>
        <p className="text-sm text-gray-600 mt-1">
          Total number of assessment: {effectiveTotalForPercent}
        </p>
      </div>

      <div className="px-4 py-3 space-y-4">
        {progressBars.map((bar) => (
          <div key={bar.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-black">{bar.label}</span>
              <span className={`font-semibold ${bar.textColor}`}>{bar.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
              <div
                className={`${bar.color} h-full rounded-full transition-all duration-500`}
                style={{ width: `${bar.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              Number of assessment: {bar.count}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssessmentsCard;

