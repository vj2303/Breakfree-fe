import React from "react";
import { InboxScenario } from "./types";

interface ScenariosPanelProps {
  scenarios: InboxScenario[];
}

const ScenariosPanel: React.FC<ScenariosPanelProps> = ({ scenarios }) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const selected = scenarios[selectedIndex];

  return (
    <div className="flex gap-4 w-full h-full">
      <div className="flex-1">
        <div className="bg-white border border-gray-200 rounded-lg p-4 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-black">
              {selected.title}
            </h2>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700 border border-gray-200">
                Exercise Time (Min){" "}
                <b className="text-black">{selected.exerciseTime}</b>
              </span>
              <span className="px-2.5 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700 border border-gray-200">
                Reading Time (Min){" "}
                <b className="text-black">{selected.readTime}</b>
              </span>
            </div>
          </div>
          <div
            className="prose prose-sm max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: selected.data }}
          />
        </div>
      </div>
      {scenarios.length > 1 && (
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded border border-gray-200 mb-2 p-2 font-medium text-center text-xs text-black">
            Scenarios
          </div>
          <div className="bg-white rounded border border-gray-200 divide-y divide-gray-200 max-h-full overflow-y-auto">
            {scenarios.map((scenario, idx) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors ${
                  idx === selectedIndex
                    ? "bg-gray-100 text-black"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {scenario.title || `Scenario ${idx + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenariosPanel;

