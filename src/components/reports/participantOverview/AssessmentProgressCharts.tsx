"use client";

import React from 'react';
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatScore } from './scoring';
import type { OverviewCompetency, ProgressPoint } from './types';

export interface AssessmentProgressChartsProps {
  competencies: OverviewCompetency[];
  points: ProgressPoint[];
}

const READINESS_COLOR = '#7c3aed';
const APPLICATION_COLOR = '#2563eb';

interface SeriesConfig {
  key: keyof ProgressPoint;
  name: string;
  color: string;
  /** Keeps the two labels on a point from colliding. */
  labelPosition: 'top' | 'bottom';
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function ProgressChart({
  index,
  title,
  subtitle,
  series,
  points,
  domain,
  signed,
}: {
  index: number;
  title: string;
  subtitle: string;
  series: SeriesConfig[];
  points: ProgressPoint[];
  domain: [number | 'auto', number | 'auto'];
  signed?: boolean;
}) {
  const format = (value: unknown) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '';
    const text = formatScore(value);
    return signed && value > 0 ? `+${text}` : text;
  };

  // An all-null series renders as bare axes, which reads as a broken chart — say so instead.
  const hasValues = points.some((point) =>
    series.some((s) => typeof point[s.key] === 'number')
  );

  return (
    <div className="min-w-0">
      <h4 className="text-sm font-bold text-black">
        {index}. {title}
      </h4>
      <p className="text-xs text-gray-500">{subtitle}</p>

      <div className="mt-2 flex items-center gap-4">
        {series.map((s) => (
          <LegendDot key={String(s.key)} color={s.color} label={s.name} />
        ))}
      </div>

      <div className="mt-3 h-[260px]">
        {points.length === 0 || !hasValues ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 22, right: 16, left: -18, bottom: 4 }}>
              <CartesianGrid stroke="#f1f2f6" vertical={false} />
              <XAxis
                dataKey="code"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
              />
              <YAxis
                domain={domain}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  fontSize: 12,
                }}
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.competencyName || String(label)
                }
                formatter={(value, name) => [format(value), String(name)]}
              />
              {series.map((s) => (
                <Line
                  key={String(s.key)}
                  type="linear"
                  dataKey={s.key as string}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ fill: s.color, r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={s.key as string}
                    position={s.labelPosition}
                    offset={8}
                    formatter={format}
                    style={{ fontSize: 11, fontWeight: 600, fill: s.color }}
                  />
                </Line>
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function AssessmentProgressCharts({
  competencies,
  points,
}: AssessmentProgressChartsProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-bold text-black">Assessment Progress</h3>

      {competencies.length > 0 && (
        <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Competency Key:
            </span>
            {competencies.map((competency) => (
              <span key={competency.id} className="text-sm text-gray-600">
                <span className="font-bold text-black">{competency.code}</span> {competency.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <ProgressChart
          index={1}
          title="Pre-assessment"
          subtitle="Readiness vs application"
          points={points}
          domain={[0, 5]}
          series={[
            {
              key: 'preReadiness',
              name: 'Readiness',
              color: READINESS_COLOR,
              labelPosition: 'top',
            },
            {
              key: 'preApplication',
              name: 'Application',
              color: APPLICATION_COLOR,
              labelPosition: 'bottom',
            },
          ]}
        />
        <ProgressChart
          index={2}
          title="Post-assessment"
          subtitle="Readiness vs application"
          points={points}
          domain={[0, 5]}
          series={[
            {
              key: 'postReadiness',
              name: 'Readiness',
              color: READINESS_COLOR,
              labelPosition: 'top',
            },
            {
              key: 'postApplication',
              name: 'Application',
              color: APPLICATION_COLOR,
              labelPosition: 'bottom',
            },
          ]}
        />
        <ProgressChart
          index={3}
          title="Improvement (post – pre)"
          subtitle="Change in scores"
          points={points}
          domain={['auto', 'auto']}
          signed
          series={[
            {
              key: 'readinessDelta',
              name: 'Readiness Δ',
              color: READINESS_COLOR,
              labelPosition: 'bottom',
            },
            {
              key: 'applicationDelta',
              name: 'Application Δ',
              color: APPLICATION_COLOR,
              labelPosition: 'top',
            },
          ]}
        />
      </div>
    </div>
  );
}
