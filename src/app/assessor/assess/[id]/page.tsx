"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { FileText, Loader2, ArrowLeft, Edit } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const getInteractiveActivityTypeBadge = (type?: string) => {
  switch (type) {
    case 'GD':
      return { label: 'GD', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'ROLEPLAY':
      return { label: 'Roleplay', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'CASE_STUDY':
      return { label: 'Case Study', color: 'bg-green-50 text-green-700 border-green-200' };
    default:
      return null;
  }
};

interface AssessmentDetailProps {
  params: Promise<{ id: string }>;
}

interface GroupDetails {
  success: boolean;
  message: string;
  data: {
    assessor: {
      id: string;
      name: string;
      email: string;
      designation: string;
      accessLevel: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    };
    assignment: {
      id: string;
      assessmentCenter: {
        id: string;
        name: string;
        description: string;
        displayName: string;
        displayInstructions: string;
        competencyIds: string[];
        documentUrl?: string;
        reportTemplateName: string;
        reportTemplateType: string;
        createdBy: string;
        createdAt: string;
        updatedAt: string;
      };
      group: {
        id: string;
        name: string;
        admin: string;
        adminEmail: string;
        participantIds: string[];
        createdAt: string;
        updatedAt: string;
      };
      participants: Array<{
        participant: {
          id: string;
          name: string;
          email: string;
          designation: string;
          managerName: string;
          createdAt: string;
          updatedAt: string;
        };
        activities: Array<{
          activityId: string;
          activityType: string;
          displayOrder: number;
          competency: {
            id: string;
            competencyName: string;
            subCompetencyNames: string[];
            createdAt: string;
            updatedAt: string;
          };
          activityDetail: {
            id: string;
            name: string;
            description: string;
            interactiveActivityType?: string;
          };
          submission: unknown;
        }>;
        assessorScore: unknown;
        submissionCount: number;
        totalActivities: number;
        attemptStatus?: string;
        hasAttempted?: boolean;
      }>;
      competencies: Array<{
        id: string;
        competencyName: string;
        subCompetencyNames: string[];
        createdAt: string;
        updatedAt: string;
      }>;
    };
  };
}


const AssessmentDetail = ({ params }: AssessmentDetailProps) => {
  const { id } = React.use(params); // This is the groupId
  const router = useRouter();
  const searchParams = useSearchParams();
  const { assessorId, token } = useAuth();
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get assessmentCenterId from URL query params synchronously
  const assessmentCenterId = searchParams.get('assessmentCenterId');

  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!assessorId || !token) {
        setError('Assessor ID or token not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Include assessmentCenterId in query if available
        const url = assessmentCenterId 
          ? `/api/assessors/${assessorId}/groups/${id}?assessmentCenterId=${assessmentCenterId}`
          : `/api/assessors/${assessorId}/groups/${id}`;
        
        console.log('Fetching group details with URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (result.success) {
          setGroupDetails(result);
        } else {
          setError(result.message || 'Failed to fetch group details');
        }
      } catch (err) {
        console.error('Error fetching group details:', err);
        setError('An error occurred while fetching group details');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();
  }, [assessorId, token, id, assessmentCenterId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (error || !groupDetails || !groupDetails.data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-semibold mb-3 text-black">Error Loading Group</h1>
          <p className="text-sm text-red-600 mb-4">{error || 'Invalid group data received'}</p>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-700 hover:text-black text-sm"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const ParticipantCard = ({ participant, assessmentCenterId }: { participant: { participant: { id: string; name: string; email: string; designation: string; managerName: string; createdAt: string; updatedAt: string }; activities: { activityId: string; activityType: string; displayOrder: number; competency: { id: string; competencyName: string; subCompetencyNames: string[]; createdAt: string; updatedAt: string }; activityDetail: { id: string; name: string; description: string }; submission: unknown; allSubmissions?: unknown[] }[]; assessorScore: unknown; submissionCount: number; totalActivities: number; attemptStatus?: string; hasAttempted?: boolean }; assessmentCenterId?: string }) => {
    const allSubmissions = participant.activities.flatMap(a => {
      const subs = a.allSubmissions || [];
      return subs.length > 0 ? subs : (a.submission ? [a.submission] : []);
    });
    const totalSubmissions = allSubmissions.length;
    const progressPercentage = participant.totalActivities > 0 
      ? Math.round((participant.submissionCount / participant.totalActivities) * 100) 
      : 0;
    
    // Get score status from assessorScore
    const scoreStatus = participant.assessorScore && typeof participant.assessorScore === 'object' 
      ? (participant.assessorScore as { status?: string }).status 
      : null;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <h4 className="font-semibold text-base text-black">{participant.participant.name}</h4>
              {/* Attempt Status Badge */}
              {participant.attemptStatus && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  participant.attemptStatus === 'completed' 
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : participant.attemptStatus === 'in_progress'
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-gray-50 text-gray-700 border-gray-300'
                }`}>
                  {participant.attemptStatus === 'completed' ? 'Completed' :
                   participant.attemptStatus === 'in_progress' ? 'In Progress' :
                   'Not Attempted'}
                </span>
              )}
              {/* Score Status Badge */}
              {scoreStatus && (scoreStatus === 'SUBMITTED' || scoreStatus === 'FINALIZED') && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  scoreStatus === 'FINALIZED'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {scoreStatus === 'FINALIZED' ? 'Finalized' : 'Submitted'}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-xs mb-0.5">{participant.participant.email}</p>
            <p className="text-gray-500 text-xs">{participant.participant.designation}</p>
            {participant.participant.managerName && (
              <p className="text-gray-500 text-xs mt-1">Manager: {participant.participant.managerName}</p>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-700 font-medium">Progress</span>
            <span className="text-gray-600">
              {participant.submissionCount} of {participant.totalActivities} activities
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-gray-800 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Activity Summary */}
        <div className="mb-3 p-2.5 bg-gray-50 rounded border border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-600">Total Activities:</span>
              <span className="ml-1.5 font-semibold text-black">{participant.totalActivities}</span>
            </div>
            <div>
              <span className="text-gray-600">Submitted:</span>
              <span className="ml-1.5 font-semibold text-gray-700">{participant.submissionCount}</span>
            </div>
            {totalSubmissions > participant.submissionCount && (
              <div className="col-span-2">
                <span className="text-gray-600">Total Submissions:</span>
                <span className="ml-1.5 font-semibold text-gray-700">{totalSubmissions}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Evaluate Button */}
        {scoreStatus && (scoreStatus === 'SUBMITTED' || scoreStatus === 'FINALIZED') ? (
          <div className="flex gap-2">
            <button
              className="flex-1 flex items-center justify-center gap-2 text-xs bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-3 py-2 rounded transition-colors font-medium"
              onClick={() => {
                const url = `/assessor/assess/${id}/score/${participant.participant.id}${assessmentCenterId ? `?assessmentCenterId=${assessmentCenterId}` : ''}${scoreStatus === 'FINALIZED' || scoreStatus === 'SUBMITTED' ? '&mode=edit' : ''}`;
                router.push(url);
              }}
            >
              <Edit size={14} />
              Edit
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 text-xs bg-black hover:bg-gray-800 text-white px-3 py-2 rounded transition-colors font-medium"
              onClick={() => {
                const url = `/assessor/assess/${id}/score/${participant.participant.id}${assessmentCenterId ? `?assessmentCenterId=${assessmentCenterId}` : ''}`;
                router.push(url);
              }}
            >
              <FileText size={14} />
              View
            </button>
          </div>
        ) : (
          <button
            className="w-full flex items-center justify-center gap-2 text-xs bg-black hover:bg-gray-800 text-white px-4 py-2 rounded transition-colors font-medium"
            onClick={() => {
              const url = `/assessor/assess/${id}/score/${participant.participant.id}${assessmentCenterId ? `?assessmentCenterId=${assessmentCenterId}` : ''}`;
              router.push(url);
            }}
          >
            <FileText size={16} />
            Evaluate Assessment
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-600 hover:text-black mb-3 text-sm"
          >
            <ArrowLeft size={16} />
            Back to Groups
          </button>
          <h1 className="text-2xl font-semibold text-black mb-0">Assessment Details</h1>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Group Information */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black mb-1.5">{groupDetails.data.assignment?.group?.name || 'Unknown Group'}</h2>
            <p className="text-xs text-gray-600 mb-1">Admin: {groupDetails.data.assignment?.group?.admin || 'N/A'}</p>
            <p className="text-xs text-gray-600 mb-4">Email: {groupDetails.data.assignment?.group?.adminEmail || 'N/A'}</p>
            
            <h3 className="text-base font-semibold text-black mb-3">Assessment Details</h3>
            <p className="text-xs text-gray-700 mb-1">Assignment ID: <span className="text-black font-medium">{groupDetails.data.assignment?.id || 'N/A'}</span></p>
            <p className="text-xs text-gray-700 mb-4">Participants: <span className="text-black font-medium">{groupDetails.data.assignment?.participants?.length || 0}</span></p>
            
            <h4 className="text-base font-semibold text-black mb-2">{groupDetails.data.assignment?.assessmentCenter?.displayName || groupDetails.data.assignment?.assessmentCenter?.name || 'Assessment Center'}</h4>
            <p className="text-sm text-gray-600 mb-4">{groupDetails.data.assignment?.assessmentCenter?.description || ''}</p>
            
            {/* Assessment Instructions */}
            {groupDetails.data.assignment?.assessmentCenter?.displayInstructions && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
                <h5 className="font-medium text-black mb-1.5 text-sm">Instructions</h5>
                <div 
                  className="text-gray-700 text-xs prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: groupDetails.data.assignment.assessmentCenter.displayInstructions }}
                />
              </div>
            )}
            
            {/* Assessor Guide */}
            {groupDetails.data.assignment?.assessmentCenter?.documentUrl && (
              <div className="mb-6">
                <a 
                  href={groupDetails.data.assignment.assessmentCenter.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border border-gray-200 rounded p-3 hover:bg-gray-50 transition-colors"
                >
                  <FileText size={18} className="text-gray-600" />
                  <div className="text-left">
                    <div className="font-medium text-sm text-black">Assessor Guide</div>
                    <div className="text-xs text-gray-600">Click to view document</div>
                  </div>
                </a>
              </div>
            )}
            
            {/* Competencies */}
            {groupDetails.data.assignment?.competencies && groupDetails.data.assignment.competencies.length > 0 && (
              <div className="mb-6">
                <h5 className="font-medium text-sm text-black mb-2">Assessment Competencies</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupDetails.data.assignment.competencies.map((competency) => (
                    <div key={competency.id} className="p-3 bg-gray-50 border border-gray-200 rounded">
                      <h6 className="font-medium text-sm text-black mb-1.5">{competency.competencyName}</h6>
                      <ul className="text-xs text-gray-600 space-y-0.5">
                        {competency.subCompetencyNames.map((subComp, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1 h-1 bg-gray-600 rounded-full mr-1.5"></span>
                            {subComp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Group Members */}
          <div className="mb-6">
            <h3 className="text-base font-semibold text-black mb-4">Group Members ({groupDetails.data.assignment?.participants?.length || 0})</h3>
            
            {groupDetails.data.assignment?.participants && groupDetails.data.assignment.participants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupDetails.data.assignment.participants.map((participant) => (
                  <ParticipantCard 
                    key={participant.participant.id} 
                    participant={participant}
                    assessmentCenterId={groupDetails.data.assignment?.assessmentCenter?.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-gray-500">
                <p>No participants found in this group.</p>
              </div>
            )}
          </div>

          {/* Generate Report Button */}
          <div className="mt-6">
            <button className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
              Generate Management Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AssessmentDetailWithSearchParams = ({ params }: AssessmentDetailProps) => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AssessmentDetail params={params} />
    </Suspense>
  );
};

export default AssessmentDetailWithSearchParams;