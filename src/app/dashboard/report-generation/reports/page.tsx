"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AssessmentInsights from '@/components/reports/insights/AssessmentInsights';
import ParticipantReports from '@/components/reports/ParticipantReports';

const TABS = [
  { id: 'management', label: 'Assessment Insights' },
  { id: 'participants', label: 'Participant Reports' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ReportsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('management');

  return (
    <div className="min-h-screen bg-[#f8fafd]">
      {/* Tab strip — each tab renders its own page heading below. */}
      <div className="border-b border-gray-200 bg-white px-6 pt-4">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-violet-600 text-black'
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-6">
        {activeTab === 'management' && <AssessmentInsights token={token} />}
        {activeTab === 'participants' && (
          <div className="view-enter space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-black">Participant Reports</h1>
              <p className="mt-1 text-sm text-gray-500">
                Generate and download individual participant reports
              </p>
            </div>
            <ParticipantReports token={token} />
          </div>
        )}
      </div>
    </div>
  );
}
