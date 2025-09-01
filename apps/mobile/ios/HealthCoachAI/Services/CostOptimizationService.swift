import Foundation
import Combine

// MARK: - AI Cost Optimization Service

class CostOptimizationService: ObservableObject {
    static let shared = CostOptimizationService()
    
    private let apiService = APIService.shared
    @Published var currentCostMetrics: CostMetrics?
    @Published var quotaStatus: QuotaStatus?
    @Published var isNearLimit = false
    @Published var isOverLimit = false
    
    private init() {
        startPeriodicUpdates()
    }
    
    // MARK: - Cost Tracking
    
    /**
     * Get cost metrics for current user
     */
    func getCostMetrics(userId: String) async throws -> CostMetrics {
        guard let metrics = try await apiService.request(
            endpoint: "/ai-prompt-optimization/cost-metrics?userId=\(userId)",
            method: .GET,
            responseType: CostMetrics.self
        ) else {
            throw APIError.decodingError(NSError(domain: "CostOptimizationService", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to get cost metrics"]))
        }
        
        await MainActor.run {
            self.currentCostMetrics = metrics
        }
        
        return metrics
    }
    
    /**
     * Get quota status for current user
     */
    func getQuotaStatus(userId: String) async throws -> QuotaStatus {
        guard let status = try await apiService.request(
            endpoint: "/ai-prompt-optimization/quota-status?userId=\(userId)",
            method: .GET,
            responseType: QuotaStatus.self
        ) else {
            throw APIError.decodingError(NSError(domain: "CostOptimizationService", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to get quota status"]))
        }
        
        await MainActor.run {
            self.quotaStatus = status
            self.isNearLimit = status.isNearLimit
            self.isOverLimit = status.isOverLimit
        }
        
        return status
    }
    
    /**
     * Execute optimized prompt template
     */
    func executeOptimizedPrompt(
        userId: String,
        templateId: String,
        variables: [String: Any],
        category: String = "general"
    ) async throws -> OptimizedPromptResponse {
        let requestBody = [
            "userId": userId,
            "templateId": templateId,
            "variables": variables,
            "category": category
        ] as [String: Any]
        
        guard let response = try await apiService.request(
            endpoint: "/ai-prompt-optimization/execute",
            method: .POST,
            body: requestBody,
            responseType: OptimizedPromptResponse.self
        ) else {
            throw APIError.decodingError(NSError(domain: "CostOptimizationService", code: 0, userInfo: [NSLocalizedDescriptionKey: "Failed to execute optimized prompt"]))
        }
        
        // Update quota status if provided
        if let quotaStatus = response.quotaStatus {
            await MainActor.run {
                self.quotaStatus = quotaStatus
                self.isNearLimit = quotaStatus.isNearLimit
                self.isOverLimit = quotaStatus.isOverLimit
            }
        }
        
        return response
    }
    
    /**
     * Get available prompt templates
     */
    func getTemplates(category: String? = nil) async throws -> [PromptTemplate] {
        var endpoint = "/ai-prompt-optimization/templates"
        if let category = category {
            endpoint += "?category=\(category)"
        }
        
        guard let templates = try await apiService.request(
            endpoint: endpoint,
            method: .GET,
            responseType: [PromptTemplate].self
        ) else {
            return []
        }
        
        return templates
    }
    
    /**
     * Track API usage for cost optimization
     */
    func trackUsage(
        userId: String,
        endpoint: String,
        method: String,
        tokenCount: Int?,
        cost: Double?
    ) async {
        let requestBody = [
            "userId": userId,
            "endpoint": endpoint,
            "method": method,
            "tokenCount": tokenCount as Any,
            "cost": cost as Any,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ] as [String: Any]
        
        do {
            _ = try await apiService.request(
                endpoint: "/ai-prompt-optimization/track-usage",
                method: .POST,
                body: requestBody,
                responseType: EmptyResponse.self
            )
        } catch {
            // Log error but don't throw - usage tracking shouldn't break main functionality
            print("Failed to track usage: \(error.localizedDescription)")
        }
    }
    
    /**
     * Get cost optimization settings
     */
    func getSettings(userId: String) async throws -> CostOptimizationSettings {
        guard let settings = try await apiService.request(
            endpoint: "/ai-prompt-optimization/settings?userId=\(userId)",
            method: .GET,
            responseType: CostOptimizationSettings.self
        ) else {
            // Return default settings if none found
            return CostOptimizationSettings(
                enableBatching: true,
                maxBatchSize: 5,
                batchTimeoutSeconds: 30,
                enableTemplateOptimization: true,
                costThresholdUsd: 10.0,
                preferredModel: nil
            )
        }
        
        return settings
    }
    
    /**
     * Update cost optimization settings
     */
    func updateSettings(userId: String, settings: CostOptimizationSettings) async throws {
        _ = try await apiService.request(
            endpoint: "/ai-prompt-optimization/settings",
            method: .PUT,
            body: ["userId": userId, "settings": settings],
            responseType: EmptyResponse.self
        )
    }
    
    // MARK: - Periodic Updates
    
    private func startPeriodicUpdates() {
        // Update cost metrics every 5 minutes
        Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { [weak self] _ in
            Task {
                // In a real app, get the actual user ID from auth context
                let userId = "user_123"
                try? await self?.getCostMetrics(userId: userId)
                try? await self?.getQuotaStatus(userId: userId)
            }
        }
    }
    
    // MARK: - Utility Methods
    
    /**
     * Check if user is approaching cost limits
     */
    func shouldOptimizeForCost() -> Bool {
        guard let quotaStatus = quotaStatus else { return false }
        return quotaStatus.isNearLimit || quotaStatus.isOverLimit
    }
    
    /**
     * Get recommended optimization actions
     */
    func getOptimizationRecommendations() -> [String] {
        var recommendations: [String] = []
        
        if isOverLimit {
            recommendations.append("You've exceeded your daily quota. Consider upgrading your plan.")
        } else if isNearLimit {
            recommendations.append("You're approaching your daily limit. Consider using optimized templates.")
        }
        
        if let metrics = currentCostMetrics {
            if metrics.averageCostPerRequest > 0.05 {
                recommendations.append("Your average cost per request is high. Try using batch processing.")
            }
            
            if metrics.averageTokensPerRequest > 1000 {
                recommendations.append("Consider using shorter, more focused prompts to reduce token usage.")
            }
        }
        
        return recommendations
    }
}

// MARK: - Supporting Types

struct OptimizedPromptResponse: Codable {
    let success: Bool
    let response: String
    let templateId: String
    let tokenCount: Int
    let costUsd: Double
    let optimizationRatio: Double
    let quotaStatus: QuotaStatus?
    let executionTime: Double
}

struct PromptTemplate: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let category: String
    let template: String
    let variables: [String]
    let estimatedTokens: Int
    let averageCost: Double
    let usageCount: Int
    let successRate: Double
}