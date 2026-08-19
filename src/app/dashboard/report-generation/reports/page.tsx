"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ManagementReports from '@/components/reports/ManagementReports';
import ParticipantReports from '@/components/reports/ParticipantReports';

const TABS = [
  {
    id: 'management' as const,
    label: 'Management reports',
    subtitle: 'Organizational view of assessment progress and competency performance',
  },
  {
    id: 'participants' as const,
    label: 'Participants Reports',
    subtitle: 'Generate and download individual participant reports',
  },
];

export default function ReportsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'participants' | 'management'>('management');

  return (
    <div className="min-h-screen bg-[#f8fafd]">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200 bg-white px-6 pb-4 pt-5">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold leading-tight text-black">Reports</h1>
          <p className="mt-1 text-sm text-gray-600">
            {TABS.find((tab) => tab.id === activeTab)?.subtitle}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'management' && <ManagementReports token={token} />}
        {activeTab === 'participants' && <ParticipantReports token={token} />}
      </div>
    </div>
  );
}
