import React from 'react';
import { InboxActivityData } from './types';

interface ScenarioStepProps {
  activityData?: InboxActivityData;
}

const ScenarioStep: React.FC<ScenarioStepProps> = ({ activityData }) => {
  const [selected, setSelected] = React.useState(0);
  
  const scenarios = activityData?.activityDetail?.scenarios || [];
  
  if (!activityData?.activityDetail || scenarios.length === 0) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3 text-black">Scenario Description</h2>
        <div className="bg-white p-4 rounded border border-gray-200 text-gray-700">
          <p className="text-sm">No scenarios available for this activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-black">Scenario Description</h2>
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="bg-white p-4 rounded border border-gray-200 text-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-black">{scenarios[selected].title}</h3>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700 border border-gray-200">
                  Exercise Time (Min) <b className="text-black">{scenarios[selected].exerciseTime}</b>
                </span>
                <span className="px-2.5 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700 border border-gray-200">
                  Reading Time (Min) <b className="text-black">{scenarios[selected].readTime}</b>
                </span>
              </div>
            </div>
            <div 
              className="text-sm prose prose-sm max-w-none text-gray-800" 
              dangerouslySetInnerHTML={{ __html: scenarios[selected].data }}
            />
          </div>
        </div>
        {scenarios.length > 1 && (
          <div className="w-48">
            <div className="bg-white rounded border border-gray-200 mb-2 p-2 font-medium text-center text-sm text-black">All Scenarios</div>
            <div className="bg-white rounded border border-gray-200 divide-y divide-gray-200">
              {scenarios.map((scenario, idx) => (
                <button
                  key={scenario.id}
                  className={`w-full px-3 py-2 text-left text-sm text-black font-medium transition-colors ${selected === idx ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  onClick={() => setSelected(idx)}
                >
                  {scenario.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioStep; 