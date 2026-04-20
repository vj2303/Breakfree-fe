'use client';

import { Suspense } from 'react';
import CaseStudyAssessment from './CaseStudyAssessment';
import ParticipantView from './ParticipantView';
import { useSearchParams } from 'next/navigation';

function CaseStudyContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view');
  const assessmentCenterId = searchParams.get('assessmentCenterId');
  
  // Show participant view if view=participant or if assessmentCenterId is present
  const showParticipantView = view === 'participant' || assessmentCenterId !== null;
  
  if (showParticipantView) {
    return <ParticipantView />;
  }
  
  return <CaseStudyAssessment />;
}

export default function CaseStudyWrapper() {
  return (
    <Suspense fallback={<div className="p-4 text-black">Loading...</div>}>
      <CaseStudyContent />
    </Suspense>
  );
}
