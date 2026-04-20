'use client'

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, loading } = useAuth();

  const isLoginPage = pathname === '/participant/login';

  // Auth guard: redirect to login if not authenticated (except on login page)
  useEffect(() => {
    if (loading) return;
    if (!isLoginPage && !token) {
      router.replace('/participant/login');
    }
  }, [token, loading, isLoginPage, router]);

  // Don't render protected content while checking auth or when redirecting
  if (!isLoginPage && (!loading && !token)) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-[#F7F9FC]">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Page Content */}
        <main className="flex-1 bg-[#F7F9FC] min-h-[calc(100vh-80px)]">
          {children}
        </main>
      </div>
    </div>
  );
}