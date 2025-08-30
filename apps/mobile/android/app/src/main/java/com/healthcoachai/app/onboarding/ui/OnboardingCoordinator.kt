package com.healthcoachai.app.onboarding.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import java.util.Date

/**
 * OnboardingCoordinator - Manages the onboarding flow state and navigation
 * Implements Phase 8 requirements for guided onboarding with conversational UX
 */
@HiltViewModel
class OnboardingCoordinator @Inject constructor(
    // TODO: Inject OnboardingRepository when implemented
) : ViewModel() {
    
    // MARK: - State
    private val _currentStep = MutableStateFlow(OnboardingStep.SPLASH)
    val currentStep: StateFlow<OnboardingStep> = _currentStep.asStateFlow()
    
    private val _isOnboardingComplete = MutableStateFlow(false)
    val isOnboardingComplete: StateFlow<Boolean> = _isOnboardingComplete.asStateFlow()
    
    private val _onboardingData = MutableStateFlow(OnboardingData())
    val onboardingData: StateFlow<OnboardingData> = _onboardingData.asStateFlow()
    
    private val _progress = MutableStateFlow(0f)
    val progress: StateFlow<Float> = _progress.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _errorMessage = MutableStateFlow("")
    val errorMessage: StateFlow<String> = _errorMessage.asStateFlow()
    
    private val totalSteps = OnboardingStep.values().size - 1 // Exclude COMPLETE
    
    init {
        updateProgress()
        checkOnboardingStatus()
    }
    
    // MARK: - Navigation
    fun nextStep() {
        val currentStepValue = _currentStep.value
        if (currentStepValue.ordinal < OnboardingStep.COMPLETE.ordinal) {
            val nextStep = OnboardingStep.values()[currentStepValue.ordinal + 1]
            _currentStep.value = nextStep
            updateProgress()
        } else {
            completeOnboarding()
        }
    }
    
    fun previousStep() {
        val currentStepValue = _currentStep.value
        if (currentStepValue.ordinal > OnboardingStep.SPLASH.ordinal) {
            val previousStep = OnboardingStep.values()[currentStepValue.ordinal - 1]
            _currentStep.value = previousStep
            updateProgress()
        }
    }
    
    fun skipStep() {
        // Log analytics event for skipped step
        trackEvent("onboarding_step_skipped", mapOf(
            "step" to _currentStep.value.ordinal,
            "step_name" to _currentStep.value.name
        ))
        
        nextStep()
    }
    
    fun goToStep(step: OnboardingStep) {
        _currentStep.value = step
        updateProgress()
    }
    
    // MARK: - Data Management
    fun saveBasicInfo() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = ""
            
            try {
                // TODO: Implement API call
                // val result = onboardingRepository.saveBasicInfo(onboardingData.value)
                
                trackEvent("onboarding_basic_info_completed", mapOf(
                    "step" to _currentStep.value.ordinal
                ))
                
                nextStep()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to save basic information. Please try again."
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun saveLifestyle() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = ""
            
            try {
                // TODO: Implement API call
                trackEvent("onboarding_lifestyle_completed", mapOf(
                    "step" to _currentStep.value.ordinal,
                    "activity_level" to onboardingData.value.activityLevel
                ))
                
                nextStep()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to save lifestyle information. Please try again."
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun saveHealth() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = ""
            
            try {
                // TODO: Implement API call
                trackEvent("onboarding_health_completed", mapOf(
                    "step" to _currentStep.value.ordinal,
                    "has_health_conditions" to onboardingData.value.healthConditions.isNotEmpty()
                ))
                
                nextStep()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to save health information. Please try again."
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun savePreferences() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = ""
            
            try {
                // TODO: Implement API call
                trackEvent("onboarding_preferences_completed", mapOf(
                    "step" to _currentStep.value.ordinal,
                    "dietary_preference" to onboardingData.value.dietaryPreference
                ))
                
                nextStep()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to save preferences. Please try again."
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun saveGoals() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = ""
            
            try {
                // TODO: Implement API call
                trackEvent("onboarding_completed", mapOf(
                    "primary_goal" to onboardingData.value.primaryGoal,
                    "completed_at" to Date().toString()
                ))
                
                completeOnboarding()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to save goals. Please try again."
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun updateBasicInfo(update: (OnboardingData) -> OnboardingData) {
        _onboardingData.value = update(_onboardingData.value)
    }
    
    fun updateLifestyle(update: (OnboardingData) -> OnboardingData) {
        _onboardingData.value = update(_onboardingData.value)
    }
    
    fun updateHealth(update: (OnboardingData) -> OnboardingData) {
        _onboardingData.value = update(_onboardingData.value)
    }
    
    fun updatePreferences(update: (OnboardingData) -> OnboardingData) {
        _onboardingData.value = update(_onboardingData.value)
    }
    
    fun updateGoals(update: (OnboardingData) -> OnboardingData) {
        _onboardingData.value = update(_onboardingData.value)
    }
    
    // MARK: - Private Methods
    private fun updateProgress() {
        _progress.value = _currentStep.value.ordinal.toFloat() / totalSteps.toFloat()
    }
    
    private fun completeOnboarding() {
        _currentStep.value = OnboardingStep.COMPLETE
        _progress.value = 1.0f
        
        // Save completion status
        // TODO: Save to SharedPreferences or DataStore
        
        // Delay before showing main app
        viewModelScope.launch {
            kotlinx.coroutines.delay(2000)
            _isOnboardingComplete.value = true
        }
    }
    
    private fun checkOnboardingStatus() {
        // TODO: Check if user has already completed onboarding
        // This should check both local storage and backend API
        // _isOnboardingComplete.value = checkIfCompleted()
    }
    
    private fun trackEvent(eventName: String, properties: Map<String, Any>) {
        // Privacy-safe analytics tracking
        // Only track flow events, no PII
        println("📊 Analytics: $eventName - $properties")
        
        // TODO: Integrate with analytics service (Firebase, etc.)
        // Ensure compliance with privacy policies
    }
}

// MARK: - Data Models
enum class OnboardingStep(val title: String, val description: String) {
    SPLASH("Welcome", "Let's start your health journey"),
    AUTHENTICATION("Sign In", "Secure access to your account"),
    CONSENT("Privacy", "Your privacy matters to us"),
    BASIC_INFO("Basic Info", "Tell us about yourself"),
    LIFESTYLE("Lifestyle", "Your daily habits"),
    HEALTH("Health", "Health information"),
    PREFERENCES("Food Preferences", "Food choices & preferences"),
    GOALS("Goals", "What you want to achieve"),
    COMPLETE("Complete", "Ready to start!")
}

data class OnboardingData(
    // Basic Info
    val firstName: String = "",
    val lastName: String = "",
    val email: String = "",
    val birthday: Date = Date(),
    val gender: String = "",
    val height: Double = 170.0,
    val weight: Double = 70.0,
    val city: String = "",
    val state: String = "",
    
    // Lifestyle
    val activityLevel: String = "moderately_active",
    val smokingFrequency: Int = 0,
    val alcoholFrequency: Int = 0,
    val sleepHours: Double = 8.0,
    val jobActivityLevel: Int = 3,
    val eatingOutFrequency: Int = 3,
    val stressLevel: Int = 5,
    val waterIntake: Double = 2.5,
    
    // Health
    val healthConditions: List<String> = emptyList(),
    val bloodPressureSystolic: Int = 120,
    val bloodPressureDiastolic: Int = 80,
    val fastingBloodSugar: Int = 90,
    val emergencyContactName: String = "",
    val emergencyContactPhone: String = "",
    
    // Preferences
    val dietaryPreference: String = "vegetarian",
    val favoriteCuisines: List<String> = emptyList(),
    val allergens: List<String> = emptyList(),
    val spiceTolerance: String = "medium",
    val favoriteIngredients: List<String> = emptyList(),
    val dislikedIngredients: List<String> = emptyList(),
    val cravings: List<String> = emptyList(),
    val mealsPerDay: Int = 3,
    val cookingSkillLevel: Int = 3,
    
    // Goals
    val primaryGoal: String = "weight_loss",
    val goalPriority: String = "medium",
    val intensity: String = "moderate",
    val targetWeight: Double = 65.0,
    val targetDate: Date = Date(),
    val dailyCalorieTarget: Int = 1800,
    val weeklyExerciseTarget: Int = 150,
    val motivation: String = ""
)