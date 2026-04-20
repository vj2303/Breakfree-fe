'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

const tabs = [
  { label: 'Assessment center', path: '/dashboard/report-generation/content/assessment-center' },
  { label: 'Assessment', path: '/dashboard/report-generation/content/assessment' },
  { label: 'Report Structure', path: '/dashboard/report-generation/content/report-structure' },
  { label: 'AI profile', path: '/dashboard/report-generation/content/ai-profile' },
  { label: 'Competency Mapping', path: '/dashboard/report-generation/content/competency-mapping' },
];

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Hide Content Management layout on case-study and inbox-activity pages
  if (pathname.includes('/assessment/case-study') || pathname.includes('/assessment/inbox-activity') || pathname.includes('/assessment-center/create')  ) {
    return <>{children}</>;
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 mx-4 mt-4 mb-6 overflow-hidden">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">Content Management</h1>
          <p className="text-base text-gray-600 leading-relaxed mb-6 max-w-4xl">
            In this section you will build your assessment framework—map competencies, create activities, design rubrics, and configure reports—so your assessment center runs seamlessly from start to finish
          </p>
          <div className="flex flex-wrap gap-3 pb-2">
            {tabs.map(tab => {
              const isActive = pathname === tab.path;
              return (
                <button
                  key={tab.label}
                  onClick={() => {
                    // Set flag to prevent auto-redirect when clicking tabs
                    if (tab.path === '/dashboard/report-generation/content/assessment-center') {
                      sessionStorage.setItem('assessment-center-auto-redirect', 'false');
                    }
                    router.push(tab.path);
                  }}
                  className={`px-6 py-2.5 rounded-full border text-sm font-semibold transition-all duration-200 ${
                    isActive 
                      ? 'bg-[#425375] text-white border-transparent shadow-sm' 
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  style={{ outline: 'none' }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className='px-4 pb-8'>
        {children}
      </div>
    </div>
  );
} 