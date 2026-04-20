'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
  FileText,
  LogOut,
  User
} from 'lucide-react';

const sidebarLinks = [
  { label: 'Assessment', icon: FileText, href: '/participant/dashboard' },
  { label: 'Profile', icon: User, href: '/participant/dashboard/profile' },
];

export default function ParticipantDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, assignments } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  // Use real user data from AuthContext and participant data from assignments
  const displayUser = {
    name: assignments?.participant?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "Participant"),
    email: assignments?.participant?.email || user?.email || 'participant@example.com',
    avatar: '/logo.png',
  };

  return (
    <div className="min-h-screen flex bg-gray-50 m-0 p-0">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col justify-between min-h-screen m-0 p-0 shadow-sm">
        <div className="pt-6">
          <div className="mb-8 flex items-center justify-center px-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Breakfree Consulting" width={48} height={48} className="rounded" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-black leading-tight">BREAKFREE</span>
                <span className="text-[10px] text-gray-600 leading-tight">CONSULTING</span>
              </div>
            </div>
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {sidebarLinks.map(link => {
              const Icon = link.icon;
              const isActive = pathname === link.href || 
                (link.href === '/participant/dashboard' && pathname?.startsWith('/participant/dashboard') && pathname !== '/participant/dashboard/profile') ||
                (link.href === '/participant/dashboard/profile' && pathname === '/participant/dashboard/profile');
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gray-100 text-black border-l-2 border-black' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-600'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mb-6 px-3 border-t border-gray-200 pt-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2.5 rounded text-sm text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen m-0 p-0">
        {/* Navbar */}
        <header className="w-full flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 m-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-gray-600">Dashboard</h2>
          </div>
          <button
            onClick={() => router.push('/participant/dashboard/profile')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="text-right">
              <div className="font-medium text-sm text-black">{displayUser.name}</div>
              <div className="text-xs text-gray-500">{displayUser.email}</div>
            </div>
            <div className="relative">
              <Image
                src={displayUser.avatar}
                alt={displayUser.name}
                width={36}
                height={36}
                className="rounded-full object-cover border-2 border-gray-200"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
          </button>
        </header>
        {/* Page Content */}
        <main className="flex-1 p-6 bg-gray-50 min-h-[calc(100vh-64px)] m-0">
          {children}
        </main>
      </div>
    </div>
  );
}