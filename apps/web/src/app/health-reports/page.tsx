'use client'

import { useState } from 'react'
import {
  DocumentPlusIcon,
  CloudArrowUpIcon,
  EyeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

const reportCategories = [
  { id: 'all', name: 'All Reports' },
  { id: 'blood', name: 'Blood Tests' },
  { id: 'imaging', name: 'Imaging' },
  { id: 'cardio', name: 'Cardio' },
  { id: 'general', name: 'General' },
]

const recentReports = [
  {
    id: 1,
    name: 'Complete Blood Count (CBC)',
    date: '2024-08-20',
    type: 'Blood Test',
    status: 'analyzed',
    file: 'cbc_report_aug2024.pdf',
    size: '2.3 MB',
    insights: [
      { type: 'normal', text: 'Hemoglobin levels are within normal range' },
      { type: 'attention', text: 'Vitamin D levels are below optimal range' },
      { type: 'normal', text: 'White blood cell count is healthy' }
    ],
    keyMetrics: {
      hemoglobin: { value: '14.2', unit: 'g/dL', range: '12.0-16.0', status: 'normal' },
      vitaminD: { value: '18', unit: 'ng/mL', range: '30-100', status: 'low' },
      cholesterol: { value: '185', unit: 'mg/dL', range: '<200', status: 'normal' }
    }
  },
  {
    id: 2,
    name: 'Lipid Profile',
    date: '2024-08-15',
    type: 'Blood Test',
    status: 'analyzed',
    file: 'lipid_profile_aug2024.pdf',
    size: '1.8 MB',
    insights: [
      { type: 'normal', text: 'Total cholesterol within healthy limits' },
      { type: 'good', text: 'HDL cholesterol levels are excellent' },
      { type: 'attention', text: 'Triglycerides slightly elevated' }
    ],
    keyMetrics: {
      totalCholesterol: { value: '185', unit: 'mg/dL', range: '<200', status: 'normal' },
      hdl: { value: '55', unit: 'mg/dL', range: '>40', status: 'good' },
      triglycerides: { value: '165', unit: 'mg/dL', range: '<150', status: 'elevated' }
    }
  },
  {
    id: 3,
    name: 'Thyroid Function Test',
    date: '2024-07-28',
    type: 'Blood Test',
    status: 'processing',
    file: 'thyroid_test_jul2024.pdf',
    size: '1.5 MB',
    insights: [],
    keyMetrics: {}
  },
  {
    id: 4,
    name: 'Chest X-Ray',
    date: '2024-07-10',
    type: 'Imaging',
    status: 'analyzed',
    file: 'chest_xray_jul2024.jpg',
    size: '8.2 MB',
    insights: [
      { type: 'normal', text: 'Chest X-ray shows clear lungs' },
      { type: 'normal', text: 'Heart size appears normal' }
    ],
    keyMetrics: {}
  }
]

const aiInsights = [
  {
    title: 'Vitamin D Deficiency Pattern',
    description: 'Your vitamin D levels have been consistently low across multiple reports. Consider increasing sun exposure and supplementation.',
    recommendation: 'Take 2000 IU vitamin D3 daily and retest in 3 months',
    urgency: 'medium',
    reports: ['CBC Aug 2024', 'Annual Physical Mar 2024']
  },
  {
    title: 'Improving Cardiovascular Health',
    description: 'Your lipid profile shows excellent HDL levels, indicating good cardiovascular health maintenance.',
    recommendation: 'Continue current exercise routine and Mediterranean diet',
    urgency: 'low',
    reports: ['Lipid Profile Aug 2024']
  }
]

const PhysicianRedFlagModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Critical Health Alert
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Your recent blood pressure readings show concerning patterns that require immediate medical attention. 
                  Please consult with a physician within 24-48 hours.
                </p>
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800">Detected Issues:</h4>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    <li>Blood pressure consistently above 140/90 mmHg</li>
                    <li>Irregular heart rate patterns</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
              onClick={onClose}
            >
              Find Physicians Nearby
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              onClick={onClose}
            >
              Remind Me Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HealthReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [showRedFlagModal, setShowRedFlagModal] = useState(false)

  const filteredReports = recentReports.filter(report => {
    const matchesCategory = selectedCategory === 'all' || report.type.toLowerCase().includes(selectedCategory)
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.type.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'good':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'normal':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'attention':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'warning':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-display mb-2">
              Health Reports
            </h1>
            <p className="text-gray-600">
              Upload, analyze, and track your health reports with AI-powered insights
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowRedFlagModal(true)}
              className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-500"
            >
              <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              Test Red Flag
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500"
            >
              <DocumentPlusIcon className="h-5 w-5 mr-2" />
              Upload Report
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowUpload(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
              <div className="text-center">
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Health Report</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Upload PDF files, images, or scan reports directly. Our AI will analyze and extract key insights.
                </p>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4">
                  <input type="file" className="hidden" id="report-upload" accept=".pdf,.jpg,.jpeg,.png" />
                  <label htmlFor="report-upload" className="cursor-pointer">
                    <div className="text-center">
                      <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to browse or drag files here</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</p>
                    </div>
                  </label>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowUpload(false)}
                    className="flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowUpload(false)}
                    className="flex-1 inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Physician Red Flag Modal */}
      <PhysicianRedFlagModal isOpen={showRedFlagModal} onClose={() => setShowRedFlagModal(false)} />

      {/* AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {aiInsights.map((insight, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{insight.title}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                insight.urgency === 'high' ? 'bg-red-100 text-red-800' :
                insight.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {insight.urgency} priority
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-3">{insight.description}</p>
            <div className="bg-primary-50 rounded-lg p-3 mb-3">
              <h4 className="text-sm font-medium text-primary-900 mb-1">AI Recommendation:</h4>
              <p className="text-sm text-primary-700">{insight.recommendation}</p>
            </div>
            <div className="text-xs text-gray-500">
              Based on: {insight.reports.join(', ')}
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {reportCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <FunnelIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className="bg-primary-100 rounded-lg p-3">
                  <DocumentTextIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{report.date}</span>
                    <span>{report.type}</span>
                    <span>{report.size}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                  {report.status === 'processing' ? (
                    <>
                      <ClockIcon className="h-3 w-3 inline mr-1" />
                      Processing
                    </>
                  ) : report.status === 'analyzed' ? (
                    <>
                      <CheckCircleIcon className="h-3 w-3 inline mr-1" />
                      Analyzed
                    </>
                  ) : (
                    report.status
                  )}
                </span>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <EyeIcon className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {report.status === 'analyzed' && report.insights.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">AI Insights:</h4>
                <div className="space-y-2">
                  {report.insights.map((insight, index) => (
                    <div key={index} className={`p-2 rounded-lg border text-sm ${getInsightColor(insight.type)}`}>
                      {insight.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(report.keyMetrics).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Key Metrics:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(report.keyMetrics).map(([key, metric]: [string, { value: string, unit: string, range: string, status: string }]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          metric.status === 'normal' ? 'bg-green-100 text-green-800' :
                          metric.status === 'good' ? 'bg-blue-100 text-blue-800' :
                          metric.status === 'low' || metric.status === 'elevated' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {metric.status}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-lg font-bold text-gray-900">
                          {metric.value} {metric.unit}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Normal: {metric.range}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? `No reports match "${searchQuery}"`
              : "Upload your first health report to get started with AI-powered analysis"
            }
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500"
          >
            <DocumentPlusIcon className="h-5 w-5 mr-2" />
            Upload Your First Report
          </button>
        </div>
      )}
    </div>
  )
}