import SwiftUI

struct HealthReportsView: View {
    @State private var selectedReportType: ReportType = .weekly
    @State private var showingDetailReport = false
    @State private var selectedReport: HealthReport?
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Report Type Selector
                    ReportTypeSelector(selectedType: $selectedReportType)
                    
                    // Quick Stats Overview
                    QuickStatsCard()
                    
                    // Recent Reports List
                    RecentReportsSection(
                        reportType: selectedReportType,
                        onReportTap: { report in
                            selectedReport = report
                            showingDetailReport = true
                        }
                    )
                    
                    // Health Insights
                    HealthInsightsCard()
                    
                    // Red Flag Alerts
                    RedFlagAlertsCard()
                    
                    Spacer(minLength: 100)
                }
                .padding(.horizontal, 16)
                .padding(.top, 10)
            }
            .navigationTitle("Health Reports")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingDetailReport) {
                if let report = selectedReport {
                    DetailReportView(report: report)
                }
            }
        }
    }
}

// MARK: - Report Type Selector
struct ReportTypeSelector: View {
    @Binding var selectedType: ReportType
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Report Type")
                .font(.headline)
                .foregroundColor(.primary)
            
            HStack(spacing: 12) {
                ForEach(ReportType.allCases, id: \.self) { type in
                    Button(action: {
                        selectedType = type
                    }) {
                        Text(type.displayName)
                            .font(.subheadline)
                            .fontWeight(selectedType == type ? .semibold : .medium)
                            .foregroundColor(selectedType == type ? .white : Color(hex: "#14b8a6"))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 20)
                                    .fill(selectedType == type ? Color(hex: "#14b8a6") : Color(hex: "#14b8a6").opacity(0.1))
                            )
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(UIColor.secondarySystemBackground))
        )
    }
}

// MARK: - Quick Stats Card
struct QuickStatsCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("This Week's Summary")
                .font(.headline)
                .foregroundColor(.primary)
            
            HStack(spacing: 20) {
                StatItem(
                    title: "Avg. Calories",
                    value: "2,150",
                    subtitle: "kcal/day",
                    color: .blue
                )
                
                StatItem(
                    title: "Water Intake",
                    value: "7.5",
                    subtitle: "glasses/day",
                    color: Color(hex: "#14b8a6")
                )
                
                StatItem(
                    title: "Active Days",
                    value: "5/7",
                    subtitle: "this week",
                    color: .green
                )
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(UIColor.secondarySystemBackground))
        )
    }
}

struct StatItem: View {
    let title: String
    let value: String
    let subtitle: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            
            Text(subtitle)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Recent Reports Section
struct RecentReportsSection: View {
    let reportType: ReportType
    let onReportTap: (HealthReport) -> Void
    
    private let sampleReports = [
        HealthReport(id: "1", title: "Weekly Health Summary", date: Date(), type: .weekly, status: .complete),
        HealthReport(id: "2", title: "Monthly Progress Report", date: Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date(), type: .monthly, status: .complete),
        HealthReport(id: "3", title: "Quarterly Analysis", date: Calendar.current.date(byAdding: .day, value: -30, to: Date()) ?? Date(), type: .quarterly, status: .complete)
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Recent Reports")
                .font(.headline)
                .foregroundColor(.primary)
            
            ForEach(filteredReports, id: \.id) { report in
                ReportRow(report: report) {
                    onReportTap(report)
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(UIColor.secondarySystemBackground))
        )
    }
    
    private var filteredReports: [HealthReport] {
        sampleReports.filter { $0.type == reportType }
    }
}

struct ReportRow: View {
    let report: HealthReport
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(report.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    Text(report.date, style: .date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Health Insights Card
struct HealthInsightsCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Health Insights")
                .font(.headline)
                .foregroundColor(.primary)
            
            VStack(spacing: 8) {
                InsightRow(
                    icon: "checkmark.circle.fill",
                    text: "Great job maintaining consistent water intake!",
                    color: .green
                )
                
                InsightRow(
                    icon: "exclamationmark.triangle.fill",
                    text: "Consider increasing fiber intake by 5g daily",
                    color: .orange
                )
                
                InsightRow(
                    icon: "info.circle.fill",
                    text: "Your sleep quality has improved 15% this week",
                    color: .blue
                )
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(UIColor.secondarySystemBackground))
        )
    }
}

struct InsightRow: View {
    let icon: String
    let text: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(color)
            
            Text(text)
                .font(.caption)
                .foregroundColor(.primary)
                .multilineTextAlignment(.leading)
            
            Spacer()
        }
    }
}

// MARK: - Red Flag Alerts Card
struct RedFlagAlertsCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.red)
                
                Text("Health Alerts")
                    .font(.headline)
                    .foregroundColor(.primary)
            }
            
            Text("No critical health alerts at this time")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(.vertical, 8)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.red.opacity(0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.red.opacity(0.2), lineWidth: 1)
                )
        )
    }
}

// MARK: - Detail Report View
struct DetailReportView: View {
    let report: HealthReport
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(report.title)
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Generated on \(report.date, style: .date)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    // Report content would go here
                    Text("Detailed report content would be displayed here...")
                        .foregroundColor(.secondary)
                    
                    Spacer()
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: Button("Done") {
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
    }
}

// MARK: - Supporting Types
enum ReportType: CaseIterable {
    case weekly, monthly, quarterly
    
    var displayName: String {
        switch self {
        case .weekly: return "Weekly"
        case .monthly: return "Monthly"
        case .quarterly: return "Quarterly"
        }
    }
}

struct HealthReport {
    let id: String
    let title: String
    let date: Date
    let type: ReportType
    let status: ReportStatus
}

enum ReportStatus {
    case pending, complete, error
}

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
    HealthReportsView()
}