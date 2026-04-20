"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import AssessmentsCard from './AssessmentsCard';
import CompetencyCard from './CompetencyCard';
import GroupsList from './GroupsList';
import GroupDetails from './GroupDetails';
import ApplicationReadinessGraph from './ApplicationReadinessGraph';
import PrePostAssessment from './PrePostAssessment';
import AssessorsReports from './AssessorsReports';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { API_BASE_URL_WITH_API } from '../../lib/apiConfig';

interface ManagementReportsProps {
  token: string | null;
}

interface OverviewData {
  totalAssessments: number;
  assigned: number;
  inProgress: number;
  completed: number;
  assignedPercentage: number;
  inProgressPercentage: number;
  completedPercentage: number;
}

interface CompetencyData {
  competencyId: string;
  competencyName: string;
  averageScore: number;
}

interface GroupData {
  id: string;
  name: string;
  participants: ParticipantData[];
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
  displayName: string;
}

interface ParticipantAssignment {
  assignmentId: string;
  assessmentCenter: AssessmentCenterData;
  activities: Array<{
    activityId: string;
    activityType: string;
    activityDetail: {
      id: string;
      name: string;
    } | null;
    isSubmitted: boolean;
    submission: any;
  }>;
  totalActivities: number;
  submittedActivities: number;
  completionPercentage: number;
}

