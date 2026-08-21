"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

import { API_BASE_URL_WITH_API } from '@/lib/apiConfig';

import CompetencyChangeTable from './CompetencyChangeTable';
import type { CompetencyChangeRow } from './CompetencyChangeTable';
import InsightsFilterBar from './InsightsFilterBar';
import type { FilterOption } from './InsightsFilterBar';
import InsightsStatTiles from './InsightsStatTiles';
import ReadinessApplicationCharts from './ReadinessApplicationCharts';
import { buildProgressPoints, mean, parseCompetencyName } from '../participantOverview/scoring';
import type { OverviewCompetency, ProgressPoint } from '../participantOverview/types';

export interface AssessmentInsightsProps {
  token: string | null;
}

interface RawRecord {
  [key: string]: any;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  designation: string;
  groupId: string;
  groupName: string;
}

interface CenterOption {
  id: string;
  name: string;
}

/** What one participant contributes to the aggregate. */
interface ParticipantRollup {
  participant: Participant;
  /** Has at least one activity in the selected centre. */
  inScope: boolean;
  completed: boolean;
  scored: boolean;
  lastActivityAt: string | null;
  points: ProgressPoint[];
}

const ALL = '__all__';

const PERIOD_OPTIONS: FilterOption[] = [
  { value: ALL, label: 'All time' },
  { value: '90', label: 'Last 3 months' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last 12 months' },
];

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

export default function AssessmentInsights({ token }: AssessmentInsightsProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [centers, setCenters] = useState<CenterOption[]>([]);
  const [scaffoldLoading, setScaffoldLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [groupFilter, setGroupFilter] = useState(ALL);
  const [centerFilter, setCenterFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState(ALL);
  const [periodFilter, setPeriodFilter] = useState(ALL);

  const [competencies, setCompetencies] = useState<OverviewCompetency[]>([]);
  const [rollups, setRollups] = useState<ParticipantRollup[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [reportYear, setReportYear] = useState<number | null>(null);
  const [awaitingOpen, setAwaitingOpen] = useState(false);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token]
  );

  // ---- Groups + assessment centres, once ----
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const loadScaffold = async () => {
      setScaffoldLoading(true);
      try {
        const [groupsRes, centersRes] = await Promise.all([
          fetch('/api/management-reports/groups', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/assessment-centers?page=1&limit=100&search=', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const groupsJson = groupsRes.ok ? await groupsRes.json() : null;
        const centersJson = centersRes.ok ? await centersRes.json() : null;
        if (cancelled) return;

        const rawGroups: RawRecord[] = groupsJson?.data?.groups || [];
        const flatParticipants: Participant[] = [];
        const seen = new Set<string>();
        rawGroups.forEach((group) => {
          (group.participants || []).forEach((p: RawRecord) => {
            if (!p?.id || seen.has(p.id)) return;
            seen.add(p.id);
            flatParticipants.push({
              id: p.id,
              name: p.name || 'Participant',
              email: p.email || '',
              designation: p.designation || '',
              groupId: group.id,
              groupName: group.name || '',
            });
          });
        });

        const rawCenters: RawRecord[] =
          centersJson?.data?.assessmentCenters || centersJson?.data?.centers || centersJson?.data || [];
        const centerOptions: CenterOption[] = (Array.isArray(rawCenters) ? rawCenters : [])
          .filter((c) => typeof c?.id === 'string')
          .map((c) => ({ id: c.id, name: c.displayName || c.name || 'Assessment centre' }));

        setGroups(rawGroups.map((g) => ({ id: g.id, name: g.name || 'Group' })));
        setParticipants(flatParticipants);
        setCenters(centerOptions);
        setCenterFilter((current) => current || centerOptions[0]?.id || '');
      } catch (err) {
        console.error('Error loading insights filters:', err);
        if (!cancelled) setError('Failed to load report filters. Please try again.');
      } finally {
        if (!cancelled) setScaffoldLoading(false);
      }
    };

    loadScaffold();
    return () => {
      cancelled = true;
    };
  }, [token, authHeaders]);

  /** Participants matching the cohort and designation filters — the pool we fetch for. */
  const pool = useMemo(
    () =>
      participants.filter(
        (p) =>
          (groupFilter === ALL || p.groupId === groupFilter) &&
          (designationFilter === ALL || p.designation === designationFilter)
      ),
    [participants, groupFilter, designationFilter]
  );

  // ---- Per-participant data for the selected centre ----
  const loadInsights = useCallback(async () => {
    if (!token || !centerFilter || pool.length === 0) {
      setRollups([]);
      setCompetencies([]);
      return;
    }

    setDataLoading(true);
    setError(null);

    try {
      const centerRes = await fetch(`${API_BASE_URL_WITH_API}/assessment-centers/${centerFilter}`, {
        headers: authHeaders,
      });
      const centerJson = centerRes.ok ? await centerRes.json() : null;
      const overviewCompetencies: OverviewCompetency[] = (
        (centerJson?.data?.competencies as RawRecord[]) || []
      ).map((c, index) => {
        const { code, label } = parseCompetencyName(c.competencyName || '', index);
        return {
          id: c.id,
          code,
          label,
          fullName: c.competencyName || '',
          subCompetencyNames: c.subCompetencyNames || [],
        };
      });
      setCompetencies(overviewCompetencies);

      // Pass 1 — who is actually assigned to this centre, and how far have they got.
      const assignmentResults = await mapWithConcurrency(pool, 5, async (participant) => {
        try {
          const res = await fetch(
            `${API_BASE_URL_WITH_API}/assignments/participant/${participant.id}`,
            { headers: authHeaders }
          );
          const json = res.ok ? await res.json() : null;
          const assignments: RawRecord[] = json?.data?.assignments || [];
          const forCenter = assignments.filter((a) => a.assessmentCenter?.id === centerFilter);
          const activities: RawRecord[] = forCenter.flatMap((a) => a.activities || []);

          const stamps = activities
            .map((a) => a.submission?.submittedAt || a.submission?.createdAt || null)
            .filter((s): s is string => Boolean(s));

          return {
            participant,
            inScope: activities.length > 0,
            activityIds: activities
              .map((a) => a.activityId)
              .filter((id): id is string => typeof id === 'string'),
            completed: activities.length > 0 && activities.every((a) => Boolean(a.isSubmitted)),
            lastActivityAt:
              stamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null,
          };
        } catch {
          return {
            participant,
            inScope: false,
            activityIds: [] as string[],
            completed: false,
            lastActivityAt: null as string | null,
          };
        }
      });

      const inScope = assignmentResults.filter((entry) => entry.inScope);

      // Pass 2 — scoring state and the readiness / application series, only for those in scope.
      const rolled = await mapWithConcurrency(inScope, 5, async (entry): Promise<ParticipantRollup> => {
        const participantId = entry.participant.id;
        const [scoresRes, prePostRes, readinessRes] = await Promise.all([
          fetch(
            `/api/assessors/admin/scores?participantId=${participantId}&assessmentCenterId=${centerFilter}&page=1&limit=100`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `/api/management-reports/participant/${participantId}/pre-post-assessment?assessmentCenterId=${centerFilter}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `/api/management-reports/participant/${participantId}/application-readiness?assessmentCenterId=${centerFilter}`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);

        const scoresJson = scoresRes.ok ? await scoresRes.json() : null;
        const prePostJson = prePostRes.ok ? await prePostRes.json() : null;
        const readinessJson = readinessRes.ok ? await readinessRes.json() : null;

        const scores: RawRecord[] = scoresJson?.data?.scores || [];
        const scoredActivityIds = new Set<string>();
        scores.forEach((score) => {
          Object.keys(score.activityCompetencyScores || {}).forEach((activityId) => {
            if (entry.activityIds.includes(activityId)) scoredActivityIds.add(activityId);
          });
        });

        return {
          participant: entry.participant,
          inScope: true,
          completed: entry.completed,
          scored:
            entry.activityIds.length > 0 && scoredActivityIds.size >= entry.activityIds.length,
          lastActivityAt: entry.lastActivityAt,
          points: buildProgressPoints(
            overviewCompetencies,
            prePostJson?.data?.competencies || [],
            readinessJson?.data?.competencies || []
          ),
        };
      });

      setRollups(rolled);

      const now = new Date();
      setReportYear(now.getFullYear());
      setGeneratedAt(
        now.toLocaleString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch (err) {
      console.error('Error loading assessment insights:', err);
      setError('Failed to load assessment insights. Please try again.');
    } finally {
      setDataLoading(false);
    }
  }, [token, centerFilter, pool, authHeaders]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  // ---- Period filter, applied client-side over what we already hold ----
  const visibleRollups = useMemo(() => {
    if (periodFilter === ALL) return rollups;
    const days = parseInt(periodFilter, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return rollups.filter((entry) => {
      if (!entry.lastActivityAt) return false;
      const stamp = new Date(entry.lastActivityAt).getTime();
      return !Number.isNaN(stamp) && stamp >= cutoff;
    });
  }, [rollups, periodFilter]);

  // ---- Aggregates ----
  const { chartPoints, tableRows } = useMemo(() => {
    const points: ProgressPoint[] = [];
    const rows: CompetencyChangeRow[] = [];

    competencies.forEach((competency, index) => {
      const perParticipant = visibleRollups
        .map((entry) => entry.points[index])
        .filter((point): point is ProgressPoint => Boolean(point));

      const averaged: ProgressPoint = {
        code: competency.code,
        competencyName: competency.label,
        preReadiness: mean(perParticipant.map((p) => p.preReadiness)),
        preApplication: mean(perParticipant.map((p) => p.preApplication)),
        postReadiness: mean(perParticipant.map((p) => p.postReadiness)),
        postApplication: mean(perParticipant.map((p) => p.postApplication)),
        readinessDelta: mean(perParticipant.map((p) => p.readinessDelta)),
        applicationDelta: mean(perParticipant.map((p) => p.applicationDelta)),
      };

      const contributing = perParticipant.filter(
        (p) => p.readinessDelta !== null || p.applicationDelta !== null
      ).length;

      points.push(averaged);
      rows.push({ ...averaged, n: contributing });
    });

    return { chartPoints: points, tableRows: rows };
  }, [competencies, visibleRollups]);

  const completedCount = visibleRollups.filter((entry) => entry.completed).length;
  const scoredCount = visibleRollups.filter((entry) => entry.scored).length;
  const awaitingNames = visibleRollups
    .filter((entry) => entry.completed && !entry.scored)
    .map((entry) => entry.participant.name);

  const designationOptions: FilterOption[] = useMemo(() => {
    const unique = Array.from(
      new Set(participants.map((p) => p.designation).filter((d) => d && d.trim()))
    ).sort();
    return [
      { value: ALL, label: 'All designations' },
      ...unique.map((d) => ({ value: d, label: d })),
    ];
  }, [participants]);

  const selectedCenterName = centers.find((c) => c.id === centerFilter)?.name || '';

  const exportCsv = () => {
    const header = ['Competency', 'N', 'Readiness change', 'Application change'];
    const lines = tableRows.map((row) =>
      [
        `"${row.code} — ${row.competencyName.replace(/"/g, '""')}"`,
        row.n,
        row.readinessDelta === null ? '' : row.readinessDelta.toFixed(1),
        row.applicationDelta === null ? '' : row.applicationDelta.toFixed(1),
      ].join(',')
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assessment-insights-${selectedCenterName || 'report'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (scaffoldLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
        <span className="ml-2 text-sm text-gray-600">Loading assessment insights…</span>
      </div>
    );
  }

  return (
    <div className="view-enter space-y-6">
      {/* Title + export */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-black">Assessment Insights</h1>
          <p className="mt-1 text-sm text-gray-500">
            Assessment Centre
            {selectedCenterName && <> · {selectedCenterName}</>}
            {reportYear && <> · {reportYear}</>}
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={tableRows.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      <InsightsFilterBar
        filters={[
          {
            id: 'cohort',
            label: 'Cohort / Group',
            value: groupFilter,
            onChange: setGroupFilter,
            options: [
              { value: ALL, label: 'All Cohorts' },
              ...groups.map((g) => ({ value: g.id, label: g.name })),
            ],
          },
          {
            id: 'assessment',
            label: 'Assessment',
            value: centerFilter,
            onChange: setCenterFilter,
            options: centers.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            id: 'designation',
            label: 'Designation',
            value: designationFilter,
            onChange: setDesignationFilter,
            options: designationOptions,
          },
          {
            id: 'period',
            label: 'Period',
            value: periodFilter,
            onChange: setPeriodFilter,
            options: PERIOD_OPTIONS,
          },
        ]}
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="flex items-center gap-2 text-sm text-gray-600">
        Showing data for <span className="font-bold text-black">{visibleRollups.length}</span>{' '}
        participants
        {dataLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
      </p>

      <InsightsStatTiles
        participantCount={visibleRollups.length}
        completedCount={completedCount}
        scoredCount={scoredCount}
        awaitingNames={awaitingNames}
        awaitingOpen={awaitingOpen}
        onToggleAwaiting={() => setAwaitingOpen((prev) => !prev)}
      />

      <ReadinessApplicationCharts points={chartPoints} />

      <CompetencyChangeTable rows={tableRows} />

      <p className="border-t border-gray-200 pt-5 text-sm text-gray-400">
        {generatedAt ? `Data as of ${generatedAt} · ` : ''}
        Scores are averages on a 5-point scale (1 = Low, 5 = High) · Readiness source: psychometric
        assessment (external) and SJT (in-platform)
      </p>
    </div>
  );
}
