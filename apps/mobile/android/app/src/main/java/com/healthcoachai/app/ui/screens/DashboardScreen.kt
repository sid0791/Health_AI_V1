package com.healthcoachai.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.healthcoachai.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen() {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            // Greeting Section
            GreetingCard()
        }
        
        item {
            // Today's Meals Card
            DashboardCard(
                title = "Today's Meals",
                subtitle = "3 of 4 meals completed",
                icon = Icons.Filled.Restaurant,
                onClick = { 
                    // Navigate to meal plan screen
                    // In real implementation: navController.navigate("meal_plan")
                }
            )
        }
        
        item {
            // Quick Actions
            QuickActionsSection()
        }
        
        item {
            // Activity Widget
            DashboardCard(
                title = "Today's Activity",
                subtitle = "7,543 steps • 45 min workout",
                icon = Icons.Filled.DirectionsWalk,
                onClick = { 
                    // Navigate to fitness screen
                    // In real implementation: navController.navigate("fitness")
                }
            )
        }
    }
}

@Composable
fun GreetingCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Good Morning!",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "How are you feeling today?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            // Profile avatar placeholder
            Box(
                modifier = Modifier
                    .size(50.dp)
                    .clip(CircleShape)
                    .background(Primary500),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "JD",
                    color = androidx.compose.ui.graphics.Color.White,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
fun DashboardCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = Secondary500,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@Composable
fun QuickActionsSection() {
    Column {
        Text(
            text = "Quick Actions",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(bottom = 12.dp)
        )
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            QuickActionButton(
                title = "Log Meal",
                icon = Icons.Filled.Add,
                color = Success500,
                modifier = Modifier.weight(1f),
                onClick = { 
                    // Open meal logging dialog or navigate to log screen
                    // In real implementation: navController.navigate("log_meal")
                }
            )
            
            QuickActionButton(
                title = "Update Weight",
                icon = Icons.Filled.FitnessCenter,
                color = Primary500,
                modifier = Modifier.weight(1f),
                onClick = { 
                    // Open weight update dialog or navigate to profile
                    // In real implementation: show weight update dialog
                }
            )
            
            QuickActionButton(
                title = "Chat AI",
                icon = Icons.Filled.Chat,
                color = Secondary500,
                modifier = Modifier.weight(1f),
                onClick = { 
                    // Navigate to AI chat screen
                    // In real implementation: navController.navigate("chat")
                }
            )
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            QuickActionButton(
                title = "Analytics",
                icon = Icons.Filled.Analytics,
                color = androidx.compose.ui.graphics.Color(0xFF8B5CF6),
                modifier = Modifier.weight(1f),
                onClick = { 
                    // Navigate to analytics screen (modal or separate activity)
                    // In real implementation: navController.navigate("analytics")
                }
            )
            
            QuickActionButton(
                title = "Health Report",
                icon = Icons.Filled.Assessment,
                color = androidx.compose.ui.graphics.Color(0xFFEF4444),
                modifier = Modifier.weight(1f),
                onClick = { 
                    // Navigate to health reports screen
                    // In real implementation: navController.navigate("health_reports")
                }
            )
            
            // Empty space to maintain balance
            Spacer(modifier = Modifier.weight(1f))
        }
    }
}

@Composable
fun QuickActionButton(
    title: String,
    icon: ImageVector,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = modifier.height(80.dp), // WCAG AA minimum tap target
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = color,
                modifier = Modifier.size(24.dp)
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun DashboardScreenPreview() {
    HealthCoachAITheme {
        DashboardScreen()
    }
}