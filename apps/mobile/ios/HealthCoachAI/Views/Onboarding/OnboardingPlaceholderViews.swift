import SwiftUI

// MARK: - Auth View Implementation
struct OnboardingAuthView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    @State private var phoneNumber = ""
    @State private var isLoading = false
    @State private var showOTP = false
    @State private var otpCode = ""
    
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
            
            if !showOTP {
                // Phone number input
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Phone Number")
                            .font(.custom("Inter", size: 14))
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                        
                        HStack {
                            Text("+91")
                                .font(.custom("Inter", size: 16))
                                .foregroundColor(.secondary)
                                .padding(.leading, 12)
                            
                            TextField("Enter your phone number", text: $phoneNumber)
                                .font(.custom("Inter", size: 16))
                                .keyboardType(.phonePad)
                                .textContentType(.telephoneNumber)
                        }
                        .padding(.vertical, 12)
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                    }
                    
                    // Social login options
                    VStack(spacing: 12) {
                        HStack {
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                                .frame(height: 1)
                            Text("or continue with")
                                .font(.custom("Inter", size: 14))
                                .foregroundColor(.secondary)
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                                .frame(height: 1)
                        }
                        
                        HStack(spacing: 12) {
                            Button(action: {}) {
                                HStack {
                                    Image(systemName: "apple.logo")
                                        .foregroundColor(.white)
                                    Text("Apple")
                                        .font(.custom("Inter", size: 14))
                                        .fontWeight(.medium)
                                        .foregroundColor(.white)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.black)
                                .cornerRadius(8)
                            }
                            
                            Button(action: {}) {
                                HStack {
                                    Image(systemName: "globe")
                                        .foregroundColor(.blue)
                                    Text("Google")
                                        .font(.custom("Inter", size: 14))
                                        .fontWeight(.medium)
                                        .foregroundColor(.blue)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(8)
                            }
                        }
                    }
                }
                .padding(.horizontal, 40)
            } else {
                // OTP verification
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Enter OTP")
                            .font(.custom("Inter", size: 14))
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                        
                        Text("We've sent a 6-digit code to +91 \(phoneNumber)")
                            .font(.custom("Inter", size: 12))
                            .foregroundColor(.secondary)
                        
                        TextField("000000", text: $otpCode)
                            .font(.custom("Inter", size: 18))
                            .fontWeight(.medium)
                            .keyboardType(.numberPad)
                            .textContentType(.oneTimeCode)
                            .multilineTextAlignment(.center)
                            .padding(.vertical, 16)
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(8)
                    }
                    
                    Button(action: {}) {
                        Text("Resend OTP")
                            .font(.custom("Inter", size: 14))
                            .foregroundColor(.blue)
                    }
                }
                .padding(.horizontal, 40)
            }
            
            Spacer()
            
            OnboardingPrimaryButton(
                title: showOTP ? "Verify OTP" : (phoneNumber.isEmpty ? "Continue" : "Send OTP"),
                isEnabled: showOTP ? otpCode.count == 6 : !phoneNumber.isEmpty,
                isLoading: isLoading
            ) {
                if showOTP {
                    // Verify OTP and continue
                    coordinator.nextStep()
                } else if !phoneNumber.isEmpty {
                    // Send OTP
                    showOTP = true
                } else {
                    coordinator.nextStep()
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
    }
}

// MARK: - Consent View Implementation
struct OnboardingConsentView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    @State private var acceptedTerms = false
    @State private var acceptedPrivacy = false
    @State private var acceptedHealth = false
    
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
            
            ScrollView {
                VStack(spacing: 20) {
                    // Privacy explanation
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "shield.checkered")
                                .foregroundColor(.green)
                                .font(.title2)
                            Text("Bank-grade Security")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.semibold)
                        }
                        
                        Text("Your health data is encrypted and stored securely. We never share your personal information with third parties without your explicit consent.")
                            .font(.custom("Inter", size: 14))
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(12)
                    
                    // Consent checkboxes
                    VStack(spacing: 16) {
                        ConsentCheckbox(
                            title: "Terms of Service",
                            description: "I agree to the terms of service and understand how the app works",
                            isChecked: $acceptedTerms
                        )
                        
                        ConsentCheckbox(
                            title: "Privacy Policy",
                            description: "I understand how my data is collected, used, and protected",
                            isChecked: $acceptedPrivacy
                        )
                        
                        ConsentCheckbox(
                            title: "Health Data Consent",
                            description: "I consent to AI analysis of my health data for personalized recommendations",
                            isChecked: $acceptedHealth
                        )
                    }
                }
            }
            .padding(.horizontal, 20)
            
            OnboardingPrimaryButton(
                title: "Accept & Continue",
                isEnabled: acceptedTerms && acceptedPrivacy && acceptedHealth,
                isLoading: false
            ) {
                coordinator.nextStep()
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
    }
}

