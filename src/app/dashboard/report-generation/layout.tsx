'use client';
import React from 'react';
import { BarChart2, FileText, Home, LogOut, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  /** Treat any path under this prefix as active. */
  prefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    icon: Home,
    href: '/dashboard/report-generation/home',
    prefix: '/dashboard/report-generation/home',
  },
  {
    label: 'Content',
    icon: FileText,
    href: '/dashboard/report-generation/content',
    prefix: '/dashboard/report-generation/content',
  },
  { label: 'Reports', icon: BarChart2, href: '/dashboard/report-generation/reports' },
  { label: 'People', icon: Users, href: '/dashboard/report-generation/people' },
];

export default function ReportGenerationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafd] text-black">
      <Navbar />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            {NAV_ITEMS.map(({ label, icon: Icon, href, prefix }) => {
              const isActive = prefix ? pathname.startsWith(prefix) : pathname === href;
              return (
                <Link
                  key={label}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-[#e6effa] font-semibold text-black'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 px-3 py-4">
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
            >
              <LogOut size={18} className="flex-shrink-0" />
              Log Out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
