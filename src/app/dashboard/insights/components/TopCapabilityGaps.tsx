'use client';

import { ArrowDown, ArrowRight, ArrowUp, Info } from 'lucide-react';

import { CAPABILITY_GAPS } from '../data';

export default function TopCapabilityGaps() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="flex items-center gap-1.5 text-base font-semibold text-gray-900">
        Top Capability Gaps
        <span className="text-xs font-normal text-gray-500">(Across Organization)</span>
        <Info size={14} className="text-gray-400" />
      </h2>

      <table className="mt-3 w-full">
        <thead>
          <tr className="border-b border-gray-200 text-left text-[11px] font-medium text-gray-500">
            <th className="pb-2">Capability</th>
            <th className="pb-2 text-right">Avg. Score</th>
            <th className="pb-2 text-right">vs Previous</th>
          </tr>
        </thead>
        <tbody>
          {CAPABILITY_GAPS.map((gap) => {
            const DeltaIcon = gap.trend === 'down' ? ArrowDown : ArrowUp;
            const deltaClass = gap.trend === 'down' ? 'text-red-600' : 'text-green-600';
            return (
              <tr key={gap.capability} className="border-b border-gray-100 last:border-0">
                <td className="py-2.5 text-sm text-gray-700">{gap.capability}</td>
                <td className="py-2.5 text-right text-sm tabular-nums text-gray-900">
                  {gap.averageScore}
                </td>
                <td className={`py-2.5 text-right text-sm ${deltaClass}`}>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <DeltaIcon size={13} />
                    {gap.delta}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button
        type="button"
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
      >
        View all capability gaps
        <ArrowRight size={13} />
      </button>
    </section>
  );
}
