import SwiftUI

struct DashboardView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Greeting Section
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Good Morning!")
                                .font(.title2)
                                .fontWeight(.medium)
                            Text("How are you feeling today?")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        // Profile avatar placeholder
                        Circle()
                            .fill(Color(hex: "#14b8a6"))
                            .frame(width: 50, height: 50)
                            .overlay {
                                Text("JD")
                                    .foregroundColor(.white)
                                    .fontWeight(.semibold)
                            }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.1), radius: 8)
                    
                    // Today's Meals Card
                    DashboardCard(
                        title: "Today's Meals",
                        subtitle: "3 of 4 meals completed",
                        iconName: "fork.knife",
                        iconColor: Color(hex: "#f0653e") // Coral accent
                    ) {
                        // Navigate to meal plan
                    }
                    
                    // Quick Actions
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Quick Actions")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        HStack(spacing: 16) {
                            QuickActionButton(
                                title: "Log Meal",
                                iconName: "plus.circle.fill",
                                color: Color(hex: "#22c55e") // Success green
                            ) {
                                // Log meal action
                            }
                            
                            QuickActionButton(
                                title: "Update Weight",
                                iconName: "scalemass.fill",
                                color: Color(hex: "#14b8a6") // Primary turquoise
                            ) {
                                // Update weight action
                            }
                            
                            QuickActionButton(
                                title: "Chat",
                                iconName: "message.fill",
                                color: Color(hex: "#f0653e") // Coral accent
                            ) {
                                // Chat action
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    // Activity Widget
                    DashboardCard(
                        title: "Today's Activity",
                        subtitle: "7,543 steps • 45 min workout",
                        iconName: "figure.walk",
                        iconColor: Color(hex: "#14b8a6")
                    ) {
                        // Navigate to fitness
                    }
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .background(Color(.systemGroupedBackground))
        }
    }
}

struct DashboardCard: View {
    let title: String
    let subtitle: String
    let iconName: String
    let iconColor: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: iconName)
                    .foregroundColor(iconColor)
                    .font(.title2)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.1), radius: 8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct QuickActionButton: View {
    let title: String
    let iconName: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: iconName)
                    .font(.title2)
                    .foregroundColor(color)
                
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    DashboardView()
}