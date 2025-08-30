import SwiftUI

struct OnboardingSplashView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    @State private var isAnimating = false
    @State private var showStartButton = false
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(hex: "#14b8a6"), // Primary turquoise
                    Color(hex: "#0d9488"), // Darker turquoise
                    Color(hex: "#065f46")  // Dark green
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 40) {
                Spacer()
                
                // Logo and animation
                VStack(spacing: 20) {
                    ZStack {
                        // Outer circle with pulse animation
                        Circle()
                            .fill(Color.white.opacity(0.2))
                            .frame(width: 160, height: 160)
                            .scaleEffect(isAnimating ? 1.2 : 1.0)
                            .opacity(isAnimating ? 0.3 : 0.7)
                            .animation(
                                Animation.easeInOut(duration: 2.0)
                                    .repeatForever(autoreverses: true),
                                value: isAnimating
                            )
                        
                        // Inner circle
                        Circle()
                            .fill(Color.white.opacity(0.3))
                            .frame(width: 120, height: 120)
                        
                        // Logo/Icon
                        Image(systemName: "heart.fill")
                            .font(.system(size: 50, weight: .bold))
                            .foregroundColor(.white)
                    }
                    
                    // App title with typing animation
                    VStack(spacing: 8) {
                        Text("HealthCoach AI")
                            .font(.custom("Inter", size: 32))
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .opacity(showStartButton ? 1.0 : 0.0)
                            .animation(.easeInOut(duration: 1.0).delay(1.0), value: showStartButton)
                        
                        Text("Your personalized health journey")
                            .font(.custom("Inter", size: 16))
                            .foregroundColor(.white.opacity(0.9))
                            .multilineTextAlignment(.center)
                            .opacity(showStartButton ? 1.0 : 0.0)
                            .animation(.easeInOut(duration: 1.0).delay(1.5), value: showStartButton)
                    }
                }
                
                Spacer()
                
                // Features preview
                VStack(spacing: 16) {
                    ForEach(features, id: \.title) { feature in
                        FeatureRow(
                            icon: feature.icon,
                            title: feature.title,
                            description: feature.description
                        )
                        .opacity(showStartButton ? 1.0 : 0.0)
                        .offset(x: showStartButton ? 0 : 50)
                        .animation(
                            .easeOut(duration: 0.8)
                                .delay(2.0 + Double(features.firstIndex(where: { $0.title == feature.title }) ?? 0) * 0.2),
                            value: showStartButton
                        )
                    }
                }
                .padding(.horizontal, 20)
                
                Spacer()
                
                // Start button
                VStack(spacing: 16) {
                    Button(action: {
                        coordinator.nextStep()
                    }) {
                        HStack {
                            Text("Start Your Journey")
                                .font(.custom("Inter", size: 18))
                                .fontWeight(.semibold)
                            
                            Image(systemName: "arrow.right")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .foregroundColor(Color(hex: "#14b8a6"))
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 28))
                        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                    }
                    .padding(.horizontal, 20)
                    .scaleEffect(showStartButton ? 1.0 : 0.8)
                    .opacity(showStartButton ? 1.0 : 0.0)
                    .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(3.0), value: showStartButton)
                    
                    // Terms and privacy
                    Text("By continuing, you agree to our Terms of Service and Privacy Policy")
                        .font(.custom("Inter", size: 12))
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                        .opacity(showStartButton ? 1.0 : 0.0)
                        .animation(.easeInOut(duration: 1.0).delay(3.5), value: showStartButton)
                }
                .padding(.bottom, 30)
            }
        }
        .onAppear {
            // Start animations
            isAnimating = true
            showStartButton = true
        }
    }
}

// MARK: - Feature Row Component
struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(spacing: 16) {
            // Icon
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.2))
                    .frame(width: 40, height: 40)
                
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(.white)
            }
            
            // Text content
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.custom("Inter", size: 16))
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                
                Text(description)
                    .font(.custom("Inter", size: 14))
                    .foregroundColor(.white.opacity(0.8))
                    .lineLimit(2)
            }
            
            Spacer()
        }
        .padding(.horizontal, 20)
    }
}

// MARK: - Feature Data
struct Feature {
    let icon: String
    let title: String
    let description: String
}

private let features = [
    Feature(
        icon: "brain.head.profile",
        title: "AI-Powered Insights",
        description: "Get personalized recommendations based on your health data"
    ),
    Feature(
        icon: "fork.knife.circle",
        title: "Smart Meal Planning",
        description: "Custom meal plans that fit your preferences and goals"
    ),
    Feature(
        icon: "figure.run.circle",
        title: "Fitness Guidance",
        description: "Workout plans tailored to your fitness level and schedule"
    ),
    Feature(
        icon: "chart.line.uptrend.xyaxis",
        title: "Progress Tracking",
        description: "Monitor your journey with detailed analytics and insights"
    )
]

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    OnboardingSplashView()
        .environmentObject(OnboardingCoordinator())
}