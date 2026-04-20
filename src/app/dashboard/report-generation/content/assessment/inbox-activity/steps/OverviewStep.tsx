import React from "react";
import Editor from "@/components/Editor";

interface OverviewStepProps {
  formData: {
    overview: string;
    exerciseTime: number;
    readingTime: number;
    name?: string;
    description?: string;
    videoUrl?: string;
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
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Video URL (optional)</label>
        <input
          type="url"
          value={formData.videoUrl || ''}
          onChange={e => updateFormData('videoUrl', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.com/video.mp4 or YouTube/Vimeo link"
        />
      </div>
    </div>
  );
};

export default OverviewStep; 