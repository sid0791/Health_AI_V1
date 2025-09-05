# AI Meal Planning Parameters & Logic

## 🤖 How Our AI Creates Personalized Meal Plans

Our AI meal planning system uses advanced algorithms and machine learning to create highly personalized meal plans based on comprehensive user data and health analysis.

## 📊 Primary Input Parameters

### 1. User Profile Data
```typescript
{
  age: number,                    // Age affects metabolism and nutritional needs
  gender: 'male' | 'female',     // Gender-specific calorie and nutrient requirements
  weight: number,                 // Current weight in kg
  height: number,                 // Height in cm for BMI and calorie calculations
  activityLevel: string,          // Sedentary, light, moderate, active, very active
  goals: string[],               // weight_loss, muscle_gain, maintenance, performance
  budgetRange: {                 // Weekly grocery budget constraints
    min: number,
    max: number
  }
}
```

### 2. Health Conditions & Medical Data
```typescript
{
  healthConditions: [
    'diabetes',                   // Blood sugar management focus
    'hypertension',              // Low sodium, heart-healthy foods
    'cholesterol',               // Low saturated fat, high fiber
    'thyroid',                   // Iodine and selenium considerations
    'kidney_disease',            // Protein and phosphorus restrictions
    'liver_disease',             // Low sodium, limited protein
    'celiac',                    // Gluten-free requirements
    'ibs',                       // Low FODMAP considerations
    'gerd'                       // Acid-reducing foods
  ],
  allergies: [                   // Strict ingredient exclusions
    'nuts', 'dairy', 'eggs', 'soy', 'shellfish', 'wheat'
  ],
  medications: [                 // Drug-nutrient interactions
    'warfarin',                  // Vitamin K restrictions
    'metformin',                 // B12 absorption considerations
    'statins'                    // CoQ10 supplementation needs
  ]
}
```

### 3. Health Report Integration
```typescript
{
  bloodWorkData: {
    hemoglobin: number,          // Iron-rich food recommendations
    vitaminD: number,            // D3-rich foods or supplementation
    b12: number,                 // B12-rich foods for deficiency
    cholesterol: {
      total: number,
      hdl: number,
      ldl: number,
      triglycerides: number     // Omega-3 rich foods for high triglycerides
    },
    bloodSugar: {
      fasting: number,          // Low GI food selection
      hba1c: number            // Diabetic-friendly meal timing
    },
    kidneyFunction: {
      creatinine: number,       // Protein restriction if elevated
      bun: number
    },
    liverFunction: {
      alt: number,              // Liver-supporting foods
      ast: number
    }
  }
}
```

### 4. Dietary Preferences & Lifestyle
```typescript
{
  dietaryPreferences: [
    'vegetarian',               // Plant-based protein sources
    'vegan',                   // B12, iron, calcium attention
    'keto',                    // High fat, very low carb
    'paleo',                   // No grains, legumes, dairy
    'mediterranean',           // Olive oil, fish, whole grains
    'intermittent_fasting',    // Meal timing optimization
    'high_protein',            // Protein target adjustment
    'low_carb',                // Carbohydrate restriction
    'gluten_free'              // Gluten elimination
  ],
  cuisinePreferences: [
    'indian',                  // Spice-rich, diverse vegetarian options
    'mediterranean',           // Heart-healthy fats and whole grains
    'asian',                   // Stir-fries, steaming, minimal oil
    'mexican',                 // Beans, peppers, lean proteins
    'italian',                 // Whole grains, tomatoes, olive oil
    'middle_eastern'           // Legumes, herbs, healthy fats
  ],
  mealsPerDay: 3,              // 3-6 meals depending on preference
  snacksPerDay: 2,             // 0-3 snacks for blood sugar stability
  cookingSkill: 'beginner' | 'intermediate' | 'advanced',
  timeConstraints: {
    prepTime: number,           // Maximum prep time per meal
    cookTime: number,           // Maximum cooking time
    totalTime: number           // Total time budget per day
  }
}
```

## 🧮 AI Calculation Logic

