'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'

import AssessorTopNav from './AssessorTopNav'

export default function AssessorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { token, loading } = useAuth()

  // `/assessor` renders its own login screen, so both auth entry points skip the shell.
  const isLoginPage = pathname === '/assessor/login' || pathname === '/assessor'

  // Auth guard: redirect to login if not authenticated (except on login page)
  useEffect(() => {
    if (loading) return
    if (!isLoginPage && !token) {
      router.replace('/assessor/login')
    }
  }, [token, loading, isLoginPage, router])

  if (isLoginPage) {
    return <>{children}</>
  }

  // Don't render protected content while checking auth or when redirecting
  if (!loading && !token) {
    return null
  }

  // The scoring screen runs its own full-bleed shell, so it opts out of the centred column.
  const isFullBleed = pathname.includes('/score/')

  return (
    <div className="assessor-portal flex h-screen flex-col overflow-hidden bg-[var(--ap-bg)] text-[var(--ap-ink)]">
      <AssessorTopNav />
      <main className="min-h-0 flex-1 overflow-y-auto">
        {isFullBleed ? (
          children
        ) : (
          <div className="mx-auto max-w-[1080px] px-6 pb-20 pt-9 md:px-10">{children}</div>
        )}
      </main>
    </div>
  )
}
