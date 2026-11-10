'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { showError, showSuccess } from '@/utils/toast'

// 1. Define a type for formData
type FormDataType = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  agreeToTerms: boolean;
};

export default function Register() {
  const router = useRouter()
  const { register } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [selectedCountryCode, setSelectedCountryCode] = useState('+91')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormDataType>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    agreeToTerms: false,
  })

  const handleInputChange = (field: keyof FormDataType, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Validate required fields (phone number is optional)
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.agreeToTerms) {
      showError('Please fill in all required fields and agree to terms')
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      showError('Please enter a valid email address')
      return
    }

    // Prepare data for API. Phone number is optional and only sent when provided.
    const payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    } = {
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
    };

    if (formData.phoneNumber.trim()) {
      payload.phoneNumber = selectedCountryCode + '-' + formData.phoneNumber.trim();
    }

    try {
      setIsLoading(true);
      // Call register API
      const result = await register(payload);

      if (result.success) {
        // Registration also authenticates the user (token is set), so send
        // them straight into the platform instead of back to the login screen.
        showSuccess('Registration completed successfully!');
        router.push('/dashboard');
      } else {
        // Show error message without navigating
        showError(result.message || 'Registration failed. Please check your information and try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showError('An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleLoginRedirect = () => {
    router.push('/login')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 bg-cover bg-center"
      style={{ backgroundImage: '' }}
    >
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            <Image
              src="/logo.png"
              alt="Breakfree Consulting"
              width={138}
              height={131}
              className="mx-auto w-[100px] h-auto"
            />
          </div>
        </div>

        {/* Create New Account */}
        <div className=" p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Create New Account
            </h1>
            <p className="text-gray-600">
              Let&apos;s get you all set up so you can access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Name and Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name*
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name*
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-black"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail*
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-black"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create Password*
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none pr-12 text-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Phone Number (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-gray-400 font-normal">(optional, used for password resets)</span>
              </label>
              <div className="flex">
                <div className="relative">
                  <select
                    value={selectedCountryCode}
                    onChange={(e) => setSelectedCountryCode(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-l-lg px-3 py-3 pr-8 outline-none text-black"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="8077854435"
                  className="flex-1 px-4 py-3 border border-l-0 border-gray-300 rounded-r-lg outline-none text-black"
                />
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="terms"
                checked={formData.agreeToTerms}
                onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-600">
                I agree to all the{' '}
                <span className="text-blue-600 hover:underline cursor-pointer">Terms</span>
                {' '}and{' '}
                <span className="text-blue-600 hover:underline cursor-pointer">Privacy Policies</span>
              </label>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-gray-800 text-white py-3 rounded-full font-medium hover:bg-gray-900 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Registering...' : 'Register Account'}
            </button>

            {/* Login Link */}
            <div className="text-center">
              <span className="text-gray-600">Already have an account? </span>
              <button
                type="button"
                onClick={handleLoginRedirect}
                className="text-blue-600 hover:underline font-medium"
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
