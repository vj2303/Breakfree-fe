"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ReportStructureApi, ReportStructure } from '@/lib/reportStructureApi';
import { Download, Search, ArrowLeft, ChevronRight, LayoutDashboard, Sparkles, Upload } from 'lucide-react';
import { API_V1_BASE_URL } from '@/lib/apiConfig';
import { downloadParticipantReportPdf } from '@/lib/reports/participantReportPdf';
import ActionMenu from '@/components/ui/ActionMenu';
import ParticipantOverview from './participantOverview/ParticipantOverview';
import { initials } from './participantOverview/scoring';

interface ParticipantReportsProps {
  token: string | null;
}

interface ParticipantData {
  id: string;
  userCode: string;
  name: string;
  email: string;
  designation: string;
  contactNo: string;
  managerName: string;
}

interface AssessmentCenterData {
  id: string;
  name: string;
  displayName?: string;
}

// Removed unused interface

interface GroupData {
  id: string;
  name: string;
  participants: ParticipantData[];
}

/** Per participant + assessment center progress, shown as chips on the row. */
interface CenterStats {
  /** Activities the participant has submitted. */
  completedActivities: number;
  totalActivities: number;
  /** Activities at least one assessor has scored. */
  scoredActivities: number;
  /** Every submitted assessor score for this center is finalized. */
  moderationDone: boolean;
  hasScores: boolean;
}

const centerStatsKey = (participantId: string, assessmentCenterId: string) =>
  `${participantId}:${assessmentCenterId}`;

type ChipTone = 'complete' | 'partial' | 'empty';

const CHIP_TONES: Record<ChipTone, string> = {
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  empty: 'border-gray-200 bg-white text-gray-500',
};

/** Compact "label / value" chip used for the per-center progress on each row. */
const StatusChip: React.FC<{ label: string; value: string; tone: ChipTone }> = ({
  label,
  value,
  tone,
}) => (
  <div className={`rounded-lg border px-3 py-1.5 ${CHIP_TONES[tone]}`}>
    <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
    <div className="text-sm font-semibold tabular-nums">{value}</div>
  </div>
);

function ratioTone(done: number, total: number): ChipTone {
  if (total > 0 && done >= total) return 'complete';
  return done > 0 ? 'partial' : 'empty';
}

