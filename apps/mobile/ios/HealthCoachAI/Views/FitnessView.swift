import SwiftUI

struct FitnessView: View {
    @State private var selectedTab = 0
    private let tabs = ["Workouts", "Progress", "Plans"]
    
    var body: some View {
        NavigationView {
            VStack {
                // Custom tab selector
                HStack {
                    ForEach(0..<tabs.count, id: \.self) { index in
                        Button(action: {
                            selectedTab = index
                        }) {
                            Text(tabs[index])
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(selectedTab == index ? DesignColors.primary500 : .secondary)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 16)
                                .background(
                                    selectedTab == index ? 
                                    DesignColors.primary100 : Color.clear
                                )
                                .cornerRadius(DesignRadius.md)
                        }
                    }
                    Spacer()
                }
                .padding()
                
                // Content
                ScrollView {
                    switch selectedTab {
                    case 0:
                        WorkoutView()
                    case 1:
                        ProgressView()
                    case 2:
                        PlansView()
                    default:
                        WorkoutView()
                    }
                }
            }
            .navigationTitle("Fitness")
            .background(Color(.systemGroupedBackground))
        }
    }
}

struct WorkoutView: View {
    var body: some View {
        LazyVStack(spacing: 16) {
            // Today's workout
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Today's Workout")
                        .font(.headline)
                    Spacer()
                    Text("45 min")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                WorkoutCard(
                    title: "Upper Body Strength",
                    description: "Focus on chest, shoulders, and arms",
                    duration: "45 min",
                    exercises: 8,
                    difficulty: "Intermediate",
                    status: .ready
                )
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(DesignRadius.lg)
            .shadow(color: DesignShadows.md, radius: 8)
            
            // Workout history
            VStack(alignment: .leading, spacing: 12) {
                Text("Recent Workouts")
                    .font(.headline)
                
                ForEach(0..<3) { index in
                    WorkoutHistoryItem(
                        title: "Full Body HIIT",
                        date: "2 days ago",
                        duration: "30 min",
                        calories: 280,
                        status: .completed
                    )
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(DesignRadius.lg)
            .shadow(color: DesignShadows.md, radius: 8)
        }
        .padding()
    }
}

struct ProgressView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Progress tracking would be implemented here")
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

struct PlansView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Fitness plans would be implemented here")
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

// MARK: - Supporting Views

enum WorkoutStatus {
    case ready, inProgress, completed, skipped
    
    var color: Color {
        switch self {
        case .ready:
            return DesignColors.primary500
        case .inProgress:
            return DesignColors.warning500
        case .completed:
            return DesignColors.success500
        case .skipped:
            return DesignColors.gray400
        }
    }
    
    var text: String {
        switch self {
        case .ready:
            return "Ready"
        case .inProgress:
            return "In Progress"
        case .completed:
            return "Completed"
        case .skipped:
            return "Skipped"
        }
    }
}

struct WorkoutCard: View {
    let title: String
    let description: String
    let duration: String
    let exercises: Int
    let difficulty: String
    let status: WorkoutStatus
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                Spacer()
                
                VStack(spacing: 4) {
                    Circle()
                        .fill(status.color)
                        .frame(width: 12, height: 12)
                    
                    Text(status.text)
                        .font(.caption2)
                        .foregroundColor(status.color)
                }
            }
            
            HStack {
                WorkoutStat(label: "Duration", value: duration, icon: "clock")
                WorkoutStat(label: "Exercises", value: "\(exercises)", icon: "list.bullet")
                WorkoutStat(label: "Level", value: difficulty, icon: "chart.bar")
                
                Spacer()
                
                if status == .ready {
                    Button("Start Workout") {
                        // Start workout action
                    }
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(DesignColors.primary500)
                    .cornerRadius(DesignRadius.sm)
                }
            }
        }
        .padding()
        .background(Color(.tertiarySystemBackground))
        .cornerRadius(DesignRadius.md)
    }
}

struct WorkoutStat: View {
    let label: String
    let value: String
    let icon: String
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(.secondary)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.caption)
                    .fontWeight(.medium)
                
                Text(label)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct WorkoutHistoryItem: View {
    let title: String
    let date: String
    let duration: String
    let calories: Int
    let status: WorkoutStatus
    
    var body: some View {
        HStack {
            Circle()
                .fill(status.color)
                .frame(width: 8, height: 8)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text("\(date) • \(duration)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text("\(calories) cal")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(DesignColors.primary600)
        }
        .padding(.vertical, 8)
    }
}

#Preview {
    FitnessView()
}