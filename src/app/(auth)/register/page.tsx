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
  agreeToTerms: boolean;
  phoneNumber: string;
  batchNo: string;
  designation: string;
  role: string;
  managerName: string;
  location: string;
  department: string;
  division: string;
};

export default function MultiStepRegister() {
  const router = useRouter()
  const { register } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedCountryCode, setSelectedCountryCode] = useState('+91')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormDataType>({
    // Step 1 data
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    agreeToTerms: false,
    
    // Step 2 data
    phoneNumber: '',
    batchNo: '',
    designation: '',
    role: '',
    managerName: '',
    location: '',
    department: '',
    division: ''
  })

  const handleInputChange = (field: keyof FormDataType, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleStep1Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Validate Step 1 fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.agreeToTerms) {
      showError('Please fill in all required fields and agree to terms')
      return
    }
    setCurrentStep(2)
  }

  const handleStep2Submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Validate required fields for step 2
    if (!formData.phoneNumber || !formData.batchNo || !formData.designation || 
        !formData.managerName || !formData.location || !formData.department || !formData.division) {
      showError('Please fill in all required fields')
      return
    }

    // Prepare data for API (merge country code with phone number, map batchNo to batchNumber)
    const payload = {
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: selectedCountryCode + '-' + formData.phoneNumber,
      batchNumber: formData.batchNo,
      designation: formData.designation,
      managerName: formData.managerName,
      location: formData.location,
      department: formData.department,
      division: formData.division
    };

    try {
      setIsLoading(true);
      // Call register API
      const result = await register(payload);
      
      if (result.success) {
        // Only navigate if registration was successful
        showSuccess('Registration completed successfully!');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
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

  const handleBackToStep1 = () => {
    setCurrentStep(1)
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
              width={100}
              height={100}
              className="mx-auto"
            />
          </div>
        </div>

        {/* Step 1: Create New Account */}
        {currentStep === 1 && (
          <div className=" p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Create New Account
              </h1>
              <p className="text-gray-600">
                Let&apos;s get you all set up so you can access your Admin Account.
              </p>
            </div>

            <form onSubmit={handleStep1Submit} className="space-y-6">
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
        )}

        {/* Step 2: Complete Profile */}
        {currentStep === 2 && (
          <div className="">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Complete Your Profile!
              </h1>
              <p className="text-gray-600">
                Let&apos;s get you all set up so you can access your Admin Account.
              </p>
            </div>

            <form onSubmit={handleStep2Submit} className="space-y-6">
              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
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

              {/* Batch No */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch No.
                </label>
                <input
                  type="text"
                  value={formData.batchNo}
                  onChange={(e) => handleInputChange('batchNo', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-black"
                />
              </div>

              {/* Designation and Role */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Designation*
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    placeholder="Manager"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role*
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    placeholder="Learner"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-black"
                  />
                </div>
              </div>

              {/* Manager Name and Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manager Name*
                  </label>
                  <input
                    type="text"
                    value={formData.managerName}
                    onChange={(e) => handleInputChange('managerName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location*
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-black"
                  />
                </div>
              </div>

              {/* Department and Division */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department*
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Division*
                  </label>
                  <input
                    type="text"
                    value={formData.division}
                    onChange={(e) => handleInputChange('division', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-black"
                  />
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms2"
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="terms2" className="text-sm text-gray-600">
                  I agree to all the{' '}
                  <span className="text-blue-600 hover:underline cursor-pointer">Terms</span>
                  {' '}and{' '}
                  <span className="text-blue-600 hover:underline cursor-pointer">Privacy Policies</span>
                </label>
              </div>

              {/* Navigation Buttons */}
              <div className="space-y-4">
                <button
                  type="submit"
                  className="w-full bg-gray-800 text-white py-3 rounded-full font-medium hover:bg-gray-900 transition-colors"
                >
                  Save & Continue
                </button>
                
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-full font-medium hover:bg-gray-200 transition-colors"
                >
                  Back to Previous Step
                </button>
              </div>

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
        )}
      </div>
    </div>
  )
}