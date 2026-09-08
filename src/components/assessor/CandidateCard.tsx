'use client';

export type CandidateStatus = 'overdue' | 'progress' | 'notstarted' | 'signed';

export interface CandidateCardProps {
  name: string;
  /** Designation, shown small in the top-right like the mockup's grade. */
  role: string;
  status: CandidateStatus;
  statusLabel: string;
  /** Secondary line: activity and how long it has been waiting. */
  sub: string;
  done: number;
  total: number;
  actionLabel: string;
  /** Signed-off candidates get the outlined button. */
  ghost?: boolean;
  onAction: () => void;
}

const TAG_STYLES: Record<CandidateStatus, string> = {
  overdue: 'bg-[var(--ap-rust-wash)] text-[var(--ap-rust)]',
  progress: 'bg-[var(--ap-amber-wash)] text-[var(--ap-amber)]',
  notstarted: 'bg-[var(--ap-grey-wash)] text-[var(--ap-grey)]',
  signed: 'bg-[var(--ap-teal-wash)] text-[var(--ap-teal)]',
};

const FILL_STYLES: Record<CandidateStatus, string> = {
  overdue: 'bg-[var(--ap-rust)]',
  progress: 'bg-[var(--ap-amber)]',
  notstarted: 'bg-[var(--ap-grey-light)]',
  signed: 'bg-[var(--ap-teal)]',
};

export default function CandidateCard({
  name,
  role,
  status,
  statusLabel,
  sub,
  done,
  total,
  actionLabel,
  ghost,
  onAction,
}: CandidateCardProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col rounded-xl border border-[var(--ap-border)] bg-[var(--ap-card)] p-4 pb-3.5">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-[5px] px-2 py-[3px] text-[10.5px] font-bold ${TAG_STYLES[status]}`}
        >
          {statusLabel}
        </span>
        {role && (
          <span className="truncate text-[11px] font-semibold text-[var(--ap-grey-light)]">
            {role}
          </span>
        )}
      </div>

      <p className="mt-2.5 truncate text-[14.5px] font-bold text-[var(--ap-ink)]" title={name}>
        {name}
      </p>
      <p className="mt-0.5 truncate text-xs text-[var(--ap-grey)]" title={sub}>
        {sub}
      </p>

      <div className="mt-3.5 flex items-center gap-2">
        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--ap-grey-wash)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${FILL_STYLES[status]}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="whitespace-nowrap text-[11.5px] font-semibold text-[var(--ap-grey)]">
          {done}/{total}
        </span>
      </div>

      <button
        type="button"
        onClick={onAction}
        className={`mt-3.5 w-full rounded-lg px-3 py-2.5 text-[12.5px] font-semibold transition-colors ${
          ghost
            ? 'border border-[var(--ap-navy)] bg-transparent text-[var(--ap-navy)] hover:bg-[var(--ap-grey-wash)]'
            : 'bg-[var(--ap-navy)] text-white hover:bg-[var(--ap-navy-soft)]'
        }`}
      >
        {actionLabel}
      </button>
    </div>
  );
}
