'use client';

import { useAuth } from '@/context/AuthContext';

import CapabilityDistribution from './components/CapabilityDistribution';
import FilterBar from './components/FilterBar';
import InsightsHeader from './components/InsightsHeader';
import KpiRow from './components/KpiRow';
import ReadinessQuadrant from './components/ReadinessQuadrant';
import RecentCohorts from './components/RecentCohorts';
import TopCapabilityGaps from './components/TopCapabilityGaps';

/**
 * Talent & Capability Insights.
 *
 * UI only — every figure comes from `./data.ts`. No endpoint is called and no schema changed.
 * See that file for the list of things blocked on real data.
 */
export default function InsightsPage() {
  const { user } = useAuth();

  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Breakfree breakfree';
  const userEmail = user?.email || 'breakfree@gmail.com';

  return (
    <div className="flex min-h-screen flex-col">
      <InsightsHeader userName={userName} userEmail={userEmail} />

      <div className="flex flex-col gap-4 p-6">
        <FilterBar />

        <KpiRow />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <ReadinessQuadrant />

          <div className="flex flex-col gap-4">
            <CapabilityDistribution />
            <TopCapabilityGaps />
          </div>
        </div>

        <RecentCohorts />
      </div>
    </div>
  );
}
