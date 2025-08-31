package com.healthcoachai.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.healthcoachai.app.ui.theme.*

// Data classes for fitness
data class WorkoutPlan(
    val id: String,
    val name: String,
    val duration: String,
    val difficulty: String,
    val focusAreas: List<String>,
    val exercises: List<Exercise>
)

data class Exercise(
    val id: String,
    val name: String,
    val type: ExerciseType,
    val sets: Int,
    val reps: String,
    val duration: String?,
    val restTime: String,
    val instructions: String
)

enum class ExerciseType(val displayName: String, val icon: ImageVector, val color: Color) {
    CARDIO("Cardio", Icons.Default.DirectionsRun, Primary500),
    STRENGTH("Strength", Icons.Default.FitnessCenter, Secondary500),
    FLEXIBILITY("Flexibility", Icons.Default.SelfImprovement, Success500),
    CORE("Core", Icons.Default.Accessibility, Warning500)
}

data class FitnessStats(
    val weeklyGoal: Int,
    val completedWorkouts: Int,
    val totalMinutes: Int,
    val avgHeartRate: Int,
    val caloriesBurned: Int
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FitnessScreen() {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Today", "Week Plan", "Progress")
    
    val fitnessStats = FitnessStats(
        weeklyGoal = 5,
        completedWorkouts = 3,
        totalMinutes = 180,
        avgHeartRate = 142,
        caloriesBurned = 850
    )
    
    val todayWorkout = WorkoutPlan(
        id = "1",
        name = "Upper Body Strength",
        duration = "45 min",
        difficulty = "Intermediate",
        focusAreas = listOf("Chest", "Back", "Arms"),
        exercises = listOf(
            Exercise("1", "Push-ups", ExerciseType.STRENGTH, 3, "12-15", null, "60s", "Standard push-up form"),
            Exercise("2", "Pull-ups", ExerciseType.STRENGTH, 3, "8-10", null, "90s", "Full range of motion"),
            Exercise("3", "Plank", ExerciseType.CORE, 3, "", "45s", "30s", "Hold steady position"),
            Exercise("4", "Jumping Jacks", ExerciseType.CARDIO, 3, "20", null, "30s", "Keep steady rhythm")
        )
    )
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Gray50)
    ) {
        // Header
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = Secondary500)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Fitness & Workouts",
                    style = MaterialTheme.typography.headlineSmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Personalized training for your goals",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.9f)
                )
            }
        }
        
        // Weekly Progress Summary
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "This Week's Progress",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    FitnessStatItem(
                        value = "${fitnessStats.completedWorkouts}/${fitnessStats.weeklyGoal}",
                        label = "Workouts",
                        icon = Icons.Default.FitnessCenter,
                        color = Primary500
                    )
                    FitnessStatItem(
                        value = "${fitnessStats.totalMinutes}",
                        label = "Minutes",
                        icon = Icons.Default.Timer,
                        color = Secondary500
                    )
                    FitnessStatItem(
                        value = "${fitnessStats.caloriesBurned}",
                        label = "Calories",
                        icon = Icons.Default.LocalFireDepartment,
                        color = Warning500
                    )
                    FitnessStatItem(
                        value = "${fitnessStats.avgHeartRate}",
                        label = "Avg HR",
                        icon = Icons.Default.Favorite,
                        color = Error500
                    )
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Weekly goal progress
                val weeklyProgress = fitnessStats.completedWorkouts.toFloat() / fitnessStats.weeklyGoal.toFloat()
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Weekly Goal",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray700
                        )
                        Text(
                            text = "${(weeklyProgress * 100).toInt()}% Complete",
                            style = MaterialTheme.typography.bodySmall,
                            color = Primary600,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    LinearProgressIndicator(
                        progress = weeklyProgress,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = Primary500,
                        trackColor = Primary100
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Tab selector
        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(tabs.size) { index ->
                val isSelected = selectedTab == index
                
                Card(
                    modifier = Modifier
                        .clickable { selectedTab = index },
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSelected) Secondary500 else Color.White
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Text(
                        text = tabs[index],
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = if (isSelected) Color.White else Gray700,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Content based on selected tab
        when (selectedTab) {
            0 -> TodayWorkoutContent(todayWorkout)
            1 -> WeekPlanContent()
            2 -> ProgressContent()
        }
    }
}

@Composable
fun FitnessStatItem(
    value: String,
    label: String,
    icon: ImageVector,
    color: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(color.copy(alpha = 0.1f))
            .padding(12.dp)
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = color.copy(alpha = 0.8f)
        )
    }
}

@Composable
fun TodayWorkoutContent(workout: WorkoutPlan) {
    LazyColumn(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Card {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = workout.name,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = Gray900
                            )
                            Text(
                                text = "${workout.duration} • ${workout.difficulty}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Gray600
                            )
                        }
                        
                        Button(
                            onClick = { /* Start workout */ },
                            colors = ButtonDefaults.buttonColors(containerColor = Secondary500)
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Start")
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    // Focus areas
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(workout.focusAreas) { area ->
                            Surface(
                                color = Primary100,
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Text(
                                    text = area,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Primary700
                                )
                            }
                        }
                    }
                }
            }
        }
        
        items(workout.exercises) { exercise ->
            ExerciseCard(exercise = exercise)
        }
    }
}

@Composable
fun ExerciseCard(exercise: Exercise) {
    Card {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(exercise.type.color.copy(alpha = 0.1f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                exercise.type.icon,
                                contentDescription = null,
                                tint = exercise.type.color,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = exercise.name,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = Gray900
                            )
                            Text(
                                text = exercise.type.displayName,
                                style = MaterialTheme.typography.bodySmall,
                                color = exercise.type.color
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = exercise.instructions,
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray600
                    )
                }
                
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${exercise.sets} sets",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Medium,
                        color = Gray900
                    )
                    if (exercise.reps.isNotEmpty()) {
                        Text(
                            text = "${exercise.reps} reps",
                            style = MaterialTheme.typography.labelSmall,
                            color = Gray600
                        )
                    }
                    exercise.duration?.let {
                        Text(
                            text = it,
                            style = MaterialTheme.typography.labelSmall,
                            color = Gray600
                        )
                    }
                    Text(
                        text = "Rest: ${exercise.restTime}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Gray500
                    )
                }
            }
        }
    }
}

@Composable
fun WeekPlanContent() {
    // Placeholder for week plan view
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Default.CalendarMonth,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = Gray400
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Weekly Plan",
            style = MaterialTheme.typography.titleLarge,
            color = Gray600
        )
        Text(
            text = "View your complete weekly workout schedule",
            style = MaterialTheme.typography.bodyMedium,
            color = Gray500,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun ProgressContent() {
    // Placeholder for progress analytics
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Default.Analytics,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = Gray400
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Progress Analytics",
            style = MaterialTheme.typography.titleLarge,
            color = Gray600
        )
        Text(
            text = "Track your fitness journey with detailed metrics",
            style = MaterialTheme.typography.bodyMedium,
            color = Gray500,
            textAlign = TextAlign.Center
        )
    }
}

@Preview(showBackground = true)
@Composable
fun FitnessScreenPreview() {
    HealthCoachAITheme {
        FitnessScreen()
    }
}