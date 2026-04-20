import React, { useEffect, useState } from 'react';
import { useAssessmentForm } from '../create/context';
import { useAuth } from '../../../../../../context/AuthContext';
import Select, { StylesConfig, GroupBase, MultiValue } from 'react-select';
import { Users, UserCheck, Activity, ChevronDown, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

import { API_BASE_URL_WITH_API } from '../../../../../../lib/apiConfig';

const GROUPS_API = `${API_BASE_URL_WITH_API}/groups?page=1&limit=10&search=`;
const ASSESSORS_API = `${API_BASE_URL_WITH_API}/assessors?page=1&limit=10&search=`;

// Define types
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

// Updated interfaces to support multiple assessors per activity
interface ActivityAssignment {
  activityId: string;
  assessorIds: string[]; // Multiple assessors per activity
}

interface AssignmentParticipant {
  participantId: string;
  activities: ActivityAssignment[]; // Array of activity assignments
}

interface GroupAssignment {
  groupId: string;
  participants: AssignmentParticipant[];
}

// Define interface for activity from formData
interface FormActivity {
  activityType?: string;
  activityContent?: string;
  id?: string;
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

const ParticipantAssessorManagementStep: React.FC = () => {
  const context = useAssessmentForm();
  const { token } = useAuth();
  
  if (!context) {
    throw new Error('ParticipantAssessorManagementStep must be used within AssessmentFormContext');
  }
  const { formData, updateFormData } = context;
  const [allGroups, setAllGroups] = useState<Group[]>([]); // All available groups from search
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]); // Groups selected for assignment
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  
  // Convert old format to new format if needed
  const convertToNewFormat = (oldAssignments: Array<Record<string, unknown>>): GroupAssignment[] => {
    return oldAssignments.map((assignment) => {
      const participants = (assignment.participants as Array<Record<string, unknown>>).map((p) => {
        // Check if it's old format (has activityIds and assessorId)
        if (p.activityIds && Array.isArray(p.activityIds) && p.assessorId) {
          // Convert old format to new format
          const activities: ActivityAssignment[] = (p.activityIds as string[]).map((activityId: string) => ({
            activityId,
            assessorIds: p.assessorId ? [p.assessorId as string] : []
          }));
          return {
            participantId: p.participantId as string,
            activities
          };
        }
        // Already in new format or empty
        return {
          participantId: p.participantId as string,
          activities: (p.activities as ActivityAssignment[]) || []
        };
      });
      return {
        groupId: assignment.groupId as string,
        participants
      };
    });
  };
  
  const [assignments, setAssignments] = useState<GroupAssignment[]>(() => {
    const rawAssignments = (formData.assignments as unknown as Array<Record<string, unknown>>) || [];
    return convertToNewFormat(rawAssignments);
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set());

  // Fetch assessors on mount
  useEffect(() => {
    const fetchAssessors = async () => {
      if (!token) {
        setError('Authentication token not available');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const assessorsRes = await fetch(ASSESSORS_API, { headers: { Authorization: `Bearer ${token}` } });
        const assessorsData = await assessorsRes.json();
        setAssessors(assessorsData?.data?.assessors || []);
      } catch {
        setError('Failed to fetch assessors');
      } finally {
        setLoading(false);
      }
    };
    fetchAssessors();
  }, [token]);

  // Initialize selected groups from existing assignments
  useEffect(() => {
    if (assignments.length > 0 && token && selectedGroups.length === 0) {
      const initializeSelectedGroups = async () => {
        try {
          const groupIds = assignments.map(a => a.groupId);
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
      initializeSelectedGroups();
    }
  }, [assignments, token]);

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

  useEffect(() => {
    updateFormData('assignments', assignments);
    try {
      console.log('[Assessment Center][ParticipantAssessorManagement] assignments updated:', assignments);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments]);

  // Log when step is saved/next is clicked
  useEffect(() => {
    const handleStepSave = () => {
      try {
        console.log('=== PARTICIPANT ASSESSOR MANAGEMENT STEP SAVED ===');
        console.log('Current assignments:', assignments);
        console.log('Selected groups count:', selectedGroups.length);
        console.log('Assessors count:', assessors.length);
        console.log('Step validation:', {
          hasAssignments: assignments.length > 0,
          hasGroups: selectedGroups.length > 0,
          hasAssessors: assessors.length > 0,
          totalAssignments: assignments.reduce((sum, g) => sum + g.participants.length, 0)
        });
      } catch {}
    };

    // Listen for step save events
    window.addEventListener('step-save', handleStepSave);
    return () => window.removeEventListener('step-save', handleStepSave);
  }, [assignments, selectedGroups, assessors]);

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
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
    setExpandedParticipants(prev => {
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
    setAssignments(prev => {
      const groupIdx = prev.findIndex((g) => g.groupId === groupId);
      const newAssignments = [...prev];
      
      if (groupIdx === -1) {
        // Create new group assignment
        const newParticipant: AssignmentParticipant = {
          participantId,
          activities: [{ activityId, assessorIds }],
        };
        newAssignments.push({ 
          groupId, 
          participants: [newParticipant] 
        });
      } else {
        const participantIdx = newAssignments[groupIdx].participants.findIndex((p) => p.participantId === participantId);
        if (participantIdx === -1) {
          // Add new participant to existing group
          const newParticipant: AssignmentParticipant = {
            participantId,
            activities: [{ activityId, assessorIds }],
          };
          newAssignments[groupIdx].participants.push(newParticipant);
        } else {
          // Update existing participant
          const updatedParticipant = { ...newAssignments[groupIdx].participants[participantIdx] };
          const activityIdx = updatedParticipant.activities.findIndex((a) => a.activityId === activityId);
          
          if (activityIdx === -1) {
            // Add new activity assignment
            updatedParticipant.activities.push({ activityId, assessorIds });
          } else {
            // Update existing activity assignment
            updatedParticipant.activities[activityIdx] = { activityId, assessorIds };
          }
          newAssignments[groupIdx].participants[participantIdx] = updatedParticipant;
        }
      }
      return newAssignments;
    });
  };

  // Get available activities from formData
  const getAvailableActivities = (): OptionType[] => {
    const formActivities = formData.activities || [];
    return formActivities.map((activity: FormActivity) => {
      const activityTypeLabel = activity.activityType === 'case-study' ? 'Case Study' : 
                               activity.activityType === 'inbox-activity' ? 'Inbox Activity' : 
                               activity.activityType || 'Unknown';
      const displayName = activity.displayName || activity.name || 'Unnamed Activity';
      
      return {
        value: activity.activityContent || activity.id || '',
        label: `${displayName} (${activityTypeLabel})`,
      };
    });
  };

  const availableActivities = getAvailableActivities();
  const assessorOptions: OptionType[] = assessors.map((ass) => ({
    value: ass.id,
    label: `${ass.name} (${ass.email})`,
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading groups and assessors...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="text-red-400">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const getGroupStats = (groupId: string) => {
    const groupAssignment = assignments.find((g) => g.groupId === groupId);
    if (!groupAssignment) return { assigned: 0, totalActivities: 0, totalAssessors: 0 };
    
    const totalActivities = groupAssignment.participants.reduce((sum, p) => sum + p.activities.length, 0);
    const totalAssessors = groupAssignment.participants.reduce((sum, p) => 
      sum + p.activities.reduce((actSum, act) => actSum + (act.assessorIds?.length || 0), 0), 0
    );
    
    return {
      assigned: groupAssignment.participants.length,
      totalActivities,
      totalAssessors
    };
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Participant and Assessor Management</h2>
        <p className="text-gray-600 text-sm">Assign activities and multiple assessors to each participant</p>
      </div>

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

      {/* Statistics Bar */}
      {selectedGroups.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Selected Groups</p>
                <p className="text-2xl font-bold text-gray-900">{selectedGroups.length}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Participants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedGroups.reduce((sum, g) => sum + (g.participants?.length || 0), 0)}
                </p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Available Assessors</p>
                <p className="text-2xl font-bold text-gray-900">{assessors.length}</p>
              </div>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Activity className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups List */}
      {selectedGroups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Groups Selected</h3>
          <p className="text-sm text-gray-600">Please search and add groups above to assign participants.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {selectedGroups.map(group => {
          const isExpanded = expandedGroups.has(group.id);
          const stats = getGroupStats(group.id);
          const groupAssignment = assignments.find((g) => g.groupId === group.id);
          const hasAssignments = stats.assigned > 0;
          
          return (
            <div 
              key={group.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              {/* Group Header - Clickable */}
              <div 
                className="px-5 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer transition-colors duration-200 hover:bg-gray-100"
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
                        {hasAssignments && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                            <CheckCircle2 className="w-3 h-3" />
                            {stats.assigned} assigned
                        </span>
                        )}
                        {!hasAssignments && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <AlertCircle className="w-3 h-3" />
                            Not configured
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>{group.participants.length} participant{group.participants.length !== 1 ? 's' : ''}</span>
                        {hasAssignments && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span>{stats.totalActivities} activit{stats.totalActivities !== 1 ? 'ies' : 'y'}</span>
                            <span className="text-gray-400">•</span>
                            <span>{stats.totalAssessors} assessor{stats.totalAssessors !== 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                    <button
                    className={`flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 transition-all duration-200 hover:bg-gray-50 ${
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

              {/* Group Details - Expandable */}
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
                {/* Admin Info */}
                <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Admin:</span>
                    <span>{group.admin}</span>
                    <span className="text-gray-400">•</span>
                    <span>{group.adminEmail}</span>
                  </div>
                </div>
                
                {/* Participants List */}
                <div className="p-5">
                  <div className="space-y-4">
                      {group.participants.map((participant) => {
                        const defaultAssignment: AssignmentParticipant = { 
                          participantId: participant.id,
                        activities: []
                        };
                        const participantAssignment = groupAssignment?.participants.find((p) => p.participantId === participant.id) || defaultAssignment;
                      const hasActivities = participantAssignment.activities.length > 0;
                      const allAssessorsAssigned = participantAssignment.activities.every(act => act.assessorIds?.length > 0);
                      const isParticipantExpanded = expandedParticipants.has(participant.id);
                        
                        return (
                        <div 
                          key={participant.id} 
                          className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                        >
                          {/* Participant Header - Clickable */}
                          <div 
                            className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
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
                                className={`flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 transition-all duration-200 hover:bg-gray-50 flex-shrink-0 ${
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

                          {/* Participant Content - Expandable */}
                          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                            isParticipantExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}>
                            <div className="px-5 pb-5 pt-0 border-t border-gray-100">

                              {/* Step 1: Select Activities */}
                              <div className="mb-5 pt-4">
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                  Select Activities for this Participant
                                </label>
                            <div className="w-full">
                                <Select<OptionType, true>
                                  isMulti
                                  options={availableActivities}
                                  value={availableActivities.filter((a) => {
                                  const assignedActivityIds = participantAssignment.activities.map(act => act.activityId);
                                  return assignedActivityIds.includes(a.value);
                                  })}
                                  onChange={(selected: MultiValue<OptionType>) => {
                                  const selectedActivityIds = selected ? selected.map((s) => s.value) : [];
                                  const currentActivityIds = participantAssignment.activities.map(a => a.activityId);
                                  
                                  const activitiesToKeep = participantAssignment.activities.filter(a => 
                                    selectedActivityIds.includes(a.activityId)
                                  );
                                  
                                  const newActivityIds = selectedActivityIds.filter(id => 
                                    !currentActivityIds.includes(id)
                                  );
                                  
                                  const newActivities = [
                                    ...activitiesToKeep,
                                    ...newActivityIds.map(id => ({ activityId: id, assessorIds: [] }))
                                  ];
                                  
                                  setAssignments(prev => {
                                    const groupIdx = prev.findIndex((g) => g.groupId === group.id);
                                    const newAssignments = [...prev];
                                    
                                    if (groupIdx === -1) {
                                      newAssignments.push({
                                        groupId: group.id,
                                        participants: [{
                                          participantId: participant.id,
                                          activities: newActivities
                                        }]
                                      });
                                    } else {
                                      const participantIdx = newAssignments[groupIdx].participants.findIndex(
                                        (p) => p.participantId === participant.id
                                      );
                                      if (participantIdx === -1) {
                                        newAssignments[groupIdx].participants.push({
                                          participantId: participant.id,
                                          activities: newActivities
                                        });
                                      } else {
                                        newAssignments[groupIdx].participants[participantIdx] = {
                                          participantId: participant.id,
                                          activities: newActivities
                                        };
                                      }
                                    }
                                    return newAssignments;
                                  });
                                  }}
                                  styles={customStyles}
                                placeholder="Choose activities for this participant..."
                                  closeMenuOnSelect={false}
                                  classNamePrefix="react-select"
                                  isSearchable={true}
                                  menuPortalTarget={document.body}
                                  menuPosition="fixed"
                                />
                              {hasActivities && (
                                <div className="mt-2">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-gray-900 text-white">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {participantAssignment.activities.length} activit{participantAssignment.activities.length !== 1 ? 'ies' : 'y'} selected
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                              {/* Step 2: Assign Assessors for Each Activity */}
                              {hasActivities && (
                                <div>
                                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                                    Assign Assessors for Each Activity
                                  </label>
                              <div className="space-y-3">
                                {participantAssignment.activities.map((activityAssignment) => {
                                  const activity = availableActivities.find(a => a.value === activityAssignment.activityId);
                                  if (!activity) return null;
                                  
                                  const selectedAssessorIds = activityAssignment.assessorIds || [];
                                  const hasAssessors = selectedAssessorIds.length > 0;
                                  
                                  return (
                                    <div 
                                      key={activityAssignment.activityId} 
                                      className={`bg-gray-50 rounded-lg p-4 border transition-all duration-200 ${
                                        hasAssessors 
                                          ? 'border-gray-900 bg-white' 
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                        {/* Activity Info */}
                                        <div className="flex-shrink-0 lg:w-64">
                                          <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${hasAssessors ? 'bg-gray-900' : 'bg-gray-200'}`}>
                                              <Activity className={`w-4 h-4 ${hasAssessors ? 'text-white' : 'text-gray-600'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <label className="block text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                                                {activity.label}
                                              </label>
                                              <p className="text-xs text-gray-500">Select assessors</p>
                                            </div>
                                          </div>
                              </div>
                                        
                                        {/* Assessors Multi-Select */}
                                        <div className="flex-1 min-w-0">
                                          <Select<OptionType, true>
                                            isMulti
                                  options={assessorOptions}
                                            value={assessorOptions.filter((a) => selectedAssessorIds.includes(a.value))}
                                            onChange={(selected: MultiValue<OptionType>) => {
                                              const assessorIds = selected ? selected.map((s) => s.value) : [];
                                              handleActivityAssessorsChange(
                                                group.id,
                                                participant.id,
                                                activityAssignment.activityId,
                                                assessorIds
                                              );
                                            }}
                                            styles={customStyles}
                                            placeholder="Select multiple assessors..."
                                            closeMenuOnSelect={false}
                                  classNamePrefix="react-select"
                                  isSearchable={true}
                                  menuPortalTarget={document.body}
                                  menuPosition="fixed"
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
                          
                              {/* Empty States */}
                              {!hasActivities && availableActivities.length > 0 && (
                                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                  <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm font-medium text-gray-600 mb-1">No activities selected</p>
                                  <p className="text-xs text-gray-500">Select activities above to assign assessors</p>
                                </div>
                              )}
                              
                              {availableActivities.length === 0 && (
                                <div className="text-center py-6 bg-amber-50 rounded-lg border border-amber-200">
                                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                  <p className="text-sm font-semibold text-amber-800 mb-1">No Activities Available</p>
                                  <p className="text-xs text-amber-700">Please add activities in previous steps before assigning assessors.</p>
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
  );
};

export default ParticipantAssessorManagementStep;