'use client';

export interface StatusSegment {
  id: string;
  label: string;
  count: number;
  /** Tailwind background for the dot and the bar segment. */
  color: string;
}

export interface StatusStackBarProps {
  segments: StatusSegment[];
}

/**
 * The headline counters, the stacked bar and its legend — the three read from one
 * set of segments so they can never disagree.
 */
export default function StatusStackBar({ segments }: StatusStackBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <div>
      <div className="mt-9 flex flex-wrap items-center gap-3">
        {segments.map((segment, index) => (
          <div key={segment.id} className="flex items-center gap-3">
            {index > 0 && (
              <span className="mx-1 hidden h-6 w-px self-stretch bg-[var(--ap-border)] sm:block" />
            )}
            <span className="flex items-center gap-[9px]">
              <span className={`h-[9px] w-[9px] flex-shrink-0 rounded-full ${segment.color}`} />
              <span className="text-xl font-extrabold tracking-[-0.01em] text-[var(--ap-ink)]">
                {segment.count}
              </span>
              <span className="text-[12.5px] text-[var(--ap-grey)]">{segment.label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-[var(--ap-grey-wash)]">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={segment.color}
            style={{ width: total > 0 ? `${(segment.count / total) * 100}%` : '0%' }}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-7">
        {segments.map((segment) => (
          <span
            key={segment.id}
            className="flex items-center gap-[7px] text-[12.5px] text-[var(--ap-grey)]"
          >
            <span className={`h-2 w-2 rounded-full ${segment.color}`} />
            {segment.label} · <b className="font-bold text-[var(--ap-ink)]">{segment.count}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
