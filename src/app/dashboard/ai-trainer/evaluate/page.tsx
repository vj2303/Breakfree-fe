"use client"
import React, { useState } from 'react'
import UploadPage from './UploadPage'
import axios from 'axios';
import ChatPage from './ChatPage';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL_WITH_API } from '../../../../lib/apiConfig';

// Define the UploadStatus type to match what UploadPage expects
type UploadStatus = 'idle' | 'loading' | 'success' | 'error';

// Define interfaces for the new document evaluation API response
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

interface DocumentEvaluationResponse {
  success: boolean;
  message: string;
  data: DocumentEvaluationData;
}

// Legacy interfaces for backward compatibility
interface EvaluationScores {
  [key: string]: string | number;
}

interface EvaluationReasoning {
  [key: string]: string;
}

interface EvaluationData {
  scores: EvaluationScores;
  Reasoning: EvaluationReasoning;
  "Compliance Status": string;
  "Total Score": string | number;
  "Feedback": string;
  "content": string;
  "Suggestions": string[];
}

interface ClassificationData {
  "Training Proposal Score": string | number;
  "E-learning Script Score": string | number;
  "Predicted Category": string;
  "Reasoning": string;
  "Confidence": string;
  "Compliance": string;
}

interface EvaluationResult {
  evaluation: EvaluationData;
  classification: ClassificationData;
}

// API Error response type
interface ApiError {
  message: string;
  status?: number;
}

const Page = () => {
  const { token } = useAuth();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadedFileName, setUploadedFileName] = useState<string | undefined>(undefined);
  const [result] = useState<EvaluationResult | null>(null);
  const [documentEvaluationResult, setDocumentEvaluationResult] = useState<DocumentEvaluationResponse | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check if token is available
    if (!token) {
      alert('Authentication token not found. Please log in again.');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('loading');
    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await axios({
        method: 'post',
        url: `${API_BASE_URL_WITH_API}/document-evaluation/evaluate`,
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        }
      });

      setUploadedFileName(file.name);
      setDocumentEvaluationResult(res.data);
      setUploadStatus("success");
      // Don't show evaluation immediately, wait for Done button click
    } catch (error) {
      // Type guard to handle error properly
      const apiError = error as ApiError;
      alert(apiError.message || 'An error occurred during file upload');
      setUploadStatus('error');
    }
  };

  const handleEvaluationComplete = () => {
    setShowEvaluation(true);
  };

  return (
    <div className="h-full overflow-hidden">
      {showEvaluation && documentEvaluationResult ? (
        <ChatPage 
          documentEvaluation={documentEvaluationResult.data}
        />
      ) : showEvaluation && result ? (
        <ChatPage 
          evaluation={result.evaluation} 
          classification={result.classification} 
        />
      ) : (
        <UploadPage 
          handleFileUpload={handleFileUpload} 
          uploadStatus={uploadStatus} 
          uploadedFileName={uploadedFileName}
          onEvaluationComplete={handleEvaluationComplete}
        />
      )}
    </div>
  )
}

export default Page