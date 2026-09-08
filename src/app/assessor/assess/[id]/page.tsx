"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import CandidateCard from '@/components/assessor/CandidateCard';
import type { CandidateStatus } from '@/components/assessor/CandidateCard';
import CompetencyAccordion from '@/components/assessor/CompetencyAccordion';

interface AssessmentDetailProps {
  params: Promise<{ id: string }>;
}

interface RawRecord {
  [key: string]: any;
}

/** Anything unscored for longer than this reads as overdue. */
const OVERDUE_DAYS = 3;

/** "7–9 Sep 2026" from the first and last submission in the centre. */
function formatDateRange(stamps: number[]): string | null {
  if (stamps.length === 0) return null;
  const sorted = [...stamps].sort((a, b) => a - b);
  const first = new Date(sorted[0]);
  const last = new Date(sorted[sorted.length - 1]);
  const monthYear = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  if (monthYear(first) === monthYear(last)) {
    return first.getDate() === last.getDate()
      ? `${first.getDate()} ${monthYear(first)}`
      : `${first.getDate()}\u2013${last.getDate()} ${monthYear(first)}`;
  }
  return `${first.getDate()} ${monthYear(first)} \u2013 ${last.getDate()} ${monthYear(last)}`;
}

function timestampOf(value: unknown): number | null {
  if (typeof value !== 'string' || !value) return null;
  const stamp = new Date(value).getTime();
  return Number.isNaN(stamp) ? null : stamp;
}

