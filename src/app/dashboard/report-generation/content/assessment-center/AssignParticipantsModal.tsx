'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, UserCheck, Activity, ChevronDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Select, { StylesConfig, GroupBase, MultiValue } from 'react-select';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL_WITH_API } from '@/lib/apiConfig';

interface Participant {
  id: string;
  name: string;
  email: string;
  designation: string;
}

interface Group {
  id: string;
  name: string;
  admin: string;
  adminEmail: string;
  participants: Participant[];
}

interface Assessor {
  id: string;
  name: string;
  email: string;
}

interface ActivityAssignment {
  activityId: string;
  assessorIds: string[];
}

interface AssignmentParticipant {
  participantId: string;
  activities: ActivityAssignment[];
}

interface GroupAssignment {
  groupId: string;
  participants: AssignmentParticipant[];
}

// Match the FormActivity interface from ParticipantAssessorManagementStep
interface Activity {
  id?: string;
  activityType?: string;
  activityContent?: string;
  displayName?: string;
  name?: string;
}

type OptionType = { value: string; label: string };

const customStyles: StylesConfig<OptionType, true, GroupBase<OptionType>> = {
  control: (provided) => ({
    ...provided,
    backgroundColor: 'white',
    color: 'black',
    borderColor: '#e2e8f0',
    borderRadius: '8px',
    minHeight: '38px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    '&:hover': {
      borderColor: '#cbd5e1',
    },
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#e2e8f0',
    borderRadius: '6px',
    color: 'black',
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#374151',
    fontSize: '14px',
  }),
  option: (provided, state) => ({
    ...provided,
    color: 'black',
    backgroundColor: state.isSelected ? '#e2e8f0' : state.isFocused ? '#f8fafc' : 'white',
    '&:hover': {
      backgroundColor: '#f1f5f9',
    },
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    color: 'black',
    zIndex: 9999,
  }),
  input: (provided) => ({
    ...provided,
    color: 'black',
  }),
};

interface AssignParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentCenterId: string;
  activities: Activity[];
  existingAssignments?: GroupAssignment[];
  onSuccess?: () => void;
}