const ParticipantReports: React.FC<ParticipantReportsProps> = ({ token }) => {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [reportStructures, setReportStructures] = useState<ReportStructure[]>([]);
  const [selectedReportStructure, setSelectedReportStructure] = useState<ReportStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState('');
  const [downloadingParticipantId, setDownloadingParticipantId] = useState<string | null>(null);
  const [downloadingAssessmentCenterId, setDownloadingAssessmentCenterId] = useState<string | null>(null);
  const [showReportStructureSelector, setShowReportStructureSelector] = useState(false);
  const [participantsWithAssessmentCenters, setParticipantsWithAssessmentCenters] = useState<Map<string, AssessmentCenterData[]>>(new Map());
  const [centerStats, setCenterStats] = useState<Map<string, CenterStats>>(new Map());
  const [loadingAssessmentCenters, setLoadingAssessmentCenters] = useState<Set<string>>(new Set());
  const [uploadingReadiness, setUploadingReadiness] = useState<string | null>(null); // AC id being uploaded
  const [readinessUploadStatus, setReadinessUploadStatus] = useState<{ acId: string; message: string; type: 'success' | 'error' } | null>(null);
  const readinessFileRef = React.useRef<HTMLInputElement>(null);
  const [pendingUploadACId, setPendingUploadACId] = useState<string | null>(null);
  /** Hides assessment centers nobody has scored yet, so the list reads like a live cohort. */
  const [showOnlyScored, setShowOnlyScored] = useState(true);
  /** Set when an assessment center row is opened in the full Participant Overview. */
  const [overviewTarget, setOverviewTarget] = useState<{
    participant: ParticipantData;
    assessmentCenter: AssessmentCenterData;
  } | null>(null);

  // Fetch groups and report structures
  const fetchData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch groups
      const groupsRes = await fetch('/api/management-reports/groups', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (groupsRes.ok) {
        const groupsResult = await groupsRes.json();
        const groupsList = groupsResult.data?.groups || [];
        setGroups(groupsList);
      }

      // Fetch report structures
      const reportStructuresRes = await ReportStructureApi.getReportStructures(token, {
        page: 1,
        limit: 100, // Get all report structures
      });
      if (reportStructuresRes.success && reportStructuresRes.data) {
        setReportStructures(reportStructuresRes.data.reportStructures);
        // Auto-select first report structure if available
        if (reportStructuresRes.data.reportStructures.length > 0) {
          setSelectedReportStructure(reportStructuresRes.data.reportStructures[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  // Fetch assessment centers + row status for every participant when a group is selected
  useEffect(() => {
    const fetchAssessmentCentersForParticipants = async () => {
      if (!token || !selectedGroup) return;

      const participants = selectedGroup.participants || [];
      setLoadingAssessmentCenters(new Set(participants.map((p) => p.id)));

      const results = await Promise.all(
        participants.map(async (participant) => {
          const centers: AssessmentCenterData[] = [];
          const stats = new Map<string, CenterStats>();

          try {
            // Assignments give the centers and how much the participant has submitted.
            // Assessor scores give how much has been scored and whether it is finalized.
            const [assignmentsRes, scoresRes] = await Promise.all([
              fetch(`/api/assignments/participant/${participant.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              }),
              fetch(`/api/assessors/admin/scores?participantId=${participant.id}&page=1&limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
              }),
            ]);

            const assignmentsData = assignmentsRes.ok ? await assignmentsRes.json() : null;
            const scoresData = scoresRes.ok ? await scoresRes.json() : null;

            // Group every score record by the center it belongs to.
            const scoresByCenter = new Map<string, Array<Record<string, unknown>>>();
            const rawScores: Array<Record<string, any>> = scoresData?.data?.scores || [];
            rawScores.forEach((score) => {
              const acId =
                (score.assessmentCenter?.id as string) ||
                (score.assessmentCenterId as string) ||
                '';
              if (!acId) return;
              const bucket = scoresByCenter.get(acId) || [];
              bucket.push(score);
              scoresByCenter.set(acId, bucket);
            });

            const assignments: Array<Record<string, any>> = assignmentsData?.data?.assignments || [];
            const seen = new Set<string>();

            assignments.forEach((assignment) => {
              const ac = assignment.assessmentCenter as Record<string, any> | undefined;
              const acId = typeof ac?.id === 'string' ? ac.id : '';
              if (!acId || seen.has(acId)) return;
              seen.add(acId);

              centers.push({
                id: acId,
                name: typeof ac?.name === 'string' ? ac.name : ac?.displayName || 'Unknown',
                displayName: typeof ac?.displayName === 'string' ? ac.displayName : undefined,
              });

              const activities: Array<Record<string, any>> = assignment.activities || [];
              const activityIds = new Set(
                activities
                  .map((a) => a.activityId)
                  .filter((id): id is string => typeof id === 'string')
              );
              const totalActivities =
                typeof assignment.totalActivities === 'number'
                  ? assignment.totalActivities
                  : activities.length;
              const completedActivities =
                typeof assignment.submittedActivities === 'number'
                  ? assignment.submittedActivities
                  : activities.filter((a) => a.isSubmitted).length;

              const centerScores = scoresByCenter.get(acId) || [];
              const scoredActivityIds = new Set<string>();
              centerScores.forEach((score) => {
                const byActivity = (score as Record<string, any>).activityCompetencyScores || {};
                Object.keys(byActivity).forEach((activityId) => {
                  if (activityIds.size === 0 || activityIds.has(activityId)) {
                    scoredActivityIds.add(activityId);
                  }
                });
              });

              stats.set(centerStatsKey(participant.id, acId), {
                completedActivities,
                totalActivities,
                scoredActivities: Math.min(scoredActivityIds.size, totalActivities || scoredActivityIds.size),
                moderationDone:
                  centerScores.length > 0 &&
                  centerScores.every((score) => (score as Record<string, any>).status === 'FINALIZED'),
                hasScores: centerScores.length > 0,
              });
            });
          } catch (err) {
            console.error(`Error loading report status for participant ${participant.id}:`, err);
          }

          return { participantId: participant.id, centers, stats };
        })
      );

      const newMap = new Map<string, AssessmentCenterData[]>();
      const newStats = new Map<string, CenterStats>();
      results.forEach(({ participantId, centers, stats }) => {
        newMap.set(participantId, centers);
        stats.forEach((value, key) => newStats.set(key, value));
      });

      setParticipantsWithAssessmentCenters(newMap);
      setCenterStats(newStats);
      setLoadingAssessmentCenters(new Set());
    };

    if (selectedGroup && token) {
      fetchAssessmentCentersForParticipants();
    }
  }, [selectedGroup, token]);

  const filteredParticipants = selectedGroup?.participants.filter(p =>
    p.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
    p.email.toLowerCase().includes(participantSearch.toLowerCase())
  ) || [];

  /**
   * With the filter on, only assessment centers that actually carry assessor scores are listed —
   * unassessed centers add rows without adding information. Turning it off restores every center.
   */
  const visibleCentersFor = (participantId: string): AssessmentCenterData[] => {
    const centers = participantsWithAssessmentCenters.get(participantId) || [];
    if (!showOnlyScored || loadingAssessmentCenters.size > 0) return centers;
    return centers.filter(
      (center) => centerStats.get(centerStatsKey(participantId, center.id))?.hasScores
    );
  };

  // Scores are still in flight — filtering now would blank the whole list mid-load.
  const centersLoading = loadingAssessmentCenters.size > 0;

  // Participants with nothing scored drop out entirely while the filter is on.
  const visibleParticipants =
    showOnlyScored && !centersLoading
      ? filteredParticipants.filter((p) => visibleCentersFor(p.id).length > 0)
      : filteredParticipants;

  const hiddenCenterCount =
    showOnlyScored && !centersLoading
      ? filteredParticipants.reduce((total, p) => {
          const all = participantsWithAssessmentCenters.get(p.id) || [];
          return total + (all.length - visibleCentersFor(p.id).length);
        }, 0)
      : 0;


  const handleDownloadReport = async (participant: ParticipantData, assessmentCenterId?: string) => {
    if (!token || !selectedReportStructure) {
      setError('Please select a report structure first');
      return;
    }

    setDownloadingParticipantId(participant.id);
    if (assessmentCenterId) {
      setDownloadingAssessmentCenterId(assessmentCenterId);
    }
    setError(null);

    try {
      // Call API to generate report using report structure
      const response = await fetch(`/api/report-structures/${selectedReportStructure.id}/generate-participant-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: participant.id,
          assessmentCenterId: assessmentCenterId, // Include assessment center ID if provided
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to generate report' }));
        throw new Error(errorData.message || `Failed to generate report: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.message || 'Failed to generate report');
      }

      // Generate PDF with same structure as assessor reports
      downloadParticipantReportPdf({
        reportContent: data.data.reportContent,
        participantName: data.data.participant?.name || participant.name,
        participantEmail: data.data.participant?.email || participant.email,
        assessmentCenterName:
          data.data.assessmentCenter?.name || data.data.assessmentCenter?.displayName || 'N/A',
        assessmentCenterFileNamePart: assessmentCenterId
          ? data.data.assessmentCenter?.name || data.data.assessmentCenter?.displayName || ''
          : '',
        reportName: selectedReportStructure.reportName,
      });
    } catch (err) {
      console.error('Error downloading report:', err);
      setError(err instanceof Error ? err.message : 'Failed to download report');
    } finally {
      setDownloadingParticipantId(null);
      setDownloadingAssessmentCenterId(null);
    }
  };

  const handleGenerateAIReport = (participant: ParticipantData, assessmentCenterId: string, _assessmentCenterName: string) => {
    // Open the AI report page in a new tab — it calls the backend and renders the HTML report
    const url = `/dashboard/report-generation/reports/ai-report?participantId=${participant.id}&assessmentCenterId=${assessmentCenterId}`;
    window.open(url, '_blank');
  };

  const handleUploadReadinessScores = async (assessmentCenterId: string, file: File) => {
    if (!token) return;
    setUploadingReadiness(assessmentCenterId);
    setReadinessUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assessmentCenterId', assessmentCenterId);

      const response = await fetch(`${API_V1_BASE_URL}/readiness-scores/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      setReadinessUploadStatus({
        acId: assessmentCenterId,
        message: `Uploaded: ${data.data.savedCount} saved, ${data.data.skippedCount} skipped`,
        type: 'success',
      });
    } catch (err) {
      setReadinessUploadStatus({
        acId: assessmentCenterId,
        message: err instanceof Error ? err.message : 'Upload failed',
        type: 'error',
      });
    } finally {
      setUploadingReadiness(null);
    }
  };

  /** Swap between the list and the overview, scrolling back to the top so the new view is framed. */
  const openOverview = (
    target: { participant: ParticipantData; assessmentCenter: AssessmentCenterData } | null
  ) => {
    setOverviewTarget(target);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const triggerReadinessUpload = (assessmentCenterId: string) => {
    setPendingUploadACId(assessmentCenterId);
    readinessFileRef.current?.click();
  };

  const onReadinessFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingUploadACId) {
      handleUploadReadinessScores(pendingUploadACId, file);
    }
    e.target.value = '';
    setPendingUploadACId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error && !selectedGroup) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-sm text-black">{error}</div>
      </div>
    );
  }

  // Full-page participant overview replaces the list while it is open. The `key` remounts the
  // wrapper on each switch so the entrance animation replays in both directions.
  if (overviewTarget) {
    return (
      <div
        key={`overview-${overviewTarget.participant.id}-${overviewTarget.assessmentCenter.id}`}
        className="view-enter"
      >
        <ParticipantOverview
          participant={overviewTarget.participant}
          assessmentCenter={overviewTarget.assessmentCenter}
          cohortName={selectedGroup?.name || ''}
          token={token}
          isExporting={downloadingParticipantId === overviewTarget.participant.id}
          onBack={() => openOverview(null)}
          onExport={() =>
            handleDownloadReport(overviewTarget.participant, overviewTarget.assessmentCenter.id)
          }
          onGenerateAIReport={() =>
            handleGenerateAIReport(
              overviewTarget.participant,
              overviewTarget.assessmentCenter.id,
              overviewTarget.assessmentCenter.displayName || overviewTarget.assessmentCenter.name
            )
          }
        />
      </div>
    );
  }

  return (
    <div key="participant-list" className="view-enter space-y-4">
      {/* Hidden file input for readiness score upload */}
      <input
        type="file"
        ref={readinessFileRef}
        onChange={onReadinessFileChange}
        accept=".xlsx,.xls"
        className="hidden"
      />

      {/* Report Structure Selector */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-black mb-2">
                Report Structure
              </label>
              {selectedReportStructure ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black">{selectedReportStructure.reportName}</span>
                  <button
                    onClick={() => setShowReportStructureSelector(!showReportStructureSelector)}
                    className="text-sm text-black hover:text-gray-600 underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowReportStructureSelector(!showReportStructureSelector)}
                  className="text-sm text-black hover:text-gray-600 underline"
                >
                  Select Report Structure
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Structure Dropdown */}
        {showReportStructureSelector && (
          <div className="border-t border-gray-200 max-h-60 overflow-y-auto">
            {reportStructures.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {reportStructures.map((structure) => (
                  <button
                    key={structure.id}
                    onClick={() => {
                      setSelectedReportStructure(structure);
                      setShowReportStructureSelector(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selectedReportStructure?.id === structure.id ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div className="font-medium text-sm text-black">{structure.reportName}</div>
                    {structure.description && (
                      <div className="text-sm text-gray-600 mt-1">{structure.description}</div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-gray-600 text-center">
                No report structures available. Please create one in Report Structure page.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className={`border border-gray-200 rounded-lg ${
          error.toLowerCase().includes('quota') || error.toLowerCase().includes('rate limit')
            ? 'bg-gray-50'
            : 'bg-white'
        }`}>
          <div className="px-4 py-3 flex items-start">
            <div className="flex-shrink-0">
              {(error.toLowerCase().includes('quota') || error.toLowerCase().includes('rate limit')) ? (
                <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-black">
                {(error.toLowerCase().includes('quota') || error.toLowerCase().includes('rate limit'))
                  ? 'API Quota Exceeded'
                  : 'Error'}
              </h3>
              <div className="mt-2 text-sm text-gray-600">
                <p>{error}</p>
                {(error.toLowerCase().includes('quota') || error.toLowerCase().includes('rate limit')) && (
                  <p className="mt-2">
                    Please check your OpenAI account billing and quota limits, or try again later.
                  </p>
                )}
              </div>
              <div className="mt-3">
                <button
                  onClick={() => setError(null)}
                  className="text-sm font-medium text-black hover:text-gray-600 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups List or Group Details */}
      {!selectedGroup ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-base font-semibold text-black">Groups</h3>
            <p className="text-sm text-gray-600 mt-1">Select a group to view participants</p>
          </div>

          <div className="p-4">
            {groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className="border border-gray-200 rounded-lg p-4 hover:border-black hover:bg-gray-50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-black">{group.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {group.participants?.length || 0} participant{group.participants?.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-black">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-600">
                No groups available
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Header */}
          <div className="border-b border-gray-200 px-4 py-3">
            <button
              onClick={() => {
                setSelectedGroup(null);
                setParticipantSearch('');
              }}
              className="flex items-center text-black hover:text-gray-600 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Back to Groups</span>
            </button>
            <h3 className="text-base font-semibold text-black">{selectedGroup.name}</h3>
            <p className="text-sm text-gray-600 mt-1">Select a participant to download their report</p>
          </div>

          {/* Search Bar + scored-only filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by participant name or email"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black bg-white"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showOnlyScored}
                onChange={(e) => setShowOnlyScored(e.target.checked)}
                className="h-4 w-4 accent-black"
              />
              Only assessment centers with scores
              {hiddenCenterCount > 0 && (
                <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
                  {hiddenCenterCount} hidden
                </span>
              )}
            </label>
          </div>

          {/* Participants List with Assessment Centers */}
          <div className="p-3 space-y-3">
                {visibleParticipants.length > 0 ? (
              visibleParticipants.map((participant) => {
                const assessmentCenters = visibleCentersFor(participant.id);
                const isLoading = loadingAssessmentCenters.has(participant.id);
                const isDownloading = downloadingParticipantId === participant.id;

                return (
                  <div
                      key={participant.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-black transition-all"
                  >
                    {/* Participant Info */}
                    {/* Identity leads; the rest is secondary metadata on one line, each part
                        truncating so a long email can't widen the card. */}
                    <div className="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                        {initials(participant.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-base font-semibold text-black" title={participant.name}>
                            {participant.name}
                          </h4>
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium tabular-nums text-gray-600">
                            {participant.userCode}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-gray-600">
                          <span className="max-w-[220px] truncate" title={participant.designation}>
                            {participant.designation || '—'}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="max-w-[260px] truncate" title={participant.email}>
                            {participant.email}
                          </span>
                          <span className="text-gray-300">·</span>
                          <span className="max-w-[220px] truncate" title={participant.managerName || '-'}>
                            Reports to {participant.managerName || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Assessment Centers */}
                    <div>
                      <div className="text-sm text-black mb-2 font-medium">Assessment Centers</div>
                      {isLoading ? (
                        <div className="space-y-2">
                          {[0, 1].map((row) => (
                            <div
                              key={row}
                              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                            >
                              <div className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
                              <div className="h-9 w-28 animate-pulse rounded bg-gray-200" />
                              <div className="h-9 w-28 animate-pulse rounded bg-gray-200" />
                              <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />
                            </div>
                          ))}
                        </div>
                      ) : assessmentCenters.length > 0 ? (
                        <div className="space-y-2">
                          {assessmentCenters.map((ac) => {
                            const isDownloadingThis = isDownloading && downloadingAssessmentCenterId === ac.id;
                            const stats = centerStats.get(centerStatsKey(participant.id, ac.id));
                            return (
                              <div
                                key={ac.id}
                                className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-gray-300 hover:bg-gray-100/70"
                              >
                                <div className="min-w-[160px] flex-1">
                                  <div className="truncate text-sm font-medium text-black" title={ac.displayName || ac.name}>
                                    {ac.displayName || ac.name}
                                  </div>
                                </div>

                                {stats && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusChip
                                      label="Assessment completion"
                                      value={`${stats.completedActivities}/${stats.totalActivities}`}
                                      tone={ratioTone(stats.completedActivities, stats.totalActivities)}
                                    />
                                    <StatusChip
                                      label="Assessment scored"
                                      value={`${stats.scoredActivities}/${stats.totalActivities}`}
                                      tone={ratioTone(stats.scoredActivities, stats.totalActivities)}
                                    />
                                    <StatusChip
                                      label="Moderation done"
                                      value={stats.moderationDone ? 'Y' : 'N'}
                                      tone={
                                        stats.moderationDone
                                          ? 'complete'
                                          : stats.hasScores
                                            ? 'partial'
                                            : 'empty'
                                      }
                                    />
                                  </div>
                                )}

                        {/* Two primary actions stay on the row; the utility ones move into the
                            overflow menu so the status chips have space to breathe. */}
                        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
                          <button
                            onClick={() => openOverview({ participant, assessmentCenter: ac })}
                            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Overview</span>
                          </button>
                          <button
                            onClick={() => handleGenerateAIReport(participant, ac.id, ac.displayName || ac.name)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>AI Report</span>
                          </button>
                          <ActionMenu
                            label={`More actions for ${ac.displayName || ac.name}`}
                            items={[
                              {
                                label: isDownloadingThis ? 'Generating report…' : 'Download report',
                                icon: Download,
                                loading: isDownloadingThis,
                                disabled: !selectedReportStructure || isDownloading,
                                description: selectedReportStructure
                                  ? undefined
                                  : 'Select a report structure first',
                                onSelect: () => handleDownloadReport(participant, ac.id),
                              },
                              {
                                label:
                                  uploadingReadiness === ac.id
                                    ? 'Uploading…'
                                    : 'Upload readiness scores',
                                icon: Upload,
                                loading: uploadingReadiness === ac.id,
                                description: 'Excel (.xlsx) of readiness scores',
                                onSelect: () => triggerReadinessUpload(ac.id),
                              },
                            ]}
                          />
                        </div>
                        {readinessUploadStatus && readinessUploadStatus.acId === ac.id && (
                          <div className={`w-full text-xs px-3 py-1.5 rounded ${
                            readinessUploadStatus.type === 'success'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {readinessUploadStatus.message}
                          </div>
                        )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 py-2">
                          No assessment centers found for this participant
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : showOnlyScored && filteredParticipants.length > 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-600">
                  No assessment centers have been scored in this group yet.
                </p>
                <button
                  onClick={() => setShowOnlyScored(false)}
                  className="mt-2 text-sm font-medium text-black underline hover:text-gray-600"
                >
                  Show all assessment centers
                </button>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-600">
                      No participants found
              </div>
                )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ParticipantReports;

