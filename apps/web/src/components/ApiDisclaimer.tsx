'use client'

import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface ApiDisclaimerProps {
  mode: 'real' | 'mock'
  className?: string
}

export default function ApiDisclaimer({ mode, className = '' }: ApiDisclaimerProps) {
  if (mode === 'real') {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">AI-Generated Content Disclaimer</h3>
            <p className="text-sm text-amber-700 mt-1">
              This is AI-generated suggestions, and thus could create errors. Please refer to actual dietician, 
              fitness expert, or healthcare professional for personalized medical advice.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-blue-800">Demo Mode</h3>
          <p className="text-sm text-blue-700 mt-1">
            Actual API is not available, thus referring to mock data. This is demonstration content only.
          </p>
        </div>
      </div>
    </div>
  )
}