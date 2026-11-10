'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ChevronDown, Check, X } from 'lucide-react'
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

type FieldErrors = Partial<Record<keyof FormDataType, string>>;

// Password rules enforced on the Register screen. Keep in sync with the
// backend registerSchema (password must be at least 6 characters).
const PASSWORD_MIN_LENGTH = 6;

export default function Register() {
  const router = useRouter()
  const { register } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [selectedCountryCode, setSelectedCountryCode] = useState('+91')
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formData, setFormData] = useState<FormDataType>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    agreeToTerms: false,
  })

  const passwordMeetsLength = formData.password.length >= PASSWORD_MIN_LENGTH

  const handleInputChange = (field: keyof FormDataType, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear the error for a field as soon as the user edits it.
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  // Validate on the screen where the user entered the data, returning a map of
  // field -> message so each invalid input can be highlighted individually.
  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!formData.firstName.trim()) errors.firstName = 'First name is required'
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required'

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    }

    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'Please accept the Terms and Privacy Policies to continue'
    }

    return errors
  }

  // Map backend field names to our form field names so server-side validation
  // errors highlight the correct input.
  const mapServerField = (field: string): keyof FormDataType | null => {
    switch (field) {
      case 'password': return 'password'
      case 'email': return 'email'
      case 'firstName': return 'firstName'
      case 'lastName': return 'lastName'
      case 'phoneNumber': return 'phoneNumber'
      default: return null
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      showError('Please fix the highlighted fields and try again.')
      return
    }
    setFieldErrors({})

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
        // Surface server-side validation errors on the specific fields.
        if (result.errors && result.errors.length > 0) {
          const mapped: FieldErrors = {}
          for (const err of result.errors) {
            const field = mapServerField(err.field)
            if (field) mapped[field] = err.message
          }
          if (Object.keys(mapped).length > 0) {
            setFieldErrors(mapped)
          }
        }
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

  const inputClass = (field: keyof FormDataType, extra = '') =>
    `w-full px-4 py-3 border rounded-lg outline-none text-black ${extra} ${
      fieldErrors[field] ? 'border-red-500' : 'border-gray-300'
    }`

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

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
                  className={inputClass('firstName')}
                />
                {fieldErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>
                )}
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
                  className={inputClass('lastName')}
                />
                {fieldErrors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>
                )}
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
                className={inputClass('email')}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
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
                  className={inputClass('password', 'pr-12')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {/* Password rules shown up-front and checked live */}
              <div className="mt-2 flex items-center text-sm">
                {passwordMeetsLength ? (
                  <Check size={16} className="text-green-600 mr-1.5 shrink-0" />
                ) : (
                  <X size={16} className={`mr-1.5 shrink-0 ${fieldErrors.password ? 'text-red-500' : 'text-gray-400'}`} />
                )}
                <span className={passwordMeetsLength ? 'text-green-600' : (fieldErrors.password ? 'text-red-600' : 'text-gray-500')}>
                  At least {PASSWORD_MIN_LENGTH} characters
                </span>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
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
                  className={`flex-1 px-4 py-3 border border-l-0 rounded-r-lg outline-none text-black ${
                    fieldErrors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {fieldErrors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.phoneNumber}</p>
              )}
            </div>

            {/* Terms Agreement */}
            <div>
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
              {fieldErrors.agreeToTerms && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.agreeToTerms}</p>
              )}
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
