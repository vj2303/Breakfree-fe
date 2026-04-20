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

interface ApplicationReadinessGraphProps {
  participantId: string;
  participantName: string;
  token: string | null;
  assessmentCenterId?: string | null;
}

interface CompetencyData {
  competencyId: string;
  competencyName: string;
  applicationAverage: number;
  readiness: number;
  activities: ActivityData[];
  average: number;
  forGraph: number;
  residual: number;
  total: number;
}

interface ActivityData {
  activityId: string;
  activityName: string;
  assessorName: string;
  scores: Record<string, number>;
}

const ApplicationReadinessGraph: React.FC<ApplicationReadinessGraphProps> = ({
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
      const url = `/api/management-reports/participant/${participantId}/application-readiness${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
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
      console.error('Error fetching application readiness data:', err);
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
    applicationAverage: comp.applicationAverage,
    readiness: comp.readiness,
  }));

  // Prepare data for graph
  const graphData = data.map((comp, index) => ({
    name: comp.competencyName,
    value: comp.readiness * 1000, // Scale for graph display
    index,
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
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-black">
          Application Average vs Readiness Graph ({participantName})
        </h3>
      </div>
      <div className="px-4 py-3">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-black">Competencies</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                  Application Average
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-black">Readiness</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-sm text-black">{row.competency}</td>
                  <td className="py-3 px-4 text-sm text-black">{row.applicationAverage}</td>
                  <td className="py-3 px-4 text-sm text-black">{row.readiness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Line Graph */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-black">
          Application Average vs Readiness Graph ({participantName})
        </h3>
      </div>
      <div className="px-4 py-3">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                stroke="#6b7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                domain={[0, 5000]}
                ticks={[1000, 2000, 3000, 4000, 5000]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ fill: '#60a5fa', r: 4 }}
                name="Readiness"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      {data.length > 0 && data[0].activities && data[0].activities.length > 0 && (
        <div className="bg-white border-t border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-black">
              Application Average vs Readiness Graph ({participantName})
            </h3>
          </div>
          <div className="px-4 py-3 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-black">Activity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                    Participant Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-black">
                    Assessor&apos;s Name
                  </th>
                  {data.map((comp) => (
                    <th
                      key={comp.competencyId}
                      className="text-left py-3 px-4 text-sm font-semibold text-black"
                    >
                      {comp.competencyName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data[0].activities.map((activity, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 px-4 text-sm text-black">{activity.activityName}</td>
                    <td className="py-3 px-4 text-sm text-black">{participantName}</td>
                    <td className="py-3 px-4 text-sm text-black">{activity.assessorName}</td>
                    {data.map((comp) => (
                      <td key={comp.competencyId} className="py-3 px-4 text-sm text-black">
                        {activity.scores[comp.competencyId] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
                {data[0].average !== undefined && (
                  <>
                    <tr className="border-t-2 border-gray-400 font-semibold">
                      <td colSpan={3} className="py-3 px-4 text-sm text-black">
                        Average
                      </td>
                      {data.map((comp) => (
                        <td key={comp.competencyId} className="py-3 px-4 text-sm text-black">
                          {comp.average}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-sm text-black">
                        For Graph
                      </td>
                      {data.map((comp) => (
                        <td key={comp.competencyId} className="py-3 px-4 text-sm text-black">
                          {comp.forGraph}%
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-sm text-black">
                        Residual
                      </td>
                      {data.map((comp) => (
                        <td key={comp.competencyId} className="py-3 px-4 text-sm text-black">
                          {comp.residual}%
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-sm text-black">
                        Total
                      </td>
                      {data.map((comp) => (
                        <td key={comp.competencyId} className="py-3 px-4 text-sm text-black">
                          {comp.total}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationReadinessGraph;

