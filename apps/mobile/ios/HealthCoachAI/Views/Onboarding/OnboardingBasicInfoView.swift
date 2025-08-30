import SwiftUI

struct OnboardingBasicInfoView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var selectedGender = "male"
    @State private var height = 170.0
    @State private var weight = 70.0
    @State private var birthday = Date()
    @State private var city = ""
    @State private var state = ""
    
    private var isFormValid: Bool {
        !firstName.isEmpty && !lastName.isEmpty && !selectedGender.isEmpty
    }
    
    private let genderOptions = [
        ("male", "Male", "person.fill"),
        ("female", "Female", "person.fill"),
        ("other", "Other", "person.fill"),
        ("prefer_not_to_say", "Prefer not to say", "person.fill")
    ]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Progress bar
                OnboardingProgressBar(
                    progress: coordinator.progress,
                    currentStep: coordinator.currentStep.rawValue + 1,
                    totalSteps: 6
                )
                .padding(.horizontal, 20)
                
                // Header
                OnboardingHeader(
                    title: "Tell us about yourself",
                    subtitle: "This helps us create a personalized experience just for you",
                    showBackButton: true,
                    onBack: {
                        coordinator.previousStep()
                    }
                )
                .padding(.horizontal, 20)
                
                // Form content
                VStack(spacing: 20) {
                    OnboardingCard {
                        VStack(spacing: 20) {
                            // Name section
                            VStack(spacing: 16) {
                                Text("Basic Information")
                                    .font(.custom("Inter", size: 18))
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                
                                OnboardingTextField(
                                    title: "First Name",
                                    placeholder: "Enter your first name",
                                    text: $firstName,
                                    isRequired: true
                                ) { value in
                                    value.isEmpty ? "First name is required" : nil
                                }
                                
                                OnboardingTextField(
                                    title: "Last Name",
                                    placeholder: "Enter your last name",
                                    text: $lastName,
                                    isRequired: true
                                ) { value in
                                    value.isEmpty ? "Last name is required" : nil
                                }
                                
                                OnboardingTextField(
                                    title: "Email",
                                    placeholder: "Enter your email (optional)",
                                    text: $email,
                                    keyboardType: .emailAddress
                                ) { value in
                                    if !value.isEmpty && !isValidEmail(value) {
                                        return "Please enter a valid email address"
                                    }
                                    return nil
                                }
                            }
                            
                            Divider()
                                .padding(.vertical, 8)
                            
                            // Gender selection
                            VStack(spacing: 16) {
                                Text("Gender")
                                    .font(.custom("Inter", size: 18))
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                
                                LazyVGrid(columns: [
                                    GridItem(.flexible()),
                                    GridItem(.flexible())
                                ], spacing: 12) {
                                    ForEach(genderOptions, id: \.0) { option in
                                        SelectionButton(
                                            title: option.1,
                                            icon: option.2,
                                            isSelected: selectedGender == option.0
                                        ) {
                                            selectedGender = option.0
                                        }
                                    }
                                }
                            }
                            
                            Divider()
                                .padding(.vertical, 8)
                            
                            // Physical stats
                            VStack(spacing: 16) {
                                Text("Physical Stats")
                                    .font(.custom("Inter", size: 18))
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                
                                // Height and Weight
                                HStack(spacing: 16) {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("Height (cm)")
                                            .font(.custom("Inter", size: 16))
                                            .fontWeight(.medium)
                                            .foregroundColor(.primary)
                                        
                                        Slider(value: $height, in: 120...220, step: 1) {
                                            Text("Height")
                                        } minimumValueLabel: {
                                            Text("120")
                                                .font(.custom("Inter", size: 12))
                                                .foregroundColor(.secondary)
                                        } maximumValueLabel: {
                                            Text("220")
                                                .font(.custom("Inter", size: 12))
                                                .foregroundColor(.secondary)
                                        }
                                        .accentColor(Color(hex: "#14b8a6"))
                                        
                                        Text("\(Int(height)) cm")
                                            .font(.custom("Inter", size: 16))
                                            .fontWeight(.semibold)
                                            .foregroundColor(Color(hex: "#14b8a6"))
                                            .frame(maxWidth: .infinity, alignment: .center)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("Weight (kg)")
                                            .font(.custom("Inter", size: 16))
                                            .fontWeight(.medium)
                                            .foregroundColor(.primary)
                                        
                                        Slider(value: $weight, in: 30...200, step: 0.5) {
                                            Text("Weight")
                                        } minimumValueLabel: {
                                            Text("30")
                                                .font(.custom("Inter", size: 12))
                                                .foregroundColor(.secondary)
                                        } maximumValueLabel: {
                                            Text("200")
                                                .font(.custom("Inter", size: 12))
                                                .foregroundColor(.secondary)
                                        }
                                        .accentColor(Color(hex: "#14b8a6"))
                                        
                                        Text("\(weight, specifier: "%.1f") kg")
                                            .font(.custom("Inter", size: 16))
                                            .fontWeight(.semibold)
                                            .foregroundColor(Color(hex: "#14b8a6"))
                                            .frame(maxWidth: .infinity, alignment: .center)
                                    }
                                }
                                
                                // Birthday
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Date of Birth")
                                        .font(.custom("Inter", size: 16))
                                        .fontWeight(.medium)
                                        .foregroundColor(.primary)
                                    
                                    DatePicker(
                                        "Birthday",
                                        selection: $birthday,
                                        in: ...Date(),
                                        displayedComponents: .date
                                    )
                                    .datePickerStyle(WheelDatePickerStyle())
                                    .labelsHidden()
                                    .accentColor(Color(hex: "#14b8a6"))
                                }
                            }
                            
                            Divider()
                                .padding(.vertical, 8)
                            
                            // Location (optional)
                            VStack(spacing: 16) {
                                Text("Location (Optional)")
                                    .font(.custom("Inter", size: 18))
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                
                                OnboardingTextField(
                                    title: "City",
                                    placeholder: "Enter your city",
                                    text: $city
                                )
                                
                                OnboardingTextField(
                                    title: "State",
                                    placeholder: "Enter your state",
                                    text: $state
                                )
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    // Error message
                    if !coordinator.errorMessage.isEmpty {
                        OnboardingErrorMessage(message: coordinator.errorMessage)
                            .padding(.horizontal, 20)
                    }
                    
                    // Action buttons
                    VStack(spacing: 16) {
                        OnboardingPrimaryButton(
                            title: "Continue",
                            isEnabled: isFormValid,
                            isLoading: coordinator.isLoading
                        ) {
                            saveData()
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
        .onAppear {
            loadExistingData()
        }
    }
    
    private func loadExistingData() {
        firstName = coordinator.onboardingData.firstName
        lastName = coordinator.onboardingData.lastName
        email = coordinator.onboardingData.email
        selectedGender = coordinator.onboardingData.gender
        height = coordinator.onboardingData.height
        weight = coordinator.onboardingData.weight
        birthday = coordinator.onboardingData.birthday
        city = coordinator.onboardingData.city
        state = coordinator.onboardingData.state
    }
    
    private func saveData() {
        // Update coordinator data
        coordinator.onboardingData.firstName = firstName
        coordinator.onboardingData.lastName = lastName
        coordinator.onboardingData.email = email
        coordinator.onboardingData.gender = selectedGender
        coordinator.onboardingData.height = height
        coordinator.onboardingData.weight = weight
        coordinator.onboardingData.birthday = birthday
        coordinator.onboardingData.city = city
        coordinator.onboardingData.state = state
        
        // Save to backend
        Task {
            await coordinator.saveBasicInfo()
        }
    }
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
}

#Preview {
    OnboardingBasicInfoView()
        .environmentObject(OnboardingCoordinator())
}