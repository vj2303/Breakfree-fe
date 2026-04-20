'use client'
import Sidebar from './dashboard/Sidebar'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'

export default function AssessorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { token, loading } = useAuth()
  
  // Don't show sidebar on login page
  const isLoginPage = pathname === '/assessor/login'
  
  // Auth guard: redirect to login if not authenticated (except on login page)
  useEffect(() => {
    if (loading) return
    if (!isLoginPage && !token) {
      router.replace('/assessor/login')
    }
  }, [token, loading, isLoginPage, router])

  // Determine which sidebar item is selected based on the current path
  let selected = '/assessor/dashboard'
  if (pathname.startsWith('/assessor/assess')) selected = '/assessor/assess'
  // else if (pathname.startsWith('/assessor/feedback')) selected = '/assessor/feedback'

  // If it's the login page, render without sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  // Don't render protected content while checking auth or when redirecting
  if (!loading && !token) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar selected={selected} />
      <main className="flex-1 min-h-0 overflow-y-auto p-6">{children}</main>
    </div>
  )
}



