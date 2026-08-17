"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ReportStructureApi, ReportStructure } from '@/lib/reportStructureApi';
import { Download, Search, ArrowLeft, ChevronRight, LayoutDashboard, Sparkles, Upload } from 'lucide-react';
import { API_V1_BASE_URL } from '@/lib/apiConfig';
import { downloadParticipantReportPdf } from '@/lib/reports/participantReportPdf';
import ParticipantOverview from './participantOverview/ParticipantOverview';

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
  const [loadingAssessmentCenters, setLoadingAssessmentCenters] = useState<Set<string>>(new Set());
  const [uploadingReadiness, setUploadingReadiness] = useState<string | null>(null); // AC id being uploaded
  const [readinessUploadStatus, setReadinessUploadStatus] = useState<{ acId: string; message: string; type: 'success' | 'error' } | null>(null);
  const readinessFileRef = React.useRef<HTMLInputElement>(null);
  const [pendingUploadACId, setPendingUploadACId] = useState<string | null>(null);
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

  // Fetch assessment centers for participants when group is selected
  useEffect(() => {
    const fetchAssessmentCentersForParticipants = async () => {
      if (!token || !selectedGroup) return;

      const newMap = new Map<string, AssessmentCenterData[]>();
      const loadingSet = new Set<string>();

      for (const participant of selectedGroup.participants) {
        loadingSet.add(participant.id);
        try {
          // Fetch assignments for this participant to get assessment centers
          const response = await fetch(`/api/assignments/participant/${participant.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.assignments) {
              // Extract unique assessment centers
              const assessmentCentersMap = new Map<string, AssessmentCenterData>();
              
              data.data.assignments.forEach((assignment: Record<string, unknown>) => {
                if (assignment.assessmentCenter) {
                  const ac = assignment.assessmentCenter as Record<string, unknown>;
                  const acId = typeof ac.id === 'string' ? ac.id : '';
                  if (acId && !assessmentCentersMap.has(acId)) {
                    const acName = typeof ac.name === 'string' ? ac.name : (typeof ac.displayName === 'string' ? ac.displayName : 'Unknown');
                    const acDisplayName = typeof ac.displayName === 'string' ? ac.displayName : undefined;
                    assessmentCentersMap.set(acId, {
                      id: acId,
                      name: acName,
                      displayName: acDisplayName
                    });
                  }
                }
              });

              newMap.set(participant.id, Array.from(assessmentCentersMap.values()));
            } else {
              newMap.set(participant.id, []);
            }
          } else {
            newMap.set(participant.id, []);
          }
        } catch (err) {
          console.error(`Error fetching assessment centers for participant ${participant.id}:`, err);
          newMap.set(participant.id, []);
        } finally {
          loadingSet.delete(participant.id);
        }
      }

      setParticipantsWithAssessmentCenters(newMap);
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

  // Full-page participant overview replaces the list while it is open.
  if (overviewTarget) {
    return (
      <ParticipantOverview
        participant={overviewTarget.participant}
        assessmentCenter={overviewTarget.assessmentCenter}
        cohortName={selectedGroup?.name || ''}
        token={token}
        isExporting={downloadingParticipantId === overviewTarget.participant.id}
        onBack={() => setOverviewTarget(null)}
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
    );
  }

  return (
    <div className="space-y-4">
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

          {/* Search Bar */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by participant name or email"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black bg-white"
              />
            </div>
          </div>

          {/* Participants List with Assessment Centers */}
          <div className="p-3 space-y-3">
                {filteredParticipants.length > 0 ? (
              filteredParticipants.map((participant) => {
                const assessmentCenters = participantsWithAssessmentCenters.get(participant.id) || [];
                const isLoading = loadingAssessmentCenters.has(participant.id);
                const isDownloading = downloadingParticipantId === participant.id;

                return (
                  <div
                      key={participant.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-black transition-all"
                  >
                    {/* Participant Info */}
                    {/* min-w-0 on each cell: long emails and designations would otherwise widen
                        the grid track and push the row past the card. */}
                    <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200 md:grid-cols-3 xl:grid-cols-5">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-600 mb-1">User Code</div>
                        <div className="truncate text-sm font-medium text-black" title={participant.userCode}>
                          {participant.userCode}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-gray-600 mb-1">Name</div>
                        <div className="truncate text-sm font-medium text-black" title={participant.name}>
                          {participant.name}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-gray-600 mb-1">Email</div>
                        <div className="truncate text-sm text-black" title={participant.email}>
                          {participant.email}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-gray-600 mb-1">Designation</div>
                        <div className="truncate text-sm text-black" title={participant.designation}>
                          {participant.designation}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-gray-600 mb-1">Manager</div>
                        <div className="truncate text-sm text-black" title={participant.managerName || '-'}>
                          {participant.managerName || '-'}
                        </div>
                      </div>
                    </div>

                    {/* Assessment Centers */}
                    <div>
                      <div className="text-sm text-black mb-2 font-medium">Assessment Centers</div>
                      {isLoading ? (
                        <div className="text-sm text-gray-600 py-2">Loading assessment centers...</div>
                      ) : assessmentCenters.length > 0 ? (
                        <div className="space-y-2">
                          {assessmentCenters.map((ac) => {
                            const isDownloadingThis = isDownloading && downloadingAssessmentCenterId === ac.id;
                            return (
                              <div
                                key={ac.id}
                                className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-black" title={ac.displayName || ac.name}>
                                    {ac.displayName || ac.name}
                                  </div>
                                </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setOverviewTarget({ participant, assessmentCenter: ac })}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Overview</span>
                          </button>
                          <button
                            onClick={() => handleDownloadReport(participant, ac.id)}
                            disabled={!selectedReportStructure || isDownloading}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDownloadingThis ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-black"></div>
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                <span>Download Report</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => triggerReadinessUpload(ac.id)}
                            disabled={uploadingReadiness === ac.id}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-black border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            {uploadingReadiness === ac.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-black"></div>
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>Readiness Scores</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleGenerateAIReport(participant, ac.id, ac.displayName || ac.name)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>AI Report</span>
                          </button>
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

