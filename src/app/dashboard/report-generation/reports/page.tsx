"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ManagementReports from '@/components/reports/ManagementReports';
import ParticipantReports from '@/components/reports/ParticipantReports';

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
            {activeTab === 'management'
              ? 'Organizational view of assessment progress and competency performance'
              : 'Generate and download individual participant reports'}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                activeTab === 'participants'
                  ? 'bg-black text-white border border-black'
                  : 'text-black border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Participants Reports
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                activeTab === 'management'
                  ? 'bg-black text-white border border-black'
                  : 'text-black border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Management reports
            </button>
          </div>
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
