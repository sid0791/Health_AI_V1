package com.healthcoachai.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.healthcoachai.app.ui.theme.*

// Data classes for Meal Plan
data class MealPlanDay(
    val dayName: String,
    val date: String,
    val isSelected: Boolean = false
)

data class Meal(
    val name: String,
    val calories: Int,
    val protein: Int,
    val carbs: Int,
    val fat: Int,
    val description: String
)

// Data classes for Food Logging
data class FoodLogEntry(
    val id: String,
    val name: String,
    val quantity: String,
    val calories: Int,
    val time: String,
    val mealType: String
)

// Data classes for Fitness
data class WorkoutPlan(
    val title: String,
    val duration: String,
    val difficulty: String,
    val exercises: List<Exercise>
)

data class Exercise(
    val name: String,
    val sets: String,
    val reps: String,
    val restTime: String,
    val targetMuscles: List<String>
)

// Data classes for Settings
data class SettingsSection(
    val title: String,
    val items: List<SettingsItem>
)

data class SettingsItem(
    val title: String,
    val subtitle: String? = null,
    val icon: ImageVector,
    val action: SettingsAction
)

sealed class SettingsAction {
    object Navigate : SettingsAction()
    data class Toggle(val isEnabled: Boolean) : SettingsAction()
    object Action : SettingsAction()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MealPlanScreen() {
    var selectedDay by remember { mutableStateOf("Mon") }
    
    val days = listOf(
        MealPlanDay("Mon", "12", selectedDay == "Mon"),
        MealPlanDay("Tue", "13", selectedDay == "Tue"),
        MealPlanDay("Wed", "14", selectedDay == "Wed"),
        MealPlanDay("Thu", "15", selectedDay == "Thu"),
        MealPlanDay("Fri", "16", selectedDay == "Fri"),
        MealPlanDay("Sat", "17", selectedDay == "Sat"),
        MealPlanDay("Sun", "18", selectedDay == "Sun")
    )
    
