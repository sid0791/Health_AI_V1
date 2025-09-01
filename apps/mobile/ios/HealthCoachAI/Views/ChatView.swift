import SwiftUI

struct ChatView: View {
    @StateObject private var viewModel = ChatViewModel()
    @StateObject private var costService = CostOptimizationService.shared
    @State private var messageText = ""
    @State private var selectedQuestionCategory = "all"
    @State private var showingCostOptimization = false
    @State private var showingAiCapabilities = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header with connection status and cost info
                headerView
                
                // Messages list
                messagesView
                
                // Suggested questions
                if !viewModel.uiState.suggestedQuestions.isEmpty {
                    suggestedQuestionsView
                }
                
                // Input area
                inputView
            }
            .navigationTitle("AI Health Assistant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: { showingAiCapabilities = true }) {
                            Label("AI Capabilities", systemImage: "info.circle")
                        }
                        
                        Button(action: { showingCostOptimization = true }) {
                            Label("Cost Optimization", systemImage: "chart.bar")
                        }
                        
                        Button(action: viewModel.createNewSession) {
                            Label("New Session", systemImage: "plus.circle")
                        }
                        
                        if viewModel.uiState.currentSession != nil {
                            Button(action: viewModel.deleteCurrentSession) {
                                Label("Delete Session", systemImage: "trash")
                            }
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .onAppear {
            if !viewModel.uiState.isConnected && viewModel.uiState.currentSession == nil {
                viewModel.initializeChat()
            }
        }
        .sheet(isPresented: $showingCostOptimization) {
            CostOptimizationView()
        }
        .sheet(isPresented: $showingAiCapabilities) {
            AiCapabilitiesView(capabilities: viewModel.uiState.aiCapabilities)
        }
        .alert("Error", isPresented: .constant(viewModel.uiState.error != nil)) {
            Button("OK") {
                viewModel.clearError()
            }
            if viewModel.uiState.error?.contains("limit") == true {
                Button("Retry") {
                    viewModel.retryLastMessage()
                }
            }
        } message: {
            Text(viewModel.uiState.error ?? "")
        }
    }
    
    // MARK: - Header View
    
    private var headerView: some View {
        VStack(spacing: 8) {
            HStack {
                // Connection status
                HStack(spacing: 4) {
                    Circle()
                        .fill(viewModel.uiState.isConnected ? Color.green : Color.red)
                        .frame(width: 8, height: 8)
                    Text(viewModel.uiState.connectionStatus)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Cost status
                if let quotaStatus = costService.quotaStatus {
                    HStack(spacing: 4) {
                        Image(systemName: costService.isNearLimit ? "exclamationmark.triangle" : "checkmark.circle")
                            .foregroundColor(costService.isNearLimit ? .orange : .green)
                            .font(.caption)
                        
                        Text("\(quotaStatus.dailyUsed)/\(quotaStatus.dailyQuota)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            // Domain restriction notice
            if let capabilities = viewModel.uiState.aiCapabilities {
                HStack {
                    Image(systemName: "shield.checkered")
                        .foregroundColor(.blue)
                        .font(.caption)
                    
                    Text("This AI assistant is restricted to health, nutrition, fitness, diet, and mental wellbeing topics only.")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.leading)
                    
                    Spacer()
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(UIColor.systemGray6))
    }
    
    // MARK: - Messages View
    
    private var messagesView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    if viewModel.uiState.isInitializing {
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text("Connecting to AI assistant...")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                    } else if viewModel.uiState.messages.isEmpty {
                        VStack(spacing: 16) {
                            Image(systemName: "brain.head.profile")
                                .font(.system(size: 50))
                                .foregroundColor(.blue)
                            
                            Text("AI Health Assistant")
                                .font(.title2)
                                .fontWeight(.semibold)
                            
                            Text("Ask me anything about health, nutrition, fitness, diet, or mental wellbeing. I'm here to help you achieve your wellness goals!")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                        .padding(.top, 50)
                    } else {
                        ForEach(viewModel.uiState.messages) { message in
                            MessageBubble(message: message)
                                .id(message.id)
                        }
                        
                        if viewModel.uiState.isSending {
                            HStack {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("AI is thinking...")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                            }
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }
            .onChange(of: viewModel.uiState.messages.count) { _ in
                if let lastMessage = viewModel.uiState.messages.last {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
    }
    
    // MARK: - Suggested Questions View
    
    private var suggestedQuestionsView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Suggested Questions")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Spacer()
                
                // Category filter
                Picker("Category", selection: $selectedQuestionCategory) {
                    Text("All").tag("all")
                    Text("Nutrition").tag("nutrition")
                    Text("Fitness").tag("fitness")
                    Text("Health").tag("health")
                    Text("Mental Health").tag("mental_health")
                }
                .pickerStyle(MenuPickerStyle())
                .font(.caption)
            }
            .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(viewModel.getFilteredSuggestedQuestions(category: selectedQuestionCategory)) { question in
                        SuggestedQuestionCard(question: question) {
                            viewModel.sendSuggestedQuestion(question)
                        }
                    }
                }
                .padding(.horizontal)
            }
            
            if viewModel.uiState.isLoadingSuggestions {
                HStack {
                    ProgressView()
                        .scaleEffect(0.7)
                    Text("Loading suggestions...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(.horizontal)
            }
        }
        .padding(.vertical, 8)
        .background(Color(UIColor.systemGray6))
    }
    
    // MARK: - Input View
    
    private var inputView: some View {
        VStack(spacing: 0) {
            Divider()
            
            HStack(spacing: 12) {
                // Message input
                HStack {
                    TextField("Ask about health, nutrition, fitness...", text: $messageText, axis: .vertical)
                        .textFieldStyle(PlainTextFieldStyle())
                        .lineLimit(1...4)
                        .disabled(viewModel.uiState.isSending || costService.isOverLimit)
                    
                    if !messageText.isEmpty {
                        Button(action: clearMessage) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(UIColor.systemGray6))
                .cornerRadius(20)
                
                // Send button
                Button(action: sendMessage) {
                    Image(systemName: "paperplane.fill")
                        .foregroundColor(.white)
                        .frame(width: 36, height: 36)
                        .background(
                            Circle()
                                .fill(canSendMessage ? Color.blue : Color.gray)
                        )
                }
                .disabled(!canSendMessage)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(Color(UIColor.systemBackground))
    }
    
    // MARK: - Helper Properties
    
    private var canSendMessage: Bool {
        !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !viewModel.uiState.isSending &&
        viewModel.uiState.isConnected &&
        !costService.isOverLimit
    }
    
    // MARK: - Actions
    
    private func sendMessage() {
        let trimmedMessage = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedMessage.isEmpty else { return }
        
        viewModel.sendMessage(trimmedMessage)
        messageText = ""
    }
    
    private func clearMessage() {
        messageText = ""
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    
    var body: some View {
        HStack {
            if message.type == "user" {
                Spacer()
            }
            
            VStack(alignment: message.type == "user" ? .trailing : .leading, spacing: 4) {
                Text(message.message)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(message.type == "user" ? Color.blue : Color(UIColor.systemGray6))
                    )
                    .foregroundColor(message.type == "user" ? .white : .primary)
                
                HStack(spacing: 4) {
                    Text(formatTimestamp(message.timestamp))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    
                    if let tokenCount = message.tokenCount, tokenCount > 0 {
                        Text("• \(tokenCount) tokens")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    
                    if let cost = message.costUsd, cost > 0 {
                        Text("• $\(String(format: "%.4f", cost))")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                if let metadata = message.metadata, let classification = metadata.domainClassification {
                    HStack(spacing: 4) {
                        Image(systemName: metadata.isInScope == true ? "checkmark.shield" : "exclamationmark.shield")
                            .font(.caption2)
                            .foregroundColor(metadata.isInScope == true ? .green : .orange)
                        
                        Text(classification.capitalized)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            if message.type == "assistant" {
                Spacer()
            }
        }
    }
    
    private func formatTimestamp(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Suggested Question Card

struct SuggestedQuestionCard: View {
    let question: SuggestedQuestion
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                Text(question.question)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.leading)
                
                if let description = question.description {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.leading)
                }
                
                Text(question.category.capitalized)
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundColor(.blue)
            }
            .padding(12)
            .frame(width: 200, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(UIColor.systemBackground))
                    .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Cost Optimization View

struct CostOptimizationView: View {
    @StateObject private var costService = CostOptimizationService.shared
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                if let metrics = costService.currentCostMetrics {
                    CostMetricsCard(metrics: metrics)
                }
                
                if let quotaStatus = costService.quotaStatus {
                    QuotaStatusCard(quotaStatus: quotaStatus)
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("Optimization Recommendations")
                        .font(.headline)
                    
                    ForEach(costService.getOptimizationRecommendations(), id: \.self) { recommendation in
                        HStack {
                            Image(systemName: "lightbulb")
                                .foregroundColor(.orange)
                            Text(recommendation)
                                .font(.body)
                                .foregroundColor(.primary)
                        }
                    }
                }
                .padding()
                .background(Color(UIColor.systemGray6))
                .cornerRadius(12)
                
                Spacer()
            }
            .padding()
            .navigationTitle("Cost Optimization")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Cost Metrics Card

struct CostMetricsCard: View {
    let metrics: CostMetrics
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Usage Metrics")
                .font(.headline)
            
            HStack {
                MetricItem(title: "Total Requests", value: "\(metrics.totalRequests)")
                Spacer()
                MetricItem(title: "Total Tokens", value: "\(metrics.totalTokens)")
            }
            
            HStack {
                MetricItem(title: "Total Cost", value: String(format: "$%.4f", metrics.totalCost))
                Spacer()
                MetricItem(title: "Avg Cost/Request", value: String(format: "$%.4f", metrics.averageCostPerRequest))
            }
        }
        .padding()
        .background(Color(UIColor.systemGray6))
        .cornerRadius(12)
    }
}

struct MetricItem: View {
    let title: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.headline)
                .foregroundColor(.primary)
        }
    }
}

// MARK: - Quota Status Card

struct QuotaStatusCard: View {
    let quotaStatus: QuotaStatus
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Daily Quota")
                .font(.headline)
            
            VStack(spacing: 8) {
                HStack {
                    Text("Used: \(quotaStatus.dailyUsed) / \(quotaStatus.dailyQuota)")
                        .font(.body)
                    Spacer()
                    Text(String(format: "%.1f%%", Double(quotaStatus.dailyUsed) / Double(quotaStatus.dailyQuota) * 100))
                        .font(.body)
                        .fontWeight(.semibold)
                }
                
                ProgressView(value: Double(quotaStatus.dailyUsed), total: Double(quotaStatus.dailyQuota))
                    .tint(quotaStatus.isNearLimit ? .orange : .green)
            }
            
            if quotaStatus.isNearLimit {
                Text("⚠️ Approaching daily limit")
                    .font(.caption)
                    .foregroundColor(.orange)
            } else if quotaStatus.isOverLimit {
                Text("❌ Daily limit exceeded")
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
        .padding()
        .background(Color(UIColor.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - AI Capabilities View

struct AiCapabilitiesView: View {
    let capabilities: AiCapabilities?
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 20) {
                if let capabilities = capabilities {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Allowed Topics")
                            .font(.headline)
                        
                        ForEach(capabilities.allowedTopics, id: \.self) { topic in
                            HStack {
                                Image(systemName: "checkmark.circle")
                                    .foregroundColor(.green)
                                Text(topic.capitalized)
                            }
                        }
                    }
                    
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Restricted Topics")
                            .font(.headline)
                        
                        ForEach(capabilities.restrictedTopics, id: \.self) { topic in
                            HStack {
                                Image(systemName: "xmark.circle")
                                    .foregroundColor(.red)
                                Text(topic.capitalized)
                            }
                        }
                    }
                    
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Supported Languages")
                            .font(.headline)
                        
                        ForEach(capabilities.supportedLanguages, id: \.self) { language in
                            HStack {
                                Image(systemName: "globe")
                                    .foregroundColor(.blue)
                                Text(language.uppercased())
                            }
                        }
                    }
                } else {
                    Text("No capabilities information available")
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("AI Capabilities")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
struct ChatView_Previews: PreviewProvider {
    static var previews: some View {
        ChatView()
    }
}
#endif