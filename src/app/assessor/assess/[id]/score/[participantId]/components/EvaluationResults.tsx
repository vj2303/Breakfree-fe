'use client';

import type { EvaluationResponse } from '../lib/types';

export interface EvaluationResultsProps {
  data: EvaluationResponse | null;
}

export default function EvaluationResults({ data }: EvaluationResultsProps) {
  if (!data) return null;

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-black">Interview Evaluation Report</h3>
        <div className="text-right">
          <p className="text-sm font-bold text-black">Overall Score: {data.overall_score}</p>
          <p className="text-xs text-gray-600">Average: {data.summary.average_score}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.evaluations.map((evaluation, index) => (
          <div key={index} className="rounded border border-gray-200 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="text-sm font-medium text-black">{evaluation.metric}</h4>
              <span className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-black">
                {evaluation.score}
              </span>
            </div>
            <p className="text-xs text-gray-700">{evaluation.reasoning}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-600">
        <p>Report generated for: {data.filename}</p>
        <p>Total metrics evaluated: {data.summary.total_metrics}</p>
      </div>
    </div>
  );
}
