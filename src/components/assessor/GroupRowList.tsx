'use client';

import { ChevronRight } from 'lucide-react';

export interface GroupRow {
  id: string;
  title: string;
  admin: string;
  assessmentCount: number;
  participantCount: number;
  onSelect: () => void;
}

export default function GroupRowList({
  rows,
  loading,
}: {
  rows: GroupRow[];
  loading: boolean;
}) {
  return (
    <div className="mt-3.5 flex flex-col gap-px overflow-hidden rounded-[10px] border border-[var(--ap-border)] bg-[var(--ap-border)]">
      {loading &&
        [0, 1].map((row) => (
          <div key={row} className="bg-[var(--ap-card)] px-[18px] py-4">
            <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--ap-grey-wash)]" />
            <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-[var(--ap-grey-wash)]" />
          </div>
        ))}

      {!loading && rows.length === 0 && (
        <div className="bg-[var(--ap-card)] px-[18px] py-8 text-center text-[13px] text-[var(--ap-grey)]">
          No groups are assigned to you yet.
        </div>
      )}

      {!loading &&
        rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={row.onSelect}
            className="flex w-full items-center justify-between gap-4 bg-[var(--ap-card)] px-[18px] py-4 text-left transition-colors hover:bg-[var(--ap-grey-wash)]"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[var(--ap-ink)]">
                {row.title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-[var(--ap-grey)]">
                Admin: {row.admin}
              </span>
            </span>

            <span className="flex flex-shrink-0 items-center gap-[18px]">
              <span className="hidden text-[12.5px] text-[var(--ap-grey)] sm:block">
                {row.assessmentCount} assessment{row.assessmentCount === 1 ? '' : 's'}
              </span>
              <span className="hidden text-[12.5px] text-[var(--ap-grey)] sm:block">
                {row.participantCount} participant{row.participantCount === 1 ? '' : 's'}
              </span>
              <ChevronRight className="h-[15px] w-[15px] text-[var(--ap-grey-light)]" />
            </span>
          </button>
        ))}
    </div>
  );
}
