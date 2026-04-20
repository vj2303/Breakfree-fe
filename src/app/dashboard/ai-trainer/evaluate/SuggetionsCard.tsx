import { Check, X } from 'lucide-react'
import React from 'react'

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

// Legacy interfaces for backward compatibility
interface EvaluationScores {
  [key: string]: string | number | boolean; // Added boolean type
}

interface EvaluationReasoning {
  [key: string]: string;
}

interface Evaluation {
  scores: EvaluationScores;
  Reasoning: EvaluationReasoning;
  "Compliance Status": string;
  "Total Score": string | number;
  "Feedback": string;
  "content"?: string;
  "Suggestions": string[];
}

interface Classification {
  "Training Proposal Score": string | number;
  "E-learning Script Score": string | number;
  "Predicted Category": string;
  "Reasoning": string;
  "Confidence": string | number; // Made consistent with ChatPage
  "Compliance": string | number; // Made consistent with ChatPage
}

// Define props interface
interface SuggetionsCardProps {
  evaluation?: Evaluation;
  classification?: Classification;
  currentDetails: 'classification' | 'evaluation';
  documentEvaluation?: DocumentEvaluationData;
}

const SuggetionsCard: React.FC<SuggetionsCardProps> = ({ evaluation, classification, currentDetails, documentEvaluation }) => {
    // Determine if we're using document evaluation or legacy data
    const isDocumentEvaluation = !!documentEvaluation;
    
    return (
        <div className='p-4 md:p-6 min-h-0 overflow-hidden'>
            {currentDetails === 'classification' && (
                <div>
                    <h1 className='font-bold text-lg md:text-xl bg-[#476181] rounded-lg text-white mb-3 p-2 md:p-3'>Classification</h1>
                    <div className='p-2'>
                        {isDocumentEvaluation ? (
                            // Document Evaluation Classification View
                            <div>
                                <p className='text-black text-sm md:text-base font-medium mb-3'>Document Quality Assessment</p>
                                <div className='space-y-2 mb-4'>
                                    <div className='flex justify-between items-center p-2 bg-gray-50 rounded-lg'>
                                        <span className='font-medium text-black text-xs'>Total Score:</span>
                                        <span className='font-semibold text-sm text-black'>{documentEvaluation.scoreBreakdown.totalScore}/{documentEvaluation.scoreBreakdown.totalPossible}</span>
                                    </div>
                                    <div className='flex justify-between items-center p-2 bg-gray-50 rounded-lg'>
                                        <span className='font-medium text-black text-xs'>Compliance:</span>
                                        <span className={`font-semibold px-2 py-1 rounded-full text-xs ${documentEvaluation.compliance === 'Compliant' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {documentEvaluation.compliance}
                                        </span>
                                    </div>
                                </div>
                                
                                <h3 className='text-black text-sm md:text-base font-medium mb-3'>Evaluation Criteria</h3>
                                <div className='max-h-[200px] overflow-y-auto space-y-2'>
                                    {documentEvaluation.criteria.map((criterion) => (
                                        <div key={criterion.id} className='border rounded-lg p-2 bg-white shadow-sm'>
                                            <div className='flex items-center justify-between mb-1'>
                                                <span className='font-medium text-xs text-black'>{criterion.name}</span>
                                                {criterion.answer === 'yes' ? <Check color='green' size={14} /> : <X color='red' size={14} />}
                                            </div>
                                            {criterion.note && (
                                                <p className='text-xs text-black bg-gray-50 p-1 rounded'>{criterion.note}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            // Legacy Classification View
                            <div>
                                <p className='text-[#102377] text-[24px] font-medium'>Score</p>
                                <p>Proposal Score: {classification?.["Training Proposal Score"]}</p>
                                <p>E-learning Score: {classification?.["E-learning Script Score"]}</p>
                                <h3 className='text-[#102377] text-[24px]'>Predicted Category</h3>
                                <p>{classification?.["Predicted Category"]}</p>

                                <h3 className='text-[#102377] text-[24px] font-medium'>Reasoning</h3>
                                <p>{classification?.["Reasoning"]}</p>

                                <div className='flex justify-between mt-4'>
                                    <h3 className='text-[#102377] text-[24px]'>Confidence - {classification?.["Confidence"]}</h3>
                                    <h3 className='text-[#102377] text-[24px]'>Compliance - {classification?.["Compliance"]}</h3>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {currentDetails === 'evaluation' && (
                <div>
                    <h1 className='font-bold text-lg md:text-xl bg-[#476181] rounded-lg text-white mb-3 p-2 md:p-3'>Evaluation</h1>
                    <div className='max-h-[300px] overflow-y-auto'>
                        {isDocumentEvaluation ? (
                            // Document Evaluation View
                            <div>
                                <div className='space-y-3'>
                                    <p className='text-black text-sm md:text-base font-medium'>Document Checklist</p>
                                    <div className="space-y-2">
                                        {documentEvaluation.uiChecklist.map((item) => (
                                            <div key={item.id} className="bg-gray-50 rounded-lg p-2">
                                                <div className="flex gap-2 items-center mb-1">
                                                    <h3 className="font-semibold text-xs flex-1 text-black">{item.label}:</h3>
                                                    {item.checked ? <Check color='green' size={14} /> : <X color='red' size={14} />}
                                                </div>
                                                {item.subchecks && (
                                                    <div className="ml-3 space-y-1 bg-white rounded p-1">
                                                        {item.subchecks.map((subcheck) => (
                                                            <div key={subcheck.key} className="flex gap-1 items-center text-xs">
                                                                <span className="flex-1 text-black">{subcheck.label}:</span>
                                                                {subcheck.checked ? <Check color='green' size={12} /> : <X color='red' size={12} />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <hr className="border-gray-300 my-4" />

                                {/* Overall Notes */}
                                <div className="mb-3">
                                    <p className="font-medium text-black mb-1 text-xs">Overall Assessment</p>
                                    <p className="text-black text-xs">{documentEvaluation.overallNotes}</p>
                                </div>

                                {/* Score Breakdown */}
                                <div className="mb-3">
                                    <p className="font-medium text-black mb-1 text-xs">Score Breakdown</p>
                                    <div className="space-y-1">
                                        {documentEvaluation.scoreBreakdown.perCriterionScore.map((score) => (
                                            <div key={score.id} className="flex justify-between text-xs">
                                                <span className="text-black">Criterion {score.id}:</span>
                                                <span className={score.points > 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {score.points} point{score.points !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Legacy Evaluation View
                            <div>
                                <div className='flex flex-col justify-between'>
                                    <p className='text-[#102377] text-[24px] font-medium'>Scores</p>
                                    <div className="space-y-2">
                                        {evaluation && Object.entries(evaluation["scores"]).map(([key, value]) => (
                                            <div key={key} className="flex gap-3">
                                                <h3 className="font-semibold">{key}:</h3>
                                                <p className="text-gray-700">
                                                    {typeof value === 'boolean' 
                                                        ? (value ? <Check color='green' /> : <X color='red' />)
                                                        : (Number(value) ? <Check color='green' /> : <X color='red' />)
                                                    }
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className='text-[#102377] text-[24px] font-medium'>Reasoning</p>
                                    <div className="space-y-2">
                                        {evaluation && Object.entries(evaluation["Reasoning"]).map(([key, value]) => (
                                            <div key={key} className="flex gap-3">
                                                <h3 className="font-semibold">{key}:</h3>
                                                <p className="text-gray-700">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <hr className="border-gray-300 my-4" />

                                {/* Compliance Status */}
                                <div className="flex justify-between mb-4">
                                    <p className="font-medium text-[#102377]">Compliance Status</p>
                                    <p className="text-black">{evaluation?.["Compliance Status"]}</p>
                                </div>

                                {/* Total Score */}
                                <div className="flex justify-between mb-4">
                                    <p className="font-medium text-[#102377]">Total Score</p>
                                    <p className="text-black">{evaluation?.["Total Score"]}</p>
                                </div>
                                <div className="flex justify-between mb-4">
                                    <p className="font-medium text-[#102377]">Feedback</p>
                                    <p className="text-black">{evaluation?.["Feedback"]}</p>
                                </div>
                                <div className="flex justify-between mb-4">
                                    <p className="font-medium text-[#102377]">Content</p>
                                    <p className="text-black">{evaluation?.["content"]}</p>
                                </div>

                                <hr className="border-gray-300 my-4" />

                                <div>
                                    <h3 className="text-[#102377] text-[24px] font-medium mb-2">Suggestions</h3>
                                    {evaluation?.["Suggestions"]?.map((ele: string, index: number) => {
                                        return <p key={index} className="text-black">{ele}</p>
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default SuggetionsCard