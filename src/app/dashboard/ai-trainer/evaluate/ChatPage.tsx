'use client'
import React, { useState } from 'react';
import Chats from './Chats';
import AccuracyRate from './AccuracyRate';
import SuggetionsCard from './SuggetionsCard';

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

interface ChatPageProps {
  classification?: Classification;
  evaluation?: Evaluation;
  documentEvaluation?: DocumentEvaluationData;
}

const ChatPage: React.FC<ChatPageProps> = ({ classification, evaluation, documentEvaluation }) => {
    // Changed from string to the specific union type
    const [currentDetails, setCurrentDetails] = useState<'classification' | 'evaluation'>("classification")
    
    // Determine which data to use
    const isDocumentEvaluation = !!documentEvaluation;
    const feedback = isDocumentEvaluation ? documentEvaluation.overallNotes : evaluation?.Feedback || '';
    
//   const [evaluationResult, setEvaluationResult] = useState(null); // Store Evaluation Response
//   const [overallScore, setOverallScore] = useState(null); // Store Overall Score
//   const [loading, setLoading] = useState(false); // Track loading state

//   useEffect(() => {
//     handleDoneClick();
//   }, []); // Call API when component mounts

//   const handleDoneClick = async () => {
//     setLoading(true);
//     try {
//       const response = await fetch('http://127.0.0.1:8000/evaluate/done', {
//         method: 'POST',
//         headers: { 'accept': 'application/json' },
//       });

//       const data = await response.json();
//       if (response.ok) {
//         setEvaluationResult(data.lesson_plan_evaluation);
//         setOverallScore(data.overall_score);
//       } else {
//         setEvaluationResult('❌ Evaluation failed.');
//         setOverallScore(null);
//       }
//     } catch (error) {
//       setEvaluationResult('❌ Error fetching evaluation.');
//       setOverallScore(null);
//     }
//     setLoading(false);
//   };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Mobile and Tablet Layout */}
        <div className="block lg:hidden">
          {/* Mobile Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
              Document Evaluation Results
            </h1>
            <p className="text-black">Review your document assessment below</p>
          </div>

          {/* Mobile Accuracy Rate Section */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <AccuracyRate 
              currentDetails={currentDetails} 
              setCurrentDetails={setCurrentDetails}
              documentEvaluation={documentEvaluation}
              evaluation={evaluation}
              classification={classification}
            />
          </div>

          {/* Mobile Suggestions Section */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <SuggetionsCard 
              evaluation={evaluation} 
              classification={classification} 
              currentDetails={currentDetails}
              documentEvaluation={documentEvaluation}
            />
          </div>

          {/* Mobile Chats Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Chats Feedback={feedback} />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex lg:gap-6 lg:h-[calc(100vh-4rem)]">
          {/* Left Section - Chats with Evaluation Result */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Chats Feedback={feedback} />
          </div>

          {/* Right Section - Sticky Evaluation Results */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-6 space-y-4">
              {/* Accuracy Rate */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <AccuracyRate 
                  currentDetails={currentDetails} 
                  setCurrentDetails={setCurrentDetails}
                  documentEvaluation={documentEvaluation}
                  evaluation={evaluation}
                  classification={classification}
                />
              </div>

              {/* Suggestions Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <SuggetionsCard 
                  evaluation={evaluation} 
                  classification={classification} 
                  currentDetails={currentDetails}
                  documentEvaluation={documentEvaluation}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;