import SwiftUI
import Foundation

// MARK: - Onboarding Step Enum
enum OnboardingStep: Int, CaseIterable {
    case splash = 0
    case authentication = 1
    case consent = 2
    case basicInfo = 3
    case lifestyle = 4
    case health = 5
    case preferences = 6
    case goals = 7
    case complete = 8
    
    var title: String {
        switch self {
        case .splash:
            return "Welcome"
        case .authentication:
            return "Sign In"
        case .consent:
            return "Privacy"
        case .basicInfo:
            return "Basic Info"
        case .lifestyle:
            return "Lifestyle"
        case .health:
            return "Health"
        case .preferences:
            return "Food Preferences"
        case .goals:
            return "Goals"
        case .complete:
            return "Complete"
        }
    }
    
    var description: String {
        switch self {
        case .splash:
            return "Let's start your health journey"
        case .authentication:
            return "Secure access to your account"
        case .consent:
            return "Your privacy matters to us"
        case .basicInfo:
            return "Tell us about yourself"
        case .lifestyle:
            return "Your daily habits"
        case .health:
            return "Health information"
        case .preferences:
            return "Food choices & preferences"
        case .goals:
            return "What you want to achieve"
        case .complete:
            return "Ready to start!"
        }
    }
}

// MARK: - Onboarding Data Models
struct OnboardingData {
    // Basic Info
    var firstName: String = ""
    var lastName: String = ""
    var email: String = ""
    var birthday: Date = Date()
    var gender: String = ""
    var height: Double = 170.0
    var weight: Double = 70.0
    var city: String = ""
    var state: String = ""
    
    // Lifestyle
    var activityLevel: String = "moderately_active"
    var smokingFrequency: Int = 0
    var alcoholFrequency: Int = 0
    var sleepHours: Double = 8.0
    var jobActivityLevel: Int = 3
    var eatingOutFrequency: Int = 3
    var stressLevel: Int = 5
    var waterIntake: Double = 2.5
    
    // Health
    var healthConditions: [String] = []
    var bloodPressureSystolic: Int = 120
    var bloodPressureDiastolic: Int = 80
    var fastingBloodSugar: Int = 90
    var emergencyContactName: String = ""
    var emergencyContactPhone: String = ""
    
    // Preferences
    var dietaryPreference: String = "vegetarian"
    var favoriteCuisines: [String] = []
    var allergens: [String] = []
    var spiceTolerance: String = "medium"
    var favoriteIngredients: [String] = []
    var dislikedIngredients: [String] = []
    var cravings: [String] = []
    var mealsPerDay: Int = 3
    var cookingSkillLevel: Int = 3
    
    // Goals
    var primaryGoal: String = "weight_loss"
    var goalPriority: String = "medium"
    var intensity: String = "moderate"
    var targetWeight: Double = 65.0
    var targetDate: Date = Calendar.current.date(byAdding: .month, value: 6, to: Date()) ?? Date()
    var dailyCalorieTarget: Int = 1800
    var weeklyExerciseTarget: Int = 150
    var motivation: String = ""
}

// MARK: - Onboarding Coordinator
class OnboardingCoordinator: ObservableObject {
    @Published var currentStep: OnboardingStep = .splash
    @Published var isOnboardingComplete: Bool = false
    @Published var onboardingData = OnboardingData()
    @Published var progress: Double = 0.0
    @Published var isLoading: Bool = false
    @Published var errorMessage: String = ""
    
    private let totalSteps = OnboardingStep.allCases.count - 1 // Exclude complete step
    
    init() {
        updateProgress()
        checkOnboardingStatus()
    }
    
    // MARK: - Navigation
    func nextStep() {
        guard currentStep.rawValue < OnboardingStep.complete.rawValue else {
            completeOnboarding()
            return
        }
        
        if let nextStep = OnboardingStep(rawValue: currentStep.rawValue + 1) {
            withAnimation(.easeInOut(duration: 0.3)) {
                currentStep = nextStep
                updateProgress()
            }
        }
    }
    