struct ConsentCheckbox: View {
    let title: String
    let description: String
    @Binding var isChecked: Bool
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Button(action: { isChecked.toggle() }) {
                Image(systemName: isChecked ? "checkmark.square.fill" : "square")
                    .foregroundColor(isChecked ? .blue : .gray)
                    .font(.title3)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.custom("Inter", size: 14))
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                
                Text(description)
                    .font(.custom("Inter", size: 12))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.leading)
            }
            
            Spacer()
        }
        .padding()
        .background(Color.gray.opacity(0.05))
        .cornerRadius(8)
    }
}

// MARK: - Lifestyle View Implementation
struct OnboardingLifestyleView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    @State private var smokingHabit = "None"
    @State private var alcoholFrequency = "Never"
    @State private var sleepTime = "10:00 PM"
    @State private var wakeTime = "6:00 AM"
    @State private var outsideFoodFrequency = "Rarely"
    @State private var workActivity = "Sedentary"
    
    let smokingOptions = ["None", "Occasional (1-5/day)", "Regular (6-15/day)", "Heavy (15+/day)"]
    let alcoholOptions = ["Never", "Rarely", "1-2 times/week", "3-4 times/week", "Daily"]
    let foodOptions = ["Never", "Rarely", "1-2 times/week", "3-4 times/week", "Daily"]
    let activityOptions = ["Sedentary (Desk job)", "Light (Some walking)", "Moderate (Regular movement)", "Active (Physical job)"]
    
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
            
            ScrollView {
                VStack(spacing: 20) {
                    // Smoking habits
                    LifestyleSelector(
                        title: "Smoking Habits",
                        selection: $smokingHabit,
                        options: smokingOptions,
                        icon: "smoke"
                    )
                    
                    // Alcohol consumption
                    LifestyleSelector(
                        title: "Alcohol Consumption",
                        selection: $alcoholFrequency,
                        options: alcoholOptions,
                        icon: "wineglass"
                    )
                    
                    // Sleep schedule
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "moon.zzz")
                                .foregroundColor(.blue)
                            Text("Sleep Schedule")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.medium)
                        }
                        
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Bedtime")
                                    .font(.custom("Inter", size: 12))
                                    .foregroundColor(.secondary)
                                DatePicker("", selection: Binding<Date>(
                                    get: { 
                                        let formatter = DateFormatter()
                                        formatter.timeStyle = .short
                                        return formatter.date(from: sleepTime) ?? Date()
                                    },
                                    set: { date in
                                        let formatter = DateFormatter()
                                        formatter.timeStyle = .short
                                        sleepTime = formatter.string(from: date)
                                    }
                                ), displayedComponents: .hourAndMinute)
                                .labelsHidden()
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .leading) {
                                Text("Wake time")
                                    .font(.custom("Inter", size: 12))
                                    .foregroundColor(.secondary)
                                DatePicker("", selection: Binding<Date>(
                                    get: { 
                                        let formatter = DateFormatter()
                                        formatter.timeStyle = .short
                                        return formatter.date(from: wakeTime) ?? Date()
                                    },
                                    set: { date in
                                        let formatter = DateFormatter()
                                        formatter.timeStyle = .short
                                        wakeTime = formatter.string(from: date)
                                    }
                                ), displayedComponents: .hourAndMinute)
                                .labelsHidden()
                            }
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.05))
                    .cornerRadius(12)
                    
                    // Outside food frequency
                    LifestyleSelector(
                        title: "Outside Food Frequency",
                        selection: $outsideFoodFrequency,
                        options: foodOptions,
                        icon: "fork.knife"
                    )
                    
                    // Work activity
                    LifestyleSelector(
                        title: "Work Activity Level",
                        selection: $workActivity,
                        options: activityOptions,
                        icon: "figure.walk"
                    )
                }
            }
            .padding(.horizontal, 20)
            
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

struct LifestyleSelector: View {
    let title: String
    @Binding var selection: String
    let options: [String]
    let icon: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(.primary)
                Text(title)
                    .font(.custom("Inter", size: 16))
                    .fontWeight(.medium)
            }
            
            VStack(spacing: 8) {
                ForEach(options, id: \.self) { option in
                    Button(action: { selection = option }) {
                        HStack {
                            Text(option)
                                .font(.custom("Inter", size: 14))
                                .foregroundColor(selection == option ? .blue : .primary)
                            Spacer()
                            if selection == option {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.blue)
                            }
                        }
                        .padding()
                        .background(selection == option ? Color.blue.opacity(0.1) : Color.gray.opacity(0.05))
                        .cornerRadius(8)
                    }
                }
            }
        }
        .padding()
        .background(Color.gray.opacity(0.02))
        .cornerRadius(12)
    }
}

