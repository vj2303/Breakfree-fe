'use client';

import { ArrowRight, Info } from 'lucide-react';

import { DEPARTMENT_BUBBLES } from '../data';

const MIN_DIAMETER = 34;
const MAX_DIAMETER = 62;

const counts = DEPARTMENT_BUBBLES.map((d) => d.participants);
const MIN_COUNT = Math.min(...counts);
const MAX_COUNT = Math.max(...counts);

/** Bubble diameter scales with participant count, clamped so small cohorts stay readable. */
function diameterFor(participants: number): number {
  if (MAX_COUNT === MIN_COUNT) return (MIN_DIAMETER + MAX_DIAMETER) / 2;
  const t = (participants - MIN_COUNT) / (MAX_COUNT - MIN_COUNT);
  return MIN_DIAMETER + t * (MAX_DIAMETER - MIN_DIAMETER);
}

const QUADRANTS = [
  { title: 'High Potential', caption: 'Build Experience', position: 'left-3 top-3 text-left' },
  { title: 'Future Leaders', caption: 'Sustain & Grow', position: 'right-3 top-3 text-right' },
  { title: 'Needs Development', caption: 'Focus & Support', position: 'left-3 bottom-3 text-left' },
  {
    title: 'Core Performers',
    caption: 'Recognize & Grow',
    position: 'right-3 bottom-3 text-right',
  },
];

export default function ReadinessQuadrant() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-gray-900">
            Readiness vs Application
            <Info size={14} className="text-gray-400" />
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Readiness (Potential) is measured through assessments.
            <br />
            Application (Execution) is measured through assessment center performance.
          </p>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600">
          View by:
          <select
            defaultValue="Department"
            className="appearance-none bg-transparent pr-1 font-medium text-gray-900 focus:outline-none"
          >
            <option>Department</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Plot */}
        <div className="min-w-0 flex-1">
          <div className="flex">
            {/* Y axis */}
            <div className="flex flex-shrink-0 items-center">
              <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-medium text-gray-600">
                Readiness
              </span>
            </div>
            <div className="flex w-14 flex-shrink-0 flex-col justify-between py-1 pr-2 text-right text-[11px] text-gray-400">
              <span>High</span>
              <span>Medium</span>
              <span>Low</span>
            </div>

            <div className="relative min-w-0 flex-1">
              <div className="relative h-[260px] rounded-lg border border-gray-200 bg-white">
                {/* Quadrant dividers */}
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 border-l border-dashed border-gray-200" />
                <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 border-t border-dashed border-gray-200" />

                {QUADRANTS.map((q) => (
                  <div key={q.title} className={`absolute ${q.position}`}>
                    <p className="text-[11px] font-semibold text-gray-700">{q.title}</p>
                    <p className="text-[10px] text-gray-400">{q.caption}</p>
                  </div>
                ))}

                {DEPARTMENT_BUBBLES.map((bubble) => {
                  const size = diameterFor(bubble.participants);
                  return (
                    <div
                      key={bubble.id}
                      title={`${bubble.name} — ${bubble.participants} participants`}
                      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gray-600 text-xs font-semibold text-white"
                      style={{
                        width: size,
                        height: size,
                        left: `${(bubble.application * 100).toFixed(1)}%`,
                        top: `${((1 - bubble.readiness) * 100).toFixed(1)}%`,
                      }}
                    >
                      {bubble.participants}
                    </div>
                  );
                })}
              </div>

              {/* X axis */}
              <div className="mt-2 flex justify-between px-1 text-[11px] text-gray-400">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
              <p className="mt-1.5 text-center text-xs font-medium text-gray-600">
                Application (Execution)
              </p>
            </div>
          </div>
        </div>

        {/* About this view */}
        <div className="flex w-full flex-shrink-0 flex-col rounded-lg border border-gray-200 p-3.5 lg:w-56">
          <h3 className="text-xs font-semibold text-gray-900">About this view</h3>
          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">
            Each bubble represents a department. Size indicates number of participants.
          </p>

          <p className="mt-3 text-[11px] font-semibold text-gray-900">Departments</p>
          <ul className="mt-1.5 space-y-1.5">
            {DEPARTMENT_BUBBLES.map((bubble) => (
              <li key={bubble.id} className="flex items-center justify-between text-[11px]">
                <span className="flex min-w-0 items-center gap-1.5 text-gray-600">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                  <span className="truncate">{bubble.name}</span>
                </span>
                <span className="ml-2 flex-shrink-0 tabular-nums text-gray-900">
                  {bubble.participants}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            View detailed analysis
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </section>
  );
}
