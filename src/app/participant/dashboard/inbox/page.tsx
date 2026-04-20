'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { AssignmentSubmissionApi } from '@/lib/assignmentSubmissionApi';
import { InboxActivityData } from './types';
import OverviewStep from './OverviewStep';
import ScenarioStep from './ScenarioStep';
import OrganizationChartStep from './OrganizationChartStep';
import TaskStep from './TaskStep';
import GmailInbox from './GmailInbox';
import Timer from '@/components/Timer';

const steps = [
  'Overview and Instructions',
  'Scenario Description',
  'Organization Chart',
  'Task',
];

const InboxPageWithSearchParams = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, assignments, fetchAssignments } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [assignmentData, setAssignmentData] = useState<unknown>(null);
  const [activityData, setActivityData] = useState<InboxActivityData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [submissionData, setSubmissionData] = useState<{
    textContent?: string;
    notes?: string;
    file?: File;
    submissionType: 'TEXT' | 'DOCUMENT' | 'VIDEO';
  }>({
    submissionType: 'TEXT'
  });
  const [submitting, setSubmitting] = useState(false);
  const [allActivities, setAllActivities] = useState<Array<{
    activityId: string;
    activityType: string;
    displayOrder: number;
    competency?: { competencyName: string };
    activityDetail?: { name: string };
    isSubmitted: boolean;
  }>>([]);

  const assignmentId = searchParams.get('assignmentId');
  const activityId = searchParams.get('activityId');
  
  // Calculate total time from scenarios (readTime + exerciseTime)
  const calculateTotalTime = (): number => {
    if (!activityData?.activityDetail?.scenarios || activityData.activityDetail.scenarios.length === 0) {
      return 0;
    }
    // Sum up all readTime and exerciseTime from all scenarios
    return activityData.activityDetail.scenarios.reduce((total, scenario) => {
      return total + (scenario.readTime || 0) + (scenario.exerciseTime || 0);
    }, 0);
  };
  
  const totalTimeMinutes = calculateTotalTime();

  useEffect(() => {
    if (assignmentId && assignments?.assignments) {
      const assignment = assignments.assignments.find(
        (a: unknown) => (a as { assignmentId: string }).assignmentId === assignmentId
      );
      
      if (assignment) {
        setAssignmentData(assignment);
        const activitiesList = (assignment as unknown as { activities: unknown[] }).activities || [];
        setAllActivities(activitiesList as Array<{
          activityId: string;
          activityType: string;
          displayOrder: number;
          competency?: { competencyName: string };
          activityDetail?: { name: string };
          isSubmitted: boolean;
        }>);
        
        // If activityId is provided, find that specific activity
        if (activityId) {
          const selectedActivity = activitiesList.find(
            (activity: unknown) => (activity as { activityId: string }).activityId === activityId
          ) as InboxActivityData | undefined;
          if (selectedActivity && selectedActivity.activityType === 'INBOX_ACTIVITY') {
            setActivityData(selectedActivity);
          }
        } else {
          // Otherwise, find the first INBOX_ACTIVITY activity
          const inboxActivity = activitiesList.find(
            (activity: unknown) => (activity as { activityType: string }).activityType === 'INBOX_ACTIVITY'
          ) as InboxActivityData | undefined;
          if (inboxActivity) {
            setActivityData(inboxActivity);
          }
        }
        setLoading(false);
      } else {
        setLoading(false);
        router.push('/participant/dashboard');
      }
    } else {
      setLoading(false);
      router.push('/participant/dashboard');
    }
  }, [assignmentId, activityId, assignments, router]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSaveDraft = async () => {
    if (!token || !assignmentData || !activityData) {
      alert('Missing required data for saving draft');
      return;
    }

    try {
      const submissionPayload = {
        participantId: assignments?.participant?.id || '',
        assessmentCenterId: (assignmentData as { assessmentCenter: { id: string } }).assessmentCenter.id,
        activityId: activityData.activityId,
        activityType: 'INBOX_ACTIVITY' as const,
        submissionType: submissionData.submissionType || 'TEXT',
        notes: submissionData.notes,
        textContent: submissionData.textContent,
        file: submissionData.file,
        isDraft: true,
      };

      const response = await AssignmentSubmissionApi.submitAssignment(token, submissionPayload);
      
      if (response.success) {
        alert('Draft saved successfully!');
        // Refresh assignments to get updated submission status
        if (fetchAssignments) {
          await fetchAssignments();
        }
      } else {
        alert(`Failed to save draft: ${response.message}`);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('An error occurred while saving the draft');
    }
  };

  const handleSubmit = async () => {
    if (!token || !assignmentData || !activityData) {
      alert('Missing required data for submission');
      return;
    }

    // For inbox activity, we check if there are any submissions made
    // The actual email submissions are handled within GmailInbox
    // This button marks the activity as complete
    const confirmed = window.confirm('Are you sure you want to submit this assignment? Make sure you have sent all required emails.');
    
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      // Check if activity is already submitted
      if (activityData.isSubmitted) {
        alert('This assignment has already been submitted.');
        setSubmitting(false);
        return;
      }

      // For inbox activity, we can submit with a final confirmation
      // The actual content is already submitted through individual emails
      const submissionPayload = {
        participantId: assignments?.participant?.id || '',
        assessmentCenterId: (assignmentData as { assessmentCenter: { id: string } }).assessmentCenter.id,
        activityId: activityData.activityId,
        activityType: 'INBOX_ACTIVITY' as const,
        submissionType: 'TEXT' as const,
        textContent: 'Assignment completed via inbox activity',
        notes: 'Final submission confirmation',
        isDraft: false,
      };

      const response = await AssignmentSubmissionApi.submitAssignment(token, submissionPayload);
      
      if (response.success) {
        if (fetchAssignments) await fetchAssignments();
        alert('Assignment submitted successfully!');
        router.push('/participant/dashboard');
      } else {
        alert(`Failed to submit assignment: ${response.message}`);
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('An error occurred while submitting the assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const stepContent = [
    <OverviewStep key="overview" activityData={activityData} />, 
    <ScenarioStep key="scenario" activityData={activityData} />, 
    <OrganizationChartStep key="orgchart" activityData={activityData} />, 
    currentStep === 3 ? (
      <GmailInbox 
        key="gmail-inbox"
        activityData={activityData}
        assignmentData={assignmentData as { assessmentCenter: { id: string; name?: string; displayName?: string } }}
        onRefresh={fetchAssignments}
        onFinalSubmit={handleSubmit}
        isAssignmentSubmitted={activityData?.isSubmitted}
        isSubmittingAssignment={submitting}
      />
    ) : (
      <TaskStep 
        key="task" 
        activityData={activityData} 
        submissionData={submissionData} 
        setSubmissionData={setSubmissionData}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
      />
    )
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignmentData || !activityData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Assignment Not Found</h2>
        <p className="text-gray-600 mb-4">The requested assignment could not be found.</p>
        <button
          onClick={() => router.push('/participant/dashboard')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Calculate progress percentage
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;
  const isInboxStep = currentStep === 3;

  return (
    <div className="mt-4 p-3 relative">
      {/* Timer - Only show if we have time configured */}
      {totalTimeMinutes > 0 && activityData?.activityId && (
        <Timer 
          totalMinutes={totalTimeMinutes} 
          activityId={activityData.activityId}
          onTimeUp={() => {
            alert('Time is up! Please submit your work.');
          }}
        />
      )}
      
      {/* Header */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold mb-1.5 text-black">
              {(assignmentData as { assessmentCenter: { displayName?: string; name: string } }).assessmentCenter.displayName || (assignmentData as { assessmentCenter: { displayName?: string; name: string } }).assessmentCenter.name}
            </h1>
            <div className="flex items-center gap-3 text-xs text-gray-700">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Created on {new Date((assignmentData as { assessmentCenter: { createdAt: string } }).assessmentCenter.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span className="text-black font-medium">Competency:</span> <span className="text-gray-700">{activityData.competency?.competencyName || 'N/A'}</span>
              </div>
              {(() => {
                const badge = getInteractiveActivityTypeBadge(activityData.activityDetail?.interactiveActivityType);
                return badge ? (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.color}`}>
                    {badge.label}
                  </span>
                ) : null;
              })()}
              {totalTimeMinutes > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded border border-gray-300">
                  <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-800 font-medium text-xs">Total Time: {totalTimeMinutes} min</span>
                </div>
              )}
            </div>
            {((assignmentData as { assessmentCenter: { documentUrl?: string } }).assessmentCenter.documentUrl) && (
              <div className="mt-2">
                <a
                  href={(assignmentData as { assessmentCenter: { documentUrl?: string } }).assessmentCenter.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-700 underline"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-3-3v6m-7 4v5a2 2 0 002 2h10a2 2 0 002-2v-5m-5-4l-3 3-3-3" />
                  </svg>
                  <span className="font-medium text-black">View assessment document</span>
                </a>
              </div>
            )}
          </div>
        </div>
        
        {/* Activity Selector - Tab style */}
        {allActivities.length > 1 && (
          <div className="mb-3 border-b border-gray-300">
            <div className="flex gap-0 overflow-x-auto">
              {allActivities
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((activity, index) => {
                  const isActive = activity.activityId === activityData?.activityId;
                  const activityTypeLabel = activity.activityType === 'CASE_STUDY' ? 'Case Study' : 'Inbox Activity';
                  
                  return (
                    <button
                      key={activity.activityId}
                      onClick={() => {
                        if (activity.activityType === 'CASE_STUDY') {
                          router.push(`/participant/dashboard/case-study?assignmentId=${assignmentId}&activityId=${activity.activityId}`);
                        } else {
                          router.push(`/participant/dashboard/inbox?assignmentId=${assignmentId}&activityId=${activity.activityId}`);
                        }
                      }}
                      className={`relative px-4 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'text-black border-b-2 border-black bg-white'
                          : 'text-gray-600 hover:text-black hover:bg-gray-50'
                      } ${index === 0 ? 'ml-0' : ''}`}
                    >
                      {activity.activityDetail?.name || activityTypeLabel}
                      {activity.isSubmitted && (
                        <span className="ml-1.5 text-green-600">✓</span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}
        
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-700">Progress</span>
            <span className="text-xs font-semibold text-black">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gray-800 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-3 mb-2 overflow-x-auto pb-1">
          {steps.map((step, idx) => {
            const isTaskStep = idx === steps.length - 1;
            const stepCompleted = currentStep > idx || (isTaskStep && activityData?.isSubmitted);
            const isCurrentStep = currentStep === idx && !stepCompleted;
            return (
              <div key={step} className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col items-center">
                  <span className={`text-xs font-medium whitespace-nowrap ${isCurrentStep ? 'text-black font-semibold' : stepCompleted ? 'text-gray-700' : 'text-gray-500'}`}>
                    {step}
                  </span>
                  <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1.5 transition-all duration-200
                    ${isCurrentStep ? 'border-black bg-white' : 
                      stepCompleted ? 'border-gray-700 bg-gray-100' : 
                      'border-gray-300 bg-white'}`}
                  >
                    {stepCompleted ? (
                      <svg className="w-3.5 h-3.5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : isCurrentStep ? (
                      <span className="w-2 h-2 bg-black rounded-full" />
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">{idx + 1}</span>
                    )}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-8 h-0.5 transition-all duration-200 ${
                    stepCompleted ? 'bg-gray-700' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {isInboxStep ? (
        <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-[500px]">
          {stepContent[currentStep]}
        </div>
      ) : (
        <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-[400px] overflow-y-auto max-h-[calc(100vh-350px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {stepContent[currentStep]}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center gap-3 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
        <div className="text-xs text-gray-600">
          <span className="font-medium">Step {currentStep + 1} of {steps.length}</span>
        </div>
        <div className="flex gap-2">
          {currentStep > 0 && (
            <button
              className="px-4 py-2 rounded bg-gray-100 text-black text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-1.5"
              onClick={handlePrev}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
          )}
          {currentStep < steps.length - 1 ? (
            <button
              className="px-4 py-2 rounded bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              onClick={handleNext}
            >
              {currentStep === 0 ? 'Start' : 'Next'}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              className="px-4 py-2 rounded bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              onClick={handleSubmit}
              disabled={submitting || activityData?.isSubmitted}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : activityData?.isSubmitted ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Submitted
                </>
              ) : (
                <>
                  Submit
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const InboxPage = () => {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    }>
      <InboxPageWithSearchParams />
    </Suspense>
  );
};

export default InboxPage;