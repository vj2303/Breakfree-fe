import React, { useState } from 'react';
import { ActivityData, Task } from './types';

interface TaskStepProps {
  activityData?: ActivityData;
  submissionData: {
    textContent?: string;
    notes?: string;
    file?: File;
    submissionType: 'TEXT' | 'DOCUMENT' | 'VIDEO';
  };
  setSubmissionData: (data: {
    textContent?: string;
    notes?: string;
    file?: File;
    submissionType: 'TEXT' | 'DOCUMENT' | 'VIDEO';
  }) => void;
}

const TaskStep: React.FC<TaskStepProps> = ({ activityData, submissionData, setSubmissionData }) => {
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubmissionData({
        ...submissionData,
        file,
        submissionType: file.type.startsWith('video/') ? 'VIDEO' : 'DOCUMENT'
      });
    }
  };

  const removeFile = () => {
    setSubmissionData({
      ...submissionData,
      file: undefined,
      submissionType: 'TEXT'
    });
    setFileInputKey(prev => prev + 1);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-black">Task</h2>
      <div className="bg-white p-4 rounded border border-gray-200 text-gray-800">
        {/* Task Content */}
        <div className="mb-4">
          {activityData?.activityDetail?.tasks && activityData.activityDetail.tasks.length > 0 ? (
            <div className="space-y-4">
              {activityData.activityDetail.tasks.map((task: Task) => (
                <div key={task.id} className="border-l-2 border-gray-800 pl-3">
                  <h3 className="text-sm font-semibold mb-1.5 text-black">{task.title}</h3>
                  <div className="mb-2">
                    <div className="flex gap-3 text-xs text-gray-600 mb-1.5">
                      <span><strong className="text-black">Read Time:</strong> {task.readTime} minutes</span>
                      <span><strong className="text-black">Exercise Time:</strong> {task.exerciseTime} minutes</span>
                    </div>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none text-sm text-gray-800"
                    dangerouslySetInnerHTML={{ __html: task.data }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No task data available for this activity.</p>
          )}
        </div>

        {/* Submission Options */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold mb-3 text-black">Submit Your Response</h3>
          
          {/* Submission Type Selection */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Submission Type</label>
            <div className="flex gap-3">
              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  name="submissionType"
                  value="TEXT"
                  checked={submissionData.submissionType === 'TEXT'}
                  onChange={(e) => setSubmissionData({ ...submissionData, submissionType: e.target.value as 'TEXT' })}
                  className="mr-1.5"
                />
                Text Response
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  name="submissionType"
                  value="DOCUMENT"
                  checked={submissionData.submissionType === 'DOCUMENT'}
                  onChange={(e) => setSubmissionData({ ...submissionData, submissionType: e.target.value as 'DOCUMENT' })}
                  className="mr-1.5"
                />
                Document Upload
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  name="submissionType"
                  value="VIDEO"
                  checked={submissionData.submissionType === 'VIDEO'}
                  onChange={(e) => setSubmissionData({ ...submissionData, submissionType: e.target.value as 'VIDEO' })}
                  className="mr-1.5"
                />
                Video Upload
              </label>
            </div>
          </div>

          {/* Text Response */}
          {submissionData.submissionType === 'TEXT' && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Your Response
              </label>
              <textarea
                value={submissionData.textContent || ''}
                onChange={(e) => setSubmissionData({ ...submissionData, textContent: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                placeholder="Enter your detailed response here..."
              />
            </div>
          )}

          {/* File Upload */}
          {(submissionData.submissionType === 'DOCUMENT' || submissionData.submissionType === 'VIDEO') && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Upload {submissionData.submissionType === 'VIDEO' ? 'Video' : 'Document'}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
                <input
                  key={fileInputKey}
                  type="file"
                  accept={submissionData.submissionType === 'VIDEO' ? 'video/*' : '.pdf,.doc,.docx,.txt'}
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-gray-700 hover:text-black"
                >
                  <svg className="mx-auto h-10 w-10 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-1.5 text-xs text-gray-600">
                    Click to upload {submissionData.submissionType === 'VIDEO' ? 'video' : 'document'}
                  </p>
                </label>
              </div>
              {submissionData.file && (
                <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                  <span className="text-xs text-gray-700">{submissionData.file.name}</span>
                  <button
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="mb-0">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Additional Notes (Optional)
            </label>
            <textarea
              value={submissionData.notes || ''}
              onChange={(e) => setSubmissionData({ ...submissionData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
              placeholder="Any additional context or assumptions..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskStep; 