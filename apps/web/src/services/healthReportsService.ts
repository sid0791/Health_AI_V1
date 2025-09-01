/**
 * Health Reports API Service
 * Integrates with backend health reports analysis service
 */

import apiRequest from './api'

export interface HealthReport {
  id: string
  userId: string
  fileName: string
  fileType: string
  uploadDate: string
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed'
  reportType: 'blood_test' | 'lipid_profile' | 'diabetes_panel' | 'thyroid' | 'vitamin_levels' | 'other'
  extractedData?: {
    parameters: Array<{
      name: string
      value: number | string
      unit?: string
      normalRange?: string
      status: 'normal' | 'high' | 'low' | 'critical'
    }>
    reportDate?: string
    labName?: string
  }
  analysis?: {
    summary: string
    insights: Array<{
      category: string
      finding: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      recommendation: string
    }>
    redFlags: Array<{
      parameter: string
      value: string
      concern: string
      urgency: 'low' | 'medium' | 'high' | 'critical'
      recommendedAction: string
    }>
    trends?: Array<{
      parameter: string
      direction: 'improving' | 'stable' | 'declining'
      timeframe: string
    }>
  }
}

export interface HealthReportUpload {
  file: File
  reportType?: string
  notes?: string
}

export interface PhysicianRedFlag {
  id: string
  userId: string
  reportId: string
  parameter: string
  value: string
  normalRange: string
  severity: 'high' | 'critical'
  concern: string
  recommendedAction: string
  createdAt: string
  acknowledged: boolean
  physicianNotes?: string
}

export interface HealthTrend {
  parameter: string
  values: Array<{
    date: string
    value: number
    reportId: string
  }>
  trend: 'improving' | 'stable' | 'declining'
  changePercentage: number
}

class HealthReportsService {
  /**
   * Upload health report for analysis
   */
  async uploadReport(upload: HealthReportUpload): Promise<HealthReport> {
    const formData = new FormData()
    formData.append('file', upload.file)
    if (upload.reportType) {
      formData.append('reportType', upload.reportType)
    }
    if (upload.notes) {
      formData.append('notes', upload.notes)
    }

    return apiRequest<HealthReport>('/health-reports/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Remove content-type to let browser set it for FormData
    })
  }

  /**
   * Get health report by ID
   */
  async getReport(reportId: string): Promise<HealthReport> {
    return apiRequest<HealthReport>(`/health-reports/${reportId}`)
  }

  /**
   * Get user's health reports
   */
  async getUserReports(
    userId: string,
    options?: {
      reportType?: string
      status?: string
      limit?: number
      offset?: number
      sortBy?: 'uploadDate' | 'reportDate'
      sortOrder?: 'asc' | 'desc'
    }
  ): Promise<HealthReport[]> {
    const params = new URLSearchParams()
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }

    return apiRequest<HealthReport[]>(`/health-reports/users/${userId}?${params.toString()}`)
  }

  /**
   * Get analysis status for a report
   */
  async getAnalysisStatus(reportId: string): Promise<{
    status: string
    progress: number
    estimatedCompletion?: string
    currentStep?: string
  }> {
    return apiRequest(`/health-reports/${reportId}/analysis/status`)
  }

  /**
   * Get physician red flags for user
   */
  async getRedFlags(
    userId: string,
    options?: {
      acknowledged?: boolean
      severity?: 'high' | 'critical'
      limit?: number
    }
  ): Promise<PhysicianRedFlag[]> {
    const params = new URLSearchParams()
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }

    return apiRequest<PhysicianRedFlag[]>(`/health-reports/users/${userId}/red-flags?${params.toString()}`)
  }

  /**
   * Acknowledge a red flag
   */
  async acknowledgeRedFlag(redFlagId: string, notes?: string): Promise<void> {
    await apiRequest(`/health-reports/red-flags/${redFlagId}/acknowledge`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    })
  }

  /**
   * Get health parameter trends
   */
  async getHealthTrends(
    userId: string,
    parameters: string[],
    timeframe: '3months' | '6months' | '1year' | '2years'
  ): Promise<HealthTrend[]> {
    return apiRequest<HealthTrend[]>('/health-reports/trends', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        parameters,
        timeframe,
      }),
    })
  }

  /**
   * Get health insights based on all reports
   */
  async getHealthInsights(userId: string): Promise<{
    overallScore: number
    riskFactors: Array<{
      factor: string
      risk: 'low' | 'medium' | 'high'
      description: string
      recommendations: string[]
    }>
    improvements: Array<{
      parameter: string
      improvement: string
      timeframe: string
    }>
    recommendations: Array<{
      category: string
      priority: 'low' | 'medium' | 'high'
      recommendation: string
      reasoning: string
    }>
  }> {
    return apiRequest(`/health-reports/users/${userId}/insights`)
  }

  /**
   * Get personalized recommendations based on latest reports
   */
  async getPersonalizedRecommendations(
    userId: string,
    focus?: 'nutrition' | 'fitness' | 'lifestyle' | 'medical'
  ): Promise<Array<{
    id: string
    category: string
    recommendation: string
    rationale: string
    priority: 'low' | 'medium' | 'high'
    timeframe: string
    relatedParameters: string[]
  }>> {
    const params = focus ? `?focus=${focus}` : ''
    return apiRequest(`/health-reports/users/${userId}/recommendations${params}`)
  }

  /**
   * Request re-analysis of a report with updated AI models
   */
  async requestReanalysis(reportId: string): Promise<HealthReport> {
    return apiRequest<HealthReport>(`/health-reports/${reportId}/reanalyze`, {
      method: 'POST',
    })
  }

  /**
   * Delete a health report
   */
  async deleteReport(reportId: string): Promise<void> {
    await apiRequest(`/health-reports/${reportId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Get supported report types and their requirements
   */
  async getSupportedReportTypes(): Promise<Array<{
    type: string
    name: string
    description: string
    supportedFormats: string[]
    expectedParameters: string[]
    processingTime: string
  }>> {
    return apiRequest('/health-reports/supported-types')
  }

  /**
   * Check if a report needs physician attention
   */
  async checkPhysicianAttention(reportId: string): Promise<{
    needsAttention: boolean
    urgency: 'low' | 'medium' | 'high' | 'critical'
    reasons: string[]
    recommendedTimeframe: string
  }> {
    return apiRequest(`/health-reports/${reportId}/physician-attention`)
  }
}

export const healthReportsService = new HealthReportsService()
export default healthReportsService