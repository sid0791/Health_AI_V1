'use client'

import { useState } from 'react'
import { DocumentArrowUpIcon, HeartIcon, BeakerIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import type { HealthInfo } from '../../services/onboardingService'

interface HealthStepProps {
  onNext: (data: HealthInfo) => void
  onSkip?: () => void
  loading?: boolean
  error?: string | null
}

export default function HealthStep({ onNext, onSkip, loading, error }: HealthStepProps) {
  const [formData, setFormData] = useState<HealthInfo>({
    hasHealthConditions: false,
    healthConditions: [],
    bloodPressureSystolic: undefined,
    bloodPressureDiastolic: undefined,
    fastingBloodSugar: undefined,
    hba1c: undefined,
    fattyLiver: false,
    vitaminDeficiencies: [],
    currentMedications: [],
    familyHistory: [],
    hasHealthReports: false,
    healthReportFiles: []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext(formData)
  }

  const handleInputChange = (field: keyof HealthInfo, value: string | string[] | number | boolean | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleMultiSelectChange = (field: keyof HealthInfo, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter(item => item !== value)
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData(prev => ({ ...prev, healthReportFiles: files }))
  }

  const commonHealthConditions = [
    'PCOS/PCOD',
    'Diabetes (Type 1)',
    'Diabetes (Type 2)',
    'Pre-diabetes',
    'Hypertension (High BP)',
    'Hypotension (Low BP)',
    'Thyroid (Hyperthyroid)',
    'Thyroid (Hypothyroid)',
    'Fatty Liver',
    'Sleep Disorder',
    'Anxiety/Depression',
    'Heart Disease',
    'Kidney Disease',
    'Liver Disease',
    'Arthritis',
    'Asthma',
    'GERD/Acid Reflux',
    'IBS/IBD',
    'Osteoporosis',
    'Anemia'
  ]

  const commonDeficiencies = [
    'Vitamin D',
    'Vitamin B12',
    'Iron',
    'Calcium',
    'Magnesium',
    'Zinc',
    'Folate',
    'Vitamin B6',
    'Vitamin C',
    'Omega-3'
  ]

  const familyHistoryConditions = [
    'Diabetes',
    'Heart Disease',
    'High Blood Pressure',
    'High Cholesterol',
    'Stroke',
    'Cancer',
    'Obesity',
    'Osteoporosis',
    'Alzheimer\'s',
    'Mental Health Issues'
  ]

  return (
    <form onSubmit={handleSubmit} className="p-8">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {/* Health Conditions */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <HeartIcon className="h-5 w-5 mr-2 text-primary-600" />
            Current Health Conditions
          </h3>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.hasHealthConditions}
                onChange={(e) => handleInputChange('hasHealthConditions', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">I have existing health conditions</span>
            </label>
          </div>

          {formData.hasHealthConditions && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {commonHealthConditions.map((condition) => (
                <label key={condition} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.healthConditions.includes(condition)}
                    onChange={(e) => handleMultiSelectChange('healthConditions', condition, e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{condition}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Vital Measurements */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BeakerIcon className="h-5 w-5 mr-2 text-primary-600" />
            Recent Measurements (Optional)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Pressure (Systolic)
              </label>
              <input
                type="number"
                value={formData.bloodPressureSystolic || ''}
                onChange={(e) => handleInputChange('bloodPressureSystolic', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="120"
                min="70"
                max="250"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Pressure (Diastolic)
              </label>
              <input
                type="number"
                value={formData.bloodPressureDiastolic || ''}
                onChange={(e) => handleInputChange('bloodPressureDiastolic', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="80"
                min="40"
                max="150"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fasting Blood Sugar (mg/dL)
              </label>
              <input
                type="number"
                value={formData.fastingBloodSugar || ''}
                onChange={(e) => handleInputChange('fastingBloodSugar', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="90"
                min="50"
                max="400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HbA1c (%)
              </label>
              <input
                type="number"
                value={formData.hba1c || ''}
                onChange={(e) => handleInputChange('hba1c', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="5.7"
                min="4"
                max="15"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Fatty Liver */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.fattyLiver}
              onChange={(e) => handleInputChange('fattyLiver', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">I have been diagnosed with fatty liver</span>
          </label>
        </div>

        {/* Vitamin Deficiencies */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Known Vitamin/Mineral Deficiencies
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {commonDeficiencies.map((deficiency) => (
              <label key={deficiency} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.vitaminDeficiencies.includes(deficiency)}
                  onChange={(e) => handleMultiSelectChange('vitaminDeficiencies', deficiency, e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{deficiency}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Family History */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Family Health History
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {familyHistoryConditions.map((condition) => (
              <label key={condition} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.familyHistory.includes(condition)}
                  onChange={(e) => handleMultiSelectChange('familyHistory', condition, e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{condition}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Health Reports Upload */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DocumentArrowUpIcon className="h-5 w-5 mr-2 text-primary-600" />
            Health Reports Upload
          </h3>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.hasHealthReports}
                onChange={(e) => handleInputChange('hasHealthReports', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">I have health reports to upload</span>
            </label>
          </div>

          {formData.hasHealthReports && (
            <div>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload blood reports, scans, or other health documents (PDF, JPG, PNG)
              </p>
              {formData.healthReportFiles && formData.healthReportFiles.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-700">
                    {formData.healthReportFiles.length} file(s) selected
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-between">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Skip this step
          </button>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}