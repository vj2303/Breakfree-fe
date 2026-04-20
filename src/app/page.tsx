'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronRight, Users, FileText } from 'lucide-react'

export default function JoinUs() {
  const router = useRouter()
  
  const accountTypes = [
    {
      id: 'admin',
      title: 'Admin',
      description: 'Set up. Configure. Oversee. Create, manage, monitor & run your entire assessment center.',
      icon: <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
        <div className="w-3 h-3 bg-white rounded-full"></div>
      </div>,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    },
    {
      id: 'assessor',
      title: 'Assessor',
      description: 'Observe. Evaluate. Elevate. Review participant responses, score performance and provide feedback',
      icon: <FileText className="w-6 h-6 text-blue-600" />,
      bgColor: 'bg-white',
      borderColor: 'border-gray-200'
    },
    {
      id: 'participant',
      title: 'Participant/User',
      description: 'Showcase your strengths. Take assessments designed to demonstrate your skills, behaviors, and potential',
      icon: <Users className="w-6 h-6 text-blue-600" />,
      bgColor: 'bg-white',
      borderColor: 'border-gray-200'
    }
  ]
  
  const handleAccountSelection = (accountType: string) => {
    // Navigate to different register pages based on account type
    switch (accountType) {
      case 'admin':
        router.push('/register')
        break
      case 'assessor':
        router.push('/assessor/login')
        break
      case 'participant':
        router.push('/participant/login')
        break
      default:
        console.log('Unknown account type:', accountType)
    }
  }
  
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-white"
    >
      <div className="w-full max-w-4xl mx-auto">
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
                    
          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Skill Sight AI
          </h1>
                    
          {/* Subtitle */}
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Your intelligent platform for assessments.
          </p>
        </div>

        {/* Account Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {accountTypes.map((account) => (
            <div
              key={account.id}
              onClick={() => handleAccountSelection(account.id)}
              className={`${account.bgColor} rounded-2xl p-10 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 group`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                  {account.icon}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
                            
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {account.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {account.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}