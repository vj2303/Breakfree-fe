'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

const NAV_LINKS = [
  { label: 'Home', href: '/assessor/dashboard', prefix: '/assessor/dashboard' },
  { label: 'Assess', href: '/assessor/assess', prefix: '/assessor/assess' },
];

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AssessorTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, assessorGroups, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  const name =
    assessorGroups?.assessor?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.username ||
    'Assessor';

  return (
    <div className="flex items-center justify-between border-b border-[var(--ap-border)] bg-[var(--ap-bg)] px-6 py-[18px] md:px-10">
      <div className="flex items-center gap-9">
        <Link href="/assessor/dashboard" className="flex items-center gap-2.5">
          <span className="h-[11px] w-[11px] rounded-full bg-[var(--ap-navy)]" />
          <span className="text-[15px] font-bold tracking-[-0.01em] text-[var(--ap-ink)]">
            BreakFree
          </span>
        </Link>

        <nav className="flex gap-[26px]">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.prefix);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b-2 pb-1 text-[13.5px] transition-colors ${
                  isActive
                    ? 'border-[var(--ap-navy)] font-semibold text-[var(--ap-ink)]'
                    : 'border-transparent font-medium text-[var(--ap-grey)] hover:text-[var(--ap-ink)]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div ref={menuRef} className="relative flex items-center gap-3.5">
        <span className="hidden text-[13px] text-[var(--ap-grey)] sm:block">
          {name} · <b className="font-semibold text-[var(--ap-ink)]">Assessor</b>
        </span>
        <button
          type="button"
          aria-label="Account menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--ap-navy)] text-[11.5px] font-bold text-white"
        >
          {initials(name)}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-44 overflow-hidden rounded-lg border border-[var(--ap-border)] bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
                router.replace('/');
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-[var(--ap-grey)] transition-colors hover:bg-[var(--ap-grey-wash)] hover:text-[var(--ap-ink)]"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
