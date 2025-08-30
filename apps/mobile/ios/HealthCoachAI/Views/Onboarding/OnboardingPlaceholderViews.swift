import SwiftUI

// MARK: - Auth View Placeholder
struct OnboardingAuthView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    var body: some View {
        VStack(spacing: 24) {
            OnboardingProgressBar(
                progress: coordinator.progress,
                currentStep: coordinator.currentStep.rawValue + 1,
                totalSteps: 6
            )
            .padding(.horizontal, 20)
            
            OnboardingHeader(
                title: "Welcome Back",
                subtitle: "Sign in to continue your health journey",
                showBackButton: true,
                onBack: { coordinator.previousStep() }
            )
            .padding(.horizontal, 20)
            
            Spacer()
            
            Text("Authentication flow will be implemented here")
                .font(.custom("Inter", size: 16))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
            
            OnboardingPrimaryButton(
                title: "Continue",
                isEnabled: true,
                isLoading: false
            ) {
                coordinator.nextStep()
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
    }
}

// MARK: - Consent View Placeholder
struct OnboardingConsentView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    var body: some View {
        VStack(spacing: 24) {
            OnboardingProgressBar(
                progress: coordinator.progress,
                currentStep: coordinator.currentStep.rawValue + 1,
                totalSteps: 6
            )
            .padding(.horizontal, 20)
            
            OnboardingHeader(
                title: "Privacy & Consent",
                subtitle: "Your privacy and data security are our top priorities",
                showBackButton: true,
                onBack: { coordinator.previousStep() }
            )
            .padding(.horizontal, 20)
            
            Spacer()
            
            Text("Privacy consent flow will be implemented here")
                .font(.custom("Inter", size: 16))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
            
            OnboardingPrimaryButton(
                title: "Accept & Continue",
                isEnabled: true,
                isLoading: false
            ) {
                coordinator.nextStep()
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
    }
}

// MARK: - Lifestyle View Placeholder
struct OnboardingLifestyleView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    var body: some View {
        VStack(spacing: 24) {
            OnboardingProgressBar(
                progress: coordinator.progress,
                currentStep: coordinator.currentStep.rawValue + 1,
                totalSteps: 6
            )
            .padding(.horizontal, 20)
            
            OnboardingHeader(
                title: "Your Lifestyle",
                subtitle: "Tell us about your daily habits and routines",
                showBackButton: true,
                onBack: { coordinator.previousStep() }
            )
            .padding(.horizontal, 20)
            
            Spacer()
            
            Text("Lifestyle questionnaire will be implemented here")
                .font(.custom("Inter", size: 16))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
            
            VStack(spacing: 16) {
                OnboardingPrimaryButton(
                    title: "Continue",
                    isEnabled: true,
                    isLoading: false
                ) {
                    Task { await coordinator.saveLifestyle() }
                }
                
                OnboardingSkipButton {
                    coordinator.skipStep()
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
    }
}

// MARK: - Health View Placeholder
struct OnboardingHealthView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    var body: some View {
        VStack(spacing: 24) {
            OnboardingProgressBar(
                progress: coordinator.progress,
                currentStep: coordinator.currentStep.rawValue + 1,
                totalSteps: 6
            )
            .padding(.horizontal, 20)
            
            OnboardingHeader(
                title: "Health Information",
                subtitle: "Help us understand your health profile for better recommendations",
                showBackButton: true,
                onBack: { coordinator.previousStep() }
            )
            .padding(.horizontal, 20)
            
            Spacer()
            
            Text("Health questionnaire will be implemented here")
                .font(.custom("Inter", size: 16))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
            
            VStack(spacing: 16) {
                OnboardingPrimaryButton(
                    title: "Continue",
                    isEnabled: true,
                    isLoading: false
                ) {
                    Task { await coordinator.saveHealth() }
                }
                
                OnboardingSkipButton {
                    coordinator.skipStep()
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
    }
}

// MARK: - Preferences View Placeholder
struct OnboardingPreferencesView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    var body: some View {
        VStack(spacing: 24) {
            OnboardingProgressBar(
                progress: coordinator.progress,
                currentStep: coordinator.currentStep.rawValue + 1,
                totalSteps: 6
            )
            .padding(.horizontal, 20)
            
            OnboardingHeader(
                title: "Food Preferences",
                subtitle: "Tell us about your dietary preferences and restrictions",
                showBackButton: true,
                onBack: { coordinator.previousStep() }
            )
            .padding(.horizontal, 20)
            
            Spacer()
            
            Text("Food preferences selection will be implemented here")
                .font(.custom("Inter", size: 16))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
            
            VStack(spacing: 16) {
                OnboardingPrimaryButton(
                    title: "Continue",
                    isEnabled: true,
                    isLoading: false
                ) {
                    Task { await coordinator.savePreferences() }
                }
                
                OnboardingSkipButton {
                    coordinator.skipStep()
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
    }
}

// MARK: - Goals View Placeholder
struct OnboardingGoalsView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    var body: some View {
        VStack(spacing: 24) {
            OnboardingProgressBar(
                progress: coordinator.progress,
                currentStep: coordinator.currentStep.rawValue + 1,
                totalSteps: 6
            )
            .padding(.horizontal, 20)
            
            OnboardingHeader(
                title: "Your Goals",
                subtitle: "What would you like to achieve on your health journey?",
                showBackButton: true,
                onBack: { coordinator.previousStep() }
            )
            .padding(.horizontal, 20)
            
            Spacer()
            
            Text("Goals selection will be implemented here")
                .font(.custom("Inter", size: 16))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
            
            OnboardingPrimaryButton(
                title: "Complete Setup",
                isEnabled: true,
                isLoading: coordinator.isLoading
            ) {
                Task { await coordinator.saveGoals() }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
    }
}

// MARK: - Complete View
struct OnboardingCompleteView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    
    var body: some View {
        VStack(spacing: 40) {
            Spacer()
            
            // Success animation
            VStack(spacing: 24) {
                ZStack {
                    Circle()
                        .fill(Color(hex: "#14b8a6").opacity(0.1))
                        .frame(width: 120, height: 120)
                    
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(Color(hex: "#14b8a6"))
                }
                
                VStack(spacing: 12) {
                    Text("Setup Complete!")
                        .font(.custom("Inter", size: 32))
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                    
                    Text("Welcome to your personalized health journey")
                        .font(.custom("Inter", size: 16))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
            }
            
            Spacer()
            
            Text("Get ready to discover personalized insights, meal plans, and fitness routines tailored just for you.")
                .font(.custom("Inter", size: 16))
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
        }
    }
}