package com.healthcoachai.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.healthcoachai.app.viewmodels.ChatViewModel
import com.healthcoachai.app.data.ChatMessage
import com.healthcoachai.app.data.SuggestedQuestion
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen() {
    val viewModel: ChatViewModel = viewModel()
    val uiState = viewModel.uiState
    var messageText by remember { mutableStateOf("") }
    var selectedQuestionCategory by remember { mutableStateOf("all") }
    val keyboardController = LocalSoftwareKeyboardController.current
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    
    // Auto-scroll to bottom when messages change
    LaunchedEffect(uiState.messages.size) {
        if (uiState.messages.isNotEmpty()) {
            scope.launch {
                listState.animateScrollToItem(uiState.messages.size - 1)
            }
        }
    }
    
    // Show loading state while initializing
    if (uiState.isInitializing) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(48.dp),
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Initializing AI Health Assistant...",
                    style = MaterialTheme.typography.titleMedium,
                    textAlign = TextAlign.Center
                )
                Text(
                    text = "Setting up your personalized chat experience.",
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }
        }
        return
    }
    
    // Show error state
    if (uiState.error != null) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(16.dp)
            ) {
                Icon(
                    Icons.Default.Warning,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Unable to Start Chat",
                    style = MaterialTheme.typography.titleLarge,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = uiState.error,
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = { viewModel.retry() }
                ) {
                    Text("Try Again")
                }
            }
        }
        return
    }
    
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Header
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
            shape = RoundedCornerShape(bottomStart = 0.dp, bottomEnd = 0.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "AI Health Coach",
                        style = MaterialTheme.typography.titleLarge,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Your personal nutrition and wellness assistant",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
                
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Connection status
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(
                                    if (uiState.isConnected) Color.Green else Color.Red,
                                    RoundedCornerShape(50%)
                                )
                        )
                        Text(
                            text = if (uiState.isConnected) "Connected" else "Connecting...",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.9f)
                        )
                    }
                    
                    // Thinking indicator
                    if (uiState.isThinking) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = Color.White
                            )
                            Text(
                                text = "AI thinking...",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.9f)
                            )
                        }
                    }
                }
            }
        }
        
        // Quick Actions
        if (uiState.messages.isEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "Quick Actions",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val quickActions = listOf(
                            "Log Food" to "🍎",
                            "Health Tips" to "💡",
                            "Meal Ideas" to "🍽️",
                            "Exercise" to "🏃"
                        )
                        
                        items(quickActions) { (action, emoji) ->
                            AssistChip(
                                onClick = { /* TODO: Handle quick action */ },
                                label = {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Text(emoji)
                                        Text(action)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
        
        // Messages
        LazyColumn(
            modifier = Modifier.weight(1f),
            state = listState,
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (uiState.messages.isEmpty() && !uiState.isThinking) {
                item {
                    WelcomeMessage()
                }
            }
            
            items(uiState.messages) { message ->
                MessageBubble(message = message)
            }
            
            if (uiState.isThinking) {
                item {
                    TypingIndicator()
                }
            }
        }
        
        // Suggested Questions
        if (uiState.suggestedQuestions.isNotEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Suggested questions:",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Medium
                        )
                        
                        // Category filter dropdown
                        Box {
                            var expanded by remember { mutableStateOf(false) }
                            
                            OutlinedButton(
                                onClick = { expanded = true },
                                modifier = Modifier.height(32.dp)
                            ) {
                                Text(
                                    text = selectedQuestionCategory.replaceFirstChar { it.uppercase() },
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }
                            
                            DropdownMenu(
                                expanded = expanded,
                                onDismissRequest = { expanded = false }
                            ) {
                                listOf("all", "nutrition", "fitness", "health", "meal_planning").forEach { category ->
                                    DropdownMenuItem(
                                        text = { Text(category.replaceFirstChar { it.uppercase() }) },
                                        onClick = {
                                            selectedQuestionCategory = category
                                            expanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    LazyColumn(
                        modifier = Modifier.height(120.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        val filteredQuestions = uiState.suggestedQuestions
                            .filter { selectedQuestionCategory == "all" || it.category == selectedQuestionCategory }
                            .take(6)
                            
                        items(filteredQuestions) { question ->
                            SuggestedQuestionCard(
                                question = question,
                                onClick = { viewModel.sendMessage(question.question) },
                                enabled = !uiState.isThinking
                            )
                        }
                    }
                }
            }
        }
        
        // Message Input
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(topStart = 0.dp, topEnd = 0.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Quick add button
                    IconButton(
                        onClick = { /* TODO: Quick add functionality */ }
                    ) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = "Quick add",
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                    
                    // Message input field
                    OutlinedTextField(
                        value = messageText,
                        onValueChange = { messageText = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { 
                            Text("Ask me about nutrition, health, meal planning, or fitness...")
                        },
                        enabled = !uiState.isThinking,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(
                            onSend = {
                                if (messageText.trim().isNotEmpty()) {
                                    viewModel.sendMessage(messageText.trim())
                                    messageText = ""
                                    keyboardController?.hide()
                                }
                            }
                        ),
                        shape = RoundedCornerShape(24.dp)
                    )
                    
                    // Voice input button
                    IconButton(
                        onClick = { /* TODO: Voice input */ }
                    ) {
                        Icon(
                            Icons.Default.Mic,
                            contentDescription = "Voice input",
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                    
                    // Send button
                    IconButton(
                        onClick = {
                            if (messageText.trim().isNotEmpty()) {
                                viewModel.sendMessage(messageText.trim())
                                messageText = ""
                                keyboardController?.hide()
                            }
                        },
                        enabled = messageText.trim().isNotEmpty() && !uiState.isThinking
                    ) {
                        Icon(
                            Icons.Default.Send,
                            contentDescription = "Send message",
                            tint = if (messageText.trim().isNotEmpty() && !uiState.isThinking)
                                MaterialTheme.colorScheme.primary
                            else
                                MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                        )
                    }
                }
                
                // Status text
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Press Enter to send",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                    Text(
                        text = "🔒 Health-focused AI • English, Hindi & Hinglish supported",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
                
                // Error message
                if (uiState.sendError != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Failed to send message: ${uiState.sendError}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Composable
fun WelcomeMessage() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "💡",
                style = MaterialTheme.typography.displaySmall
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Welcome to AI Health Coach!",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "I'm here to help with your nutrition, fitness, and health questions. Ask me anything about your wellness journey!",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "🔒 This chat is domain-restricted to health, nutrition, and fitness topics only.",
                style = MaterialTheme.typography.labelSmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
    }
}

@Composable
fun MessageBubble(message: ChatMessage) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (message.type == "user") Arrangement.End else Arrangement.Start
    ) {
        Card(
            modifier = Modifier.widthIn(max = 280.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (message.type == "user")
                    MaterialTheme.colorScheme.primary
                else
                    MaterialTheme.colorScheme.surface
            ),
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (message.type == "user") 16.dp else 4.dp,
                bottomEnd = if (message.type == "user") 4.dp else 16.dp
            )
        ) {
            Column(
                modifier = Modifier.padding(12.dp)
            ) {
                Text(
                    text = message.message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (message.type == "user")
                        Color.White
                    else
                        MaterialTheme.colorScheme.onSurface
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = formatTimestamp(message.timestamp),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (message.type == "user")
                        Color.White.copy(alpha = 0.7f)
                    else
                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
                
                // Domain restriction warning
                if (message.metadata?.domainClassification?.isInScope == false) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = Color(0xFFFFF3CD)
                        )
                    ) {
                        Text(
                            text = "⚠️ This question is outside my health expertise. I can only help with nutrition, fitness, and wellness topics.",
                            modifier = Modifier.padding(8.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF856404)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun TypingIndicator() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Start
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                repeat(3) { index ->
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(
                                MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                RoundedCornerShape(50%)
                            )
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "AI is analyzing your question...",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
        }
    }
}

@Composable
fun SuggestedQuestionCard(
    question: SuggestedQuestion,
    onClick: () -> Unit,
    enabled: Boolean
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = enabled) { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface.copy(
                alpha = if (enabled) 1f else 0.6f
            )
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Text(
                text = question.category.replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = question.question,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(
                    alpha = if (enabled) 1f else 0.6f
                )
            )
        }
    }
}

fun formatTimestamp(timestamp: String): String {
    // TODO: Implement proper timestamp formatting
    return try {
        timestamp.substringAfter("T").substring(0, 5)
    } catch (e: Exception) {
        "now"
    }
}