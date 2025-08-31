package com.healthcoachai.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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

// Data classes for food logging
data class LoggedMeal(
    val id: String,
    val name: String,
    val mealType: MealType,
    val time: String,
    val calories: Int,
    val protein: Int,
    val carbs: Int,
    val fat: Int,
    val quantity: String
)

enum class MealType(val displayName: String, val icon: ImageVector, val color: Color) {
    BREAKFAST("Breakfast", Icons.Default.LightMode, Primary500),
    LUNCH("Lunch", Icons.Default.WbSunny, Secondary500),
    DINNER("Dinner", Icons.Default.NightsStay, Warning600),
    SNACK("Snack", Icons.Default.Cookie, Success500)
}

data class DailyTarget(
    val calories: Int,
    val protein: Int,
    val carbs: Int,
    val fat: Int,
    val water: Int // in glasses
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogScreen() {
    var selectedDate by remember { mutableStateOf("Today") }
    var waterGlasses by remember { mutableStateOf(5) }
    
    val dailyTarget = DailyTarget(
        calories = 2000,
        protein = 150,
        carbs = 250,
        fat = 67,
        water = 8
    )
    
    val loggedMeals = listOf(
        LoggedMeal("1", "Oats with Berries", MealType.BREAKFAST, "8:30 AM", 320, 12, 45, 8, "1 bowl"),
        LoggedMeal("2", "Banana", MealType.SNACK, "10:15 AM", 105, 1, 27, 0, "1 medium"),
        LoggedMeal("3", "Chicken Caesar Salad", MealType.LUNCH, "1:00 PM", 385, 35, 15, 18, "1 large"),
        LoggedMeal("4", "Greek Yogurt", MealType.SNACK, "4:30 PM", 150, 15, 20, 0, "1 cup"),
        LoggedMeal("5", "Grilled Salmon with Rice", MealType.DINNER, "7:30 PM", 450, 38, 35, 20, "1 serving")
    )
    
    val totalCalories = loggedMeals.sumOf { it.calories }
    val totalProtein = loggedMeals.sumOf { it.protein }
    val totalCarbs = loggedMeals.sumOf { it.carbs }
    val totalFat = loggedMeals.sumOf { it.fat }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Gray50)
    ) {
        // Header with date selector
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
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
                            text = "Food Diary",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = Gray900
                        )
                        Text(
                            text = selectedDate,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Gray600
                        )
                    }
                    
                    IconButton(onClick = { /* Open calendar */ }) {
                        Icon(
                            Icons.Default.CalendarMonth,
                            contentDescription = "Select date",
                            tint = Primary600
                        )
                    }
                }
            }
        }
        
        // Daily progress summary
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Daily Progress",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Gray900
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Calories progress
                NutrientProgress(
                    label = "Calories",
                    current = totalCalories,
                    target = dailyTarget.calories,
                    unit = "cal",
                    color = Primary500
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    NutrientProgress(
                        label = "Protein",
                        current = totalProtein,
                        target = dailyTarget.protein,
                        unit = "g",
                        color = Secondary500,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    NutrientProgress(
                        label = "Carbs",
                        current = totalCarbs,
                        target = dailyTarget.carbs,
                        unit = "g",
                        color = Success500,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    NutrientProgress(
                        label = "Fat",
                        current = totalFat,
                        target = dailyTarget.fat,
                        unit = "g",
                        color = Warning500,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Water tracking
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.WaterDrop,
                        contentDescription = null,
                        tint = Primary500,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "Water Intake",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "$waterGlasses of ${dailyTarget.water} glasses",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray600
                        )
                    }
                }
                
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { if (waterGlasses > 0) waterGlasses-- }
                    ) {
                        Icon(Icons.Default.Remove, contentDescription = "Remove glass")
                    }
                    
                    repeat(minOf(waterGlasses, 8)) { index ->
                        Icon(
                            Icons.Default.WaterDrop,
                            contentDescription = null,
                            tint = Primary500,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    
                    IconButton(
                        onClick = { if (waterGlasses < dailyTarget.water) waterGlasses++ }
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Add glass")
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Add meal button
        Button(
            onClick = { /* Open add meal dialog */ },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Primary500)
        ) {
            Icon(Icons.Default.Add, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Log Food")
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Meals list
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Group meals by type
            val groupedMeals = loggedMeals.groupBy { it.mealType }
            
            MealType.values().forEach { mealType ->
                val mealsForType = groupedMeals[mealType] ?: emptyList()
                
                item {
                    MealTypeHeader(
                        mealType = mealType,
                        totalCalories = mealsForType.sumOf { it.calories }
                    )
                }
                
                if (mealsForType.isNotEmpty()) {
                    items(mealsForType) { meal ->
                        LoggedMealItem(
                            meal = meal,
                            onEdit = { /* Handle edit */ },
                            onDelete = { /* Handle delete */ }
                        )
                    }
                } else {
                    item {
                        EmptyMealSlot(
                            mealType = mealType,
                            onAddClick = { /* Handle add meal */ }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun NutrientProgress(
    label: String,
    current: Int,
    target: Int,
    unit: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    val progress = (current.toFloat() / target.toFloat()).coerceIn(0f, 1f)
    
    Column(modifier = modifier) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = Gray700
            )
            Text(
                text = "$current/$target $unit",
                style = MaterialTheme.typography.bodySmall,
                color = Gray600
            )
        }
        
        Spacer(modifier = Modifier.height(4.dp))
        
        LinearProgressIndicator(
            progress = progress,
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = color,
            trackColor = color.copy(alpha = 0.2f)
        )
    }
}

@Composable
fun MealTypeHeader(
    mealType: MealType,
    totalCalories: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(mealType.color.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    mealType.icon,
                    contentDescription = null,
                    tint = mealType.color,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = mealType.displayName,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = Gray900
            )
        }
        
        if (totalCalories > 0) {
            Text(
                text = "$totalCalories cal",
                style = MaterialTheme.typography.bodyMedium,
                color = mealType.color,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun LoggedMealItem(
    meal: LoggedMeal,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onEdit() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = meal.name,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    color = Gray900
                )
                Text(
                    text = "${meal.quantity} • ${meal.time}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray600
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${meal.calories} cal • ${meal.protein}g protein",
                    style = MaterialTheme.typography.bodySmall,
                    color = meal.mealType.color
                )
            }
            
            IconButton(onClick = onDelete) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = "Delete meal",
                    tint = Error500
                )
            }
        }
    }
}

@Composable
fun EmptyMealSlot(
    mealType: MealType,
    onAddClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onAddClick() },
        colors = CardDefaults.cardColors(
            containerColor = mealType.color.copy(alpha = 0.05f)
        ),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = mealType.color.copy(alpha = 0.3f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Add,
                contentDescription = null,
                tint = mealType.color,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Add ${mealType.displayName.lowercase()}",
                style = MaterialTheme.typography.bodyMedium,
                color = mealType.color,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun LogScreenPreview() {
    HealthCoachAITheme {
        LogScreen()
    }
}