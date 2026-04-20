import React from "react";
// import Modal from "./Modal"; // Commented out since it's not being used

// New interfaces for document evaluation
interface UIChecklistItem {
  id: number;
  label: string;
  checked: boolean;
  subchecks?: Array<{
    key: string;
    label: string;
    checked: boolean;
  }>;
}

interface CriteriaItem {
  id: number;
  name: string;
  answer: string;
  confidence: number;
  evidence: string;
  location: string;
  note: string;
  smart?: {
    [key: string]: {
      answer: string;
      evidence: string;
      confidence: number;
    };
  };
}

interface ScoreBreakdown {
  totalScore: number;
  totalPossible: number;
  perCriterionScore: Array<{
    id: number;
    points: number;
  }>;
}

interface DocumentEvaluationData {
  uiChecklist: UIChecklistItem[];
  criteria: CriteriaItem[];
  scoreBreakdown: ScoreBreakdown;
  compliance: string;
  overallNotes: string;
}

// Legacy types for backward compatibility
type Classification = {
  "Training Proposal Score": number | string;
  "E-learning Script Score": number | string;
  "Predicted Category": string;
  "Reasoning": string;
  "Confidence": number | string;
  "Compliance": number | string;
};

type Evaluation = {
  scores: Record<string, number | string | boolean>;
  Reasoning: Record<string, string>;
  "Compliance Status": string;
  "Total Score": number | string;
  Feedback: string;
  content?: string;
  Suggestions: string[];
};

type AccuracyRateProps = {
  currentDetails: 'classification' | 'evaluation'; // Changed from string to specific union type
  setCurrentDetails: (details: 'classification' | 'evaluation') => void; // Changed parameter type
  documentEvaluation?: DocumentEvaluationData;
  evaluation?: Evaluation;
  classification?: Classification;
};

const AccuracyRate = ({ currentDetails, setCurrentDetails, documentEvaluation }: AccuracyRateProps) => {
  // Determine if we're using document evaluation or legacy data
  const isDocumentEvaluation = !!documentEvaluation;
  
  // Calculate score for document evaluation
  const scorePercentage = isDocumentEvaluation 
    ? Math.round((documentEvaluation.scoreBreakdown.totalScore / documentEvaluation.scoreBreakdown.totalPossible) * 100)
    : 0;

  return (
    <div className="p-4 md:p-6 min-h-0">
      {/* Score Display for Document Evaluation */}
      {isDocumentEvaluation && (
        <div className="mb-4">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-[#476181] mb-2">
              {scorePercentage}%
            </div>
            <div className="text-xs md:text-sm text-black mb-2">
              Document Quality Score
            </div>
            <div className="text-xs text-black mb-2">
              {documentEvaluation.scoreBreakdown.totalScore} out of {documentEvaluation.scoreBreakdown.totalPossible} criteria met
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              documentEvaluation.compliance === 'Compliant' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {documentEvaluation.compliance}
            </div>
          </div>
        </div>
      )}

      {/* Buttons for actions */}
      <div className="flex flex-col gap-2">
        <button 
          className={`border rounded-full px-3 py-2 text-xs font-bold border-[#9D9D9D] whitespace-nowrap transition-colors ${currentDetails === "classification" ? "bg-[#476181] text-white" : "hover:bg-gray-50 text-black"}`}
          onClick={() => setCurrentDetails('classification')}
        >
          See Classification
        </button>
        <button 
          className={`border rounded-full px-3 py-2 text-xs font-bold border-[#9D9D9D] whitespace-nowrap transition-colors ${currentDetails === "evaluation" ? "bg-[#476181] text-white" : "hover:bg-gray-50 text-black"}`}
          onClick={() => setCurrentDetails('evaluation')}
        >
          See Evaluation
        </button>           
      </div>

      {/* Pass Modal to display when open */}
      {/* <Modal isOpen={isModalOpen} closeModal={closeModal} contentType={modalType} classification={classification} evaluation={evaluation} /> */}
    </div>
  );
};

export default AccuracyRate;