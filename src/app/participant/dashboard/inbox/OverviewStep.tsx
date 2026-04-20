import React from 'react';
import { InboxActivityData } from './types';

interface OverviewStepProps {
  activityData?: InboxActivityData;
}

const OverviewStep: React.FC<OverviewStepProps> = ({ activityData }) => (
  <div>
    <h2 className="text-lg font-semibold mb-3 text-black">Overview And Instructions</h2>
    <div className="bg-white p-4 rounded border border-gray-200 text-gray-800">
      {activityData?.activityDetail ? (
        <>
          <h3 className="text-base font-semibold mb-2 text-black">{activityData.activityDetail.name}</h3>
          <p className="mb-3 text-sm text-gray-700">{activityData.activityDetail.description}</p>
          <div 
            className="mb-3 text-sm prose prose-sm max-w-none" 
            dangerouslySetInnerHTML={{ __html: activityData.activityDetail.instructions }}
          />
          {activityData.activityDetail.videoUrl && (
            <div className="mb-3">
              <h4 className="font-medium mb-1.5 text-sm text-black">Instructional Video:</h4>
              <a 
                href={activityData.activityDetail.videoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-black underline text-sm"
              >
                Watch Video Instructions
              </a>
            </div>
          )}
          <p className="mb-0 text-sm text-gray-600">
            Please click on &quot;Start&quot; to proceed to the next page.
          </p>
        </>
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-700">
            In this exercise, you will need to read through a series of business situations and comprehend the context.
          </p>
          <p className="mb-2 text-sm text-gray-700">
            Based on the business situations, you will be required to complete certain tasks within the Inbox Activity.
          </p>
          <p className="mb-2 text-sm text-gray-700">
            <b className="text-black">Task 1:</b> Provide written responses to questions.<br />
            <b className="text-black">Task 2:</b> Connect with an assessor to elaborate upon your written response.
          </p>
          <p className="mb-2 text-sm text-gray-700">
            The whole exercise will be of 60 minutes with 30 minutes of <b className="text-black">Reading Time and 30 minutes</b> for completing the tasks. Please keep a tab on the Time left (will be visible at the top-right of the screen)
          </p>
          <p className="mb-2 text-sm text-gray-700">
            In case you face any issues during the exercise, please inform the Program Coordinator as soon as possible.
          </p>
          <p className="text-sm text-gray-600">
            Please click on &quot;Start&quot; to proceed to the next page.
          </p>
        </>
      )}
    </div>
  </div>
);

export default OverviewStep; 