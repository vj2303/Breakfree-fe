'use client';

import Link from 'next/link';
import {
  BarChart3,
  FileText,
  Gauge,
  Home,
  LifeBuoy,
  Settings,
  ClipboardList,
  Users,
  UserCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
}

/**
 * Mirrors the mockup's eight-item rail. Items without an `href` have no destination in the app
 * yet (Benchmarks and Settings do not exist); they render as inert so the nav matches the design
 * without pretending to navigate somewhere.
 */
const NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: Home, href: '/dashboard/report-generation/home' },
  { label: 'Content', icon: FileText, href: '/dashboard/report-generation/content' },
  { label: 'Participants', icon: Users, href: '/dashboard/report-generation/people' },
  {
    label: 'Assessments',
    icon: ClipboardList,
    href: '/dashboard/report-generation/content/assessment-center',
  },
  { label: 'Reports', icon: BarChart3, href: '/dashboard/insights' },
  { label: 'Benchmarks', icon: Gauge },
  { label: 'People', icon: UserCircle2, href: '/dashboard/report-generation/people' },
  { label: 'Settings', icon: Settings },
];

const ACTIVE_LABEL = 'Reports';

export default function InsightsSidebar() {
  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-[10px] font-semibold text-gray-700">
          BF
        </span>
        <span className="text-sm font-semibold text-gray-900">Breakfree Consulting</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const isActive = label === ACTIVE_LABEL;
          const className = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
            isActive
              ? 'bg-gray-100 font-medium text-gray-900'
              : href
                ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                : 'cursor-default text-gray-400'
          }`;

          const inner = (
            <>
              <Icon size={18} className="flex-shrink-0" />
              {label}
            </>
          );

          return href ? (
            <Link key={label} href={href} className={className}>
              {inner}
            </Link>
          ) : (
            <span key={label} className={className} aria-disabled="true">
              {inner}
            </span>
          );
        })}
      </nav>

      <div className="px-5 py-5 text-xs text-gray-500">
        <p className="flex items-center gap-1.5">
          <LifeBuoy size={14} />
          Need help?
        </p>
        <p className="mt-1 text-gray-400">Contact Support</p>
      </div>
    </aside>
  );
}
