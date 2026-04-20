import React from 'react';
import { ActivityData, Scenario } from './types';

interface ScenarioStepProps {
  activityData?: ActivityData;
}

const ScenarioStep: React.FC<ScenarioStepProps> = ({ activityData }) => {
  const scenarios = activityData?.activityDetail?.scenarios || [];
  
  if (!activityData?.activityDetail || scenarios.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3 text-black">Scenario Description</h2>
        <div className="bg-white p-4 rounded border border-gray-200 text-gray-700">
          <p className="text-sm text-gray-500 italic">No scenario data available for this activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-black">Scenario Description</h2>
      <div className="bg-white p-4 rounded border border-gray-200 text-gray-800">
        <div className="space-y-4">
          {scenarios.map((scenario: Scenario) => (
            <div key={scenario.id} className="border-l-2 border-gray-800 pl-3">
              <h3 className="text-sm font-semibold mb-1.5 text-black">{scenario.title}</h3>
              <div className="mb-2">
                <div className="flex gap-3 text-xs text-gray-600 mb-1.5">
                  <span><strong className="text-black">Read Time:</strong> {scenario.readTime} minutes</span>
                  <span><strong className="text-black">Exercise Time:</strong> {scenario.exerciseTime} minutes</span>
                </div>
              </div>
              <div 
                className="prose prose-sm max-w-none text-sm text-gray-800"
                dangerouslySetInnerHTML={{ __html: scenario.data }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScenarioStep;