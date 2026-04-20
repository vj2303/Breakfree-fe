"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Started', value: 41 },
  { name: 'In progress', value: 28 },
  { name: 'Completed', value: 49 }
];

export default function AssessorPlatform() {
  return (
    <div className="bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to the Assessor Platform
          </h1>
          <p className="text-gray-600 mb-6 max-w-4xl leading-relaxed">
            This platform is designed to help you evaluate participants efficiently, provide structured feedback, and track performance in real time. Access assigned assessments, review participant responses, and score competencies using predefined rubrics. Collaborate with other assessors, generate reports, and ensure a fair, data-driven evaluation process all in one place. Get started by selecting your assigned participant.
          </p>
          
          {/* Management Groups Button */}
          <button className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Management groups
          </button>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 14, fill: '#9CA3AF' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 14, fill: '#9CA3AF' }}
                  domain={[0, 50]}
                  ticks={[0, 10, 20, 30, 40, 50]}
                />
                <Bar 
                  dataKey="value" 
                  fill="#475569" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={80}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}