    val meals = mapOf(
        "Breakfast" to Meal("Oatmeal with Berries", 320, 12, 58, 6, "Steel-cut oats with fresh blueberries and almonds"),
        "Lunch" to Meal("Grilled Chicken Salad", 450, 35, 20, 25, "Mixed greens with grilled chicken and avocado"),
        "Dinner" to Meal("Salmon with Quinoa", 580, 42, 45, 28, "Baked salmon with quinoa and roasted vegetables"),
        "Snack" to Meal("Greek Yogurt & Nuts", 180, 15, 12, 8, "Plain Greek yogurt with mixed nuts")
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "7-Day Meal Plan",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = "Personalized meals based on your dietary preferences",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        
        item {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(horizontal = 4.dp)
            ) {
                items(days) { day ->
                    Card(
                        onClick = { selectedDay = day.dayName },
                        modifier = Modifier.width(70.dp).height(80.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (day.isSelected) Primary500 else MaterialTheme.colorScheme.surface
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = if (day.isSelected) 8.dp else 4.dp)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = day.dayName,
                                style = MaterialTheme.typography.labelMedium,
                                color = if (day.isSelected) Color.White else MaterialTheme.colorScheme.onSurface,
                                fontWeight = FontWeight.Medium
                            )
                            Text(
                                text = day.date,
                                style = MaterialTheme.typography.headlineSmall,
                                color = if (day.isSelected) Color.White else MaterialTheme.colorScheme.onSurface,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
        
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Daily Summary",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Calories", style = MaterialTheme.typography.labelSmall)
                            Text("1,530", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Primary500)
                            Text("kcal", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Protein", style = MaterialTheme.typography.labelSmall)
                            Text("104", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Primary500)
                            Text("g", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Carbs", style = MaterialTheme.typography.labelSmall)
                            Text("135", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Primary500)
                            Text("g", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Fat", style = MaterialTheme.typography.labelSmall)
                            Text("67", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Primary500)
                            Text("g", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
        
        items(meals.toList()) { (mealType, meal) ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(mealType, style = MaterialTheme.typography.labelLarge)
                            Text(meal.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("${meal.calories} cal", style = MaterialTheme.typography.labelLarge, color = Secondary500, fontWeight = FontWeight.SemiBold)
                            TextButton(onClick = { }) { Text("Swap") }
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(meal.description, style = MaterialTheme.typography.bodyMedium)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Protein", style = MaterialTheme.typography.labelSmall)
                            Text("${meal.protein}g", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = Success500)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Carbs", style = MaterialTheme.typography.labelSmall)
                            Text("${meal.carbs}g", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = Warning500)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Fat", style = MaterialTheme.typography.labelSmall)
                            Text("${meal.fat}g", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = Secondary500)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogScreen() {
    var searchQuery by remember { mutableStateOf("") }
    val keyboardController = LocalSoftwareKeyboardController.current
    
    val todayLogs = listOf(
        FoodLogEntry("1", "Oatmeal with berries", "1 bowl", 320, "8:30 AM", "Breakfast"),
        FoodLogEntry("2", "Green tea", "1 cup", 5, "9:15 AM", "Beverage"),
        FoodLogEntry("3", "Grilled chicken salad", "1 serving", 450, "12:45 PM", "Lunch"),
        FoodLogEntry("4", "Apple", "1 medium", 95, "3:30 PM", "Snack")
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Food Diary",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Text(
                        text = "Track your meals in English or Hinglish",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                IconButton(
                    onClick = { },
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.PhotoCamera,
                        contentDescription = "Take photo of food",
                        tint = Primary500,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
        
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Quick Add Food",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Search food or type in Hindi/English...") },
                        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = "Search") },
                        trailingIcon = {
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = { searchQuery = "" }) {
                                    Icon(Icons.Filled.Clear, contentDescription = "Clear")
                                }
                            }
                        },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { keyboardController?.hide() }),
                        singleLine = true
                    )
                }
            }
        }
        
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Today's Nutrition",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(60.dp)) {
                                CircularProgressIndicator(
                                    progress = 0.43f,
                                    modifier = Modifier.fillMaxSize(),
                                    color = Primary500,
                                    strokeWidth = 6.dp
                                )
                                Text("870", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                            }
                            Text("Calories", style = MaterialTheme.typography.labelSmall)
                            Text("/2000", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(60.dp)) {
                                CircularProgressIndicator(
                                    progress = 0.31f,
                                    modifier = Modifier.fillMaxSize(),
                                    color = Success500,
                                    strokeWidth = 6.dp
                                )
                                Text("47", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                            }
                            Text("Protein", style = MaterialTheme.typography.labelSmall)
                            Text("/150", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(60.dp)) {
                                CircularProgressIndicator(
                                    progress = 0.39f,
                                    modifier = Modifier.fillMaxSize(),
                                    color = Warning500,
                                    strokeWidth = 6.dp
                                )
                                Text("98", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                            }
                            Text("Carbs", style = MaterialTheme.typography.labelSmall)
                            Text("/250", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.size(60.dp)) {
                                CircularProgressIndicator(
                                    progress = 0.48f,
                                    modifier = Modifier.fillMaxSize(),
                                    color = Secondary500,
                                    strokeWidth = 6.dp
                                )
                                Text("32", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                            }
                            Text("Fat", style = MaterialTheme.typography.labelSmall)
                            Text("/67", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
        
        item {
            Text(
                text = "Today's Logs",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }
        
        items(todayLogs) { logEntry ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(logEntry.name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
                        Text("${logEntry.quantity} • ${logEntry.mealType}", style = MaterialTheme.typography.bodySmall)
                        Text(logEntry.time, style = MaterialTheme.typography.labelSmall)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("${logEntry.calories}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Primary500)
                        Text("cal", style = MaterialTheme.typography.labelSmall)
                    }
                    IconButton(onClick = { }, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Filled.Edit, contentDescription = "Edit entry", modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FitnessScreen() {
    var selectedTab by remember { mutableStateOf(0) }
    
    val workoutPlans = listOf(
        WorkoutPlan(
            title = "Upper Body Strength",
            duration = "45 min",
            difficulty = "Intermediate",
            exercises = listOf(
                Exercise("Push-ups", "3", "12-15", "90s", listOf("Chest", "Triceps")),
                Exercise("Pull-ups", "3", "8-10", "90s", listOf("Back", "Biceps")),
                Exercise("Shoulder Press", "3", "10-12", "60s", listOf("Shoulders"))
            )
        )
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Fitness & Workouts",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = "Personalized workout plans based on your fitness level",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "This Week's Progress",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("4", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Primary500)
                            Text("of 5", style = MaterialTheme.typography.labelSmall)
                            Text("Workouts", style = MaterialTheme.typography.labelMedium)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("180", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Primary500)
                            Text("min", style = MaterialTheme.typography.labelSmall)
                            Text("Duration", style = MaterialTheme.typography.labelMedium)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("850", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Primary500)
                            Text("burned", style = MaterialTheme.typography.labelSmall)
                            Text("Calories", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Filled.LocalFireDepartment, contentDescription = "Streak", tint = Secondary500, modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("7-day workout streak!", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = Secondary500)
                    }
                }
            }
        }
        
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                colors = CardDefaults.cardColors(containerColor = Primary500)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Today's Recommended Workout", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Color.White)
                            Text("Upper Body Strength Training", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White)
                            Text("45 minutes • Intermediate", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.8f))
                        }
                        Icon(Icons.Filled.FitnessCenter, contentDescription = "Fitness", tint = Color.White, modifier = Modifier.size(32.dp))
                    }
                }
            }
        }
        
        items(workoutPlans) { plan ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(plan.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text("${plan.duration} • ${plan.difficulty}", style = MaterialTheme.typography.bodyMedium)
                        }
                        IconButton(onClick = { }) {
                            Icon(Icons.Filled.ExpandMore, contentDescription = "Expand")
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    plan.exercises.take(2).forEach { exercise ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(exercise.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                Text("${exercise.sets} sets × ${exercise.reps} reps", style = MaterialTheme.typography.bodySmall)
                            }
                            Text(exercise.restTime, style = MaterialTheme.typography.labelSmall)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }
            }
        }
        
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary500)
                ) {
                    Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Start Workout")
                }
                OutlinedButton(
                    onClick = { },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Log Exercise")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen() {
    var notificationsEnabled by remember { mutableStateOf(true) }
    var darkModeEnabled by remember { mutableStateOf(false) }
    
    val settingsSections = listOf(
        SettingsSection(
            title = "Profile",
            items = listOf(
                SettingsItem("Personal Information", "Name, age, health metrics", Icons.Filled.Person, SettingsAction.Navigate),
                SettingsItem("Health Goals", "Weight, fitness, nutrition targets", Icons.Filled.FlagCircle, SettingsAction.Navigate),
                SettingsItem("Dietary Preferences", "Cuisines, allergies, restrictions", Icons.Filled.Restaurant, SettingsAction.Navigate)
            )
        ),
        SettingsSection(
            title = "Notifications",
            items = listOf(
                SettingsItem("Push Notifications", "Meal reminders, workout alerts", Icons.Filled.Notifications, SettingsAction.Toggle(notificationsEnabled)),
                SettingsItem("Quiet Hours", "10:00 PM - 7:00 AM", Icons.Filled.Schedule, SettingsAction.Navigate)
            )
        ),
        SettingsSection(
            title = "Privacy & Security",
            items = listOf(
                SettingsItem("Data Export", "Download your health data", Icons.Filled.Download, SettingsAction.Navigate),
                SettingsItem("Privacy Settings", "Control data sharing and usage", Icons.Filled.Security, SettingsAction.Navigate)
            )
        )
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                colors = CardDefaults.cardColors(containerColor = Primary500)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(30.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("JD", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("John Doe", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                        Text("Premium Member", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.8f))
                        Text("Member since Jan 2024", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.6f))
                    }
                    IconButton(onClick = { }) {
                        Icon(Icons.Filled.Edit, contentDescription = "Edit profile", tint = Color.White, modifier = Modifier.size(24.dp))
                    }
                }
            }
        }
        
