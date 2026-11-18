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
  // Application = assessor (BARS) measured scores. null where not measured.
  preApplication: number | null;
  postApplication: number | null;
  applicationDelta: number | null;
}

/** A score that was never measured is shown as such, never as a blank cell or a 0. */
const NotAssessed = () => <span className="text-gray-400">Not yet assessed</span>;

const cell = (value: number | null) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : <NotAssessed />;

/** Difference cell: only shown when both sides were measured; never "+0.0" filler. */
const deltaCell = (value: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return <NotAssessed />;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}`;
};

const PrePostAssessment: React.FC<PrePostAssessmentProps> = ({
  participantId,
  participantName,
  token,
  assessmentCenterId,
}) => {
  const [data, setData] = useState<CompetencyData[]>([]);
  const [comparison, setComparison] = useState(false);
  const [preName, setPreName] = useState<string | null>(null);
  const [postName, setPostName] = useState<string | null>(null);
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
        setComparison(Boolean(result.data?.comparison));
        setPreName(result.data?.preAssessmentName ?? null);
        setPostName(result.data?.postAssessmentName ?? null);
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

  // In single-event mode the "current" score is the post/current application score.
  const graphData = data.map((comp) => ({
    name: comp.competencyName,
    pre: comp.preApplication,
    post: comp.postApplication,
    score: comp.postApplication,
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
            {comparison ? 'Pre vs Post Assessment' : 'Assessment Scores'} ({participantName})
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            {comparison
              ? `Comparing "${preName ?? 'Pre'}" (Pre) against "${postName ?? 'Post'}" (Post). Difference is shown only where both were assessed.`
              : 'Single-event assessment. Tag a Pre and a Post assessment to see a comparison.'}
          </p>
        </div>
        <div className="px-4 py-3 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-black">Competencies</th>
                {comparison ? (
                  <>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-black">Pre</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-black">Post</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-black">Difference</th>
                  </>
                ) : (
                  <th className="text-left py-3 px-4 text-sm font-semibold text-black">Score</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.competencyId} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-sm text-black">{row.competencyName}</td>
                  {comparison ? (
                    <>
                      <td className="py-3 px-4 text-sm text-black">{cell(row.preApplication)}</td>
                      <td className="py-3 px-4 text-sm text-black">{cell(row.postApplication)}</td>
                      <td className="py-3 px-4 text-sm text-black font-medium bg-gray-100">
                        {deltaCell(row.applicationDelta)}
                      </td>
                    </>
                  ) : (
                    <td className="py-3 px-4 text-sm text-black">{cell(row.postApplication)}</td>
                  )}
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
            {comparison ? 'Pre vs Post Assessment Graph' : 'Assessment Scores Graph'} ({participantName})
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
                {comparison ? (
                  <>
                    <Line
                      type="monotone"
                      dataKey="pre"
                      stroke="#808080"
                      strokeWidth={2}
                      dot={{ fill: '#808080', r: 3 }}
                      name={preName ? `${preName} (Pre)` : 'Pre'}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="post"
                      stroke="#000000"
                      strokeWidth={2}
                      dot={{ fill: '#000000', r: 3 }}
                      name={postName ? `${postName} (Post)` : 'Post'}
                      connectNulls={false}
                    />
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#000000"
                    strokeWidth={2}
                    dot={{ fill: '#000000', r: 3 }}
                    name="Score"
                    connectNulls={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrePostAssessment;
