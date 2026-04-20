'use client';
import React, { useState } from 'react';
import CompetencyLibrary from './CompetencyLibrary';
import CompetencyMapping from './CompetencyMapping';

export default function CompetencyMappingPage() {
  const [activeTab, setActiveTab] = useState<'maps' | 'library'>('maps');

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-1 text-black">Competency Management</h1>
      <p className="text-black mb-6">Manage competency libraries and create competency maps</p>
      
      <div className="flex gap-2 mb-6">
        <button
          className={`px-6 py-2 rounded-full transition-colors ${
            activeTab === 'maps' 
              ? 'bg-gray-700 text-white' 
              : 'bg-gray-100 text-black hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('maps')}
        >
          Competency Maps
        </button>
        <button
          className={`px-6 py-2 rounded-full transition-colors ${
            activeTab === 'library' 
              ? 'bg-gray-700 text-white' 
              : 'bg-gray-100 text-black hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('library')}
        >
          Competency Library
        </button>
      </div>

      {/* Keep both mounted to avoid re-fetching on tab toggle */}
      <div className={activeTab === 'maps' ? '' : 'hidden'}>
        <CompetencyMapping />
      </div>
      <div className={activeTab === 'library' ? '' : 'hidden'}>
        <CompetencyLibrary />
      </div>
    </div>
  );
}