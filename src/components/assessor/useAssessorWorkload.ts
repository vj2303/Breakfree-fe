'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';

interface RawRecord {
  [key: string]: any;
}

export type WorkloadStatus = 'signed_off' | 'in_progress' | 'awaiting' | 'not_started';

/** One participant, in one assessment centre, from this assessor's point of view. */
export interface WorkloadRow {
  key: string;
  participantId: string;
  participantName: string;
  designation: string;
  groupId: string;
  groupName: string;
  centreId: string;
  centreName: string;
  submissionCount: number;
  totalActivities: number;
  status: WorkloadStatus;
  /** Name of the first activity the participant submitted but the assessor has not signed off. */
  nextActivityName: string | null;
  /** Most recent participant submission, for "waiting Nd". */
  lastSubmissionAt: number | null;
  /** When this assessor last touched the score, for the recent-activity feed. */
  scoreUpdatedAt: number | null;
  scoreStatus: string | null;
}

/** Runs `task` over `items` a few at a time so a big cohort cannot flood the API. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function timestampOf(value: unknown): number | null {
  if (typeof value !== 'string' || !value) return null;
  const stamp = new Date(value).getTime();
  return Number.isNaN(stamp) ? null : stamp;
}

/**
 * Every participant this assessor is responsible for, flattened across their groups and
 * assessment centres. One request per group/centre pair, five at a time.
 */
export function useAssessorWorkload() {
  const { assessorId, token, assessorGroups, assessorGroupsLoading, fetchAssessorGroups } =
    useAuth();
  const [rows, setRows] = useState<WorkloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessorGroups && !assessorGroupsLoading) fetchAssessorGroups();
  }, [assessorGroups, assessorGroupsLoading, fetchAssessorGroups]);

  const load = useCallback(async () => {
    if (!assessorId || !token || !assessorGroups) return;

    const groups: RawRecord[] = assessorGroups.groups || [];
    const pairs = groups.flatMap((group) =>
      (group.assessmentCenters || []).map((centre: RawRecord) => ({ group, centre }))
    );

    if (pairs.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const perPair = await mapWithConcurrency(pairs, 5, async ({ group, centre }) => {
        try {
          const res = await fetch(
            `/api/assessors/${assessorId}/groups/${group.groupId}?assessmentCenterId=${centre.assessmentCenterId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const json = res.ok ? await res.json() : null;
          const participants: RawRecord[] = json?.data?.assignment?.participants || [];

          return participants.map((entry): WorkloadRow => {
            const score = (entry.assessorScore || null) as RawRecord | null;
            const scoreStatus = typeof score?.status === 'string' ? score.status : null;

            const submissionStamps = (entry.activities || [])
              .map((activity: RawRecord) =>
                timestampOf(activity.submission?.submittedAt || activity.submission?.createdAt)
              )
              .filter((stamp: number | null): stamp is number => stamp !== null);

            const firstSubmitted = (entry.activities || []).find(
              (activity: RawRecord) => activity.submission
            );

            const status: WorkloadStatus =
              scoreStatus === 'SUBMITTED' || scoreStatus === 'FINALIZED'
                ? 'signed_off'
                : scoreStatus === 'DRAFT'
                  ? 'in_progress'
                  : (entry.submissionCount || 0) > 0
                    ? 'awaiting'
                    : 'not_started';

            return {
              key: `${group.groupId}:${centre.assessmentCenterId}:${entry.participant?.id}`,
              participantId: entry.participant?.id || '',
              participantName: entry.participant?.name || 'Participant',
              designation: entry.participant?.designation || '',
              groupId: group.groupId,
              groupName: group.groupName || '',
              centreId: centre.assessmentCenterId,
              centreName: centre.assessmentCenterName || '',
              submissionCount: entry.submissionCount || 0,
              totalActivities: entry.totalActivities || (entry.activities || []).length,
              status,
              nextActivityName:
                firstSubmitted?.activityDetail?.name ||
                firstSubmitted?.activityType ||
                null,
              lastSubmissionAt:
                submissionStamps.length > 0 ? Math.max(...submissionStamps) : null,
              scoreUpdatedAt: timestampOf(score?.updatedAt || score?.createdAt),
              scoreStatus,
            };
          });
        } catch {
          return [] as WorkloadRow[];
        }
      });

      setRows(perPair.flat());
    } catch (err) {
      console.error('Error loading assessor workload:', err);
      setError('Failed to load your assessments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [assessorId, token, assessorGroups]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    rows,
    groups: (assessorGroups?.groups || []) as RawRecord[],
    assessorName: assessorGroups?.assessor?.name || '',
    loading: loading || assessorGroupsLoading,
    error,
  };
}