function AssessmentDetailInner({ params }: AssessmentDetailProps) {
  const { id } = React.use(params); // groupId
  const router = useRouter();
  const searchParams = useSearchParams();
  const { assessorId, token, assessorGroups, assessorGroupsLoading, fetchAssessorGroups } =
    useAuth();

  const [detail, setDetail] = useState<RawRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCentreId, setActiveCentreId] = useState<string | null>(
    searchParams.get('assessmentCenterId')
  );
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!assessorGroups && !assessorGroupsLoading) fetchAssessorGroups();
  }, [assessorGroups, assessorGroupsLoading, fetchAssessorGroups]);

  /** Every centre in this group — one panel tab each. */
  const group = useMemo(
    () => (assessorGroups?.groups || []).find((g: RawRecord) => g.groupId === id) || null,
    [assessorGroups, id]
  );
  const centres: RawRecord[] = useMemo(() => group?.assessmentCenters || [], [group]);

  useEffect(() => {
    if (!activeCentreId && centres.length > 0) setActiveCentreId(centres[0].assessmentCenterId);
  }, [activeCentreId, centres]);

  const load = useCallback(async () => {
    if (!assessorId || !token) return;

    setLoading(true);
    setError(null);
    try {
      const url = activeCentreId
        ? `/api/assessors/${assessorId}/groups/${id}?assessmentCenterId=${activeCentreId}`
        : `/api/assessors/${assessorId}/groups/${id}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        setDetail(result.data);
        setNow(Date.now());
      } else {
        setError(result.message || 'Failed to fetch group details');
      }
    } catch (err) {
      console.error('Error fetching group details:', err);
      setError('An error occurred while fetching group details');
    } finally {
      setLoading(false);
    }
  }, [assessorId, token, id, activeCentreId]);

  useEffect(() => {
    load();
  }, [load]);

  const assignment: RawRecord | null = detail?.assignment || null;
  const participants: RawRecord[] = useMemo(
    () => assignment?.participants || [],
    [assignment]
  );

  /** One card's worth of derived state per participant. */
  const cards = useMemo(() => {
    if (now === null) return [];

    return participants.map((entry) => {
      const score = (entry.assessorScore || null) as RawRecord | null;
      const scoreStatus = typeof score?.status === 'string' ? score.status : null;
      const signedOff = scoreStatus === 'SUBMITTED' || scoreStatus === 'FINALIZED';

      const stamps = (entry.activities || [])
        .map((activity: RawRecord) =>
          timestampOf(activity.submission?.submittedAt || activity.submission?.createdAt)
        )
        .filter((stamp: number | null): stamp is number => stamp !== null);
      const lastSubmission = stamps.length > 0 ? Math.max(...stamps) : null;
      const waitingDays =
        lastSubmission === null
          ? null
          : Math.floor((now - lastSubmission) / (24 * 60 * 60 * 1000));

      const firstActivity = (entry.activities || []).find((a: RawRecord) => a.submission);
      const activityName =
        firstActivity?.activityDetail?.name || firstActivity?.activityType || 'No submission yet';

      let status: CandidateStatus;
      let statusLabel: string;
      let actionLabel: string;

      if (signedOff) {
        status = 'signed';
        statusLabel = 'Signed off';
        actionLabel = 'View report';
      } else if (scoreStatus === 'DRAFT') {
        status = 'progress';
        statusLabel = 'In progress';
        actionLabel = 'Continue';
      } else if (waitingDays !== null && waitingDays > OVERDUE_DAYS) {
        status = 'overdue';
        statusLabel = 'Overdue';
        actionLabel = 'Sign off';
      } else {
        status = 'notstarted';
        statusLabel = 'Not started';
        actionLabel = 'Start scoring';
      }

      const waitingText =
        waitingDays === null
          ? 'awaiting submission'
          : waitingDays > OVERDUE_DAYS
            ? `overdue ${waitingDays}d`
            : waitingDays === 0
              ? 'submitted today'
              : `waiting ${waitingDays}d`;

      return {
        id: entry.participant?.id as string,
        name: entry.participant?.name || 'Participant',
        role: entry.participant?.designation || '',
        status,
        statusLabel,
        actionLabel,
        ghost: signedOff,
        sub: `${activityName} · ${waitingText}`,
        done: entry.submissionCount || 0,
        total: entry.totalActivities || (entry.activities || []).length,
        signedOff,
        lastSubmission,
      };
    });
  }, [participants, now]);

  const submissionWindow = useMemo(
    () =>
      formatDateRange(
        cards
          .map((card) => card.lastSubmission)
          .filter((stamp): stamp is number => stamp !== null)
      ),
    [cards]
  );

  const kpis = useMemo(() => {
    const signed = cards.filter((card) => card.status === 'signed').length;
    const overdue = cards.filter((card) => card.status === 'overdue').length;
    return {
      participants: cards.length,
      toScore: cards.length - signed,
      overdue,
      signed,
      progress: cards.length > 0 ? Math.round((signed / cards.length) * 100) : 0,
    };
  }, [cards]);

  const openScoring = (participantId: string, editMode: boolean) => {
    const query = new URLSearchParams();
    if (activeCentreId) query.set('assessmentCenterId', activeCentreId);
    if (editMode) query.set('mode', 'edit');
    router.push(
      `/assessor/assess/${id}/score/${participantId}${query.toString() ? `?${query}` : ''}`
    );
  };

  const centreName =
    assignment?.assessmentCenter?.displayName ||
    assignment?.assessmentCenter?.name ||
    group?.groupName ||
    'Assessment';

  if (error) {
    return (
      <div className="view-enter">
        <button
          onClick={() => router.push('/assessor/assess')}
          className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-[var(--ap-grey)] hover:text-[var(--ap-ink)]"
        >
          <ArrowLeft size={13} />
          Back to Groups
        </button>
        <div className="rounded-xl border border-[var(--ap-border)] bg-[var(--ap-card)] p-6">
          <h1 className="text-lg font-bold text-[var(--ap-ink)]">Error loading group</h1>
          <p className="mt-2 text-sm text-[var(--ap-rust)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-enter">
      <button
        onClick={() => router.push('/assessor/assess')}
        className="mb-[18px] flex items-center gap-1.5 text-[13px] font-medium text-[var(--ap-grey)] transition-colors hover:text-[var(--ap-ink)]"
      >
        <ArrowLeft size={13} />
        Back to Groups
      </button>

      {/* Title + centre progress */}
      <div className="flex flex-wrap items-start justify-between gap-10">
        <div className="min-w-0">
          <p className="text-[12.5px] text-[var(--ap-grey)]">
            {centres.length} assessment{centres.length === 1 ? '' : 's'} ·{' '}
            {group?.totalParticipantCount ?? kpis.participants} participant
            {(group?.totalParticipantCount ?? kpis.participants) === 1 ? '' : 's'}
          </p>
          <h1 className="mt-1 max-w-[520px] text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--ap-ink)]">
            {group?.groupName || centreName}
          </h1>
        </div>

        <div className="min-w-[220px] pt-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[11.5px] font-semibold tracking-wide text-[var(--ap-grey)]">
              CENTRE PROGRESS
            </span>
            <span className="text-[13px] font-bold text-[var(--ap-ink)]">{kpis.progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ap-grey-wash)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--ap-navy)] to-[var(--ap-teal)] transition-all duration-500"
              style={{ width: `${kpis.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* One tab per assessment centre in this group */}
      {centres.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {centres.map((centre) => {
            const isActive = centre.assessmentCenterId === activeCentreId;
            return (
              <button
                key={centre.assessmentCenterId}
                type="button"
                onClick={() => setActiveCentreId(centre.assessmentCenterId)}
                className={`rounded-lg border px-4 py-[9px] text-[12.5px] font-semibold transition-colors ${
                  isActive
                    ? 'border-[var(--ap-navy)] bg-[var(--ap-navy)] text-white'
                    : 'border-[var(--ap-border)] text-[var(--ap-grey)] hover:border-[var(--ap-navy)] hover:text-[var(--ap-ink)]'
                }`}
              >
                {centre.assessmentCenterName} · {centre.participantCount} participant
                {centre.participantCount === 1 ? '' : 's'}
              </button>
            );
          })}
        </div>
      )}

      {/* KPI row */}
      <div className="mt-8 flex flex-wrap gap-x-[52px] gap-y-6 border-b border-[var(--ap-border)] pb-7">
        {[
          { label: 'Participants', value: kpis.participants, tone: '' },
          { label: 'To score', value: kpis.toScore, tone: '' },
          { label: 'Overdue', value: kpis.overdue, tone: 'text-[var(--ap-rust)]' },
          { label: 'Signed off', value: kpis.signed, tone: 'text-[var(--ap-teal)]' },
        ].map((kpi) => (
          <div key={kpi.label}>
            <p className={`text-[26px] font-extrabold ${kpi.tone || 'text-[var(--ap-ink)]'}`}>
              {loading ? '—' : kpi.value}
            </p>
            <p className="mt-0.5 text-xs text-[var(--ap-grey)]">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Candidates */}
      <div className="mb-4 mt-[30px] flex items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-bold text-[var(--ap-ink)]">{centreName}</h2>
        <span className="text-xs text-[var(--ap-grey)]">
          {submissionWindow && <>{submissionWindow} · </>}
          {kpis.participants} participant{kpis.participants === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <div
              key={card}
              className="rounded-xl border border-[var(--ap-border)] bg-[var(--ap-card)] p-4"
            >
              <div className="h-4 w-20 animate-pulse rounded bg-[var(--ap-grey-wash)]" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-[var(--ap-grey-wash)]" />
              <div className="mt-4 h-1.5 w-full animate-pulse rounded-full bg-[var(--ap-grey-wash)]" />
              <div className="mt-4 h-9 w-full animate-pulse rounded-lg bg-[var(--ap-grey-wash)]" />
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-[var(--ap-border)] bg-[var(--ap-card)] px-6 py-12 text-center text-sm text-[var(--ap-grey)]">
          No participants in this assessment centre.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <CandidateCard
              key={card.id}
              name={card.name}
              role={card.role}
              status={card.status}
              statusLabel={card.statusLabel}
              sub={card.sub}
              done={card.done}
              total={card.total}
              actionLabel={card.actionLabel}
              ghost={card.ghost}
              onAction={() => openScoring(card.id, card.signedOff)}
            />
          ))}
        </div>
      )}

      {/* Assessor guide, when the centre has one */}
      {assignment?.assessmentCenter?.documentUrl && (
        <a
          href={assignment.assessmentCenter.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center gap-2.5 rounded-[10px] border border-[var(--ap-border)] bg-[var(--ap-card)] p-3.5 transition-colors hover:bg-[var(--ap-grey-wash)]"
        >
          <FileText size={18} className="text-[var(--ap-grey)]" />
          <span>
            <span className="block text-[13px] font-semibold text-[var(--ap-ink)]">
              Assessor guide
            </span>
            <span className="block text-[11.5px] text-[var(--ap-grey)]">
              Open the reference document
            </span>
          </span>
        </a>
      )}

      <CompetencyAccordion competencies={assignment?.competencies || []} />
    </div>
  );
}

export default function AssessmentDetail(props: AssessmentDetailProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--ap-grey)]" />
        </div>
      }
    >
      <AssessmentDetailInner {...props} />
    </Suspense>
  );
}