        items(settingsSections) { section ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = section.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                    section.items.forEach { item ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(item.icon, contentDescription = item.title, tint = Primary500, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                                item.subtitle?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                            }
                            when (item.action) {
                                is SettingsAction.Navigate -> Icon(Icons.Filled.ChevronRight, contentDescription = "Navigate", modifier = Modifier.size(20.dp))
                                is SettingsAction.Toggle -> Switch(
                                    checked = item.action.isEnabled,
                                    onCheckedChange = { 
                                        when (item.title) {
                                            "Push Notifications" -> notificationsEnabled = it
                                            "Dark Mode" -> darkModeEnabled = it
                                        }
                                    },
                                    colors = SwitchDefaults.colors(checkedThumbColor = Primary500, checkedTrackColor = Primary500.copy(alpha = 0.5f))
                                )
                                is SettingsAction.Action -> IconButton(onClick = { }) {
                                    Icon(Icons.Filled.Launch, contentDescription = "Action", modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                        if (item != section.items.last()) {
                            Divider(modifier = Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.surfaceVariant)
                        }
                    }
                }
            }
        }
        
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("HealthCoachAI", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text("Version 1.0.0", style = MaterialTheme.typography.bodyMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        TextButton(onClick = { }) { Text("Privacy Policy") }
                        TextButton(onClick = { }) { Text("Terms of Service") }
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun MealPlanScreenPreview() {
    HealthCoachAITheme {
        MealPlanScreen()
    }
}

@Preview(showBackground = true)
@Composable
fun LogScreenPreview() {
    HealthCoachAITheme {
        LogScreen()
    }
}

@Preview(showBackground = true)
@Composable
fun FitnessScreenPreview() {
    HealthCoachAITheme {
        FitnessScreen()
    }
}

@Preview(showBackground = true)
@Composable
fun SettingsScreenPreview() {
    HealthCoachAITheme {
        SettingsScreen()
    }
}