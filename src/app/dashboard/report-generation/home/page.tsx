"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Upload, UserPlus } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL_WITH_API } from '@/lib/apiConfig';
import DashboardStatTiles from '@/components/home/DashboardStatTiles';
import type { DashboardStat } from '@/components/home/DashboardStatTiles';
import NeedsAttentionCard from '@/components/home/NeedsAttentionCard';
import type { AttentionItem } from '@/components/home/NeedsAttentionCard';
import QuickActionsCard from '@/components/home/QuickActionsCard';
import RecentActivityCard, { relativeTime } from '@/components/home/RecentActivityCard';
import type { ActivityEntry } from '@/components/home/RecentActivityCard';
import YourGroupsSection from '@/components/home/YourGroupsSection';
import type { HomeAssessor, HomeGroup } from '@/components/home/YourGroupsSection';

interface RawRecord {
  [key: string]: any;
}

/** Runs `task` over `items` a few at a time so a large cohort cannot flood the API. */
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

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** One participant's progress across every activity assigned to them. */
interface MemberProgress {
  submitted: number;
  total: number;
  started: boolean;
  complete: boolean;
}

export default function HomeDashboard() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupsTab, setGroupsTab] = useState<'groups' | 'assessors'>('groups');

  const [groups, setGroups] = useState<RawRecord[]>([]);
  const [participants, setParticipants] = useState<RawRecord[]>([]);
  const [centers, setCenters] = useState<RawRecord[]>([]);
  const [assessors, setAssessors] = useState<RawRecord[]>([]);
  const [scores, setScores] = useState<RawRecord[]>([]);
  const [progressById, setProgressById] = useState<Map<string, MemberProgress>>(new Map());

  /** Set once on the client so the date line and relative times never mismatch on hydration. */
  const [now, setNow] = useState<number | null>(null);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [groupsRes, participantsRes, centersRes, assessorsRes, scoresRes] = await Promise.all([
        fetch(`${API_BASE_URL_WITH_API}/groups?page=1&limit=100&search=`, { headers: authHeader }),
        fetch(`${API_BASE_URL_WITH_API}/participants?page=1&limit=100&search=`, {
          headers: authHeader,
        }),
        fetch('/api/assessment-centers?page=1&limit=100&search=', { headers: authHeader }),
        fetch(`${API_BASE_URL_WITH_API}/assessors?page=1&limit=100&search=`, {
          headers: authHeader,
        }),
        fetch('/api/assessors/admin/scores?page=1&limit=100', { headers: authHeader }),
      ]);

      const groupsJson = groupsRes.ok ? await groupsRes.json() : null;
      const participantsJson = participantsRes.ok ? await participantsRes.json() : null;
      const centersJson = centersRes.ok ? await centersRes.json() : null;
      const assessorsJson = assessorsRes.ok ? await assessorsRes.json() : null;
      const scoresJson = scoresRes.ok ? await scoresRes.json() : null;

      const groupList: RawRecord[] = groupsJson?.data?.groups || [];
      setGroups(groupList);
      setParticipants(participantsJson?.data?.participants || []);
      setCenters(centersJson?.data?.assessmentCenters || []);
      setAssessors(assessorsJson?.data?.assessors || []);
      setScores(scoresJson?.data?.scores || []);
      setNow(Date.now());
      setLoading(false);

      // Completion per member fills in after the shell renders — it is one call per person.
      const memberIds = Array.from(
        new Set(
          groupList.flatMap(
            (group) => group.participantIds || group.participants?.map((p: RawRecord) => p.id) || []
          )
        )
      ) as string[];

      if (memberIds.length === 0) return;

      const entries = await mapWithConcurrency(memberIds, 4, async (participantId) => {
        try {
          const res = await fetch(
            `${API_BASE_URL_WITH_API}/assignments/participant/${participantId}`,
            { headers: authHeader }
          );
          const json = res.ok ? await res.json() : null;
          const activities: RawRecord[] = (json?.data?.assignments || []).flatMap(
            (a: RawRecord) => a.activities || []
          );
          const submitted = activities.filter((a) => Boolean(a.isSubmitted)).length;
          return [
            participantId,
            {
              submitted,
              total: activities.length,
              started: submitted > 0,
              complete: activities.length > 0 && submitted === activities.length,
            },
          ] as const;
        } catch {
          return [
            participantId,
            { submitted: 0, total: 0, started: false, complete: false },
          ] as const;
        }
      });

      setProgressById(new Map(entries));
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load your dashboard. Please try again.');
      setLoading(false);
    }
  }, [token, authHeader]);

  useEffect(() => {
    load();
  }, [load]);

  const memberIdsOf = (group: RawRecord): string[] =>
    group.participantIds || group.participants?.map((p: RawRecord) => p.id) || [];

  // ---- Stats ----
  const stats: DashboardStat[] = useMemo(() => {
    const submittedScores = scores.filter(
      (s) => s.status === 'SUBMITTED' || s.status === 'FINALIZED'
    );
    const assessedParticipants = new Set(
      submittedScores.map((s) => s.participant?.id || s.participantId).filter(Boolean)
    );
    const awaitingRelease = scores.filter((s) => s.status === 'SUBMITTED').length;

    // Month-over-month is only possible where records carry a timestamp.
    const startOfThisMonth = new Date();
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0, 0, 0, 0);
    const thisMonth = submittedScores.filter(
      (s) => new Date(s.updatedAt || s.createdAt).getTime() >= startOfThisMonth.getTime()
    ).length;

    const allProgress = Array.from(progressById.values()).filter((p) => p.total > 0);
    const completionRate =
      allProgress.length > 0
        ? Math.round(
            (allProgress.reduce((sum, p) => sum + p.submitted / p.total, 0) / allProgress.length) *
              100
          )
        : 0;

    return [
      {
        id: 'centres',
        label: 'Active assessments',
        value: String(centers.length),
        caption: `across ${groups.length} group${groups.length === 1 ? '' : 's'}`,
      },
      {
        id: 'assessed',
        label: 'Candidates assessed',
        value: String(assessedParticipants.size),
        delta: thisMonth > 0 ? { direction: 'up', text: `${thisMonth}` } : null,
        caption: thisMonth > 0 ? 'this month' : `of ${participants.length} participants`,
      },
      {
        id: 'completion',
        label: 'Avg. completion rate',
        value: `${completionRate}%`,
        caption: `${allProgress.filter((p) => p.complete).length} of ${allProgress.length} finished`,
      },
      {
        id: 'awaiting',
        label: 'Reports awaiting release',
        value: String(awaitingRelease),
        caption: awaitingRelease > 0 ? 'needs review' : 'all released',
        needsAttention: awaitingRelease > 0,
      },
      {
        id: 'assessors',
        label: 'Active assessors',
        value: String(assessors.filter((a) => a.isActive !== false).length),
        caption: `${scores.filter((s) => s.status === 'DRAFT').length} scores still in draft`,
      },
    ];
  }, [scores, centers, groups, participants, assessors, progressById]);

  // ---- Needs your attention ----
  const attentionItems: AttentionItem[] = useMemo(() => {
    const items: AttentionItem[] = [];

    const awaitingRelease = scores.filter((s) => s.status === 'SUBMITTED');
    if (awaitingRelease.length > 0) {
      items.push({
        id: 'awaiting-release',
        severity: 'info',
        title: `${awaitingRelease.length} score${
          awaitingRelease.length === 1 ? ' is' : 's are'
        } submitted and ready to release`,
        context: 'Reports · awaiting sign-off',
        actionLabel: 'Release',
        onAction: () => router.push('/dashboard/report-generation/reports'),
      });
    }

    const completedNotScored = Array.from(progressById.entries()).filter(([participantId, p]) => {
      if (!p.complete) return false;
      return !scores.some(
        (s) => (s.participant?.id || s.participantId) === participantId && s.status !== 'DRAFT'
      );
    });
    if (completedNotScored.length > 0) {
      items.push({
        id: 'awaiting-scoring',
        severity: 'high',
        title: `${completedNotScored.length} participant${
          completedNotScored.length === 1 ? ' has' : 's have'
        } finished but not been scored`,
        context: 'Assessor scoring outstanding',
        actionLabel: 'Review',
        onAction: () => router.push('/dashboard/report-generation/reports'),
      });
    }

    const notStarted = Array.from(progressById.values()).filter(
      (p) => p.total > 0 && !p.started
    ).length;
    if (notStarted > 0) {
      items.push({
        id: 'not-started',
        severity: 'medium',
        title: `${notStarted} candidate${notStarted === 1 ? " hasn't" : "s haven't"} started their assessment`,
        context: 'Across all active groups',
        actionLabel: 'View people',
        onAction: () => router.push('/dashboard/report-generation/people'),
      });
    }

    const emptyGroups = groups.filter((group) => memberIdsOf(group).length === 0);
    if (emptyGroups.length > 0) {
      items.push({
        id: 'empty-groups',
        severity: 'medium',
        title: `${emptyGroups.length} group${
          emptyGroups.length === 1 ? ' has' : 's have'
        } no members yet`,
        context: emptyGroups.map((g) => g.name).join(', '),
        actionLabel: 'Add members',
        onAction: () => router.push('/dashboard/report-generation/people'),
      });
    }

    return items;
  }, [scores, progressById, groups, router]);

  // ---- Groups + assessors ----
  const homeGroups: HomeGroup[] = useMemo(
    () =>
      groups.map((group) => {
        const memberIds = memberIdsOf(group);
        const done = memberIds.filter((id) => progressById.get(id)?.complete).length;
        const started = memberIds.filter((id) => progressById.get(id)?.started).length;
        const status: HomeGroup['status'] =
          memberIds.length > 0 && done === memberIds.length
            ? 'complete'
            : started > 0
              ? 'on_track'
              : 'not_started';

        return {
          id: group.id,
          name: group.name,
          admin: group.admin,
          memberCount: memberIds.length,
          done,
          total: memberIds.length,
          deadlineLabel: null,
          status,
        };
      }),
    [groups, progressById]
  );

  const homeAssessors: HomeAssessor[] = useMemo(
    () =>
      assessors.map((assessor) => {
        const own = scores.filter((s) => (s.assessor?.id || s.assessorId) === assessor.id);
        return {
          id: assessor.id,
          name: assessor.name,
          email: assessor.email,
          designation: assessor.designation,
          submitted: own.filter((s) => s.status !== 'DRAFT').length,
          drafts: own.filter((s) => s.status === 'DRAFT').length,
        };
      }),
    [assessors, scores]
  );

  // ---- Recent activity ----
  const activity: ActivityEntry[] = useMemo(() => {
    if (now === null) return [];

    const entries: ActivityEntry[] = [];

    scores.forEach((score) => {
      const stamp = new Date(score.updatedAt || score.createdAt).getTime();
      if (Number.isNaN(stamp)) return;
      const participantName = score.participant?.name || 'a participant';
      const assessorName = score.assessor?.name || 'An assessor';
      entries.push({
        id: `score-${score.id}`,
        title:
          score.status === 'DRAFT'
            ? `${assessorName} started scoring ${participantName}`
            : `${assessorName} submitted scores for ${participantName}`,
        meta: `${relativeTime(stamp, now)}${
          score.assessmentCenter?.name ? ` · ${score.assessmentCenter.name}` : ''
        }`,
        timestamp: stamp,
      });
    });

    groups.forEach((group) => {
      const stamp = new Date(group.createdAt).getTime();
      if (Number.isNaN(stamp)) return;
      entries.push({
        id: `group-${group.id}`,
        title: `${group.name} created`,
        meta: `${relativeTime(stamp, now)}${group.admin ? ` · by ${group.admin}` : ''}`,
        timestamp: stamp,
      });
    });

    return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
  }, [scores, groups, now]);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'there';
  const firstName = displayName.split(' ')[0];

  const dateLine =
    now === null
      ? ''
      : new Date(now).toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

  return (
    <div className="view-enter min-h-screen bg-[#f8fafd] p-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-black">
            {now === null ? 'Welcome back' : greetingFor(new Date(now).getHours())}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {dateLine && <>{dateLine} · </>}here&apos;s what&apos;s happening across your assessment
            programs
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/report-generation/people')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gray-50"
          >
            Invite Assessor
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/report-generation/people')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
          >
            <Plus size={16} />
            New Assessment Group
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        <DashboardStatTiles stats={stats} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <NeedsAttentionCard items={attentionItems} loading={loading} />

          <YourGroupsSection
            groups={homeGroups}
            assessors={homeAssessors}
            loading={loading}
            tab={groupsTab}
            onTabChange={setGroupsTab}
            onViewGroup={() => router.push('/dashboard/report-generation/people')}
            onCreateGroup={() => router.push('/dashboard/report-generation/people')}
          />
        </div>

        <div className="space-y-6">
          <QuickActionsCard
            actions={[
              {
                id: 'new-group',
                label: 'New group',
                icon: Plus,
                primary: true,
                onSelect: () => router.push('/dashboard/report-generation/people'),
              },
              {
                id: 'invite-assessor',
                label: 'Invite assessor',
                icon: UserPlus,
                onSelect: () => router.push('/dashboard/report-generation/people'),
              },
              {
                id: 'upload-candidates',
                label: 'Upload candidates',
                icon: Upload,
                onSelect: () => router.push('/dashboard/report-generation/people'),
              },
              {
                id: 'generate-report',
                label: 'Generate report',
                icon: FileText,
                onSelect: () => router.push('/dashboard/report-generation/reports'),
              },
            ]}
            footerAction={{
              label: 'Open assessor scores →',
              onSelect: () => router.push('/dashboard/report-generation/home/scores'),
            }}
          />

          <RecentActivityCard entries={activity} loading={loading} />
        </div>
      </div>
    </div>
  );
}
