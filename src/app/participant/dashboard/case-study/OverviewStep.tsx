import React from 'react';
import { ActivityData } from './types';

interface OverviewStepProps {
  activityData?: ActivityData;
}

const OverviewStep: React.FC<OverviewStepProps> = ({ activityData }) => (
  <div>
    <h2 className="text-lg font-semibold mb-3 text-black">Overview And Instructions</h2>
    <div className="bg-white p-4 rounded border border-gray-200 text-gray-800">
      <div className="mb-3">
        <h3 className="text-sm font-semibold mb-1.5 text-black">Activity Details</h3>
        <p className="mb-1.5 text-sm"><strong className="text-black">Name:</strong> <span className="text-gray-700">{activityData?.activityDetail?.name || 'N/A'}</span></p>
        <p className="mb-0 text-sm"><strong className="text-black">Description:</strong> <span className="text-gray-700">{activityData?.activityDetail?.description || 'N/A'}</span></p>
      </div>
      
      <div className="mb-3">
        <h3 className="text-sm font-semibold mb-1.5 text-black">Instructions</h3>
        <div 
          className="mb-0 text-sm prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: activityData?.activityDetail?.instructions || 'No specific instructions provided.' 
          }}
        />
      </div>

      <div className="mb-0">
        <h3 className="text-sm font-semibold mb-1.5 text-black">General Guidelines</h3>
        <p className="mb-1.5 text-sm text-gray-700">
          In this exercise, first, you would need to read through a given business situation and comprehend the context.
        </p>
        <p className="mb-1.5 text-sm text-gray-700">
          Based on the business situation, you will be required to complete certain task within the Exercise.
        </p>
        <p className="mb-1.5 text-sm text-gray-700">
          <b className="text-black">Task 1:</b> You would need to provide written responses to questions.<br />
          <b className="text-black">Task 2:</b> You would need to connect with an assessor to elaborate upon your written response.
        </p>
        <p className="mb-1.5 text-sm text-gray-700">
          The whole exercise will be of 60 minutes with 30 minutes of <b className="text-black">Reading Time and 30 minutes</b> for completing the tasks. Please keep a tab on the Time left (will be visible at the top-right of the screen)
        </p>
        <p className="mb-1.5 text-sm text-gray-700">
          In case you face any issues during the exercise, please inform the Program Coordinator as soon as possible.
        </p>
        <p className="text-sm text-gray-600">
          Please click on &quot;Start&quot; to proceed to the next page.
        </p>
      </div>
    </div>
  </div>
);

export default OverviewStep; 