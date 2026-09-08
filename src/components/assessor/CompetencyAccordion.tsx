'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface AccordionCompetency {
  id: string;
  competencyName: string;
  subCompetencyNames: string[];
}

/** "K1 - Delighting Customers: Solutions" -> code "K1", title without the code prefix. */
function splitCode(fullName: string, index: number): { code: string; title: string } {
  const title = (fullName || '').split('\t')[0].trim();
  const match = title.match(/^(K\s*\d+)\s*[-–:]?\s*(.*)$/i);
  if (match) {
    return { code: match[1].replace(/\s+/g, '').toUpperCase(), title: match[2].trim() || title };
  }
  return { code: `K${index + 1}`, title };
}

export default function CompetencyAccordion({
  competencies,
}: {
  competencies: AccordionCompetency[];
}) {
  const [open, setOpen] = useState(false);

  if (competencies.length === 0) return null;

  const parsed = competencies.map((competency, index) => ({
    ...competency,
    ...splitCode(competency.competencyName, index),
  }));

  return (
    <div className="mt-10 border-t border-[var(--ap-border)] pt-5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-5 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[13.5px] font-bold text-[var(--ap-ink)]">
            Assessment competencies
          </span>
          <span className="mt-2.5 flex max-w-[760px] flex-wrap gap-1.5">
            {parsed.map((competency) => (
              <span
                key={competency.id}
                className="whitespace-nowrap rounded-full bg-[var(--ap-grey-wash)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--ap-grey)]"
              >
                {competency.code} · {competency.title.split(':')[0]}
              </span>
            ))}
          </span>
        </span>

        <span className="flex flex-shrink-0 items-center gap-1.5 pt-0.5 text-[12.5px] font-semibold text-[var(--ap-navy)]">
          {open ? 'Hide descriptors' : 'Show descriptors'}
          <ChevronDown
            className={`h-[13px] w-[13px] transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>

      <div
        className={`grid grid-cols-1 gap-3 overflow-hidden transition-all duration-300 md:grid-cols-2 ${
          open ? 'mt-[18px] max-h-[2400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {parsed.map((competency) => (
          <div
            key={competency.id}
            className="rounded-[10px] border border-[var(--ap-border)] border-l-[3px] border-l-[var(--ap-grey-light)] bg-[var(--ap-card)] px-4 py-3.5"
          >
            <p className="mb-[7px] text-[12.5px] font-bold text-[var(--ap-ink)]">
              <span className="mr-1.5 text-[var(--ap-navy)]">{competency.code}</span>
              {competency.title}
            </p>
            <ul className="flex flex-col gap-1">
              {competency.subCompetencyNames.map((subComp, index) => (
                <li
                  key={`${competency.id}-${index}`}
                  className="relative pl-[11px] text-[11.5px] leading-relaxed text-[var(--ap-grey)] before:absolute before:left-0 before:text-[var(--ap-grey-light)] before:content-['–']"
                >
                  {subComp.split('\t')[0]}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
