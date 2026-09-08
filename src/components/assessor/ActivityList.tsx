'use client';

export interface ActivityRow {
  id: string;
  name: string;
  context: string;
  /** Right-hand meta, e.g. "Waiting 2d" or "Yesterday". */
  meta: string;
  /** Draws the meta in rust, for anything that has been waiting too long. */
  flagged?: boolean;
  onSelect?: () => void;
}

export interface ActivityListProps {
  caption: string;
  rows: ActivityRow[];
  emptyMessage: string;
  loading: boolean;
}

export default function ActivityList({
  caption,
  rows,
  emptyMessage,
  loading,
}: ActivityListProps) {
  return (
    <div>
      <p className="mb-2 text-[12.5px] text-[var(--ap-grey)]">{caption}</p>

      <div className="flex flex-col gap-px overflow-hidden rounded-[10px] border border-[var(--ap-border)] bg-[var(--ap-border)]">
        {loading &&
          [0, 1, 2].map((row) => (
            <div key={row} className="bg-[var(--ap-card)] px-4 py-[13px]">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-[var(--ap-grey-wash)]" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[var(--ap-grey-wash)]" />
            </div>
          ))}

        {!loading && rows.length === 0 && (
          <div className="bg-[var(--ap-card)] px-4 py-6 text-center text-[12.5px] text-[var(--ap-grey)]">
            {emptyMessage}
          </div>
        )}

        {!loading &&
          rows.map((row) => {
            const Row = row.onSelect ? 'button' : 'div';
            return (
              <Row
                key={row.id}
                {...(row.onSelect ? { type: 'button' as const, onClick: row.onSelect } : {})}
                className={`flex w-full items-center justify-between gap-2.5 bg-[var(--ap-card)] px-4 py-[13px] text-left ${
                  row.onSelect ? 'transition-colors hover:bg-[var(--ap-grey-wash)]' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-[var(--ap-ink)]">
                    {row.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-[var(--ap-grey)]">
                    {row.context}
                  </span>
                </span>
                <span
                  className={`flex-shrink-0 whitespace-nowrap text-[11px] ${
                    row.flagged
                      ? 'font-bold text-[var(--ap-rust)]'
                      : 'font-semibold text-[var(--ap-grey)]'
                  }`}
                >
                  {row.meta}
                </span>
              </Row>
            );
          })}
      </div>
    </div>
  );
}
