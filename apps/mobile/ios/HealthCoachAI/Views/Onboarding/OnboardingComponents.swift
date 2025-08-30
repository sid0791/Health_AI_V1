import SwiftUI

// MARK: - Onboarding Progress Bar
struct OnboardingProgressBar: View {
    let progress: Double
    let currentStep: Int
    let totalSteps: Int
    
    var body: some View {
        VStack(spacing: 8) {
            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 4)
                        .clipShape(RoundedRectangle(cornerRadius: 2))
                    
                    // Progress
                    Rectangle()
                        .fill(LinearGradient(
                            gradient: Gradient(colors: [
                                Color(hex: "#14b8a6"),
                                Color(hex: "#0d9488")
                            ]),
                            startPoint: .leading,
                            endPoint: .trailing
                        ))
                        .frame(width: geometry.size.width * progress, height: 4)
                        .clipShape(RoundedRectangle(cornerRadius: 2))
                        .animation(.easeInOut(duration: 0.3), value: progress)
                }
            }
            .frame(height: 4)
            
            // Step indicator
            HStack {
                Text("Step \(currentStep) of \(totalSteps)")
                    .font(.custom("Inter", size: 12))
                    .fontWeight(.medium)
                    .foregroundColor(.gray)
                
                Spacer()
                
                Text("\(Int(progress * 100))%")
                    .font(.custom("Inter", size: 12))
                    .fontWeight(.medium)
                    .foregroundColor(.gray)
            }
        }
    }
}

// MARK: - Onboarding Header
struct OnboardingHeader: View {
    let title: String
    let subtitle: String
    let showBackButton: Bool
    let onBack: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Back button
            if showBackButton {
                HStack {
                    Button(action: onBack) {
                        HStack(spacing: 8) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 16, weight: .medium))
                            Text("Back")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.medium)
                        }
                        .foregroundColor(Color(hex: "#14b8a6"))
                    }
                    
                    Spacer()
                }
                .padding(.bottom, 8)
            }
            
            // Title and subtitle
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.custom("Inter", size: 28))
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                
                Text(subtitle)
                    .font(.custom("Inter", size: 16))
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }
        }
    }
}

// MARK: - Onboarding Card
struct OnboardingCard<Content: View>: View {
    let content: Content
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    var body: some View {
        VStack(spacing: 0) {
            content
        }
        .padding(24)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: Color.black.opacity(0.08), radius: 20, x: 0, y: 8)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray.opacity(0.1), lineWidth: 1)
        )
    }
}

// MARK: - Custom Text Field
struct OnboardingTextField: View {
    let title: String
    let placeholder: String
    @Binding var text: String
    let keyboardType: UIKeyboardType
    let isRequired: Bool
    let validator: ((String) -> String?)?
    
    @State private var isEditing = false
    @State private var validationError: String?
    
    init(
        title: String,
        placeholder: String,
        text: Binding<String>,
        keyboardType: UIKeyboardType = .default,
        isRequired: Bool = false,
        validator: ((String) -> String?)? = nil
    ) {
        self.title = title
        self.placeholder = placeholder
        self._text = text
        self.keyboardType = keyboardType
        self.isRequired = isRequired
        self.validator = validator
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title
            HStack {
                Text(title)
                    .font(.custom("Inter", size: 16))
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                
                if isRequired {
                    Text("*")
                        .font(.custom("Inter", size: 16))
                        .foregroundColor(.red)
                }
                
                Spacer()
            }
            
            // Text field
            TextField(placeholder, text: $text)
                .font(.custom("Inter", size: 16))
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(Color.gray.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(
                            validationError != nil ? Color.red :
                            isEditing ? Color(hex: "#14b8a6") : Color.gray.opacity(0.2),
                            lineWidth: 1
                        )
                )
                .keyboardType(keyboardType)
                .onTapGesture {
                    isEditing = true
                }
                .onChange(of: text) { newValue in
                    validateInput(newValue)
                }
            
            // Validation error
            if let error = validationError {
                Text(error)
                    .font(.custom("Inter", size: 12))
                    .foregroundColor(.red)
                    .padding(.leading, 4)
            }
        }
    }
    
    private func validateInput(_ input: String) {
        if let validator = validator {
            validationError = validator(input)
        }
    }
}

// MARK: - Selection Button
struct SelectionButton: View {
    let title: String
    let subtitle: String?
    let icon: String?
    let isSelected: Bool
    let action: () -> Void
    
    init(
        title: String,
        subtitle: String? = nil,
        icon: String? = nil,
        isSelected: Bool,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.subtitle = subtitle
        self.icon = icon
        self.isSelected = isSelected
        self.action = action
    }
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                // Icon
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(isSelected ? Color(hex: "#14b8a6") : .gray)
                        .frame(width: 24, height: 24)
                }
                
                // Text content
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.custom("Inter", size: 16))
                        .fontWeight(.medium)
                        .foregroundColor(isSelected ? Color(hex: "#14b8a6") : .primary)
                        .multilineTextAlignment(.leading)
                    
                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.custom("Inter", size: 14))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.leading)
                    }
                }
                
                Spacer()
                
                // Selection indicator
                ZStack {
                    Circle()
                        .stroke(
                            isSelected ? Color(hex: "#14b8a6") : Color.gray.opacity(0.3),
                            lineWidth: 2
                        )
                        .frame(width: 20, height: 20)
                    
                    if isSelected {
                        Circle()
                            .fill(Color(hex: "#14b8a6"))
                            .frame(width: 12, height: 12)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(
                isSelected ? Color(hex: "#14b8a6").opacity(0.05) : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(
                        isSelected ? Color(hex: "#14b8a6") : Color.gray.opacity(0.2),
                        lineWidth: 1
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Primary Button
struct OnboardingPrimaryButton: View {
    let title: String
    let isEnabled: Bool
    let isLoading: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                } else {
                    Text(title)
                        .font(.custom("Inter", size: 18))
                        .fontWeight(.semibold)
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                isEnabled ? 
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(hex: "#14b8a6"),
                        Color(hex: "#0d9488")
                    ]),
                    startPoint: .leading,
                    endPoint: .trailing
                ) :
                LinearGradient(
                    gradient: Gradient(colors: [Color.gray.opacity(0.4)]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(
                color: isEnabled ? Color(hex: "#14b8a6").opacity(0.3) : Color.clear,
                radius: 8,
                x: 0,
                y: 4
            )
        }
        .disabled(!isEnabled || isLoading)
        .animation(.easeInOut(duration: 0.2), value: isEnabled)
    }
}

// MARK: - Secondary Button
struct OnboardingSecondaryButton: View {
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.custom("Inter", size: 16))
                .fontWeight(.medium)
                .foregroundColor(Color(hex: "#14b8a6"))
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(Color.clear)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(hex: "#14b8a6"), lineWidth: 1.5)
                )
        }
    }
}

// MARK: - Skip Button
struct OnboardingSkipButton: View {
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text("Skip for now")
                .font(.custom("Inter", size: 16))
                .fontWeight(.medium)
                .foregroundColor(.gray)
                .underline()
        }
    }
}

// MARK: - Error Message
struct OnboardingErrorMessage: View {
    let message: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 16))
                .foregroundColor(.red)
            
            Text(message)
                .font(.custom("Inter", size: 14))
                .foregroundColor(.red)
                .multilineTextAlignment(.leading)
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.red.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.red.opacity(0.3), lineWidth: 1)
        )
    }
}