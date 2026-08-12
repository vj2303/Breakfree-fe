"use client";

import React from 'react';
import { CheckCircle2, ClipboardList, Timer, UserCheck } from 'lucide-react';

import StatTile from './StatTile';
import { deriveAssessmentStats, type OverviewData } from './assessmentOverview';

interface AssessmentStatTilesProps {
  data: OverviewData | null;
}

/** Headline row for the management reports screen. Every figure is live. */
const AssessmentStatTiles: React.FC<AssessmentStatTilesProps> = ({ data }) => {
  const stats = deriveAssessmentStats(data);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        icon={ClipboardList}
        label="Total Assessments"
        value={stats.total}
        caption="Across the current selection"
      />
      <StatTile
        icon={UserCheck}
        label="Assigned"
        value={stats.assignedPercentage}
        unit="%"
        caption={`${stats.assignedCount} of ${stats.total} assessments`}
      />
      <StatTile
        icon={Timer}
        label="In Progress"
        value={stats.inProgressPercentage}
        unit="%"
        caption={`${stats.inProgressCount} of ${stats.total} assessments`}
      />
      <StatTile
        icon={CheckCircle2}
        label="Completed"
        value={stats.completedPercentage}
        unit="%"
        caption={`${stats.completedCount} of ${stats.total} assessments`}
      />
    </div>
  );
};

export default AssessmentStatTiles;