// MARK: - Health View Implementation
struct OnboardingHealthView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    @State private var selectedConditions: Set<String> = []
    @State private var hasReports = false
    
    let healthConditions = [
        "PCOS", "Diabetes", "Hypertension", "High Blood Pressure",
        "Low Blood Pressure", "High Blood Sugar", "Low Blood Sugar",
        "Fatty Liver", "Sleep Disorder", "Libido Issues",
        "Vitamin D Deficiency", "Iron Deficiency", "Thyroid Issues"
    ]
    
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
            
            ScrollView {
                VStack(spacing: 20) {
                    // Health conditions
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "heart.text.square")
                                .foregroundColor(.red)
                            Text("Current Health Conditions")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.medium)
                        }
                        
                        Text("Select any conditions you currently have (optional)")
                            .font(.custom("Inter", size: 12))
                            .foregroundColor(.secondary)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 8) {
                            ForEach(healthConditions, id: \.self) { condition in
                                Button(action: {
                                    if selectedConditions.contains(condition) {
                                        selectedConditions.remove(condition)
                                    } else {
                                        selectedConditions.insert(condition)
                                    }
                                }) {
                                    Text(condition)
                                        .font(.custom("Inter", size: 12))
                                        .foregroundColor(selectedConditions.contains(condition) ? .white : .primary)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(selectedConditions.contains(condition) ? Color.blue : Color.gray.opacity(0.1))
                                        .cornerRadius(20)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.02))
                    .cornerRadius(12)
                    
                    // Health reports
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "doc.text")
                                .foregroundColor(.green)
                            Text("Health Reports")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.medium)
                        }
                        
                        Toggle("I have recent health reports to upload", isOn: $hasReports)
                            .font(.custom("Inter", size: 14))
                        
                        if hasReports {
                            Button(action: {}) {
                                HStack {
                                    Image(systemName: "plus.circle")
                                    Text("Upload Reports Later")
                                        .font(.custom("Inter", size: 14))
                                }
                                .foregroundColor(.blue)
                                .padding()
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(8)
                            }
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.02))
                    .cornerRadius(12)
                }
            }
            .padding(.horizontal, 20)
            
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

// MARK: - Preferences View Implementation  
struct OnboardingPreferencesView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    @State private var dietType = "Vegetarian"
    @State private var selectedCuisines: Set<String> = []
    @State private var selectedCravings: Set<String> = []
    @State private var allergies = ""
    
    let dietTypes = ["Vegetarian", "Non-Vegetarian", "Vegan", "Eggetarian"]
    let cuisines = ["Indian", "Chinese", "Italian", "Mexican", "Thai", "Mediterranean", "American", "Japanese"]
    let cravings = ["Chai/Tea", "Ice Cream", "Cold Drinks", "Street Food", "Sweets", "Fried Food", "Spicy Food", "Chocolate"]
    
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
            
            ScrollView {
                VStack(spacing: 20) {
                    // Diet type
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "leaf")
                                .foregroundColor(.green)
                            Text("Diet Type")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.medium)
                        }
                        
                        VStack(spacing: 8) {
                            ForEach(dietTypes, id: \.self) { type in
                                Button(action: { dietType = type }) {
                                    HStack {
                                        Text(type)
                                            .font(.custom("Inter", size: 14))
                                            .foregroundColor(dietType == type ? .blue : .primary)
                                        Spacer()
                                        if dietType == type {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(.blue)
                                        }
                                    }
                                    .padding()
                                    .background(dietType == type ? Color.blue.opacity(0.1) : Color.gray.opacity(0.05))
                                    .cornerRadius(8)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.02))
                    .cornerRadius(12)
                    
                    // Preferred cuisines
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "globe")
                                .foregroundColor(.orange)
                            Text("Preferred Cuisines")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.medium)
                        }
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 8) {
                            ForEach(cuisines, id: \.self) { cuisine in
                                Button(action: {
                                    if selectedCuisines.contains(cuisine) {
                                        selectedCuisines.remove(cuisine)
                                    } else {
                                        selectedCuisines.insert(cuisine)
                                    }
                                }) {
                                    Text(cuisine)
                                        .font(.custom("Inter", size: 12))
                                        .foregroundColor(selectedCuisines.contains(cuisine) ? .white : .primary)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(selectedCuisines.contains(cuisine) ? Color.orange : Color.gray.opacity(0.1))
                                        .cornerRadius(20)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.02))
                    .cornerRadius(12)
                    
                    // Cravings
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "heart")
                                .foregroundColor(.red)
                            Text("Common Cravings")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.medium)
                        }
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 8) {
                            ForEach(cravings, id: \.self) { craving in
                                Button(action: {
                                    if selectedCravings.contains(craving) {
                                        selectedCravings.remove(craving)
                                    } else {
                                        selectedCravings.insert(craving)
                                    }
                                }) {
                                    Text(craving)
                                        .font(.custom("Inter", size: 12))
                                        .foregroundColor(selectedCravings.contains(craving) ? .white : .primary)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(selectedCravings.contains(craving) ? Color.red : Color.gray.opacity(0.1))
                                        .cornerRadius(20)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.02))
                    .cornerRadius(12)
                    
                    // Allergies
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle")
                                .foregroundColor(.red)
                            Text("Allergies & Restrictions")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.medium)
                        }
                        
                        TextField("Enter any food allergies or restrictions", text: $allergies)
                            .font(.custom("Inter", size: 14))
                            .padding()
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(8)
                    }
                    .padding()
                    .background(Color.gray.opacity(0.02))
                    .cornerRadius(12)
                }
            }
            .padding(.horizontal, 20)
            
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