    func previousStep() {
        guard currentStep.rawValue > OnboardingStep.splash.rawValue else { return }
        
        if let previousStep = OnboardingStep(rawValue: currentStep.rawValue - 1) {
            withAnimation(.easeInOut(duration: 0.3)) {
                currentStep = previousStep
                updateProgress()
            }
        }
    }
    
    func skipStep() {
        // Log analytics event for skipped step
        AnalyticsManager.shared.trackEvent("onboarding_step_skipped", properties: [
            "step": currentStep.rawValue,
            "step_name": currentStep.title
        ])
        
        nextStep()
    }
    
    func goToStep(_ step: OnboardingStep) {
        withAnimation(.easeInOut(duration: 0.3)) {
            currentStep = step
            updateProgress()
        }
    }
    
    // MARK: - Data Management
    func saveBasicInfo() async {
        isLoading = true
        errorMessage = ""
        
        do {
            let apiData = OnboardingBasicInfoAPI(
                firstName: onboardingData.firstName,
                lastName: onboardingData.lastName,
                email: onboardingData.email.isEmpty ? nil : onboardingData.email,
                birthday: ISO8601DateFormatter().string(from: onboardingData.birthday),
                gender: onboardingData.gender,
                height: onboardingData.height,
                weight: onboardingData.weight,
                city: onboardingData.city.isEmpty ? nil : onboardingData.city,
                state: onboardingData.state.isEmpty ? nil : onboardingData.state
            )
            
            let result = try await OnboardingAPIService.shared.saveBasicInfo(apiData)
            
            if result.success {
                AnalyticsManager.shared.trackEvent("onboarding_basic_info_completed", properties: [
                    "step": currentStep.rawValue
                ])
                nextStep()
            } else {
                errorMessage = "Failed to save basic information. Please try again."
            }
        } catch {
            errorMessage = "Network error. Please check your connection and try again."
        }
        
        isLoading = false
    }
    
    func saveLifestyle() async {
        isLoading = true
        errorMessage = ""
        
        do {
            let apiData = OnboardingLifestyleAPI(
                activityLevel: onboardingData.activityLevel,
                smokingFrequency: onboardingData.smokingFrequency,
                alcoholFrequency: onboardingData.alcoholFrequency,
                sleepHours: onboardingData.sleepHours,
                jobActivityLevel: onboardingData.jobActivityLevel,
                eatingOutFrequency: onboardingData.eatingOutFrequency,
                stressLevel: onboardingData.stressLevel,
                waterIntake: onboardingData.waterIntake
            )
            
            let result = try await OnboardingAPIService.shared.saveLifestyle(apiData)
            
            if result.success {
                AnalyticsManager.shared.trackEvent("onboarding_lifestyle_completed", properties: [
                    "step": currentStep.rawValue,
                    "activity_level": onboardingData.activityLevel
                ])
                nextStep()
            } else {
                errorMessage = "Failed to save lifestyle information. Please try again."
            }
        } catch {
            errorMessage = "Network error. Please check your connection and try again."
        }
        
        isLoading = false
    }
    
    func saveHealth() async {
        isLoading = true
        errorMessage = ""
        
        do {
            let apiData = OnboardingHealthAPI(
                healthConditions: onboardingData.healthConditions,
                bloodPressureSystolic: onboardingData.bloodPressureSystolic,
                bloodPressureDiastolic: onboardingData.bloodPressureDiastolic,
                fastingBloodSugar: onboardingData.fastingBloodSugar,
                emergencyContactName: onboardingData.emergencyContactName.isEmpty ? nil : onboardingData.emergencyContactName,
                emergencyContactPhone: onboardingData.emergencyContactPhone.isEmpty ? nil : onboardingData.emergencyContactPhone
            )
            
            let result = try await OnboardingAPIService.shared.saveHealth(apiData)
            
            if result.success {
                AnalyticsManager.shared.trackEvent("onboarding_health_completed", properties: [
                    "step": currentStep.rawValue,
                    "has_health_conditions": !onboardingData.healthConditions.isEmpty
                ])
                nextStep()
            } else {
                errorMessage = "Failed to save health information. Please try again."
            }
        } catch {
            errorMessage = "Network error. Please check your connection and try again."
        }
        
        isLoading = false
    }
    
