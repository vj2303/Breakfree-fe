'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { LogOut } from 'lucide-react'

const sidebarItems = [
  { label: 'Home', href: '/assessor/dashboard' },
  { label: 'Assess', href: '/assessor/assess' },
  // { label: 'Feedback', href: '/assessor/feedback' },
]

export default function Sidebar({ selected }: { selected: string }) {
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.replace('/')
  }

  return (
    <aside className="w-56 h-screen flex-shrink-0 bg-white border-r border-gray-200 flex flex-col justify-between shadow-sm overflow-hidden">
      <div className="pt-6">
        <div className="mb-8 flex items-center justify-center px-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-black rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-black leading-tight">ASSESSOR</span>
              <span className="text-[10px] text-gray-600 leading-tight">PORTAL</span>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {sidebarItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-200 ${
                selected === item.href 
                  ? 'bg-gray-100 text-black border-l-2 border-black' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-black'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mb-16 px-3 border-t border-gray-200 pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2.5 rounded text-sm text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}



