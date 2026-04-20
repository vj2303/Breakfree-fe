import React, { useState } from "react";
import { Check } from "lucide-react";
import SelectContentStep from "./steps/SelectContentStep";
import SubjectExerciseMatrixStep from "./steps/SubjectExerciseMatrixStep";
import AddFrameworkStep from "./steps/AddFrameworkStep";
import AddDocumentStep from "./steps/AddDocumentStep";
import ReportConfigurationStep from "./steps/ReportConfigurationStep";
import ParticipantAssessorManagementStep from "./steps/ParticipantAssessorManagementStep";
import SelectCompetenciesStep from "./steps/SelectCompetenciesStep";

const steps = [
  "Select Content",
  "Select Competencies",
  "Subject - Exercise Matrix",
  "Add Framework",
  "Add Document",
  "Report configuration",
  "Participant and assessor management",
];

interface AssessmentCenterStepperProps {
  onBack?: () => void;
}

const AssessmentCenterStepper: React.FC<AssessmentCenterStepperProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState("Assessment Center Name");

  const stepContents = [
    <SelectContentStep key="select-content" />,
    <SelectCompetenciesStep key="select-competencies" />,
    <SubjectExerciseMatrixStep key="subject-exercise-matrix" />,
    <AddFrameworkStep key="add-framework" />,
    <AddDocumentStep key="add-document" />,
    <ReportConfigurationStep key="report-configuration" />,
    <ParticipantAssessorManagementStep key="participant-assessor-management" />,
  ];

  return (
    <div className="p-8">
      <div className="bg-white rounded-2xl p-8 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <input
            className="text-3xl font-black text-black bg-transparent border-none outline-none focus:ring-0"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: `${Math.max(20, name.length * 1.2)}ch` }}
          />
          <span className="text-2xl text-black cursor-pointer">✏️</span>
        </div>
        <p className="text-gray-400 text-base mb-4">Created on 2 Jan 2025</p>
        <div className="flex items-center gap-0 mt-4">
          {steps.map((step, idx) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <button
                  className={`font-semibold text-base ${
                    idx === currentStep
                      ? "text-black"
                      : idx < currentStep
                      ? "text-black opacity-60"
                      : "text-gray-400"
                  }`}
                  onClick={() => idx <= currentStep && setCurrentStep(idx)}
                  disabled={idx > currentStep}
                  style={{ minWidth: 120, textAlign: "left" }}
                >
                  <span className="flex items-center gap-2">
                    {step}
                    {idx === currentStep && (
                      <span className="ml-1 w-5 h-5 flex items-center justify-center bg-green-500 rounded-full">
                        <Check className="w-4 h-4 text-white" />
                      </span>
                    )}
                  </span>
                </button>
              </div>
              {idx < steps.length - 1 && (
                <div className="mx-2 flex items-center">
                  <span className="w-12 h-1 bg-gray-200 rounded-full block" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      {/* Step content */}
      <div className="mb-8">
        {stepContents[currentStep]}
      </div>
      <div className="flex justify-between">
        {onBack && (
          <button
            className="px-6 py-2 rounded-full bg-white border border-gray-300 text-black font-semibold text-lg shadow hover:bg-gray-100 transition"
            onClick={onBack}
          >
            Back
          </button>
        )}
        <div>
          {currentStep > 0 && (
            <button
              className="px-6 py-2 rounded-full bg-white border border-gray-300 text-black font-semibold text-lg shadow hover:bg-gray-100 transition mr-2"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Previous
            </button>
          )}
          {currentStep < steps.length - 1 && (
            <button
              className="px-6 py-2 rounded-full bg-gray-900 text-white font-semibold text-lg shadow hover:bg-gray-800 transition"
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              Next
            </button>
          )}
          {currentStep === steps.length - 1 && (
            <button
              className="px-6 py-2 rounded-full bg-green-600 text-white font-semibold text-lg shadow hover:bg-green-700 transition"
              // onClick={handleFinish}
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentCenterStepper; 