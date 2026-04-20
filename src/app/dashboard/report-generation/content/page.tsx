'use client'
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ContentIndexPage() {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  // Simply redirect to assessment-center page (default tab)
  // Don't check for persisted data here - let the assessment-center page handle that
  useEffect(() => {
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    router.replace('/dashboard/report-generation/content/assessment-center');
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
