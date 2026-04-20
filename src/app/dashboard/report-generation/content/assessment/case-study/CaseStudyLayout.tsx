'use client';

import React, { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  completed: boolean;
  active: boolean;
}

interface CaseStudyLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  onStepChange?: (step: number) => void;
  onSave?: () => void;
  onCancel?: () => void;
  showSaveButton?: boolean;
  showCancelButton?: boolean;
  saveButtonText?: string;
}

const CaseStudyLayout: React.FC<CaseStudyLayoutProps> = ({
  children,
  currentStep = 0,
  onStepChange,
  onSave,
  onCancel,
  showSaveButton = true,
  showCancelButton = false,
  saveButtonText = "Save and Next"
}) => {
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [steps] = useState<Step[]>([
    { id: 'overview', title: 'Overview and Instructions', completed: false, active: false },
    { id: 'scenario', title: 'Scenario Description', completed: false, active: false },
    { id: 'task', title: 'Task', completed: false, active: false },
    { id: 'preview', title: 'Preview', completed: false, active: false }
  ]);

  const updatedSteps = steps.map((step, index) => ({
    ...step,
    completed: index < currentStep,
    active: index === currentStep
  }));

  const handleStepClick = (index: number) => {
    if (onStepChange && index <= currentStep) {
      onStepChange(index);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black flex items-center gap-2">
              Interactive Activity
              <span className="text-gray-400">✏️</span>
            </h1>
            <p className="text-sm text-black mt-1">Created on 2 Jan 2025</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 relative">
              <span className="text-sm text-black">Know More about Interactive Activity</span>
              <button
                onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                className="w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <span className="text-white text-xs">i</span>
              </button>
              {showInfoTooltip && (
                <div className="absolute top-8 right-0 z-50 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg">
                  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                  <div className="absolute -top-2 right-2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900"></div>
                </div>
              )}
            </div>
            
            {/* Save and Next button moved to top right */}
            <div className="flex items-center gap-3">
              {showCancelButton && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              )}
              {currentStep > 0 && (
                <button
                  onClick={() => onStepChange && onStepChange(currentStep - 1)}
                  className="px-4 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Previous
                </button>
              )}
              {showSaveButton && (
                <button
                  onClick={onSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 flex items-center gap-2"
                >
                  {saveButtonText}
                  {currentStep < 3 && <ChevronRight className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl">
          {updatedSteps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div 
                className={`flex items-center gap-3 cursor-pointer ${
                  step.active ? 'opacity-100' : step.completed ? 'opacity-80' : 'opacity-50'
                }`}
                onClick={() => handleStepClick(index)}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step.completed 
                    ? 'bg-green-500 text-white' 
                    : step.active 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {step.completed ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  step.active ? 'text-black' : 'text-gray-600'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < updatedSteps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div className="h-px bg-gray-200 relative">
                    <div 
                      className={`h-px transition-all duration-300 ${
                        step.completed ? 'bg-green-500 w-full' : 'bg-gray-200 w-0'
                      }`}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-6">
        <div className="max-w-full mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseStudyLayout;