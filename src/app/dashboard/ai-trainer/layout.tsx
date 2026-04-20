'use client'

import React, { useState, useEffect } from 'react'
import AITrainerSidebar from '@/components/AITrainerSidebar'
import Navbar from '@/components/Navbar'
import { usePathname } from 'next/navigation'

export default function AITrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [activePage, setActivePage] = useState('')

  useEffect(() => {
    // Set active page based on current path
    if (pathname.includes('/create')) {
      setActivePage('create')
    } else if (pathname.includes('/evaluate')) {
      setActivePage('evaluate')
    } else {
      setActivePage('home')
    }
  }, [pathname])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafd', display: 'flex', flexDirection: 'column', color: '#000' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <aside style={{ width: 80, background: '#fff', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24, paddingBottom: 24, gap: 16, color: '#000' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 32, flex: 1, color: '#000' }}>
            <AITrainerSidebar
              activePage={activePage}
              onPageChange={setActivePage}
            />
          </nav>
        </aside>
        <main style={{ flex: 1, padding: 0, minHeight: '100vh', color: '#000' }}>{children}</main>
      </div>
    </div>
  )
} 