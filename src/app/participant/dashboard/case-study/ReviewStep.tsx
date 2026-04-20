import React from 'react';
import { ActivityData } from './types';

interface ReviewStepProps {
  activityData?: ActivityData;
  submissionData: {
    textContent?: string;
    notes?: string;
    file?: File;
    submissionType: 'TEXT' | 'DOCUMENT' | 'VIDEO';
  };
}

const ReviewStep: React.FC<ReviewStepProps> = ({ activityData, submissionData }) => {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-black">Review Your Submission</h2>
      <div className="bg-white p-4 rounded border border-gray-200 text-gray-800">
        {/* Activity Summary */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2 text-black">Activity Summary</h3>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <p className="text-sm mb-1"><strong className="text-black">Activity:</strong> <span className="text-gray-700">{activityData?.activityDetail?.name || 'N/A'}</span></p>
            <p className="text-sm mb-1"><strong className="text-black">Competency:</strong> <span className="text-gray-700">{activityData?.competency?.competencyName || 'N/A'}</span></p>
            <p className="text-sm"><strong className="text-black">Type:</strong> <span className="text-gray-700">{activityData?.activityType || 'N/A'}</span></p>
          </div>
        </div>

        {/* Submission Summary */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2 text-black">Your Submission</h3>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <p className="text-sm mb-2"><strong className="text-black">Submission Type:</strong> <span className="text-gray-700">{submissionData.submissionType}</span></p>
            
            {submissionData.submissionType === 'TEXT' && submissionData.textContent && (
              <div className="mt-2">
                <p className="text-sm mb-1.5"><strong className="text-black">Text Response:</strong></p>
                <div className="mt-1 p-2 bg-white rounded border border-gray-200 max-h-40 overflow-y-auto text-sm text-gray-700">
                  {submissionData.textContent}
                </div>
              </div>
            )}
            
            {(submissionData.submissionType === 'DOCUMENT' || submissionData.submissionType === 'VIDEO') && submissionData.file && (
              <div className="mt-2">
                <p className="text-sm mb-0.5"><strong className="text-black">Uploaded File:</strong> <span className="text-gray-700">{submissionData.file.name}</span></p>
                <p className="text-xs text-gray-600">Size: {(submissionData.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
            
            {submissionData.notes && (
              <div className="mt-2">
                <p className="text-sm mb-1.5"><strong className="text-black">Additional Notes:</strong></p>
                <div className="mt-1 p-2 bg-white rounded border border-gray-200 text-sm text-gray-700">
                  {submissionData.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
          <h4 className="font-medium text-yellow-800 mb-1.5 text-sm">Before You Submit:</h4>
          <ul className="text-yellow-700 text-xs space-y-0.5">
            <li>• Review your response to ensure it addresses all requirements</li>
            <li>• Check that your submission type matches your intended response</li>
            <li>• Verify that any uploaded files are complete and readable</li>
            <li>• Ensure your additional notes provide helpful context</li>
          </ul>
        </div>

        {/* Validation */}
        <div className="mt-0">
          {submissionData.submissionType === 'TEXT' && !submissionData.textContent && (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <p className="text-red-700 text-xs">⚠️ Please provide a text response before submitting.</p>
            </div>
          )}
          
          {(submissionData.submissionType === 'DOCUMENT' || submissionData.submissionType === 'VIDEO') && !submissionData.file && (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <p className="text-red-700 text-xs">⚠️ Please upload a file before submitting.</p>
            </div>
          )}
          
          {((submissionData.submissionType === 'TEXT' && submissionData.textContent) || 
            ((submissionData.submissionType === 'DOCUMENT' || submissionData.submissionType === 'VIDEO') && submissionData.file)) && (
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <p className="text-green-700 text-xs">✅ Your submission is ready!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewStep; 