### 1. Calorie Calculation
```typescript
// Base Metabolic Rate (BMR) using Mifflin-St Jeor Equation
function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

// Total Daily Energy Expenditure (TDEE)
function calculateTDEE(bmr: number, activityLevel: string): number {
  const activityMultipliers = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'active': 1.725,
    'very_active': 1.9
  };
  return bmr * activityMultipliers[activityLevel];
}

// Goal-adjusted calories
function adjustForGoals(tdee: number, goals: string[]): number {
  if (goals.includes('weight_loss')) {
    return tdee * 0.8; // 20% deficit
  } else if (goals.includes('muscle_gain')) {
    return tdee * 1.1; // 10% surplus
  }
  return tdee; // Maintenance
}
```

### 2. Macronutrient Distribution
```typescript
function calculateMacros(calories: number, goals: string[], healthConditions: string[]) {
  let proteinPercent = 20;
  let carbPercent = 50;
  let fatPercent = 30;

  // Adjust for goals
  if (goals.includes('muscle_gain')) {
    proteinPercent = 25;
    carbPercent = 45;
    fatPercent = 30;
  } else if (goals.includes('weight_loss')) {
    proteinPercent = 25;
    carbPercent = 40;
    fatPercent = 35;
  }

  // Adjust for health conditions
  if (healthConditions.includes('diabetes')) {
    carbPercent = 35; // Lower carbs
    proteinPercent = 25;
    fatPercent = 40;
  }

  if (healthConditions.includes('kidney_disease')) {
    proteinPercent = 15; // Restricted protein
    carbPercent = 55;
    fatPercent = 30;
  }

  return {
    protein: (calories * proteinPercent / 100) / 4, // grams
    carbs: (calories * carbPercent / 100) / 4,      // grams
    fat: (calories * fatPercent / 100) / 9          // grams
  };
}
```

### 3. Nutrient Targeting Based on Health Reports
```typescript
function adjustNutrientsForHealthReports(baseNutrients: any, healthData: any) {
  const adjustments = {};

  // Vitamin D deficiency
  if (healthData.vitaminD < 30) {
    adjustments.vitaminDFoods = ['fatty_fish', 'egg_yolks', 'fortified_dairy'];
    adjustments.vitaminDTarget = 1000; // IU per day
  }

  // Iron deficiency anemia
  if (healthData.hemoglobin < 12) {
    adjustments.ironFoods = ['red_meat', 'spinach', 'lentils', 'quinoa'];
    adjustments.vitaminCFoods = ['citrus', 'bell_peppers']; // Enhance iron absorption
  }

  // High cholesterol
  if (healthData.cholesterol.total > 200) {
    adjustments.fiberTarget = 40; // grams per day
    adjustments.omega3Target = 2000; // mg per day
    adjustments.avoidFoods = ['saturated_fat', 'trans_fat'];
  }

  // High blood sugar/diabetes
  if (healthData.bloodSugar.fasting > 100) {
    adjustments.glycemicIndex = 'low'; // GI < 55
    adjustments.fiberTarget = 35;
    adjustments.mealTiming = 'frequent_small_meals';
  }

  return adjustments;
}
```

## 🍽️ Meal Selection Algorithm

### 1. Recipe Database Filtering
```typescript
function filterRecipes(recipes: Recipe[], userProfile: UserProfile) {
  return recipes.filter(recipe => {
    // Allergy filtering (strict)
    if (userProfile.allergies.some(allergy => 
      recipe.ingredients.some(ingredient => 
        ingredient.allergens.includes(allergy)))) {
      return false;
    }

    // Dietary preference filtering
    if (!recipe.tags.some(tag => 
      userProfile.dietaryPreferences.includes(tag))) {
      return false;
    }

    // Health condition filtering
    if (userProfile.healthConditions.includes('diabetes') && 
        recipe.glycemicLoad > 20) {
      return false;
    }

    // Cuisine preference matching
    if (userProfile.cuisinePreferences.length > 0 && 
        !userProfile.cuisinePreferences.includes(recipe.cuisine)) {
      return false;
    }

    // Time constraint filtering
    if (recipe.totalTime > userProfile.timeConstraints.totalTime) {
      return false;
    }

    return true;
  });
}
```

