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
    var body: some View {
        Text("Notification Settings")
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
    var body: some View {
        Text("Language Settings")
            .navigationTitle("Language")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct HealthDataView: View {
    var body: some View {
        Text("Health Data")
            .navigationTitle("Health Data")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct PrivacySettingsView: View {
    var body: some View {
        Text("Privacy Settings")
            .navigationTitle("Privacy")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct DataExportView: View {
    var body: some View {
        Text("Data Export")
            .navigationTitle("Export Data")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct HelpView: View {
    var body: some View {
        Text("Help & FAQ")
            .navigationTitle("Help")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct ContactSupportView: View {
    var body: some View {
        Text("Contact Support")
            .navigationTitle("Support")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct TermsView: View {
    var body: some View {
        Text("Terms of Service")
            .navigationTitle("Terms")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct PrivacyPolicyView: View {
    var body: some View {
        Text("Privacy Policy")
            .navigationTitle("Privacy Policy")
            .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    SettingsView()
}