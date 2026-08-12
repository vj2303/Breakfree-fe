import React from 'react';

import InsightsSidebar from './components/InsightsSidebar';

/**
 * Standalone shell for the Insights screen, matching the approved mockup's 240px labelled rail.
 * Deliberately separate from the report-generation layout's 80px icon rail so no existing admin
 * page is affected.
 */
export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f6f7f8] text-gray-900">
      <InsightsSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