### 2. AI Scoring & Optimization
```typescript
function scoreRecipe(recipe: Recipe, userProfile: UserProfile, mealType: string) {
  let score = 0;

  // Nutritional fit (40% of score)
  const nutritionScore = calculateNutritionFit(recipe, userProfile.targetNutrients);
  score += nutritionScore * 0.4;

  // Health condition optimization (30% of score)
  const healthScore = calculateHealthOptimization(recipe, userProfile.healthConditions);
  score += healthScore * 0.3;

  // Preference alignment (20% of score)
  const preferenceScore = calculatePreferenceAlignment(recipe, userProfile);
  score += preferenceScore * 0.2;

  // Variety and novelty (10% of score)
  const varietyScore = calculateVarietyScore(recipe, userProfile.recentMeals);
  score += varietyScore * 0.1;

  return score;
}
```

### 3. Weekly Plan Optimization
```typescript
function optimizeWeeklyPlan(dailyMeals: DailyMeal[], userProfile: UserProfile) {
  // Ensure nutrient distribution across the week
  const weeklyNutrients = calculateWeeklyNutrients(dailyMeals);
  
  // Check for micronutrient adequacy
  const micronutrientGaps = identifyNutrientGaps(weeklyNutrients, userProfile);
  
  // Adjust meals to fill gaps
  if (micronutrientGaps.length > 0) {
    dailyMeals = fillNutrientGaps(dailyMeals, micronutrientGaps);
  }

  // Ensure cost compliance
  const weeklyCost = calculateWeeklyCost(dailyMeals);
  if (weeklyCost > userProfile.budgetRange.max) {
    dailyMeals = optimizeForBudget(dailyMeals, userProfile.budgetRange);
  }

  // Ensure variety (no ingredient repeated more than 3 times per week)
  dailyMeals = ensureVariety(dailyMeals);

  return dailyMeals;
}
```

## 🎯 Special Considerations

### 1. Cultural & Regional Adaptations
- **Indian Cuisine Focus**: Emphasizes traditional spices with health benefits (turmeric, ginger, cumin)
- **Seasonal Availability**: Prioritizes locally available ingredients
- **Festival Considerations**: Includes healthy versions of cultural favorites
- **Regional Preferences**: North Indian vs South Indian cooking styles

### 2. Smart Substitutions
```typescript
const healthySubstitutions = {
  'white_rice': 'brown_rice',
  'refined_flour': 'whole_wheat_flour',
  'sugar': 'jaggery',
  'cream': 'greek_yogurt',
  'fried': 'air_fried',
  'deep_oil': 'minimal_oil'
};
```

### 3. Meal Timing Optimization
- **Diabetes**: Smaller, frequent meals with consistent carb content
- **GERD**: Earlier dinner, no late-night snacks
- **Hypertension**: Lower sodium throughout the day
- **Weight Loss**: Larger breakfast, smaller dinner

## 📈 Continuous Learning & Adaptation

### User Feedback Integration
```typescript
function updateAIModel(userFeedback: Feedback[]) {
  // Adjust recipe scoring based on user ratings
  userFeedback.forEach(feedback => {
    if (feedback.rating < 3) {
      // Reduce score for similar recipes
      adjustSimilarRecipeScores(feedback.recipeId, -0.1);
    } else if (feedback.rating > 4) {
      // Increase score for similar recipes
      adjustSimilarRecipeScores(feedback.recipeId, 0.1);
    }
  });

  // Learn from ingredient preferences
  const likedIngredients = extractLikedIngredients(userFeedback);
  updateIngredientPreferences(likedIngredients);
}
```

### Health Data Monitoring
- **Weekly Health Checks**: Adjust plans based on weight/measurement changes
- **Lab Result Integration**: Modify nutrition targets when new blood work is uploaded
- **Symptom Tracking**: Adapt meal plans based on reported digestive issues or energy levels

## 🔬 AI Model Architecture

### Primary Models Used
1. **Nutritional Analysis Model**: Trained on 50,000+ Indian recipes with accurate nutrition data
2. **Health Condition Prediction Model**: Maps health markers to optimal food choices
3. **Preference Learning Model**: Learns individual taste preferences over time
4. **Cost Optimization Model**: Balances nutrition with budget constraints

### Real-time Adaptations
- **Seasonal Adjustments**: Automatically updates ingredient availability
- **Market Price Integration**: Adjusts for current grocery prices
- **Health Event Response**: Rapidly adapts when new health concerns arise
- **Activity Level Changes**: Adjusts calories and nutrients for lifestyle changes

This comprehensive AI system ensures that every meal plan is not just nutritionally sound, but also personally tailored, culturally appropriate, and health-optimized for each individual user.