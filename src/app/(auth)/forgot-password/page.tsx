'use client'

import React, { useState, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { showError, showSuccess } from '@/utils/toast'

type Role = 'admin' | 'assessor' | 'participant'

const roleToApiRole = (role: Role) => {
  if (role === 'admin') return 'ADMIN'
  if (role === 'assessor') return 'ASSESSOR'
  return 'PARTICIPANT'
}

function ForgotPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRole = (searchParams.get('role') as Role) || 'admin'

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>(initialRole)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      showError('Please enter your email address')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: roleToApiRole(role),
        }),
      })

      const result = await res.json()
      if (!res.ok || !result.success) {
        // Backend always returns a generic success, but handle unexpected errors gracefully
        showError(result.message || 'Something went wrong. Please try again.')
      } else {
        showSuccess('If an account exists for this email, a password reset link has been sent.')
        // Optionally redirect back to the appropriate login
        setTimeout(() => {
          if (role === 'admin') router.push('/login')
          else if (role === 'assessor') router.push('/assessor/login')
          else router.push('/participant/login')
        }, 1500)
      }
    } catch (err) {
      console.error('Forgot password error:', err)
      showError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-semibold text-black mb-2 text-center">Forgot password</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                  role === 'admin' ? 'bg-black text-white border-black' : 'bg-white text-gray-800 border-gray-300'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole('assessor')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                  role === 'assessor' ? 'bg-black text-white border-black' : 'bg-white text-gray-800 border-gray-300'
                }`}
              >
                Assessor
              </button>
              <button
                type="button"
                onClick={() => setRole('participant')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                  role === 'participant' ? 'bg-black text-white border-black' : 'bg-white text-gray-800 border-gray-300'
                }`}
              >
                Participant
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-black text-sm"
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending link...
              </>
            ) : (
              'Send reset link'
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (role === 'admin') router.push('/login')
              else if (role === 'assessor') router.push('/assessor/login')
              else router.push('/participant/login')
            }}
            className="w-full text-xs text-gray-600 hover:text-black mt-2"
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  )
}
