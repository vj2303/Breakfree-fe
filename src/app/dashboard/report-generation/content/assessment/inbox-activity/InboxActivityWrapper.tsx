'use client';

import { Suspense } from 'react';
import InboxActivityAssessment from './InboxActivityAssessment';

export default function InboxActivityWrapper() {
  return (
    <Suspense fallback={<div className="p-4 text-black">Loading...</div>}>
      <InboxActivityAssessment />
    </Suspense>
  );
}