const AssignParticipantsModal: React.FC<AssignParticipantsModalProps> = ({
  isOpen,
  onClose,
  assessmentCenterId,
  activities,
  existingAssignments = [],
  onSuccess,
}) => {
  const { token } = useAuth();
  const [allGroups, setAllGroups] = useState<Group[]>([]); // All available groups from search
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]); // Groups selected for assignment
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [assignments, setAssignments] = useState<GroupAssignment[]>(existingAssignments);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setAssignments(existingAssignments);
      fetchAssessors();
      // Initialize selected groups from existing assignments
      if (existingAssignments && existingAssignments.length > 0) {
        initializeSelectedGroups();
      }
    }
  }, [isOpen, existingAssignments]);

  // Initialize selected groups from existing assignments
  const initializeSelectedGroups = async () => {
    if (!token) return;
    
    try {
      const groupIds = existingAssignments.map(a => a.groupId);
      if (groupIds.length === 0) return;

      const response = await fetch(`${API_BASE_URL_WITH_API}/groups?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const allGroupsData = data?.data?.groups || [];
      const groupsFromAssignments = allGroupsData.filter((g: Group) => groupIds.includes(g.id));
      setSelectedGroups(groupsFromAssignments);
    } catch (error) {
      console.error('Error initializing selected groups:', error);
    }
  };

  const fetchAssessors = async () => {
    if (!token) {
      setError('Authentication token not available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const assessorsRes = await fetch(`${API_BASE_URL_WITH_API}/assessors?page=1&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const assessorsData = await assessorsRes.json();
      
      // Handle different possible response structures for assessors
      const assessorsList = assessorsData?.data?.assessors || assessorsData?.data || assessorsData?.assessors || [];
      setAssessors(assessorsList);
    } catch {
      setError('Failed to fetch assessors');
    } finally {
      setLoading(false);
    }
  };

  // Search groups - only fetch when search term is provided
  useEffect(() => {
    if (!token || !groupSearchTerm.trim()) {
      setAllGroups([]);
      return;
    }

    const delayedSearch = setTimeout(async () => {
      setGroupSearchLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL_WITH_API}/groups?page=1&limit=100&search=${encodeURIComponent(groupSearchTerm)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();
        const groupsData = data?.data?.groups || [];
        // Filter out already selected groups
        const selectedGroupIds = new Set(selectedGroups.map(g => g.id));
        const filteredGroups = groupsData.filter((g: Group) => !selectedGroupIds.has(g.id));
        setAllGroups(filteredGroups);
      } catch (error) {
        console.error('Error searching groups:', error);
        setAllGroups([]);
      } finally {
        setGroupSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [groupSearchTerm, token, selectedGroups]);

  // Add group to selected groups
  const handleAddGroup = (group: Group) => {
    if (!selectedGroups.find(g => g.id === group.id)) {
      setSelectedGroups([...selectedGroups, group]);
      setGroupSearchTerm(''); // Clear search after selecting
      setAllGroups([]); // Clear search results
    }
  };

  // Remove group from selected groups
  const handleRemoveGroup = (groupId: string) => {
    setSelectedGroups(selectedGroups.filter(g => g.id !== groupId));
    // Also remove assignments for this group
    setAssignments(assignments.filter(a => a.groupId !== groupId));
  };

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const toggleParticipantExpansion = (participantId: string) => {
    setExpandedParticipants((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const handleActivityAssessorsChange = (
    groupId: string,
    participantId: string,
    activityId: string,
    assessorIds: string[]
  ) => {
    setAssignments((prev) => {
      const groupIdx = prev.findIndex((g) => g.groupId === groupId);
      const newAssignments = [...prev];

      if (groupIdx === -1) {
        const newParticipant: AssignmentParticipant = {
          participantId,
          activities: [{ activityId, assessorIds }],
        };
        newAssignments.push({
          groupId,
          participants: [newParticipant],
        });
      } else {
        const participantIdx = newAssignments[groupIdx].participants.findIndex(
          (p) => p.participantId === participantId
        );
        if (participantIdx === -1) {
          const newParticipant: AssignmentParticipant = {
            participantId,
            activities: [{ activityId, assessorIds }],
          };
          newAssignments[groupIdx].participants.push(newParticipant);
        } else {
          const updatedParticipant = { ...newAssignments[groupIdx].participants[participantIdx] };
          const activityIdx = updatedParticipant.activities.findIndex((a) => a.activityId === activityId);

          if (activityIdx === -1) {
            updatedParticipant.activities.push({ activityId, assessorIds });
          } else {
            updatedParticipant.activities[activityIdx] = { activityId, assessorIds };
          }
          newAssignments[groupIdx].participants[participantIdx] = updatedParticipant;
        }
      }
      return newAssignments;
    });
  };

  // Compute available activities - matching the exact logic from ParticipantAssessorManagementStep
  const availableActivities = React.useMemo(() => {
    if (!activities || activities.length === 0) {
      console.warn('getAvailableActivities: No activities provided', activities);
      return [];
    }
    
    const mapped = activities.map((activity: Activity) => {
      // Match the exact logic from ParticipantAssessorManagementStep
      const activityTypeLabel = activity.activityType === 'case-study' ? 'Case Study' : 
                               activity.activityType === 'inbox-activity' ? 'Inbox Activity' : 
                               activity.activityType || 'Unknown';
      const displayName = activity.displayName || activity.name || 'Unnamed Activity';
      const value = activity.activityContent || activity.id || '';
      
      if (!value) {
        console.warn('Activity missing value:', activity);
      }
      
      return {
        value: value,
        label: `${displayName} (${activityTypeLabel})`,
      };
    }).filter(a => a.value); // Filter out any activities without a value
    
    console.log('getAvailableActivities result:', mapped);
    return mapped;
  }, [activities]);
  
  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('AssignParticipantsModal - Activities Debug:', {
        activitiesProp: activities,
        availableActivities: availableActivities,
        activitiesCount: activities?.length || 0,
        availableActivitiesCount: availableActivities.length,
        activitiesStructure: activities?.map(a => ({
          id: a.id,
          activityType: a.activityType,
          activityContent: a.activityContent,
          displayName: a.displayName,
          name: a.name
        })) || []
      });
    }
  }, [isOpen, activities, availableActivities]);
  
  const assessorOptions: OptionType[] = assessors.map((ass) => {
    const name = ass.name || 'Unknown Assessor';
    const email = ass.email || '';
    return {
      value: ass.id,
      label: email ? `${name} (${email})` : name,
    };
  });

  const handleSave = async () => {
    if (!token) {
      setError('Authentication token not available');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Debug: Log the assignments being saved
      console.log('=== SAVING PARTICIPANT ASSIGNMENTS ===');
      console.log('Assessment Center ID:', assessmentCenterId);
      console.log('Assignments to save:', JSON.stringify(assignments, null, 2));
      
      // Log each participant assignment for debugging
      assignments.forEach((groupAssignment, gIdx) => {
        console.log(`Group ${gIdx + 1}:`, groupAssignment.groupId);
        groupAssignment.participants.forEach((participant, pIdx) => {
          console.log(`  Participant ${pIdx + 1}:`, {
            participantId: participant.participantId,
            activitiesCount: participant.activities.length,
            activities: participant.activities.map(a => ({
              activityId: a.activityId,
              assessorIds: a.assessorIds
            }))
          });
        });
      });

      const form = new FormData();
      form.append('assignments', JSON.stringify(assignments));

      const response = await fetch(`${API_BASE_URL_WITH_API}/assessment-centers/${assessmentCenterId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const result = await response.json();
      console.log('Save assignments response:', result);

      if (result.success) {
        console.log('✅ Assignments saved successfully');
        onSuccess?.();
        onClose();
      } else {
        console.error('❌ Failed to save assignments:', result.message);
        setError(result.message || 'Failed to save assignments');
      }
    } catch (err) {
      setError('An error occurred while saving assignments');
      console.error('Error saving assignments:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#00000045] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Assign Participants</h2>
            <p className="text-sm text-gray-600 mt-1">Select groups and assign assessors to activities</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Group Search Section */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Search and Add Groups
            </label>
            <div className="relative">
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-4 py-2.5 w-full pl-10 text-black focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Type to search groups..."
                value={groupSearchTerm}
                onChange={(e) => setGroupSearchTerm(e.target.value)}
              />
              <svg 
                className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Search Results - Only show when typing */}
            {groupSearchTerm && (
              <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto">
                {groupSearchLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                    <span className="ml-2 text-sm text-gray-600">Searching...</span>
                  </div>
                ) : allGroups.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {allGroups.map((group) => (
                      <div
                        key={group.id}
                        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleAddGroup(group)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-black">{group.name}</div>
                            <div className="text-sm text-gray-600">
                              {group.participants?.length || 0} participant{group.participants?.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <button
                            className="px-3 py-1 text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddGroup(group);
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No groups found. Try adjusting your search term.
                  </div>
                )}
              </div>
            )}

            {/* Selected Groups */}
            {selectedGroups.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Selected Groups ({selectedGroups.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedGroups.map((group) => (
                    <div
                      key={group.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium"
                    >
                      <span>{group.name}</span>
                      <button
                        onClick={() => handleRemoveGroup(group.id)}
                        className="hover:bg-gray-700 rounded p-0.5 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
              <span className="ml-2 text-gray-600">Loading assessors...</span>
            </div>
          ) : selectedGroups.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Groups Selected</h3>
              <p className="text-sm text-gray-600">Please search and add groups above to assign participants.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.id);
                const groupAssignment = assignments.find((g) => g.groupId === group.id);
                const stats = groupAssignment
                  ? {
                      assigned: groupAssignment.participants.length,
                      totalActivities: groupAssignment.participants.reduce(
                        (sum, p) => sum + p.activities.length,
                        0
                      ),
                    }
                  : { assigned: 0, totalActivities: 0 };

                return (
                  <div
                    key={group.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* Group Header */}
                    <div
                      className="px-5 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleGroupExpansion(group.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-gray-900 rounded-lg">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-base font-semibold text-gray-900">{group.name}</h3>
                              {stats.assigned > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {stats.assigned} assigned
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <span>{group.participants.length} participant{group.participants.length !== 1 ? 's' : ''}</span>
                              {stats.totalActivities > 0 && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span>{stats.totalActivities} activit{stats.totalActivities !== 1 ? 'ies' : 'y'}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          className={`flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 transition-all ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupExpansion(group.id);
                          }}
                        >
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Group Details */}
                    <div
                      className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="p-5">
                        <div className="space-y-4">
                          {group.participants.map((participant) => {
                            const defaultAssignment: AssignmentParticipant = {
                              participantId: participant.id,
                              activities: [],
                            };
                            const participantAssignment =
                              groupAssignment?.participants.find((p) => p.participantId === participant.id) ||
                              defaultAssignment;
                            const hasActivities = participantAssignment.activities.length > 0;
                            const allAssessorsAssigned = participantAssignment.activities.every(
                              (act) => act.assessorIds?.length > 0
                            );
                            const isParticipantExpanded = expandedParticipants.has(participant.id);

                            return (
                              <div
                                key={participant.id}
                                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                              >
                                {/* Participant Header */}
                                <div
                                  className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                  onClick={() => toggleParticipantExpansion(participant.id)}
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="p-2 bg-gray-900 rounded-lg">
                                        <UserCheck className="w-4 h-4 text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <h4 className="text-base font-semibold text-gray-900">{participant.name}</h4>
                                          {hasActivities && allAssessorsAssigned && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                                              <CheckCircle2 className="w-3 h-3" />
                                              Complete
                                            </span>
                                          )}
                                          {hasActivities && !allAssessorsAssigned && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                              <AlertCircle className="w-3 h-3" />
                                              Incomplete
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                          <span>{participant.email}</span>
                                          <span className="text-gray-400">•</span>
                                          <span>{participant.designation}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      className={`flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 transition-all flex-shrink-0 ${
                                        isParticipantExpanded ? 'rotate-180' : ''
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleParticipantExpansion(participant.id);
                                      }}
                                    >
                                      <ChevronDown className="w-4 h-4 text-gray-600" />
                                    </button>
                                  </div>
                                </div>

                                {/* Participant Content */}
                                <div
                                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                                    isParticipantExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                                  }`}
                                >
                                  <div className="px-5 pb-5 pt-0 border-t border-gray-100">
                                    {/* Select Activities */}
                                    <div className="mb-5 pt-4">
                                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                                        Select Activities
                                        {availableActivities.length > 0 && (
                                          <span className="ml-2 text-xs font-normal text-gray-500">
                                            ({availableActivities.length} available)
                                          </span>
                                        )}
                                      </label>
                                      {availableActivities.length > 0 ? (
                                        <>
                                          <div className="w-full">
                                            <Select<OptionType, true>
                                              isMulti
                                              options={availableActivities}
                                              value={availableActivities.filter((a) => {
                                                const assignedActivityIds = participantAssignment.activities.map(
                                                  (act) => act.activityId
                                                );
                                                return assignedActivityIds.includes(a.value);
                                              })}
                                              onChange={(selected: MultiValue<OptionType>) => {
                                                const selectedActivityIds = selected ? selected.map((s) => s.value) : [];
                                                const currentActivityIds = participantAssignment.activities.map(
                                                  (a) => a.activityId
                                                );

                                                const activitiesToKeep = participantAssignment.activities.filter((a) =>
                                                  selectedActivityIds.includes(a.activityId)
                                                );

                                                const newActivityIds = selectedActivityIds.filter(
                                                  (id) => !currentActivityIds.includes(id)
                                                );

                                                const newActivities = [
                                                  ...activitiesToKeep,
                                                  ...newActivityIds.map((id) => ({ activityId: id, assessorIds: [] })),
                                                ];

                                                setAssignments((prev) => {
                                                  const groupIdx = prev.findIndex((g) => g.groupId === group.id);
                                                  const newAssignments = [...prev];

                                                  if (groupIdx === -1) {
                                                    newAssignments.push({
                                                      groupId: group.id,
                                                      participants: [
                                                        {
                                                          participantId: participant.id,
                                                          activities: newActivities,
                                                        },
                                                      ],
                                                    });
                                                  } else {
                                                    const participantIdx = newAssignments[groupIdx].participants.findIndex(
                                                      (p) => p.participantId === participant.id
                                                    );
                                                    if (participantIdx === -1) {
                                                      newAssignments[groupIdx].participants.push({
                                                        participantId: participant.id,
                                                        activities: newActivities,
                                                      });
                                                    } else {
                                                      newAssignments[groupIdx].participants[participantIdx] = {
                                                        participantId: participant.id,
                                                        activities: newActivities,
                                                      };
                                                    }
                                                  }
                                                  return newAssignments;
                                                });
                                              }}
                                              styles={{
                                                ...customStyles,
                                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                                menu: (base) => ({ ...base, zIndex: 9999 }),
                                              }}
                                              placeholder="Choose activities for this participant..."
                                              closeMenuOnSelect={false}
                                              classNamePrefix="react-select"
                                              isSearchable={true}
                                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                              menuPosition="fixed"
                                              menuShouldBlockScroll={true}
                                            />
                                          </div>
                                          {participantAssignment.activities.length > 0 && (
                                            <div className="mt-2">
                                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-gray-900 text-white">
                                                <CheckCircle2 className="w-3 h-3" />
                                                {participantAssignment.activities.length} activit{participantAssignment.activities.length !== 1 ? 'ies' : 'y'} selected
                                              </span>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                                          <p className="font-medium">No activities available</p>
                                          <p>This assessment center has no activities configured. Please add activities first.</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Assign Assessors */}
                                    {hasActivities && (
                                      <div>
                                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                                          Assign Assessors for Each Activity
                                        </label>
                                        <div className="space-y-3">
                                          {participantAssignment.activities.map((activityAssignment) => {
                                            // Find the activity by matching activityId with activityContent
                                            const activity = availableActivities.find(
                                              (a) => a.value === activityAssignment.activityId
                                            );
                                            if (!activity) {
                                              console.warn('Activity not found:', {
                                                activityAssignmentId: activityAssignment.activityId,
                                                availableValues: availableActivities.map(a => ({ value: a.value, label: a.label }))
                                              });
                                              return null;
                                            }

                                            const selectedAssessorIds = activityAssignment.assessorIds || [];
                                            const hasAssessors = selectedAssessorIds.length > 0;

                                            return (
                                              <div
                                                key={activityAssignment.activityId}
                                                className={`bg-gray-50 rounded-lg p-4 border transition-all ${
                                                  hasAssessors
                                                    ? 'border-gray-900 bg-white'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                              >
                                                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                                  <div className="flex-shrink-0 lg:w-64">
                                                    <div className="flex items-start gap-3">
                                                      <div
                                                        className={`p-2 rounded-lg ${
                                                          hasAssessors ? 'bg-gray-900' : 'bg-gray-200'
                                                        }`}
                                                      >
                                                        <Activity
                                                          className={`w-4 h-4 ${hasAssessors ? 'text-white' : 'text-gray-600'}`}
                                                        />
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                        <label className="block text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                                                          {activity.label}
                                                        </label>
                                                        <p className="text-xs text-gray-500">Select assessors</p>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div className="flex-1 min-w-0">
                                                    <Select<OptionType, true>
                                                      isMulti
                                                      options={assessorOptions}
                                                      value={assessorOptions.filter((a) =>
                                                        selectedAssessorIds.includes(a.value)
                                                      )}
                                                      onChange={(selected: MultiValue<OptionType>) => {
                                                        const assessorIds = selected ? selected.map((s) => s.value) : [];
                                                        handleActivityAssessorsChange(
                                                          group.id,
                                                          participant.id,
                                                          activityAssignment.activityId,
                                                          assessorIds
                                                        );
                                                      }}
                                                      styles={{
                                                        ...customStyles,
                                                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                                        menu: (base) => ({ ...base, zIndex: 9999 }),
                                                      }}
                                                      placeholder="Select multiple assessors..."
                                                      closeMenuOnSelect={false}
                                                      classNamePrefix="react-select"
                                                      isSearchable={true}
                                                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                                                      menuPosition="fixed"
                                                      menuShouldBlockScroll={true}
                                                    />
                                                    {hasAssessors && (
                                                      <div className="mt-2">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-gray-900 text-white">
                                                          <UserCheck className="w-3 h-3" />
                                                          {selectedAssessorIds.length} assessor{selectedAssessorIds.length !== 1 ? 's' : ''} assigned
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {availableActivities.length === 0 && (
                                      <div className="text-center py-6 bg-amber-50 rounded-lg border border-amber-200">
                                        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                        <p className="text-sm font-semibold text-amber-800 mb-1">No Activities Available</p>
                                        <p className="text-xs text-amber-700">
                                          Please add activities to this assessment center first.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Assignments'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignParticipantsModal;
