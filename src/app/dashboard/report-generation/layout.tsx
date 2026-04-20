'use client';
import React from 'react';
import { Home, FileText, BarChart2, Users, LogOut } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ReportGenerationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  // Sidebar items
  const navItems = [
    { label: 'Home', icon: <Home size={24} />, href: '/dashboard/report-generation/home' },
    { label: 'Content', icon: <FileText size={24} />, href: '/dashboard/report-generation/content' },
    { label: 'Reports', icon: <BarChart2 size={24} />, href: '/dashboard/report-generation/reports' },
    { label: 'People', icon: <Users size={24} />, href: '/dashboard/report-generation/people' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafd', display: 'flex', flexDirection: 'column', color: '#000' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <aside style={{ width: 80, background: '#fff', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24, paddingBottom: 24, gap: 16, color: '#000' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 32, flex: 1, color: '#000' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.label === 'Content' && pathname.startsWith('/dashboard/report-generation/content'));
              return (
                <Link href={item.href} key={item.label} style={{ textDecoration: 'none', width: '100%' }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8, borderRadius: 12, background: isActive ? '#e6effa' : 'transparent', color: '#000', fontWeight: isActive ? 600 : 400, transition: 'background 0.2s', cursor: 'pointer',
                  }}>
                    {item.icon}
                    <span style={{ fontSize: 12, marginTop: 4, color: '#000' }}>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
          <div style={{ marginTop: 'auto' }}>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8, borderRadius: 12, color: '#000', fontWeight: 400, cursor: 'pointer', background: 'none', border: 'none' }}
            >
              <LogOut size={24} />
              <span style={{ fontSize: 12, marginTop: 4, color: '#000' }}>Log Out</span>
            </button>
          </div>
        </aside>
        <main style={{ flex: 1, padding: 0, minHeight: '100vh', color: '#000' }}>{children}</main>
      </div>
    </div>
  );
}
