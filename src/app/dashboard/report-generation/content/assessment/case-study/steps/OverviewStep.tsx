'use client';

import React from 'react';
import Editor from '@/components/Editor';

type InteractiveActivityType = 'GD' | 'ROLEPLAY' | 'CASE_STUDY';

const INTERACTIVE_ACTIVITY_TYPES: { value: InteractiveActivityType; label: string }[] = [
  { value: 'GD', label: 'Group Discussion (GD)' },
  { value: 'ROLEPLAY', label: 'Roleplay' },
  { value: 'CASE_STUDY', label: 'Case Study' },
];

interface OverviewStepProps {
  formData: {
    overview: string;
    exerciseTime: number;
    readingTime: number;
    name?: string;
    description?: string;
    videoUrl?: string;
    interactiveActivityType?: InteractiveActivityType;
  };
  updateFormData: (field: string, value: string | number) => void;
}

const OverviewStep: React.FC<OverviewStepProps> = ({ formData, updateFormData }) => {
  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Name</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={e => updateFormData('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter assessment name"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
        <select
          value={formData.interactiveActivityType || 'CASE_STUDY'}
          onChange={e => updateFormData('interactiveActivityType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          required
        >
          {INTERACTIVE_ACTIVITY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          value={formData.description || ''}
          onChange={e => updateFormData('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Enter a brief description"
          required
        />
      </div>
      <h2 className="text-xl font-semibold mb-4 text-black">Create Instructions</h2>
      <Editor
        content={formData.overview}
        onChange={(value) => updateFormData('overview', value)}
      />
      <div className="mt-4 p-4 border border-gray-200 rounded-md">
        <label className="block text-sm font-medium text-gray-700 mb-2">Video URL (Optional)</label>
        <div className="flex items-center space-x-2">
          <input
            type="url"
            value={formData.videoUrl || ''}
            onChange={(e) => updateFormData('videoUrl', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="https://example.com/video"
          />
          {formData.videoUrl && (
            <button
              type="button"
              onClick={() => updateFormData('videoUrl', '')}
              className="text-red-500 hover:text-red-700 p-1"
              title="Clear video URL"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Supported formats: YouTube, Vimeo, or direct video URL
        </p>
      </div>
    </div>
  );
};

export default OverviewStep;