    func savePreferences() async {
        isLoading = true
        errorMessage = ""
        
        do {
            let apiData = OnboardingPreferencesAPI(
                dietaryPreference: onboardingData.dietaryPreference,
                favoriteCuisines: onboardingData.favoriteCuisines,
                allergens: onboardingData.allergens,
                spiceTolerance: onboardingData.spiceTolerance,
                favoriteIngredients: onboardingData.favoriteIngredients,
                dislikedIngredients: onboardingData.dislikedIngredients,
                cravings: onboardingData.cravings,
                mealsPerDay: onboardingData.mealsPerDay,
                cookingSkillLevel: onboardingData.cookingSkillLevel
            )
            
            let result = try await OnboardingAPIService.shared.savePreferences(apiData)
            
            if result.success {
                AnalyticsManager.shared.trackEvent("onboarding_preferences_completed", properties: [
                    "step": currentStep.rawValue,
                    "dietary_preference": onboardingData.dietaryPreference
                ])
                nextStep()
            } else {
                errorMessage = "Failed to save preferences. Please try again."
            }
        } catch {
            errorMessage = "Network error. Please check your connection and try again."
        }
        
        isLoading = false
    }
    
    func saveGoals() async {
        isLoading = true
        errorMessage = ""
        
        do {
            let apiData = OnboardingGoalsAPI(
                primaryGoal: onboardingData.primaryGoal,
                goalPriority: onboardingData.goalPriority,
                intensity: onboardingData.intensity,
                targetWeight: onboardingData.targetWeight,
                targetDate: ISO8601DateFormatter().string(from: onboardingData.targetDate),
                dailyCalorieTarget: onboardingData.dailyCalorieTarget,
                weeklyExerciseTarget: onboardingData.weeklyExerciseTarget,
                motivation: onboardingData.motivation.isEmpty ? nil : onboardingData.motivation
            )
            
            let result = try await OnboardingAPIService.shared.saveGoals(apiData)
            
            if result.onboardingComplete {
                AnalyticsManager.shared.trackEvent("onboarding_completed", properties: [
                    "primary_goal": onboardingData.primaryGoal,
                    "completed_at": ISO8601DateFormatter().string(from: Date())
                ])
                completeOnboarding()
            } else {
                errorMessage = "Failed to save goals. Please try again."
            }
        } catch {
            errorMessage = "Network error. Please check your connection and try again."
        }
        
        isLoading = false
    }
    
    // MARK: - Private Methods
    private func updateProgress() {
        progress = Double(currentStep.rawValue) / Double(totalSteps)
    }
    
    private func completeOnboarding() {
        withAnimation(.easeInOut(duration: 0.5)) {
            currentStep = .complete
            progress = 1.0
        }
        
        // Save completion status to UserDefaults
        UserDefaults.standard.set(true, forKey: "onboardingCompleted")
        
        // Delay before showing main app
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            withAnimation(.easeInOut(duration: 0.5)) {
                self.isOnboardingComplete = true
            }
        }
    }
    
    private func checkOnboardingStatus() {
        // Check if user has already completed onboarding
        let isCompleted = UserDefaults.standard.bool(forKey: "onboardingCompleted")
        if isCompleted {
            isOnboardingComplete = true
        }
        
        // TODO: Also check with backend API for onboarding progress
        // This will help handle cases where user completed onboarding on another device
    }
}

// MARK: - Analytics Helper
class AnalyticsManager {
    static let shared = AnalyticsManager()
    
    private init() {}
    
    func trackEvent(_ eventName: String, properties: [String: Any]? = nil) {
        // Privacy-safe analytics tracking
        // Only track flow events, no PII
        print("📊 Analytics: \(eventName) - \(properties ?? [:])")
        
        // TODO: Integrate with analytics service (Firebase, Mixpanel, etc.)
        // Ensure compliance with privacy policies
    }
}