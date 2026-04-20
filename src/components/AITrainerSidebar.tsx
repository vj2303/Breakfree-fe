'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, Plus, BarChart3, LogOut } from 'lucide-react'

interface AITrainerSidebarProps {
  activePage: string
  onPageChange: (page: string) => void
}

const AITrainerSidebar: React.FC<AITrainerSidebarProps> = ({ activePage, onPageChange }) => {
  const router = useRouter()
  const pathname = usePathname()

  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/dashboard'
    },
    {
      id: 'create',
      label: 'Create',
      icon: Plus,
      path: '/dashboard/ai-trainer/create'
    },
    {
      id: 'evaluate',
      label: 'Evaluate',
      icon: BarChart3,
      path: '/dashboard/ai-trainer/evaluate'
    }
  ]

  const handleLogout = () => {
    // Clear any stored tokens or user data
    localStorage.removeItem('token')
    // Redirect to login page
    router.push('/login')
  }

  const handleMenuClick = (item: typeof menuItems[0]) => {
    if (item.id === 'home') {
      router.push(item.path)
    } else {
      onPageChange(item.id)
      router.push(item.path)
    }
  }

  return (
    <>
      {/* Menu Items */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id || (activePage === '' && pathname.includes(item.path))

          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 12, borderRadius: 12, background: isActive ? '#e6effa' : 'transparent', color: '#000', fontWeight: isActive ? 600 : 400, transition: 'background 0.2s', cursor: 'pointer', border: 'none'
              }}
            >
              <Icon size={24} />
              <span style={{ fontSize: 12, marginTop: 4, color: '#000' }}>{item.label}</span>
            </button>
          )
        })}

        {/* Logout Button */}
        <div style={{ marginTop: 260 }}>
          <button
            onClick={handleLogout}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8, borderRadius: 12, color: '#000', fontWeight: 400, cursor: 'pointer', background: 'none', border: 'none' }}
          >
            <LogOut size={24} />
            <span style={{ fontSize: 12, marginTop: 4, color: '#000' }}>Log Out</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default AITrainerSidebar 