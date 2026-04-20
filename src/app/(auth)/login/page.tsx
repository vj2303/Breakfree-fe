'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { showError, showSuccess } from '@/utils/toast'

export default function Login() {
  const router = useRouter()
  const { login, loading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    
    // Basic validation
    if (!formData.email || !formData.password) {
      showError('Please fill in all fields')
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      showError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const result = await login({ 
        email: formData.email, 
        password: formData.password 
      })

      
      if (result.success) {
        showSuccess('Login successful! Redirecting...')
        setTimeout(() => {
          if(result.data?.user?.role === 'ADMIN') {
            router.push('/dashboard')
          } else if(result.data?.user?.role === 'PARTICIPANT') {
            router.push('/participant/dashboard')
          } else if(result.data?.user?.role === 'ASSESSOR') {
            router.push('/assessor/dashboard')
          } else {
            router.push('/dashboard')
          }
        }, 1000)
      } else {
        showError(result.message || 'Login failed. Please check your credentials.')
      }
    } catch (error) {
      console.error('Login error:', error)
      showError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterRedirect = () => {
    router.push('/register')
  }

  const handleForgotPassword = () => {
    router.push('/forgot-password')
  }

  // useEffect(() => {
  //   if (user && !loading) {
  //     router.push('/dashboard')
  //   }
  // }, [user, loading, router])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 bg-cover bg-center"
      style={{ backgroundImage: '' }}
    >
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-block mb-8">
            <Image
              src="/logo.png"
              alt="Breakfree Consulting"
              width={120}
              height={120}
              className="mx-auto"
            />
          </div>
        </div>

        {/* Login Form */}
        <div className="">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back!
            </h1>
            <p className="text-gray-600">
              Login to access all your data
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address*
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-black transition-all duration-200"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password*
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-12 text-black transition-all duration-200"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                disabled={isLoading}
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-800 text-white py-3 rounded-full font-medium hover:bg-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </button>

            {/* Register Link */}
            <div className="text-center pt-4">
              <span className="text-gray-600">Don&apos;t have an account? </span>
              <button
                type="button"
                onClick={handleRegisterRedirect}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                disabled={isLoading}
              >
                Register
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>&copy; 2025 Breakfree Consulting. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}