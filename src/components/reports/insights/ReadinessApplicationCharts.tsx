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

import { formatScore } from '../participantOverview/scoring';
import type { ProgressPoint } from '../participantOverview/types';

const READINESS_COLOR = '#7c3aed';
const APPLICATION_COLOR = '#2563eb';

interface SeriesConfig {
  key: keyof ProgressPoint;
  name: string;
  color: string;
  dashed?: boolean;
  labelPosition: 'top' | 'bottom';
}

function Legend({ series }: { series: SeriesConfig[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4">
      {series.map((entry) => (
        <span key={String(entry.key)} className="flex items-center gap-1.5 text-xs text-gray-600">
          <svg width="18" height="8" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="18"
              y2="4"
              stroke={entry.color}
              strokeWidth="2"
              strokeDasharray={entry.dashed ? '4 3' : undefined}
            />
          </svg>
          {entry.name}
        </span>
      ))}
    </div>
  );
}

function ChartPanel({
  tag,
  series,
  points,
  domain,
  ticks,
  signed,
}: {
  tag: string;
  series: SeriesConfig[];
  points: ProgressPoint[];
  domain: [number | 'auto', number | 'auto'];
  ticks?: number[];
  signed?: boolean;
}) {
  const format = (value: unknown) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '';
    const text = formatScore(value);
    return signed && value > 0 ? `+${text}` : text;
  };

  const hasValues = points.some((point) =>
    series.some((entry) => typeof point[entry.key] === 'number')
  );

  return (
    <div className="min-w-0 flex-1 px-5 py-4">
      <span className="inline-block rounded-md bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
        {tag}
      </span>

      <Legend series={series} />

      <div className="mt-3 h-[260px]">
        {!hasValues ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
            No data for this selection
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 24, right: 16, left: -20, bottom: 4 }}>
              <CartesianGrid stroke="#f1f2f6" vertical={false} />
              <XAxis
                dataKey="code"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
              />
              <YAxis
                domain={domain}
                ticks={ticks}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                width={46}
              />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload?.competencyName || String(label)
                }
                formatter={(value, name) => [format(value), String(name)]}
              />
              {series.map((entry) => (
                <Line
                  key={String(entry.key)}
                  type="linear"
                  dataKey={entry.key as string}
                  name={entry.name}
                  stroke={entry.color}
                  strokeWidth={2}
                  strokeDasharray={entry.dashed ? '5 4' : undefined}
                  dot={{ fill: entry.color, r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={entry.key as string}
                    position={entry.labelPosition}
                    offset={8}
                    formatter={format}
                    style={{ fontSize: 11, fontWeight: 600, fill: entry.color }}
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

export interface ReadinessApplicationChartsProps {
  points: ProgressPoint[];
}

export default function ReadinessApplicationCharts({ points }: ReadinessApplicationChartsProps) {
  return (
    <section>
      <h2 className="text-lg font-bold text-black">
        Readiness vs application — average scores by competency
      </h2>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-gray-500">
          Readiness: psychometric &amp; SJT assessments · Application: assessment centre observed
          evidence
        </p>
        <p className="text-sm text-gray-400">Scale: 1 (low) to 5 (high)</p>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm lg:flex-row lg:divide-x lg:divide-y-0">
        <ChartPanel
          tag="Pre-assessment"
          points={points}
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          series={[
            {
              key: 'preReadiness',
              name: 'Readiness (Pre)',
              color: READINESS_COLOR,
              labelPosition: 'top',
            },
            {
              key: 'preApplication',
              name: 'Application (Pre)',
              color: APPLICATION_COLOR,
              dashed: true,
              labelPosition: 'bottom',
            },
          ]}
        />
        <ChartPanel
          tag="Post-assessment"
          points={points}
          domain={[1, 5]}
          ticks={[1, 2, 3, 4, 5]}
          series={[
            {
              key: 'postReadiness',
              name: 'Readiness (Post)',
              color: READINESS_COLOR,
              labelPosition: 'top',
            },
            {
              key: 'postApplication',
              name: 'Application (Post)',
              color: APPLICATION_COLOR,
              dashed: true,
              labelPosition: 'bottom',
            },
          ]}
        />
        <ChartPanel
          tag="Change (post – pre)"
          points={points}
          domain={['auto', 'auto']}
          signed
          series={[
            {
              key: 'readinessDelta',
              name: 'Readiness change',
              color: READINESS_COLOR,
              labelPosition: 'bottom',
            },
            {
              key: 'applicationDelta',
              name: 'Application change',
              color: APPLICATION_COLOR,
              dashed: true,
              labelPosition: 'top',
            },
          ]}
        />
      </div>
    </section>
  );
}