// MARK: - Goals View Implementation
struct OnboardingGoalsView: View {
    @EnvironmentObject var coordinator: OnboardingCoordinator
    @State private var primaryGoal = ""
    @State private var selectedGoals: Set<String> = []
    @State private var targetWeight = ""
    @State private var targetTimeframe = "3 months"
    
    let primaryGoals = ["Weight Loss", "Weight Gain", "Weight Maintenance", "Muscle Gain"]
    let secondaryGoals = ["Better Sleep", "More Energy", "Improved Digestion", "Reduced Stress", "Better Skin", "Enhanced Immunity"]
    let timeframes = ["1 month", "3 months", "6 months", "1 year"]
    
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
            
            ScrollView {
                VStack(spacing: 20) {
                    // Primary goal
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "target")
                                .foregroundColor(.blue)
                            Text("Primary Goal")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.medium)
                        }
                        
                        VStack(spacing: 8) {
                            ForEach(primaryGoals, id: \.self) { goal in
                                Button(action: { primaryGoal = goal }) {
                                    HStack {
                                        Text(goal)
                                            .font(.custom("Inter", size: 14))
                                            .foregroundColor(primaryGoal == goal ? .blue : .primary)
                                        Spacer()
                                        if primaryGoal == goal {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(.blue)
                                        }
                                    }
                                    .padding()
                                    .background(primaryGoal == goal ? Color.blue.opacity(0.1) : Color.gray.opacity(0.05))
                                    .cornerRadius(8)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.02))
                    .cornerRadius(12)
                    
                    // Target weight (if applicable)
                    if primaryGoal.contains("Weight") {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Image(systemName: "scalemass")
                                    .foregroundColor(.green)
                                Text("Target Weight (kg)")
                                    .font(.custom("Inter", size: 16))
                                    .fontWeight(.medium)
                            }
                            
                            TextField("Enter target weight", text: $targetWeight)
                                .font(.custom("Inter", size: 14))
                                .keyboardType(.decimalPad)
                                .padding()
                                .background(Color.gray.opacity(0.1))
                                .cornerRadius(8)
                        }
                        .padding()
                        .background(Color.gray.opacity(0.02))
                        .cornerRadius(12)
                    }
                    
                    // Secondary goals
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "plus.circle")
                                .foregroundColor(.purple)
                            Text("Additional Goals (Optional)")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.medium)
                        }
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 8) {
                            ForEach(secondaryGoals, id: \.self) { goal in
                                Button(action: {
                                    if selectedGoals.contains(goal) {
                                        selectedGoals.remove(goal)
                                    } else {
                                        selectedGoals.insert(goal)
                                    }
                                }) {
                                    Text(goal)
                                        .font(.custom("Inter", size: 12))
                                        .foregroundColor(selectedGoals.contains(goal) ? .white : .primary)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(selectedGoals.contains(goal) ? Color.purple : Color.gray.opacity(0.1))
                                        .cornerRadius(20)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.02))
                    .cornerRadius(12)
                    
                    // Timeframe
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "calendar")
                                .foregroundColor(.orange)
                            Text("Target Timeframe")
                                .font(.custom("Inter", size: 16))
                                .fontWeight(.medium)
                        }
                        
                        HStack(spacing: 8) {
                            ForEach(timeframes, id: \.self) { timeframe in
                                Button(action: { targetTimeframe = timeframe }) {
                                    Text(timeframe)
                                        .font(.custom("Inter", size: 12))
                                        .foregroundColor(targetTimeframe == timeframe ? .white : .primary)
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 8)
                                        .background(targetTimeframe == timeframe ? Color.orange : Color.gray.opacity(0.1))
                                        .cornerRadius(20)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color.gray.opacity(0.02))
                    .cornerRadius(12)
                }
            }
            .padding(.horizontal, 20)
            
            OnboardingPrimaryButton(
                title: "Complete Setup",
                isEnabled: !primaryGoal.isEmpty,
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