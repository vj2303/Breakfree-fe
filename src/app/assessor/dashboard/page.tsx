'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import ActivityList from '@/components/assessor/ActivityList';
import type { ActivityRow } from '@/components/assessor/ActivityList';
import GroupRowList from '@/components/assessor/GroupRowList';
import type { GroupRow } from '@/components/assessor/GroupRowList';
import StatusStackBar from '@/components/assessor/StatusStackBar';
import type { StatusSegment } from '@/components/assessor/StatusStackBar';
import { useAssessorWorkload } from '@/components/assessor/useAssessorWorkload';

/** "2h ago" / "Yesterday" / "3 days ago". */
function relativeTime(timestamp: number, now: number): string {
  const minutes = Math.round((now - timestamp) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return `${Math.round(days / 30)}mo ago`;
}

/** Unscored submissions older than this read as overdue, matching the detail view. */
const OVERDUE_DAYS = 3;

/** Whole days a submission has been sitting unscored. */
function waitingDays(timestamp: number, now: number): number {
  return Math.floor((now - timestamp) / (24 * 60 * 60 * 1000));
}

export default function AssessorHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { rows, groups, assessorName, loading, error } = useAssessorWorkload();

  // Fixed on the client after mount so relative times never mismatch on hydration.
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => setNow(Date.now()), [rows]);

  const firstName = (assessorName || user?.firstName || 'there').split(' ')[0];

  const segments: StatusSegment[] = useMemo(() => {
    const count = (...statuses: string[]) =>
      rows.filter((row) => statuses.includes(row.status)).length;

    // Three exclusive buckets, so the counters, the bar and the legend cover everyone.
    return [
      {
        id: 'started',
        label: 'Started',
        count: count('awaiting', 'not_started'),
        color: 'bg-[var(--ap-grey-pale)]',
      },
      {
        id: 'in_progress',
        label: 'In progress',
        count: count('in_progress'),
        color: 'bg-[var(--ap-slate)]',
      },
      {
        id: 'signed_off',
        label: 'Completed',
        count: count('signed_off'),
        color: 'bg-[var(--ap-navy)]',
      },
    ];
  }, [rows]);

  const pendingRows: ActivityRow[] = useMemo(() => {
    if (now === null) return [];
    return rows
      .filter((row) => row.status === 'awaiting' || row.status === 'in_progress')
      .sort((a, b) => (a.lastSubmissionAt ?? 0) - (b.lastSubmissionAt ?? 0))
      .slice(0, 5)
      .map((row) => {
        const days = row.lastSubmissionAt ? waitingDays(row.lastSubmissionAt, now) : null;
        return {
          id: row.key,
          name: `${row.participantName}${row.nextActivityName ? ` — ${row.nextActivityName}` : ''}`,
          context: `${row.centreName} · ${row.groupName}`,
          meta:
            days === null
              ? 'Awaiting submission'
              : days > OVERDUE_DAYS
                ? `Overdue ${days}d`
                : days === 0
                  ? 'Submitted today'
                  : `Waiting ${days}d`,
          // Anything sitting unscored for more than three days is called out.
          flagged: days !== null && days > OVERDUE_DAYS,
          onSelect: () =>
            router.push(
              `/assessor/assess/${row.groupId}/score/${row.participantId}?assessmentCenterId=${row.centreId}`
            ),
        };
      });
  }, [rows, now, router]);

  const recentRows: ActivityRow[] = useMemo(() => {
    if (now === null) return [];
    return rows
      .filter((row) => row.scoreUpdatedAt !== null)
      .sort((a, b) => (b.scoreUpdatedAt ?? 0) - (a.scoreUpdatedAt ?? 0))
      .slice(0, 5)
      .map((row) => ({
        id: `recent-${row.key}`,
        name: `${row.participantName} — ${
          row.scoreStatus === 'FINALIZED'
            ? 'signed off'
            : row.scoreStatus === 'SUBMITTED'
              ? 'submitted'
              : 'scoring started'
        }`,
        context: `${row.centreName} · ${row.groupName}`,
        meta: relativeTime(row.scoreUpdatedAt as number, now),
      }));
  }, [rows, now]);

  const groupRows: GroupRow[] = useMemo(
    () =>
      groups.map((group) => ({
        id: group.groupId,
        title: group.groupName,
        admin: group.adminName,
        assessmentCount: (group.assessmentCenters || []).length,
        participantCount: group.totalParticipantCount || 0,
        onSelect: () => router.push('/assessor/assess'),
      })),
    [groups, router]
  );

  return (
    <div className="view-enter">
      <p className="text-[12.5px] text-[var(--ap-grey)]">Overview</p>
      <h1 className="mt-1 max-w-[520px] text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--ap-ink)]">
        Welcome back, {firstName}
      </h1>
      <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-[var(--ap-grey)]">
        Here&apos;s where things stand across your assessment groups this cycle.
      </p>

      {error && (
        <div className="mt-6 rounded-[10px] border border-[var(--ap-rust)]/30 bg-[var(--ap-rust-wash)] px-4 py-3 text-[13px] text-[var(--ap-rust)]">
          {error}
        </div>
      )}

      <StatusStackBar segments={segments} />

      <h2 className="mb-3.5 mt-[34px] text-[13.5px] font-bold text-[var(--ap-ink)]">Activity</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityList
          caption="Pending activities"
          rows={pendingRows}
          emptyMessage="Nothing is waiting on you right now."
          loading={loading}
        />
        <ActivityList
          caption="Recent activity"
          rows={recentRows}
          emptyMessage="No scoring activity yet."
          loading={loading}
        />
      </div>

      <h2 className="mb-3.5 mt-8 text-[13.5px] font-bold text-[var(--ap-ink)]">Your groups</h2>
      <GroupRowList rows={groupRows} loading={loading} />
    </div>
  );
}