const ManagementReports: React.FC<ManagementReportsProps> = ({ token }) => {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [competencyData, setCompetencyData] = useState<CompetencyData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantData | null>(null);
  const [filteredParticipant, setFilteredParticipant] = useState<ParticipantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competencySearch, setCompetencySearch] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [showGraphs, setShowGraphs] = useState(false);
  const [selectedAssessmentCenter, setSelectedAssessmentCenter] = useState<AssessmentCenterData | null>(null);
  const [participantAssignments, setParticipantAssignments] = useState<ParticipantAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assessmentCenterActivities, setAssessmentCenterActivities] = useState<Array<{
    activityId: string;
    activityType: string;
    displayName?: string;
    activityDetail?: {
      id: string;
      name: string;
    } | null;
    competency?: {
      id: string;
      competencyName: string;
      subCompetencyNames: string[];
    };
  }>>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!token) return;

    try {
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
    } catch (err) {
      console.error('Error fetching groups data:', err);
    }
  }, [token]);

  const fetchOverviewAndCompetencies = useCallback(async (groupId?: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Build query params
      const queryParams = new URLSearchParams();
      if (groupId) {
        queryParams.append('groupId', groupId);
      }

      // Fetch overview data
      const overviewUrl = `/api/management-reports/overview${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const overviewRes = await fetch(overviewUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (overviewRes.ok) {
        const overviewResult = await overviewRes.json();
        setOverviewData(overviewResult.data);
      }

      // Fetch competency data
      const competencyUrl = `/api/management-reports/competencies${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const competencyRes = await fetch(competencyUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (competencyRes.ok) {
        const competencyResult = await competencyRes.json();
        setCompetencyData(competencyResult.data || []);
      }
    } catch (err) {
      console.error('Error fetching management reports data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial fetch for groups
  useEffect(() => {
    if (token) {
      fetchGroups();
    }
  }, [token, fetchGroups]);

  // Fetch overview and competencies on mount and when group selection changes
  useEffect(() => {
    if (token) {
      fetchOverviewAndCompetencies(selectedGroup?.id);
    }
  }, [token, selectedGroup?.id, fetchOverviewAndCompetencies]);

  const filteredCompetencies = competencyData.filter(comp =>
    comp.competencyName.toLowerCase().includes(competencySearch.toLowerCase())
  );

  const filteredParticipants = selectedGroup?.participants.filter(p =>
    p.name.toLowerCase().includes(participantSearch.toLowerCase())
  ) || [];

  // Get all participants from selected group for participant filter dropdown
  const groupParticipants = selectedGroup?.participants || [];

  // Handle group filter change
  const handleGroupFilterChange = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    setSelectedGroup(group || null);
    setSelectedParticipant(null);
    setFilteredParticipant(null);
    setShowGraphs(false);
  };

  // Fetch assessment center activities with competencies
  const fetchAssessmentCenterActivities = useCallback(async (assessmentCenterId: string) => {
    if (!token) return;

    setActivitiesLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL_WITH_API}/assessment-centers/${assessmentCenterId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const activities = result.data.activities || [];
          const competencies = result.data.competencies || [];
          
          // Get activity IDs to fetch case studies and inbox activities
          const activityIds = activities.map((act: any) => act.activityId).filter(Boolean);
          
          // Fetch case studies and inbox activities
          const [caseStudiesRes, inboxActivitiesRes] = await Promise.all([
            activityIds.length > 0
              ? fetch(`${API_BASE_URL_WITH_API}/case-studies?page=1&limit=100`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
              : Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { caseStudies: [] } }) }),
            activityIds.length > 0
              ? fetch(`${API_BASE_URL_WITH_API}/inbox-activities?page=1&limit=100`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
              : Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { inboxActivities: [] } }) }),
          ]);
          
          const caseStudiesData = await caseStudiesRes.json();
          const inboxActivitiesData = await inboxActivitiesRes.json();
          const caseStudies = caseStudiesData?.data?.caseStudies || [];
          const inboxActivities = inboxActivitiesData?.data?.inboxActivities || [];

          // Map activities with their details
          const activitiesWithDetails = activities.map((act: any) => {
            // Find activity detail
            let activityDetail = null;
            if (act.activityType === 'CASE_STUDY') {
              activityDetail = caseStudies.find((cs: any) => cs.id === act.activityId);
            } else if (act.activityType === 'INBOX_ACTIVITY') {
              activityDetail = inboxActivities.find((ia: any) => ia.id === act.activityId);
            }
            
            // Find competency for this activity
            const competency = competencies.find(
              (comp: any) => comp.id === act.competencyLibraryId
            );

            return {
              activityId: act.activityId,
              activityType: act.activityType?.toLowerCase().replace('_', '-') || '',
              displayName: act.displayName || activityDetail?.name || null,
              activityDetail: activityDetail
                ? {
                    id: activityDetail.id,
                    name: activityDetail.name,
                  }
                : null,
              competency: competency
                ? {
                    id: competency.id,
                    competencyName: competency.competencyName,
                    subCompetencyNames: competency.subCompetencyNames || [],
                  }
                : undefined,
            };
          });

          setAssessmentCenterActivities(activitiesWithDetails);
        } else {
          setAssessmentCenterActivities([]);
        }
      } else {
        setAssessmentCenterActivities([]);
      }
    } catch (err) {
      console.error('Error fetching assessment center activities:', err);
      setAssessmentCenterActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [token]);

  // Fetch participant assignments (assessment centers)
  const fetchParticipantAssignments = useCallback(async (participantId: string) => {
    if (!token) return;
    
    setAssignmentsLoading(true);
    try {


      const res = await fetch(`${API_BASE_URL_WITH_API}/assignments/participant/${participantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          // The API returns data.assignments, not data directly
          const assignments = Array.isArray(result.data.assignments)
            ? result.data.assignments
            : Array.isArray(result.data)
            ? result.data
            : [];

          setParticipantAssignments(assignments);

          // Get unique assessment centers
          if (assignments.length > 0 && Array.isArray(assignments)) {
            const centers = Array.from(
              new Map(assignments.map((a: ParticipantAssignment) => [a.assessmentCenter.id, a.assessmentCenter])).values()
            );

            // If participant has only one assessment center, auto-select it
            if (centers.length === 1) {
              setSelectedAssessmentCenter(centers[0]);
              // Fetch activities for this center
              fetchAssessmentCenterActivities(centers[0].id);
            } else if (centers.length > 1) {
              // If multiple centers, clear selection to let user choose
              setSelectedAssessmentCenter(null);
              setAssessmentCenterActivities([]);
            } else {
              setSelectedAssessmentCenter(null);
              setAssessmentCenterActivities([]);
            }
          } else {
            setSelectedAssessmentCenter(null);
            setAssessmentCenterActivities([]);
          }
        } else {
          // No data or unsuccessful response
          setParticipantAssignments([]);
          setSelectedAssessmentCenter(null);
          setAssessmentCenterActivities([]);
        }
      } else {
        console.error('Failed to fetch participant assignments:', res.status, res.statusText);
        setParticipantAssignments([]);
        setSelectedAssessmentCenter(null);
        setAssessmentCenterActivities([]);
      }
    } catch (err) {
      console.error('Error fetching participant assignments:', err);
      setParticipantAssignments([]);
      setSelectedAssessmentCenter(null);
      setAssessmentCenterActivities([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [token, fetchAssessmentCenterActivities]);

  // Handle participant filter change
  const handleParticipantFilterChange = (participantId: string) => {
    const participant = groupParticipants.find(p => p.id === participantId);
    setFilteredParticipant(participant || null);
    setSelectedParticipant(participant || null);
    setShowGraphs(!!participant);
    setSelectedAssessmentCenter(null);
    setParticipantAssignments([]);
    
    if (participant) {
      fetchParticipantAssignments(participant.id);
    }
  };

  // Get unique assessment centers from assignments
  const assessmentCenters = participantAssignments.map(a => a.assessmentCenter);
  const uniqueAssessmentCenters = Array.from(
    new Map(assessmentCenters.map(ac => [ac.id, ac])).values()
  );

  // Get assignments for selected assessment center (or all if only one center exists)
  const selectedCenterAssignments = (() => {
    if (uniqueAssessmentCenters.length === 1) {
      // If only one center, use it automatically
      return participantAssignments;
    } else if (selectedAssessmentCenter) {
      // If multiple centers and one is selected, filter by it
      return participantAssignments.filter(a => a.assessmentCenter.id === selectedAssessmentCenter.id);
    }
    // If multiple centers but none selected, return empty
    return [];
  })();

  // Get all activities from selected assessment center
  const allActivities = selectedCenterAssignments.flatMap(a => a.activities);
  const completedActivities = allActivities.filter(a => a.isSubmitted);
  const notCompletedActivities = allActivities.filter(a => !a.isSubmitted);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-xs text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-xs text-black">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Section - At the Top */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 flex items-center gap-4 flex-wrap">
          {/* Group Filter */}
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-semibold text-black mb-2">
              Filter using Groups
            </label>
            <select
              value={selectedGroup?.id || ''}
              onChange={(e) => {
                if (e.target.value) {
                  handleGroupFilterChange(e.target.value);
                } else {
                  setSelectedGroup(null);
                  setSelectedParticipant(null);
                  setFilteredParticipant(null);
                  setShowGraphs(false);
                }
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-black focus:border-black focus:outline-none bg-white"
            >
              <option value="">All Groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.participants?.length || 0} participants)
                </option>
              ))}
            </select>
          </div>

          {/* Participant Filter - Only show when group is selected */}
          {selectedGroup && groupParticipants.length > 0 && (
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-semibold text-black mb-2">
                Filter Participants
              </label>
              <select
                value={filteredParticipant?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    handleParticipantFilterChange(e.target.value);
                  } else {
                    setFilteredParticipant(null);
                    setSelectedParticipant(null);
                    setSelectedAssessmentCenter(null);
                    setParticipantAssignments([]);
                    setShowGraphs(false);
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-black focus:border-black focus:outline-none bg-white"
              >
                <option value="">All Participants</option>
                {groupParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name} ({participant.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Assessment Center Filter - Only show when participant is selected and has multiple centers */}
          {filteredParticipant && uniqueAssessmentCenters.length > 1 && (
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-semibold text-black mb-2">
                Select Assessment Center
              </label>
              <select
                value={selectedAssessmentCenter?.id || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const center = uniqueAssessmentCenters.find(ac => ac.id === e.target.value);
                    setSelectedAssessmentCenter(center || null);
                    if (center) {
                      fetchAssessmentCenterActivities(center.id);
                    }
                  } else {
                    setSelectedAssessmentCenter(null);
                    setAssessmentCenterActivities([]);
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-black focus:border-black focus:outline-none bg-white"
                disabled={assignmentsLoading}
              >
                <option value="">All Assessment Centers</option>
                {uniqueAssessmentCenters.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.displayName || center.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
          {(selectedGroup || filteredParticipant || selectedAssessmentCenter) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedGroup(null);
                  setSelectedParticipant(null);
                  setFilteredParticipant(null);
                  setSelectedAssessmentCenter(null);
                  setParticipantAssignments([]);
                  setShowGraphs(false);
                }}
                className="px-4 py-2 text-sm font-medium text-black border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Active Filters Display */}
        {(selectedGroup || filteredParticipant || selectedAssessmentCenter) && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-600">Active Filters:</span>
              {selectedGroup && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-medium text-black">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Group: {selectedGroup.name}
                </span>
              )}
              {filteredParticipant && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-medium text-black">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Participant: {filteredParticipant.name}
                </span>
              )}
              {selectedAssessmentCenter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-medium text-black">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Assessment Center: {selectedAssessmentCenter.displayName || selectedAssessmentCenter.name}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assessment Details Section - Replaces top cards when participant and assessment center are selected */}
      {filteredParticipant && participantAssignments.length > 0 && (uniqueAssessmentCenters.length === 1 || selectedAssessmentCenter) ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-base font-bold text-black">Assessment Details</h3>
            {filteredParticipant && (
              <p className="text-sm text-gray-600 mt-1">
                {filteredParticipant.email}
              </p>
            )}
          </div>
          
          {assignmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-black"></div>
              <span className="ml-2 text-sm text-gray-600">Loading assessments...</span>
            </div>
          ) : selectedCenterAssignments.length > 0 && allActivities.length > 0 ? (
            <div className="p-4 space-y-4">
              {/* Performance Analysis - Graphs and Completed Table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Pie Chart - Completion Status */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-black mb-2">Completion Status</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: completedActivities.length },
                          { name: 'Not Completed', value: notCompletedActivities.length }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill="#000000" />
                        <Cell fill="#808080" />
                      </Pie>
                      <Tooltip />
                      <Legend 
                        wrapperStyle={{ fontSize: '11px' }}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar Chart - Assessment Types */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-black mb-2">By Activity Type</h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={[
                        {
                          type: 'Inbox',
                          completed: completedActivities.filter(a => a.activityType === 'INBOX_ACTIVITY').length,
                          pending: notCompletedActivities.filter(a => a.activityType === 'INBOX_ACTIVITY').length
                        },
                        {
                          type: 'Case Study',
                          completed: completedActivities.filter(a => a.activityType === 'CASE_STUDY').length,
                          pending: notCompletedActivities.filter(a => a.activityType === 'CASE_STUDY').length
                        }
                      ]}
                    >
                      <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="completed" fill="#000000" name="Completed" />
                      <Bar dataKey="pending" fill="#808080" name="Pending" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Completed Assessments Table */}
                {completedActivities.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg">
                    <div className="border-b border-gray-200 px-3 py-2 bg-gray-50 rounded-t-lg">
                      <h4 className="text-sm font-semibold text-black">
                        Completed ({completedActivities.length})
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-200 max-h-[180px] overflow-y-auto">
                      {completedActivities.map((activity, index) => (
                        <div key={activity.activityId} className="px-3 py-2 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xs font-medium text-gray-500 w-4">{index + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-black truncate">
                                  {activity.activityDetail?.name || `Activity ${activity.activityId}`}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">
                                  {activity.activityType.replace('_', ' ').toLowerCase()}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-black border border-black px-2 py-0.5">
                              ✓
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Not Completed Assessments - Only show if there are any */}
              {notCompletedActivities.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="border-b border-gray-200 px-3 py-2 bg-gray-50 rounded-t-lg">
                    <h4 className="text-sm font-semibold text-black">
                      Not Completed ({notCompletedActivities.length})
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {notCompletedActivities.map((activity, index) => (
                      <div key={activity.activityId} className="px-3 py-2 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-medium text-gray-500 w-4">{index + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-black truncate">
                                {activity.activityDetail?.name || `Activity ${activity.activityId}`}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {activity.activityType.replace('_', ' ').toLowerCase()}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-gray-600 border border-gray-400 px-2 py-0.5">
                            Pending
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show message if no assessments */}
              {allActivities.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  <p>No assessments found for this participant in the selected assessment center.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              <p>No assessment data available.</p>
            </div>
          )}
        </div>
      ) : (
        /* Assessments and Competency Cards - Show when no participant/assessment center selected */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AssessmentsCard data={overviewData} />
          <CompetencyCard
            competencies={filteredCompetencies}
            searchValue={competencySearch}
            onSearchChange={setCompetencySearch}
          />
        </div>
      )}

      {/* Groups List or Group Details - Hide when participant is selected */}
      {!filteredParticipant && (
        <>
          {!selectedGroup ? (
            <GroupsList
              groups={groups}
              onGroupSelect={(group) => {
                setSelectedGroup(group);
                setFilteredParticipant(null);
                setSelectedParticipant(null);
                setSelectedAssessmentCenter(null);
                setParticipantAssignments([]);
                setShowGraphs(false);
              }}
            />
          ) : (
            <GroupDetails
              group={selectedGroup}
              participants={filteredParticipants}
              searchValue={participantSearch}
              onSearchChange={setParticipantSearch}
              onParticipantSelect={(participant) => {
                setSelectedParticipant(participant);
                setFilteredParticipant(participant);
                setShowGraphs(true);
                fetchParticipantAssignments(participant.id);
              }}
              onBack={() => {
                setSelectedGroup(null);
                setSelectedParticipant(null);
                setFilteredParticipant(null);
                setSelectedAssessmentCenter(null);
                setParticipantAssignments([]);
                setShowGraphs(false);
              }}
            />
          )}
        </>
      )}


      {/* Graphs Section - Only show when participant is selected from filter */}
      {filteredParticipant && showGraphs && (selectedAssessmentCenter || uniqueAssessmentCenters.length <= 1) && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-base font-bold text-black">Performance Analytics</h3>
            </div>
            
            {/* Application Average vs Readiness Graph */}
            <div className="border-b border-gray-300">
              <ApplicationReadinessGraph
                participantId={filteredParticipant.id}
                participantName={filteredParticipant.name}
                token={token}
                assessmentCenterId={selectedAssessmentCenter?.id || (uniqueAssessmentCenters.length === 1 ? uniqueAssessmentCenters[0]?.id : null)}
              />
            </div>

            {/* Pre vs Post Assessment */}
            <div>
              <PrePostAssessment
                participantId={filteredParticipant.id}
                participantName={filteredParticipant.name}
                token={token}
                assessmentCenterId={selectedAssessmentCenter?.id || (uniqueAssessmentCenters.length === 1 ? uniqueAssessmentCenters[0]?.id : null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* All Assessors Reports Section - Show when participant and assessment center are selected */}
      {filteredParticipant && (selectedAssessmentCenter || uniqueAssessmentCenters.length === 1) && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-base font-bold text-black">All Assessors Reports</h3>
            <p className="text-sm text-gray-600 mt-1">
              View all assessor evaluations with activity-wise competency scores
            </p>
          </div>
          <div className="p-4">
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
                <span className="ml-2 text-sm text-gray-600">Loading activities...</span>
              </div>
            ) : assessmentCenterActivities.length > 0 ? (
              <AssessorsReports
                participantId={filteredParticipant.id}
                participantName={filteredParticipant.name}
                assessmentCenterId={selectedAssessmentCenter?.id || uniqueAssessmentCenters[0]?.id || ''}
                token={token}
                activities={assessmentCenterActivities}
                descriptors={{}}
              />
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                <p>No activities found for this assessment center.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show message when participant selected but no assessment center selected (when multiple exist) */}
      {filteredParticipant && uniqueAssessmentCenters.length > 1 && !selectedAssessmentCenter && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-6 text-center">
          <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-sm font-medium text-black">Select an Assessment Center</p>
          <p className="text-sm text-gray-600 mt-1">This participant is assigned to multiple assessment centers. Please select one from the filter above to view assessment details.</p>
        </div>
      )}

      {/* Show message when filters are applied but no participant selected for graphs */}
      {selectedGroup && !filteredParticipant && (
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-6 text-center">
          <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm font-medium text-black">Select a participant to view performance analytics</p>
          <p className="text-sm text-gray-600 mt-1">Choose a participant from the filter above to see detailed graphs and reports</p>
        </div>
      )}
    </div>
  );
};

export default ManagementReports;

