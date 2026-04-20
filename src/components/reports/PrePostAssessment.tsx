"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PrePostAssessmentProps {
  participantId: string;
  participantName: string;
  token: string | null;
  assessmentCenterId?: string | null;
}

interface CompetencyData {
  competencyId: string;
  competencyName: string;
  preAssessmentApp: number;
  preAssessmentApp2: number;
  improvement: number;
  postAssessmentReadiness: number;
}

const PrePostAssessment: React.FC<PrePostAssessmentProps> = ({
  participantId,
  participantName,
  token,
  assessmentCenterId,
}) => {
  const [data, setData] = useState<CompetencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (assessmentCenterId) {
        queryParams.append('assessmentCenterId', assessmentCenterId);
      }
      const url = `/api/management-reports/participant/${participantId}/pre-post-assessment${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const result = await res.json();
        setData(result.data?.competencies || []);
      } else {
        setError('Failed to load data');
      }
    } catch (err) {
      console.error('Error fetching pre-post assessment data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token, participantId, assessmentCenterId]);

  useEffect(() => {
    if (token && participantId) {
      fetchData();
    }
  }, [token, participantId, fetchData]);

  // Prepare data for table
  const tableData = data.map((comp) => ({
    competency: comp.competencyName,
    preAssessmentApp: comp.preAssessmentApp,
    preAssessmentApp2: comp.preAssessmentApp2,
    improvement: comp.improvement,
    postAssessmentReadiness: comp.postAssessmentReadiness,
  }));

  // Prepare data for graph
  const graphData = data.map((comp) => ({
    name: comp.competencyName,
    preAssessment: comp.preAssessmentApp,
    preAssessment2: comp.preAssessmentApp2,
    postAssessment: comp.postAssessmentReadiness,
  }));

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-6">
        <div className="text-center py-4 text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-6">
        <div className="text-center py-4 text-sm text-black">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-black">
            Pre vs Post Assessment ({participantName})
          </h3>
        </div>
        <div className="px-4 py-3 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                  Competencies
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                  Pre- Assessment App
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                  Pre- Assessment App
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                  Improvement
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                  Post Assessment readiness
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-sm text-black">{row.competency}</td>
                  <td className="py-3 px-4 text-sm text-black">{row.preAssessmentApp}</td>
                  <td className="py-3 px-4 text-sm text-black">{row.preAssessmentApp2}</td>
                  <td className="py-3 px-4 text-sm text-black font-medium bg-gray-100">
                    {row.improvement}
                  </td>
                  <td className="py-3 px-4 text-sm text-black">{row.postAssessmentReadiness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Line Graph */}
      <div className="bg-white border-t border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-black">
            Pre vs Post Assessment Graph ({participantName})
          </h3>
        </div>
        <div className="px-4 py-3">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                <XAxis
                  dataKey="name"
                  stroke="#000000"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="#000000"
                  fontSize={11}
                  domain={[0, 5.0]}
                  ticks={[0, 1.0, 2.0, 3.0, 4.0, 5.0]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #000000',
                    borderRadius: '0',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="preAssessment"
                  stroke="#000000"
                  strokeWidth={2}
                  dot={{ fill: '#000000', r: 3 }}
                  name="Pre Assessment App"
                />
                <Line
                  type="monotone"
                  dataKey="preAssessment2"
                  stroke="#808080"
                  strokeWidth={2}
                  dot={{ fill: '#808080', r: 3 }}
                  name="Pre Assessment App 2"
                />
                <Line
                  type="monotone"
                  dataKey="postAssessment"
                  stroke="#404040"
                  strokeWidth={2}
                  dot={{ fill: '#404040', r: 3 }}
                  name="Post Assessment Readiness"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
          <button className="px-4 py-2 text-sm font-medium text-black border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            View Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrePostAssessment;

