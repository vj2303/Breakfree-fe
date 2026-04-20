"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ManagementReports from '@/components/reports/ManagementReports';
import ParticipantReports from '@/components/reports/ParticipantReports';

export default function ReportsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'participants' | 'management'>('management');

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
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
