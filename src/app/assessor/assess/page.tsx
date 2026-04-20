"use client";

import React, { useState, useEffect } from 'react';
import { ChevronRight, Loader2, ArrowLeft, Users, ClipboardList } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface AssessmentCenter {
  assignmentId: string;
  assessmentCenterId: string;
  assessmentCenterName: string;
  assessmentCenterDescription: string;
  participantCount: number;
}

interface GroupData {
  groupId: string;
  groupName: string;
  adminName: string;
  adminEmail: string;
  assessmentCenters: AssessmentCenter[];
  totalParticipantCount: number;
}

type ViewState = 'groups' | 'assessmentCenters' | 'participants';

export default function AssessorPlatform() {
  const router = useRouter();
  const { user, assessorGroups, assessorGroupsLoading, fetchAssessorGroups } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('groups');
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [selectedAssessmentCenter, setSelectedAssessmentCenter] = useState<AssessmentCenter | null>(null);

  useEffect(() => {
    if (!assessorGroups && !assessorGroupsLoading) {
      fetchAssessorGroups();
    }
  }, [assessorGroups, assessorGroupsLoading, fetchAssessorGroups]);

  const handleGroupClick = (group: GroupData) => {
    setSelectedGroup(group);
    setViewState('assessmentCenters');
  };

  const handleAssessmentCenterClick = (assessmentCenter: AssessmentCenter) => {
    setSelectedAssessmentCenter(assessmentCenter);
    setViewState('participants');
    // Navigate to the group details page with the correct assessmentCenterId
    router.push(`/assessor/assess/${selectedGroup?.groupId}?assessmentCenterId=${assessmentCenter.assessmentCenterId}`);
  };

  const handleBack = () => {
    if (viewState === 'participants') {
      setViewState('assessmentCenters');
      setSelectedAssessmentCenter(null);
    } else if (viewState === 'assessmentCenters') {
      setViewState('groups');
      setSelectedGroup(null);
    }
  };

  if (assessorGroupsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading assessor assignments...</p>
        </div>
      </div>
    );
  }

  const groups: GroupData[] = assessorGroups?.groups || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {viewState !== 'groups' && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-gray-600 hover:text-black mb-3 text-sm"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          )}
          <h1 className="text-2xl font-semibold text-black mb-1.5">
            Welcome {assessorGroups?.assessor?.name || user?.firstName || 'Assessor'}
          </h1>
          <p className="text-sm text-gray-600 mb-0">
            {viewState === 'groups' && 'Select a group to view assessment centers and participants.'}
            {viewState === 'assessmentCenters' && `Assessment Centers in ${selectedGroup?.groupName}`}
            {viewState === 'participants' && `Participants in ${selectedGroup?.groupName} - ${selectedAssessmentCenter?.assessmentCenterName}`}
          </p>
        </div>

        {/* Groups View */}
        {viewState === 'groups' && (
          <div>
            <h2 className="text-base font-semibold text-black mb-4">Groups</h2>
            {groups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <div
                    key={group.groupId}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
                    onClick={() => handleGroupClick(group)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-black mb-1.5">{group.groupName}</h3>
                        <div className="space-y-0.5 text-xs text-gray-600">
                          <p>
                            <span className="text-gray-500">Admin:</span> <span className="text-black">{group.adminName}</span>
                          </p>
                          <p>
                            <span className="text-gray-500">Email:</span> <span className="text-gray-700">{group.adminEmail}</span>
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <ClipboardList size={14} />
                        <span>{group.assessmentCenters.length} assessment{group.assessmentCenters.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} />
                        <span>{group.totalParticipantCount} participant{group.totalParticipantCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-600">No groups assigned to you yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Assessment Centers View */}
        {viewState === 'assessmentCenters' && selectedGroup && (
          <div>
            <h2 className="text-base font-semibold text-black mb-4">
              Assessment Centers in {selectedGroup.groupName}
            </h2>
            {selectedGroup.assessmentCenters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedGroup.assessmentCenters.map((assessmentCenter) => (
                  <div
                    key={`${assessmentCenter.assessmentCenterId}-${selectedGroup.groupId}`}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
                    onClick={() => handleAssessmentCenterClick(assessmentCenter)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-black mb-1.5">
                          {assessmentCenter.assessmentCenterName}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {assessmentCenter.assessmentCenterDescription || 'No description available'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 pt-3 border-t border-gray-200">
                      <Users size={14} />
                      <span>{assessmentCenter.participantCount} participant{assessmentCenter.participantCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-600">No assessment centers found in this group.</p>
              </div>
            )}
          </div>
        )}

        {/* Participants View - This will be handled by the [id]/page.tsx route */}
        {viewState === 'participants' && (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600">Loading participants...</p>
          </div>
        )}
      </div>
    </div>
  );
}
