import SwiftUI

struct SettingsView: View {
    @State private var notificationsEnabled = true
    @State private var darkModeEnabled = false
    @State private var hinglishEnabled = true
    @AppStorage("colorScheme") private var colorScheme = "system"
    
    var body: some View {
        NavigationView {
            List {
                // Profile Section
                Section {
                    HStack {
                        Circle()
                            .fill(DesignColors.primary500)
                            .frame(width: 60, height: 60)
                            .overlay {
                                Text("JD")
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                            }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("John Doe")
                                .font(.headline)
                            Text("john.doe@example.com")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        Button("Edit") {
                            // Edit profile action
                        }
                        .font(.subheadline)
                        .foregroundColor(DesignColors.primary500)
                    }
                    .padding(.vertical, 8)
                }
                
                // App Settings
                Section("App Settings") {
                    SettingsRow(
                        icon: "bell.fill",
                        iconColor: DesignColors.warning500,
                        title: "Notifications",
                        destination: AnyView(NotificationSettingsView())
                    )
                    
                    SettingsRow(
                        icon: "moon.fill",
                        iconColor: DesignColors.gray600,
                        title: "Appearance",
                        destination: AnyView(AppearanceSettingsView())
                    )
                    
                    SettingsRow(
                        icon: "globe",
                        iconColor: DesignColors.primary500,
                        title: "Language & Region",
                        destination: AnyView(LanguageSettingsView())
                    )
                }
                
                // Health & Privacy
                Section("Health & Privacy") {
                    SettingsRow(
                        icon: "heart.fill",
                        iconColor: DesignColors.error500,
                        title: "Health Data",
                        destination: AnyView(HealthDataView())
                    )
                    
                    SettingsRow(
                        icon: "lock.fill",
                        iconColor: DesignColors.gray700,
                        title: "Privacy Settings",
                        destination: AnyView(PrivacySettingsView())
                    )
                    
                    SettingsRow(
                        icon: "doc.text.fill",
                        iconColor: DesignColors.secondary500,
                        title: "Data Export",
                        destination: AnyView(DataExportView())
                    )
                }
                
                // Support
                Section("Support") {
                    SettingsRow(
                        icon: "questionmark.circle.fill",
                        iconColor: DesignColors.primary500,
                        title: "Help & FAQ",
                        destination: AnyView(HelpView())
                    )
                    
                    SettingsRow(
                        icon: "envelope.fill",
                        iconColor: DesignColors.secondary500,
                        title: "Contact Support",
                        destination: AnyView(ContactSupportView())
                    )
                    
                    SettingsRow(
                        icon: "star.fill",
                        iconColor: DesignColors.warning500,
                        title: "Rate App",
                        isButton: true
                    ) {
                        // Rate app action
                    }
                }
                
                // About
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    
                    SettingsRow(
                        icon: "doc.plaintext.fill",
                        iconColor: DesignColors.gray600,
                        title: "Terms of Service",
                        destination: AnyView(TermsView())
                    )
                    
                    SettingsRow(
                        icon: "hand.raised.fill",
                        iconColor: DesignColors.gray600,
                        title: "Privacy Policy",
                        destination: AnyView(PrivacyPolicyView())
                    )
                }
                
                // Logout
                Section {
                    Button(action: {
                        // Logout action
                    }) {
                        HStack {
                            Image(systemName: "arrow.backward.square.fill")
                                .foregroundColor(DesignColors.error500)
                            Text("Sign Out")
                                .foregroundColor(DesignColors.error500)
                        }
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

struct SettingsRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let destination: AnyView?
    let isButton: Bool
    let action: (() -> Void)?
    
    init(icon: String, iconColor: Color, title: String, destination: AnyView) {
        self.icon = icon
        self.iconColor = iconColor
        self.title = title
        self.destination = destination
        self.isButton = false
        self.action = nil
    }
    
    init(icon: String, iconColor: Color, title: String, isButton: Bool = false, action: @escaping () -> Void) {
        self.icon = icon
        self.iconColor = iconColor
        self.title = title
        self.destination = nil
        self.isButton = isButton
        self.action = action
    }
    
    var body: some View {
        if let destination = destination {
            NavigationLink(destination: destination) {
                SettingsRowContent(icon: icon, iconColor: iconColor, title: title)
            }
        } else if let action = action {
            Button(action: action) {
                SettingsRowContent(icon: icon, iconColor: iconColor, title: title)
            }
            .buttonStyle(PlainButtonStyle())
        }
    }
}

struct SettingsRowContent: View {
    let icon: String
    let iconColor: Color
    let title: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(iconColor)
                .frame(width: 24, height: 24)
            
            Text(title)
                .foregroundColor(.primary)
            
            Spacer()
        }
    }
}

// MARK: - Placeholder Settings Views

struct NotificationSettingsView: View {
    @State private var dailyReminders = true
    @State private var mealReminders = true
    @State private var workoutReminders = true
    @State private var progressUpdates = true
    @State private var healthAlerts = true
    @State private var motivationalMessages = false
    @State private var weeklyReports = true
    
    var body: some View {
        List {
            Section("Meal & Nutrition") {
                ToggleRow(
                    title: "Meal Reminders",
                    subtitle: "Get notified when it's time to eat",
                    isOn: $mealReminders
                )
                
                ToggleRow(
                    title: "Daily Nutrition Goals",
                    subtitle: "Track your daily macro targets",
                    isOn: $dailyReminders
                )
            }
            
            Section("Fitness & Workouts") {
                ToggleRow(
                    title: "Workout Reminders",
                    subtitle: "Stay consistent with your fitness routine",
                    isOn: $workoutReminders
                )
                
                ToggleRow(
                    title: "Progress Updates",
                    subtitle: "Celebrate your achievements",
                    isOn: $progressUpdates
                )
            }
            
            Section("Health Monitoring") {
                ToggleRow(
                    title: "Health Alerts",
                    subtitle: "Important health notifications",
                    isOn: $healthAlerts
                )
                
                ToggleRow(
                    title: "Weekly Health Reports",
                    subtitle: "Get your comprehensive health summary",
                    isOn: $weeklyReports
                )
            }
            
            Section("Motivation & Tips") {
                ToggleRow(
                    title: "Motivational Messages",
                    subtitle: "Daily encouragement and tips",
                    isOn: $motivationalMessages
                )
            }
            
            Section("Notification Schedule") {
                NavigationLink("Quiet Hours") {
                    QuietHoursView()
                }
                
                NavigationLink("Frequency Settings") {
                    NotificationFrequencyView()
                }
            }
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct AppearanceSettingsView: View {
    @AppStorage("colorScheme") private var colorScheme = "system"
    
    var body: some View {
        List {
            Section("Appearance") {
                HStack {
                    Text("Theme")
                    Spacer()
                    Picker("Theme", selection: $colorScheme) {
                        Text("System").tag("system")
                        Text("Light").tag("light")
                        Text("Dark").tag("dark")
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .frame(width: 200)
                }
            }
        }
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct LanguageSettingsView: View {
    @State private var selectedLanguage = "en"
    @State private var hinglishEnabled = true
    @State private var culturalAdaptation = true
    
    private let languages = [
        ("en", "English", "🇺🇸"),
        ("hi", "हिंदी", "🇮🇳"),
        ("hinglish", "Hinglish", "🇮🇳"),
        ("es", "Español", "🇪🇸"),
        ("fr", "Français", "🇫🇷"),
        ("de", "Deutsch", "🇩🇪")
    ]
    
    var body: some View {
        List {
            Section("Preferred Language") {
                ForEach(languages, id: \.0) { code, name, flag in
                    HStack {
                        Text(flag)
                            .font(.title2)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(name)
                                .font(.body)
                            if code == "hinglish" {
                                Text("Mix of Hindi & English")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        if selectedLanguage == code {
                            Image(systemName: "checkmark")
                                .foregroundColor(DesignColors.primary500)
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedLanguage = code
                    }
                }
            }
            
            Section("Regional Settings") {
                ToggleRow(
                    title: "Cultural Adaptation",
                    subtitle: "Adapt meal suggestions to Indian cuisine",
                    isOn: $culturalAdaptation
                )
                
                if selectedLanguage.contains("hi") {
                    ToggleRow(
                        title: "Hinglish Mode",
                        subtitle: "Mix Hindi and English for comfort",
                        isOn: $hinglishEnabled
                    )
                }
            }
            
            Section("Units & Format") {
                NavigationLink("Units") {
                    UnitsSettingsView()
                }
                
                NavigationLink("Date & Time Format") {
                    DateTimeFormatView()
                }
            }
        }
        .navigationTitle("Language")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct HealthDataView: View {
    @State private var healthKitEnabled = true
    @State private var autoSync = true
    @State private var shareWithDoctor = false
    
    var body: some View {
        List {
            Section("Connected Services") {
                HStack {
                    Image(systemName: "heart.fill")
                        .foregroundColor(.red)
                        .frame(width: 24)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Apple Health")
                            .font(.body)
                        Text("Sync with HealthKit")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Toggle("", isOn: $healthKitEnabled)
                }
                
                HStack {
                    Image(systemName: "applewatch")
                        .foregroundColor(.blue)
                        .frame(width: 24)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Apple Watch")
                        Text("Fitness & health metrics")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Button("Connect") {
                        // Connect Apple Watch
                    }
                    .font(.subheadline)
                    .foregroundColor(DesignColors.primary500)
                }
            }
            
            Section("Data Sharing") {
                ToggleRow(
                    title: "Auto-sync",
                    subtitle: "Automatically sync health data",
                    isOn: $autoSync
                )
                
                ToggleRow(
                    title: "Share with Healthcare Provider",
                    subtitle: "Allow your doctor to access your data",
                    isOn: $shareWithDoctor
                )
            }
            
            Section("Data Management") {
                NavigationLink("Export Health Data") {
                    DataExportView()
                }
                
                NavigationLink("Data Usage") {
                    DataUsageView()
                }
                
                Button("Clear Local Data") {
                    // Clear local data
                }
                .foregroundColor(.red)
            }
            
            Section("Supported Metrics") {
                MetricRow(name: "Heart Rate", icon: "heart.fill", color: .red, enabled: true)
                MetricRow(name: "Blood Pressure", icon: "drop.fill", color: .blue, enabled: true)
                MetricRow(name: "Weight", icon: "scalemass.fill", color: .green, enabled: true)
                MetricRow(name: "Steps", icon: "figure.walk", color: .orange, enabled: true)
                MetricRow(name: "Sleep", icon: "bed.double.fill", color: .purple, enabled: false)
            }
        }
        .navigationTitle("Health Data")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PrivacySettingsView: View {
    @State private var analyticsEnabled = true
    @State private var crashReporting = true
    @State private var personalizedAds = false
    @State private var biometricAuth = true
    
    var body: some View {
        List {
            Section("Privacy Controls") {
                ToggleRow(
                    title: "Biometric Authentication",
                    subtitle: "Use Face ID or Touch ID to secure app",
                    isOn: $biometricAuth
                )
                
                NavigationLink("Data Permissions") {
                    DataPermissionsView()
                }
                
                NavigationLink("Account Privacy") {
                    AccountPrivacyView()
                }
            }
            
            Section("Data Collection") {
                ToggleRow(
                    title: "Analytics",
                    subtitle: "Help improve the app with usage data",
                    isOn: $analyticsEnabled
                )
                
                ToggleRow(
                    title: "Crash Reporting",
                    subtitle: "Send crash reports to improve stability",
                    isOn: $crashReporting
                )
                
                ToggleRow(
                    title: "Personalized Ads",
                    subtitle: "Show relevant health product ads",
                    isOn: $personalizedAds
                )
            }
            
            Section("Data Rights") {
                NavigationLink("Download My Data") {
                    DataExportView()
                }
                
                NavigationLink("Data Deletion Request") {
                    DataDeletionView()
                }
                
                NavigationLink("Privacy Policy") {
                    PrivacyPolicyView()
                }
            }
            
            Section("Security") {
                HStack {
                    Text("Last Security Check")
                    Spacer()
                    Text("2 days ago")
                        .foregroundColor(.secondary)
                }
                
                Button("Run Security Check") {
                    // Run security check
                }
                .foregroundColor(DesignColors.primary500)
            }
        }
        .navigationTitle("Privacy")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DataExportView: View {
    @State private var exportFormat = "JSON"
    @State private var includeHealthData = true
    @State private var includeMealPlans = true
    @State private var includeFitnessPlans = true
    @State private var includeAnalytics = false
    @State private var isExporting = false
    
    private let formats = ["JSON", "CSV", "PDF"]
    
    var body: some View {
        List {
            Section("Export Format") {
                Picker("Format", selection: $exportFormat) {
                    ForEach(formats, id: \.self) { format in
                        Text(format).tag(format)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
            }
            
            Section("Data to Include") {
                ToggleRow(
                    title: "Health Data",
                    subtitle: "Biometrics, reports, measurements",
                    isOn: $includeHealthData
                )
                
                ToggleRow(
                    title: "Meal Plans",
                    subtitle: "Nutrition plans and food logs",
                    isOn: $includeMealPlans
                )
                
                ToggleRow(
                    title: "Fitness Plans",
                    subtitle: "Workout routines and progress",
                    isOn: $includeFitnessPlans
                )
                
                ToggleRow(
                    title: "Analytics Data",
                    subtitle: "Usage patterns and preferences",
                    isOn: $includeAnalytics
                )
            }
            
            Section("Export Options") {
                HStack {
                    Text("Date Range")
                    Spacer()
                    Button("Last 3 Months") {
                        // Select date range
                    }
                    .foregroundColor(DesignColors.primary500)
                }
                
                HStack {
                    Text("Estimated Size")
                    Spacer()
                    Text("~2.5 MB")
                        .foregroundColor(.secondary)
                }
            }
            
            Section {
                Button(action: {
                    exportData()
                }) {
                    HStack {
                        if isExporting {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "square.and.arrow.up")
                        }
                        Text(isExporting ? "Exporting..." : "Export My Data")
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundColor(isExporting ? .secondary : DesignColors.primary500)
                }
                .disabled(isExporting)
            }
            
            Section(footer: Text("Your data will be prepared and sent to your registered email address. This process may take a few minutes.")) {
                EmptyView()
            }
        }
        .navigationTitle("Export Data")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func exportData() {
        isExporting = true
        // Simulate export process
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            isExporting = false
        }
    }
}

struct HelpView: View {
    @State private var searchText = ""
    
    private let faqItems = [
        FAQItem(question: "How do I update my fitness goals?", answer: "Go to Fitness > Settings > Goals to update your targets.", category: "Fitness"),
        FAQItem(question: "Can I customize my meal plan?", answer: "Yes! Tap any meal in your plan and select 'Swap' or 'Customize' to modify it.", category: "Nutrition"),
        FAQItem(question: "How accurate are the calorie calculations?", answer: "Our AI uses advanced algorithms with 95%+ accuracy based on ingredient databases.", category: "Nutrition"),
        FAQItem(question: "My Apple Watch isn't syncing", answer: "Check that HealthKit permissions are enabled in Settings > Health Data.", category: "Technical"),
        FAQItem(question: "How do I export my health data?", answer: "Go to Settings > Privacy > Export Data to download all your information.", category: "Privacy"),
        FAQItem(question: "Can I share my progress with my doctor?", answer: "Yes, enable sharing in Settings > Health Data > Share with Healthcare Provider.", category: "Health")
    ]
    
    var filteredFAQs: [FAQItem] {
        if searchText.isEmpty {
            return faqItems
        }
        return faqItems.filter { 
            $0.question.localizedCaseInsensitiveContains(searchText) ||
            $0.answer.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    var body: some View {
        List {
            Section {
                SearchBar(text: $searchText, placeholder: "Search help topics...")
            }
            
            Section("Quick Actions") {
                HStack {
                    Image(systemName: "message.fill")
                        .foregroundColor(DesignColors.primary500)
                        .frame(width: 24)
                    Text("Contact Support")
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundColor(.secondary)
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    // Contact support
                }
                
                HStack {
                    Image(systemName: "video.fill")
                        .foregroundColor(.green)
                        .frame(width: 24)
                    Text("Video Tutorials")
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundColor(.secondary)
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    // Open video tutorials
                }
                
                HStack {
                    Image(systemName: "book.fill")
                        .foregroundColor(.blue)
                        .frame(width: 24)
                    Text("User Guide")
                    Spacer()
                    Image(systemName: "chevron.right")
                        .foregroundColor(.secondary)
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    // Open user guide
                }
            }
            
            Section("Frequently Asked Questions") {
                ForEach(filteredFAQs.prefix(10), id: \.question) { faq in
                    FAQRow(faq: faq)
                }
            }
            
            Section("Categories") {
                let categories = Set(faqItems.map { $0.category })
                ForEach(Array(categories).sorted(), id: \.self) { category in
                    NavigationLink(destination: CategoryHelpView(category: category, faqs: faqItems.filter { $0.category == category })) {
                        HStack {
                            CategoryIcon(category: category)
                            Text(category)
                            Spacer()
                            Text("\(faqItems.filter { $0.category == category }.count)")
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Help")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ContactSupportView: View {
    @State private var selectedTopic = "General"
    @State private var message = ""
    @State private var userEmail = "user@example.com"
    @State private var isSubmitting = false
    
    private let supportTopics = ["General", "Technical Issue", "Billing", "Privacy", "Feature Request", "Bug Report"]
    
    var body: some View {
        Form {
            Section("Contact Information") {
                HStack {
                    Text("Email")
                    Spacer()
                    TextField("Your email", text: $userEmail)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .frame(width: 200)
                }
            }
            
            Section("Support Topic") {
                Picker("Topic", selection: $selectedTopic) {
                    ForEach(supportTopics, id: \.self) { topic in
                        Text(topic).tag(topic)
                    }
                }
            }
            
            Section("Message") {
                TextEditor(text: $message)
                    .frame(minHeight: 120)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                    )
            }
            
            Section("Quick Contact") {
                HStack {
                    Image(systemName: "phone.fill")
                        .foregroundColor(.green)
                    VStack(alignment: .leading) {
                        Text("Phone Support")
                        Text("+91-800-HEALTH (432584)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button("Call") {
                        // Make phone call
                    }
                    .foregroundColor(DesignColors.primary500)
                }
                
                HStack {
                    Image(systemName: "message.fill")
                        .foregroundColor(.blue)
                    VStack(alignment: .leading) {
                        Text("Live Chat")
                        Text("Available 9 AM - 9 PM IST")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Button("Chat") {
                        // Start live chat
                    }
                    .foregroundColor(DesignColors.primary500)
                }
            }
            
            Section {
                Button(action: submitSupport) {
                    HStack {
                        if isSubmitting {
                            ProgressView()
                                .scaleEffect(0.8)
                        }
                        Text(isSubmitting ? "Sending..." : "Send Message")
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundColor(isSubmitting ? .secondary : DesignColors.primary500)
                }
                .disabled(isSubmitting || message.isEmpty)
            }
        }
        .navigationTitle("Support")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func submitSupport() {
        isSubmitting = true
        // Simulate sending message
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            isSubmitting = false
            message = ""
        }
    }
}

struct TermsView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Terms of Service")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.bottom, 8)
                
                Text("Last updated: January 1, 2024")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 16)
                
                Group {
                    TermsSection(
                        title: "1. Acceptance of Terms",
                        content: "By using HealthCoach AI, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service."
                    )
                    
                    TermsSection(
                        title: "2. Health Information Disclaimer",
                        content: "HealthCoach AI provides general health and wellness information for educational purposes only. This information is not intended as medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers before making health decisions."
                    )
                    
                    TermsSection(
                        title: "3. User Responsibilities",
                        content: "You are responsible for providing accurate health information, following safety guidelines, and consulting healthcare professionals when needed. You must not misuse the service or share your account with others."
                    )
                    
                    TermsSection(
                        title: "4. AI and Data Usage",
                        content: "Our AI analyzes your health data to provide personalized recommendations. We use industry-standard security measures to protect your information and do not share personal data with third parties without consent."
                    )
                    
                    TermsSection(
                        title: "5. Subscription and Payments",
                        content: "Premium features require a subscription. Payments are processed securely through the App Store. Subscriptions auto-renew unless cancelled 24 hours before the renewal date."
                    )
                    
                    TermsSection(
                        title: "6. Limitation of Liability",
                        content: "HealthCoach AI is provided 'as is' without warranties. We are not liable for any health outcomes, injuries, or damages resulting from use of our service."
                    )
                }
                
                Text("For complete terms and conditions, visit our website at healthcoachai.com/terms")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.top, 16)
            }
            .padding()
        }
        .navigationTitle("Terms")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct TermsSection: View {
    let title: String
    let content: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundColor(DesignColors.primary500)
            
            Text(content)
                .font(.body)
                .foregroundColor(.primary)
        }
        .padding(.bottom, 8)
    }
}

struct PrivacyPolicyView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Privacy Policy")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.bottom, 8)
                
                Text("Last updated: January 1, 2024")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 16)
                
                Group {
                    PrivacySection(
                        title: "Information We Collect",
                        content: "We collect health data you provide, including biometrics, meal logs, fitness activities, and device-synced information from Apple Health and other connected services."
                    )
                    
                    PrivacySection(
                        title: "How We Use Your Data",
                        content: "Your data is used to provide personalized health recommendations, track progress, generate meal and fitness plans, and improve our AI algorithms. Data is processed securely on encrypted servers."
                    )
                    
                    PrivacySection(
                        title: "Data Sharing",
                        content: "We do not sell your personal data. Health information may be shared with healthcare providers only with your explicit consent. Anonymized data may be used for research purposes."
                    )
                    
                    PrivacySection(
                        title: "Data Security",
                        content: "We use AES-256 encryption, secure authentication, and industry-standard security measures. Data is stored in secure cloud infrastructure with regular security audits."
                    )
                    
                    PrivacySection(
                        title: "Your Rights",
                        content: "You can access, modify, or delete your data at any time. You may request data exports, account deletion, or opt-out of data processing. Contact support for assistance."
                    )
                    
                    PrivacySection(
                        title: "International Transfers",
                        content: "Data may be processed in countries outside India. We ensure adequate protection through appropriate safeguards and comply with applicable data protection laws."
                    )
                    
                    PrivacySection(
                        title: "Children's Privacy",
                        content: "Our service is not intended for users under 13. We do not knowingly collect data from children. If you believe we have collected such data, please contact us immediately."
                    )
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("Contact Us")
                        .font(.headline)
                        .foregroundColor(DesignColors.primary500)
                    
                    Text("Questions about privacy? Contact us at privacy@healthcoachai.com or through the app's support feature.")
                        .font(.body)
                }
                .padding(.top, 16)
            }
            .padding()
        }
        .navigationTitle("Privacy Policy")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PrivacySection: View {
    let title: String
    let content: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .foregroundColor(DesignColors.primary500)
            
            Text(content)
                .font(.body)
                .foregroundColor(.primary)
        }
        .padding(.bottom, 8)
    }
}

#Preview {
    SettingsView()
}

// MARK: - Supporting Views and Components

struct ToggleRow: View {
    let title: String
    let subtitle: String
    @Binding var isOn: Bool
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Toggle("", isOn: $isOn)
        }
    }
}

struct MetricRow: View {
    let name: String
    let icon: String
    let color: Color
    let enabled: Bool
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 24)
            
            Text(name)
            
            Spacer()
            
            if enabled {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            } else {
                Text("Coming Soon")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct FAQItem {
    let question: String
    let answer: String
    let category: String
}

struct FAQRow: View {
    let faq: FAQItem
    @State private var isExpanded = false
    
    var body: some View {
        DisclosureGroup(faq.question, isExpanded: $isExpanded) {
            Text(faq.answer)
                .font(.body)
                .foregroundColor(.secondary)
                .padding(.top, 8)
        }
    }
}

struct CategoryIcon: View {
    let category: String
    
    var body: some View {
        let (icon, color) = iconForCategory(category)
        
        Image(systemName: icon)
            .foregroundColor(color)
            .frame(width: 24)
    }
    
    private func iconForCategory(_ category: String) -> (String, Color) {
        switch category {
        case "Fitness":
            return ("figure.run", .orange)
        case "Nutrition":
            return ("leaf.fill", .green)
        case "Health":
            return ("heart.fill", .red)
        case "Technical":
            return ("gear", .blue)
        case "Privacy":
            return ("lock.fill", .purple)
        default:
            return ("questionmark.circle", .gray)
        }
    }
}

struct SearchBar: View {
    @Binding var text: String
    let placeholder: String
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            
            TextField(placeholder, text: $text)
                .textFieldStyle(RoundedBorderTextFieldStyle())
        }
    }
}

// MARK: - Additional Supporting Views

struct QuietHoursView: View {
    @State private var quietHoursEnabled = true
    @State private var startTime = Date()
    @State private var endTime = Date()
    
    var body: some View {
        List {
            Section {
                Toggle("Enable Quiet Hours", isOn: $quietHoursEnabled)
            }
            
            if quietHoursEnabled {
                Section("Quiet Hours Schedule") {
                    DatePicker("Start Time", selection: $startTime, displayedComponents: .hourAndMinute)
                    DatePicker("End Time", selection: $endTime, displayedComponents: .hourAndMinute)
                }
            }
        }
        .navigationTitle("Quiet Hours")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct NotificationFrequencyView: View {
    @State private var mealFrequency = "Normal"
    @State private var workoutFrequency = "Daily"
    
    private let frequencies = ["Low", "Normal", "High"]
    private let workoutFrequencies = ["Daily", "Workout Days Only", "Custom"]
    
    var body: some View {
        List {
            Section("Meal Notifications") {
                Picker("Frequency", selection: $mealFrequency) {
                    ForEach(frequencies, id: \.self) { frequency in
                        Text(frequency).tag(frequency)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
            }
            
            Section("Workout Notifications") {
                Picker("Frequency", selection: $workoutFrequency) {
                    ForEach(workoutFrequencies, id: \.self) { frequency in
                        Text(frequency).tag(frequency)
                    }
                }
            }
        }
        .navigationTitle("Frequency")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct UnitsSettingsView: View {
    @State private var weightUnit = "kg"
    @State private var heightUnit = "cm"
    @State private var temperatureUnit = "°C"
    
    var body: some View {
        List {
            Section("Weight") {
                Picker("Weight Unit", selection: $weightUnit) {
                    Text("Kilograms (kg)").tag("kg")
                    Text("Pounds (lbs)").tag("lbs")
                }
            }
            
            Section("Height") {
                Picker("Height Unit", selection: $heightUnit) {
                    Text("Centimeters (cm)").tag("cm")
                    Text("Feet & Inches").tag("ft")
                }
            }
            
            Section("Temperature") {
                Picker("Temperature Unit", selection: $temperatureUnit) {
                    Text("Celsius (°C)").tag("°C")
                    Text("Fahrenheit (°F)").tag("°F")
                }
            }
        }
        .navigationTitle("Units")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DateTimeFormatView: View {
    @State private var dateFormat = "DD/MM/YYYY"
    @State private var timeFormat = "24-hour"
    
    var body: some View {
        List {
            Section("Date Format") {
                Picker("Date Format", selection: $dateFormat) {
                    Text("DD/MM/YYYY").tag("DD/MM/YYYY")
                    Text("MM/DD/YYYY").tag("MM/DD/YYYY")
                    Text("YYYY-MM-DD").tag("YYYY-MM-DD")
                }
            }
            
            Section("Time Format") {
                Picker("Time Format", selection: $timeFormat) {
                    Text("24-hour").tag("24-hour")
                    Text("12-hour (AM/PM)").tag("12-hour")
                }
            }
        }
        .navigationTitle("Date & Time")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DataUsageView: View {
    var body: some View {
        List {
            Section("Storage Usage") {
                HStack {
                    Text("Health Records")
                    Spacer()
                    Text("15.2 MB")
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Meal Photos")
                    Spacer()
                    Text("8.7 MB")
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Cached Data")
                    Spacer()
                    Text("2.1 MB")
                        .foregroundColor(.secondary)
                }
            }
            
            Section {
                Button("Clear Cache") {
                    // Clear cache
                }
                .foregroundColor(DesignColors.primary500)
            }
        }
        .navigationTitle("Data Usage")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DataPermissionsView: View {
    @State private var cameraAccess = true
    @State private var photosAccess = true
    @State private var healthKitAccess = true
    @State private var locationAccess = false
    
    var body: some View {
        List {
            Section("App Permissions") {
                PermissionRow(
                    icon: "camera.fill",
                    title: "Camera",
                    subtitle: "Take photos of meals",
                    isEnabled: $cameraAccess,
                    color: .blue
                )
                
                PermissionRow(
                    icon: "photo.fill",
                    title: "Photos",
                    subtitle: "Save and access meal photos",
                    isEnabled: $photosAccess,
                    color: .green
                )
                
                PermissionRow(
                    icon: "heart.fill",
                    title: "HealthKit",
                    subtitle: "Sync health and fitness data",
                    isEnabled: $healthKitAccess,
                    color: .red
                )
                
                PermissionRow(
                    icon: "location.fill",
                    title: "Location",
                    subtitle: "Find nearby restaurants",
                    isEnabled: $locationAccess,
                    color: .orange
                )
            }
        }
        .navigationTitle("Permissions")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PermissionRow: View {
    let icon: String
    let title: String
    let subtitle: String
    @Binding var isEnabled: Bool
    let color: Color
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Toggle("", isOn: $isEnabled)
        }
    }
}

struct AccountPrivacyView: View {
    @State private var profilePublic = false
    @State private var shareProgress = true
    @State private var allowMessages = false
    
    var body: some View {
        List {
            Section("Profile Visibility") {
                ToggleRow(
                    title: "Public Profile",
                    subtitle: "Allow others to see your profile",
                    isOn: $profilePublic
                )
                
                ToggleRow(
                    title: "Share Progress",
                    subtitle: "Show achievements to friends",
                    isOn: $shareProgress
                )
            }
            
            Section("Communication") {
                ToggleRow(
                    title: "Allow Messages",
                    subtitle: "Receive messages from other users",
                    isOn: $allowMessages
                )
            }
        }
        .navigationTitle("Account Privacy")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct DataDeletionView: View {
    @State private var showingAlert = false
    
    var body: some View {
        List {
            Section(header: Text("Delete Account Data")) {
                Text("This will permanently delete all your data including:")
                    .foregroundColor(.secondary)
                
                VStack(alignment: .leading, spacing: 8) {
                    BulletPoint("Health records and measurements")
                    BulletPoint("Meal plans and nutrition data")
                    BulletPoint("Fitness plans and workout history")
                    BulletPoint("Photos and personal preferences")
                    BulletPoint("Account information")
                }
                .padding(.vertical, 8)
            }
            
            Section {
                Button("Request Account Deletion") {
                    showingAlert = true
                }
                .foregroundColor(.red)
                .frame(maxWidth: .infinity)
            }
            
            Section(footer: Text("Account deletion is permanent and cannot be undone. Your data will be completely removed within 30 days.")) {
                EmptyView()
            }
        }
        .navigationTitle("Delete Data")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Delete Account", isPresented: $showingAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                // Handle account deletion
            }
        } message: {
            Text("Are you sure you want to permanently delete your account and all data?")
        }
    }
}

struct BulletPoint: View {
    let text: String
    
    init(_ text: String) {
        self.text = text
    }
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
                .foregroundColor(.secondary)
            Text(text)
                .foregroundColor(.secondary)
            Spacer()
        }
    }
}

struct CategoryHelpView: View {
    let category: String
    let faqs: [FAQItem]
    
    var body: some View {
        List {
            ForEach(faqs, id: \.question) { faq in
                FAQRow(faq: faq)
            }
        }
        .navigationTitle(category)
        .navigationBarTitleDisplayMode(.inline)
    }
}