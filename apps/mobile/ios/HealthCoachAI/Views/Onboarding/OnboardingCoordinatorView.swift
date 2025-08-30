import SwiftUI

struct OnboardingCoordinatorView: View {
    @StateObject private var coordinator = OnboardingCoordinator()
    @State private var isOnboardingComplete = false
    
    var body: some View {
        Group {
            if isOnboardingComplete {
                ContentView()
            } else {
                NavigationView {
                    currentOnboardingView
                        .navigationBarHidden(true)
                }
            }
        }
        .onReceive(coordinator.$isOnboardingComplete) { completed in
            isOnboardingComplete = completed
        }
    }
    
    @ViewBuilder
    private var currentOnboardingView: some View {
        switch coordinator.currentStep {
        case .splash:
            OnboardingSplashView()
                .environmentObject(coordinator)
        case .authentication:
            OnboardingAuthView()
                .environmentObject(coordinator)
        case .consent:
            OnboardingConsentView()
                .environmentObject(coordinator)
        case .basicInfo:
            OnboardingBasicInfoView()
                .environmentObject(coordinator)
        case .lifestyle:
            OnboardingLifestyleView()
                .environmentObject(coordinator)
        case .health:
            OnboardingHealthView()
                .environmentObject(coordinator)
        case .preferences:
            OnboardingPreferencesView()
                .environmentObject(coordinator)
        case .goals:
            OnboardingGoalsView()
                .environmentObject(coordinator)
        case .complete:
            OnboardingCompleteView()
                .environmentObject(coordinator)
        }
    }
}

#Preview {
    OnboardingCoordinatorView()
}