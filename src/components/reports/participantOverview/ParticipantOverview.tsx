"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, Loader2, Sparkles } from 'lucide-react';

import { API_BASE_URL_WITH_API } from '@/lib/apiConfig';

import AssessmentCompletionTable from './AssessmentCompletionTable';
import AssessmentProgressCharts from './AssessmentProgressCharts';
import ParticipantSummaryCard from './ParticipantSummaryCard';
import ScoringDetailsPanel from './ScoringDetailsPanel';
import {
  buildProgressPoints,
  formatDateRange,
  parseCompetencyName,
  readableActivityType,
} from './scoring';
import type {
  AssessorRecord,
  CompletionRow,
  OverviewActivity,
  OverviewAssessmentCenter,
  OverviewCompetency,
  OverviewParticipant,
  ProgressPoint,
} from './types';

export interface ParticipantOverviewProps {
  participant: OverviewParticipant;
  assessmentCenter: OverviewAssessmentCenter;
  /** Cohort / batch label — the group the participant was assessed in. */
  cohortName: string;
  token: string | null;
  onBack: () => void;
  onExport: () => void;
  onGenerateAIReport: () => void;
  isExporting?: boolean;
}

interface RawRecord {
  [key: string]: any;
}

/** Minutes on an activity, when the activity type carries one. */
function readDuration(detail: RawRecord | null | undefined): number | null {
  if (!detail) return null;
  const candidate = detail.duration ?? detail.durationMinutes ?? detail.timeLimit ?? detail.time;
  const parsed = typeof candidate === 'string' ? parseInt(candidate, 10) : candidate;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readDescription(detail: RawRecord | null | undefined): string {
  if (!detail) return '';
  const value = detail.description ?? detail.instructions ?? detail.summary;
  return typeof value === 'string' ? value : '';
}

export default function ParticipantOverview({
  participant,
  assessmentCenter,
  cohortName,
  token,
  onBack,
  onExport,
  onGenerateAIReport,
  isExporting = false,
}: ParticipantOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [competencies, setCompetencies] = useState<OverviewCompetency[]>([]);
  const [activities, setActivities] = useState<OverviewActivity[]>([]);
  const [completionRows, setCompletionRows] = useState<CompletionRow[]>([]);
  const [assessors, setAssessors] = useState<AssessorRecord[]>([]);
  const [descriptors, setDescriptors] = useState<Record<string, unknown> | null>(null);
  const [progressPoints, setProgressPoints] = useState<ProgressPoint[]>([]);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const [centerRes, assignmentsRes, scoresRes, caseStudiesRes, inboxRes] = await Promise.all([
        fetch(`${API_BASE_URL_WITH_API}/assessment-centers/${assessmentCenter.id}`, {
          headers: authHeaders,
        }),
        fetch(`${API_BASE_URL_WITH_API}/assignments/participant/${participant.id}`, {
          headers: authHeaders,
        }),
        fetch(
          `${API_BASE_URL_WITH_API}/assessors/admin/scores?participantId=${participant.id}&assessmentCenterId=${assessmentCenter.id}&page=1&limit=100`,
          { headers: authHeaders }
        ),
        fetch(`${API_BASE_URL_WITH_API}/case-studies?page=1&limit=100`, { headers: authHeaders }),
        fetch(`${API_BASE_URL_WITH_API}/inbox-activities?page=1&limit=100`, {
          headers: authHeaders,
        }),
      ]);

      const centerJson = centerRes.ok ? await centerRes.json() : null;
      const assignmentsJson = assignmentsRes.ok ? await assignmentsRes.json() : null;
      const scoresJson = scoresRes.ok ? await scoresRes.json() : null;
      const caseStudiesJson = caseStudiesRes.ok ? await caseStudiesRes.json() : null;
      const inboxJson = inboxRes.ok ? await inboxRes.json() : null;

      // ---- Competencies + rubric descriptors ----
      const rawCompetencies: RawRecord[] = centerJson?.data?.competencies || [];
      const overviewCompetencies: OverviewCompetency[] = rawCompetencies.map((c, index) => {
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
      setDescriptors(centerJson?.data?.descriptors || null);

      // ---- Activity detail lookups (names, descriptions, durations) ----
      const detailsById = new Map<string, RawRecord>();
      (caseStudiesJson?.data?.caseStudies || []).forEach((cs: RawRecord) =>
        detailsById.set(cs.id, cs)
      );
      (inboxJson?.data?.inboxActivities || []).forEach((ia: RawRecord) =>
        detailsById.set(ia.id, ia)
      );

      // ---- Activities configured on the centre, with their competencies ----
      const rawActivities: RawRecord[] = centerJson?.data?.activities || [];
      const competencyIdsByActivity = new Map<string, string[]>();
      rawActivities.forEach((activity) => {
        const activityId = activity.activityId;
        if (typeof activityId !== 'string') return;
        const existing = competencyIdsByActivity.get(activityId) || [];
        if (
          typeof activity.competencyLibraryId === 'string' &&
          !existing.includes(activity.competencyLibraryId)
        ) {
          existing.push(activity.competencyLibraryId);
        }
        competencyIdsByActivity.set(activityId, existing);
      });

      const seenActivity = new Set<string>();
      const overviewActivities: OverviewActivity[] = [];
      rawActivities.forEach((activity) => {
        const activityId = activity.activityId;
        if (typeof activityId !== 'string' || seenActivity.has(activityId)) return;
        seenActivity.add(activityId);
        const detail = detailsById.get(activityId);
        overviewActivities.push({
          activityId,
          name:
            activity.displayName ||
            (detail?.name as string) ||
            readableActivityType(activity.activityType || ''),
          description: readDescription(detail) || activity.displayInstructions || '',
          activityType: activity.activityType || '',
          competencyIds: competencyIdsByActivity.get(activityId) || [],
        });
      });
      setActivities(overviewActivities);

      // ---- Assessor scores ----
      const rawScores: RawRecord[] = scoresJson?.data?.scores || [];
      const assessorRecords: AssessorRecord[] = rawScores.map((score) => ({
        id: score.id,
        name: score.assessor?.name || 'Assessor',
        email: score.assessor?.email || '',
        status: score.status || 'DRAFT',
        activityCompetencyScores: score.activityCompetencyScores || {},
        activitySelectedScoreKeys: score.activitySelectedScoreKeys || {},
        activitySubCompetencyComments: score.activitySubCompetencyComments || {},
        activityComments: score.activityComments || {},
        overallComments: score.overallComments || '',
      }));
      setAssessors(assessorRecords);

      // Descriptors can also ride along on the score payload.
      if (!centerJson?.data?.descriptors && rawScores[0]?.assessmentCenter?.descriptors) {
        setDescriptors(rawScores[0].assessmentCenter.descriptors);
      }

      // ---- Completion status, from this participant's assignments ----
      const assignments: RawRecord[] = Array.isArray(assignmentsJson?.data?.assignments)
        ? assignmentsJson.data.assignments
        : Array.isArray(assignmentsJson?.data)
          ? assignmentsJson.data
          : [];
      const centerAssignments = assignments.filter(
        (a) => a.assessmentCenter?.id === assessmentCenter.id
      );

      const rows: CompletionRow[] = [];
      centerAssignments.forEach((assignment) => {
        (assignment.activities || []).forEach((activity: RawRecord) => {
          const activityId = activity.activityId;
          if (typeof activityId !== 'string') return;
          const detail = detailsById.get(activityId);
          const configured = overviewActivities.find((a) => a.activityId === activityId);
          const submission = activity.submission as RawRecord | null;

          rows.push({
            activityId,
            name:
              configured?.name ||
              activity.activityDetail?.name ||
              readableActivityType(activity.activityType || ''),
            description: configured?.description || readDescription(detail),
            activityType: activity.activityType || configured?.activityType || '',
            durationMinutes: readDuration(detail),
            assessors: assessorRecords
              .filter((assessor) => Boolean(assessor.activityCompetencyScores?.[activityId]))
              .map((assessor) => assessor.name),
            isSubmitted: Boolean(activity.isSubmitted),
            completedAt: submission?.submittedAt || submission?.createdAt || null,
          });
        });
      });
      setCompletionRows(rows);

      // ---- Progress charts ----
      const [prePostRes, readinessRes] = await Promise.all([
        fetch(
          `/api/management-reports/participant/${participant.id}/pre-post-assessment?assessmentCenterId=${assessmentCenter.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetch(
          `/api/management-reports/participant/${participant.id}/application-readiness?assessmentCenterId=${assessmentCenter.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);
      const prePostJson = prePostRes.ok ? await prePostRes.json() : null;
      const readinessJson = readinessRes.ok ? await readinessRes.json() : null;
      setProgressPoints(
        buildProgressPoints(
          overviewCompetencies,
          prePostJson?.data?.competencies || [],
          readinessJson?.data?.competencies || []
        )
      );
    } catch (err) {
      console.error('Error loading participant overview:', err);
      setError('Failed to load the participant overview. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, participant.id, assessmentCenter.id, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const completedCount = completionRows.filter((row) => row.isSubmitted).length;
  const status: 'Completed' | 'In Progress' | 'Not Started' =
    completionRows.length > 0 && completedCount === completionRows.length
      ? 'Completed'
      : completedCount > 0
        ? 'In Progress'
        : 'Not Started';

  const assessmentDates = formatDateRange(
    completionRows.map((row) => row.completedAt).filter((d): d is string => Boolean(d))
  );

  return (
    <div className="view-enter-stagger space-y-5">
      {/* Breadcrumb + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1.5 text-sm">
          <button type="button" onClick={onBack} className="text-gray-500 hover:text-gray-800">
            Participant Reports
          </button>
          <ChevronRight size={15} className="text-gray-300" />
          <span className="font-semibold text-black">Participant Overview</span>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </button>
          <button
            type="button"
            onClick={onGenerateAIReport}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
          >
            <Sparkles className="h-4 w-4" />
            Generate AI Report
          </button>
        </div>
      </div>

      <ParticipantSummaryCard
        name={participant.name}
        participantCode={participant.userCode}
        cohort={cohortName || assessmentCenter.displayName || assessmentCenter.name}
        department={participant.designation}
        manager={participant.managerName}
        email={participant.email}
        assessmentDates={assessmentDates}
        status={status}
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-16">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          <span className="ml-2 text-sm text-gray-600">Loading participant overview…</span>
        </div>
      ) : (
        <>
          <AssessmentCompletionTable rows={completionRows} />
          <AssessmentProgressCharts competencies={competencies} points={progressPoints} />
          <ScoringDetailsPanel
            activities={activities}
            competencies={competencies}
            assessors={assessors}
            descriptors={descriptors}
          />
        </>
      )}
    </div>
  );
}
