"use client";

import React from "react";
import { Check, ChevronRight, Info } from "lucide-react";

interface Step {
  id: string;
  title: string;
  completed: boolean;
  active: boolean;
}

interface AssessmentCenterLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  onStepChange?: (step: number) => void;
  onSave?: () => void;
  onCancel?: () => void;
  showSaveButton?: boolean;
  showCancelButton?: boolean;
  saveButtonText?: string;
  isEditMode?: boolean;
  assessmentCenterName?: string;
}

const stepTitles = [
  "Select Content",
  "Select Competencies",
  "Subject - Exercise Matrix",
  "Add Framework",
  "Add Document",
  "Report configuration",
  "Participant and assessor management",
];

const AssessmentCenterLayout: React.FC<AssessmentCenterLayoutProps> = ({
  children,
  currentStep = 0,
  onStepChange,
  onSave,
  onCancel,
  showSaveButton = true,
  showCancelButton = false,
  saveButtonText = "Save and Next",
  isEditMode = false,
  assessmentCenterName,
}) => {
  const steps: Step[] = stepTitles.map((title, idx) => ({
    id: `step-${idx}`,
    title,
    completed: idx < currentStep,
    active: idx === currentStep,
  }));

  const handleStepClick = (index: number) => {
    if (onStepChange && index <= currentStep) {
      onStepChange(index);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {assessmentCenterName ? (
                    <>
                      {assessmentCenterName}
                      {isEditMode && (
                        <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                          Edit Mode
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Assessment Center
                      {isEditMode && (
                        <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                          Edit Mode
                        </span>
                      )}
                    </>
                  )}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {assessmentCenterName 
                    ? (isEditMode ? `Editing: ${assessmentCenterName}` : `Creating: ${assessmentCenterName}`)
                    : (isEditMode ? 'Editing existing assessment center' : `Created on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`)
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all border border-gray-200 hover:border-gray-300">
                <Info className="w-4 h-4" />
                <span>Learn More</span>
              </button>
              {showCancelButton && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all hover:border-gray-400"
                >
                  Cancel
                </button>
              )}
              {currentStep > 0 && (
                <button
                  onClick={() => onStepChange && onStepChange(currentStep - 1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all hover:border-gray-400"
                >
                  Previous
                </button>
              )}
              {showSaveButton && (
                <button
                  onClick={onSave}
                  className="px-5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all shadow-sm hover:shadow-md flex items-center gap-2 active:scale-95"
                >
                  {saveButtonText}
                  {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Perfect Progress Stepper */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 py-2">
          <div className="flex items-start w-full overflow-x-auto pb-2 scrollbar-hide">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step Item */}
                <div
                  className={`flex mt-2 flex-col items-center cursor-pointer transition-all flex-shrink-0 group ${
                    step.active ? 'opacity-100' : step.completed ? 'opacity-100' : 'opacity-50'
                  }`}
                  onClick={() => handleStepClick(index)}
                >
                  {/* Step Icon */}
                  <div className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 mb-2 ${
                    step.completed
                      ? 'bg-gray-900 text-white shadow-sm'
                      : step.active
                        ? 'bg-gray-900 text-white shadow-md ring-1 ring-gray-900 ring-offset-2'
                        : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
                  }`}>
                    {step.completed ? (
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    ) : (
                      <span className="text-sm font-bold">{index + 1}</span>
                    )}
                  </div>
                  {/* Step Label */}
                  <span className={`text-xs font-medium whitespace-nowrap text-center leading-tight px-1 ${
                    step.active 
                      ? 'text-gray-900 font-semibold' 
                      : step.completed 
                        ? 'text-gray-600' 
                        : 'text-gray-400 group-hover:text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-2 min-w-[30px] flex-shrink-0 pt-5">
                    <div className="h-0.5 bg-gray-200 relative overflow-hidden rounded-full">
                      <div
                        className={`h-full transition-all duration-500 ease-out rounded-full ${
                          step.completed ? 'bg-gray-900 w-full' : 'bg-gray-200 w-0'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentCenterLayout; 