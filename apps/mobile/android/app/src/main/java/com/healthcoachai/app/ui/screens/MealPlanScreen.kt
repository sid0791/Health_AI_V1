package com.healthcoachai.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Swap
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.healthcoachai.app.ui.theme.*

// Data classes for meal plan
data class Meal(
    val id: String,
    val name: String,
    val calories: Int,
    val protein: Int,
    val carbs: Int,
    val fat: Int,
    val cookingTime: Int,
    val difficulty: String
)

data class DayPlan(
    val dayNumber: Int,
    val dayName: String,
    val totalCalories: Int,
    val meals: List<Meal>
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MealPlanScreen() {
    var selectedDay by remember { mutableStateOf(0) }
    
    val sampleMeals = listOf(
        Meal("1", "Oats with Almonds & Berries", 320, 12, 45, 8, 10, "Easy"),
        Meal("2", "Grilled Chicken Salad", 385, 35, 15, 18, 20, "Medium"),
        Meal("3", "Quinoa Buddha Bowl", 420, 18, 52, 12, 25, "Medium"),
        Meal("4", "Protein Smoothie", 280, 25, 28, 6, 5, "Easy"),
        Meal("5", "Baked Salmon with Vegetables", 450, 38, 22, 20, 30, "Medium")
    )
    
    val weekPlan = (1..7).map { day ->
        DayPlan(
            dayNumber = day,
            dayName = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")[day - 1],
            totalCalories = 1800 + (day * 50),
            meals = sampleMeals.shuffled().take(4)
        )
    }
    
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
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Your 7-Day Meal Plan",
                    style = MaterialTheme.typography.headlineSmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Personalized nutrition for your goals",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.9f)
                )
            }
        }
        
        // Day selector
        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(weekPlan.size) { index ->
                val day = weekPlan[index]
                val isSelected = selectedDay == index
                
                Card(
                    modifier = Modifier
                        .clickable { selectedDay = index }
                        .width(80.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSelected) Primary500 else Color.White
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .padding(12.dp)
                            .fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = day.dayName,
                            style = MaterialTheme.typography.labelMedium,
                            color = if (isSelected) Color.White else Gray700,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = "Day ${day.dayNumber}",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isSelected) Color.White.copy(0.8f) else Gray500
                        )
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Selected day content
        val currentDay = weekPlan[selectedDay]
        
        // Daily summary
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "${currentDay.totalCalories}",
                        style = MaterialTheme.typography.headlineMedium,
                        color = Primary600,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Total Calories",
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray600
                    )
                }
                
                Column {
                    Text(
                        text = "${currentDay.meals.sumOf { it.protein }}g",
                        style = MaterialTheme.typography.headlineSmall,
                        color = Secondary600,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Protein",
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray600
                    )
                }
                
                Column {
                    Text(
                        text = "${currentDay.meals.sumOf { it.carbs }}g",
                        style = MaterialTheme.typography.headlineSmall,
                        color = Success600,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Carbs",
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray600
                    )
                }
                
                Column {
                    Text(
                        text = "${currentDay.meals.sumOf { it.fat }}g",
                        style = MaterialTheme.typography.headlineSmall,
                        color = Warning600,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Fat",
                        style = MaterialTheme.typography.bodySmall,
                        color = Gray600
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Meals list
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(currentDay.meals) { meal ->
                MealCard(
                    meal = meal,
                    onSwapClick = { /* Handle swap */ }
                )
            }
        }
    }
}

@Composable
fun MealCard(
    meal: Meal,
    onSwapClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = meal.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Gray900
                    )
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Restaurant,
                            contentDescription = null,
                            tint = Gray500,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "${meal.cookingTime} min • ${meal.difficulty}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Gray600
                        )
                    }
                }
                
                IconButton(onClick = onSwapClick) {
                    Icon(
                        Icons.Default.Swap,
                        contentDescription = "Swap meal",
                        tint = Primary600
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Nutrition info
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                NutritionItem("${meal.calories} cal", "Calories", Primary100, Primary600)
                NutritionItem("${meal.protein}g", "Protein", Secondary100, Secondary600)
                NutritionItem("${meal.carbs}g", "Carbs", Success100, Success600)
                NutritionItem("${meal.fat}g", "Fat", Warning100, Warning600)
            }
        }
    }
}

@Composable
fun NutritionItem(
    value: String,
    label: String,
    backgroundColor: Color,
    textColor: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(backgroundColor)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(
            text = value,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            color = textColor
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = textColor.copy(alpha = 0.8f)
        )
    }
}

@Preview(showBackground = true)
@Composable
fun MealPlanScreenPreview() {
    HealthCoachAITheme {
        MealPlanScreen()
    }
}