'use client'
import React from 'react';
import { useRouter } from 'next/navigation';
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

interface AssessmentCardProps {
  assignmentId: string;
  activityId: string;
  displayName: string;
  assignedDate: string;
  submitBy: string;
  daysRemaining: number;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
  type: string;
  interactiveActivityType?: string;
  onStart?: (assignmentId: string, activityType: string, activityId: string) => void;
}

const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assignmentId,
  activityId,
  displayName,
  assignedDate,
  submitBy,
  daysRemaining,
  progress,
  status,
  type,
  interactiveActivityType,
  onStart
}) => {
  const interactiveBadge = getInteractiveActivityTypeBadge(interactiveActivityType);
  const getStatusText = () => {
    switch (status) {
      case 'not-started':
        return 'Not Started yet';
      case 'in-progress':
        return `${progress}%`;
      case 'completed':
        return 'Completed';
      default:
        return '';
    }
  };

  const getProgressBarStyle = () => {
    if (status === 'completed') {
      return { width: '100%' };
    }
    return { width: `${progress}%` };
  };

  const getActivityTypeDisplay = (activityType: string) => {
    switch (activityType) {
      case 'INBOX_ACTIVITY':
        return { name: 'Inbox Activity', color: 'bg-gray-50 text-gray-700 border-gray-300' };
      case 'CASE_STUDY':
        return { name: 'Case Study', color: 'bg-gray-50 text-gray-700 border-gray-300' };
      default:
        return { name: activityType.replace('_', ' '), color: 'bg-gray-50 text-gray-700 border-gray-300' };
    }
  };

  const activityTypeInfo = getActivityTypeDisplay(type);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="text-base font-semibold text-black">{displayName}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
              type === 'INBOX_ACTIVITY' 
                ? 'bg-gray-50 text-gray-700 border-gray-300' 
                : 'bg-gray-50 text-gray-700 border-gray-300'
            }`}>
              {activityTypeInfo.name}
            </span>
            {interactiveBadge && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${interactiveBadge.color}`}>
                {interactiveBadge.label}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600">Assigned on {assignedDate}</p>
        </div>
        {status === 'completed' ? (
          <span className="text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded text-xs font-medium">
            You have already completed
          </span>
        ) : (
          <button
            className="bg-black text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            onClick={() => onStart && onStart(assignmentId, type, activityId)}
          >
            Start
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      <div className="space-y-2.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Submit By: <span className="text-black font-medium">{submitBy}</span></span>
          <span className={`font-medium ${daysRemaining <= 3 ? 'text-red-600' : daysRemaining <= 7 ? 'text-orange-600' : 'text-gray-600'}`}>
            {daysRemaining} days remaining
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                status === 'completed'
                  ? 'bg-gray-800'
                  : status === 'in-progress'
                  ? 'bg-gray-700'
                  : 'bg-gray-300'
              }`}
              style={getProgressBarStyle()}
            />
          </div>
          <div className="text-xs text-gray-600 text-right">
            {getStatusText()}
          </div>
        </div>
      </div>
    </div>
  );
};

const AssessmentDashboard: React.FC = () => {
  const router = useRouter();
  const { user, assignments, assignmentsLoading } = useAuth();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const calculateDaysRemaining = (createdDate: string) => {
    const created = new Date(createdDate);
    const deadline = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from creation
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  const getAssessmentStatus = (completionPercentage: number): 'not-started' | 'in-progress' | 'completed' => {
    if (completionPercentage === 0) return 'not-started';
    if (completionPercentage === 100) return 'completed';
    return 'in-progress';
  };

  // One card per activity (so Case Study and Inbox Activity both show when assigned)
  const assessments: AssessmentCardProps[] = (assignments?.assignments ?? []).flatMap(assignment => {
    const createdDate = assignment.assessmentCenter.createdAt;
    const deadline = new Date(new Date(createdDate).getTime() + 30 * 24 * 60 * 60 * 1000);
    const baseDisplayName = assignment.assessmentCenter.displayName || assignment.assessmentCenter.name;

    return assignment.activities.map((activity) => {
      const activityProgress = activity.isSubmitted ? 100 : 0;
      const activityName = activity.activityDetail?.name;
      const displayName = activityName
        ? `${baseDisplayName} - ${activityName}`
        : baseDisplayName;

      return {
        assignmentId: assignment.assignmentId,
        activityId: activity.activityId,
        displayName,
        assignedDate: formatDate(createdDate),
        submitBy: formatDate(deadline.toISOString()),
        daysRemaining: calculateDaysRemaining(createdDate),
        progress: activityProgress,
        status: getAssessmentStatus(activityProgress),
        type: activity.activityType || 'CASE_STUDY',
        interactiveActivityType: activity.activityDetail?.interactiveActivityType
      };
    });
  });

  const handleStart = (assignmentId: string, activityType: string, activityId: string) => {
    if (activityType === 'CASE_STUDY') {
      router.push(`/participant/dashboard/case-study?assignmentId=${assignmentId}&activityId=${activityId}`);
    } else if (activityType === 'INBOX_ACTIVITY') {
      router.push(`/participant/dashboard/inbox?assignmentId=${assignmentId}&activityId=${activityId}`);
    } else {
      router.push('/participant/dashboard');
    }
  };

  if (assignmentsLoading) {
    return (
      <div className="w-full">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-gray-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-600">Loading your assignments...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-black mb-1.5">
            Welcome {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : assignments?.participant?.name || 'Participant'}
          </h1>
          <p className="text-sm text-gray-600">
            Complete your assigned assessments to showcase your skills and competencies.
          </p>
        </div>
        {/* Assessments Badge */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 bg-black text-white text-xs font-medium rounded">
              Assessments ({assessments.length})
            </span>
            {assessments.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-2 h-2 bg-gray-800 rounded-full"></span>
                <span>{assessments.filter(a => a.status === 'completed').length} Completed</span>
                <span className="text-gray-400">•</span>
                <span>{assessments.filter(a => a.status === 'in-progress').length} In Progress</span>
              </div>
            )}
          </div>
        </div>
        {/* Assessment Cards Grid */}
        {assessments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((assessment) => (
              <AssessmentCard
                key={`${assessment.assignmentId}-${assessment.activityId}`}
                {...assessment}
                onStart={handleStart}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              <div className="mb-3">
                <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-black mb-1.5">No Assignments Yet</h3>
              <p className="text-sm text-gray-600">
                You don&apos;t have any assignments at the moment. Check back later or contact your assessor.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentDashboard;