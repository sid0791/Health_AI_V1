import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { DietType, MealType, DifficultyLevel } from '../entities/recipe.entity';

/**
 * Helper function to create recipe DTO with getTotalTimeMinutes method
 */
function createRecipeDto(data: Omit<CreateRecipeDto, 'getTotalTimeMinutes'>): CreateRecipeDto {
  return {
    ...data,
    getTotalTimeMinutes(): number {
      return this.prepTimeMinutes + this.cookTimeMinutes;
    },
  };
}

/**
 * Curated healthy recipes across Indian-first cuisines and global favorites
 * Phase 4 - Recipe Corpus Seeding
 */
export const RECIPE_SEED_DATA: CreateRecipeDto[] = [
  // Indian Vegetarian Recipes
  createRecipeDto({
    name: 'Quinoa Vegetable Pulao',
    description: 'A nutritious twist on traditional pulao using quinoa instead of rice, packed with colorful vegetables and aromatic spices.',
    cuisine: 'Indian',
    dietType: [DietType.VEGETARIAN, DietType.VEGAN],
    mealType: [MealType.LUNCH, MealType.DINNER],
    difficultyLevel: DifficultyLevel.MEDIUM,
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    servingsCount: 4,
    isDiabeticFriendly: true,
    isHighProtein: true,
    isLowCalorie: true,
    isGlutenFree: true,
    tags: ['quinoa', 'pulao', 'vegetables', 'protein-rich', 'diabetic-friendly'],
    allergens: [],
    ingredients: [
      { ingredientName: 'quinoa', quantity: 200, unit: 'g', sortOrder: 1 },
      { ingredientName: 'mixed vegetables', quantity: 300, unit: 'g', preparationNote: 'diced (carrots, peas, beans)', sortOrder: 2 },
      { ingredientName: 'onion', quantity: 1, unit: 'medium', preparationNote: 'finely chopped', sortOrder: 3 },
      { ingredientName: 'ginger-garlic paste', quantity: 1, unit: 'tbsp', sortOrder: 4 },
      { ingredientName: 'cumin seeds', quantity: 1, unit: 'tsp', sortOrder: 5 },
      { ingredientName: 'turmeric powder', quantity: 0.5, unit: 'tsp', sortOrder: 6 },
      { ingredientName: 'garam masala', quantity: 1, unit: 'tsp', sortOrder: 7 },
      { ingredientName: 'olive oil', quantity: 2, unit: 'tbsp', sortOrder: 8 },
      { ingredientName: 'vegetable broth', quantity: 500, unit: 'ml', sortOrder: 9 },
      { ingredientName: 'salt', quantity: 1, unit: 'tsp', sortOrder: 10 },
      { ingredientName: 'fresh coriander', quantity: 2, unit: 'tbsp', preparationNote: 'chopped', sortOrder: 11 },
    ],
    steps: [
      { stepNumber: 1, instruction: 'Rinse quinoa thoroughly under cold water until water runs clear.', durationMinutes: 2 },
      { stepNumber: 2, instruction: 'Heat olive oil in a heavy-bottomed pan over medium heat.', durationMinutes: 1, cookingMethod: 'saute' },
      { stepNumber: 3, instruction: 'Add cumin seeds and let them splutter.', durationMinutes: 1 },
      { stepNumber: 4, instruction: 'Add chopped onions and sauté until golden brown.', durationMinutes: 3, cookingMethod: 'saute' },
      { stepNumber: 5, instruction: 'Add ginger-garlic paste and cook for 1 minute until fragrant.', durationMinutes: 1 },
      { stepNumber: 6, instruction: 'Add mixed vegetables and cook for 5 minutes, stirring occasionally.', durationMinutes: 5, cookingMethod: 'saute' },
      { stepNumber: 7, instruction: 'Add turmeric, garam masala, and salt. Mix well.', durationMinutes: 1 },
      { stepNumber: 8, instruction: 'Add quinoa and stir gently to coat with spices.', durationMinutes: 1 },
      { stepNumber: 9, instruction: 'Pour in vegetable broth and bring to a boil.', durationMinutes: 3, cookingMethod: 'boil' },
      { stepNumber: 10, instruction: 'Reduce heat to low, cover and simmer for 15 minutes until quinoa is cooked.', durationMinutes: 15, cookingMethod: 'simmer' },
      { stepNumber: 11, instruction: 'Let it rest for 5 minutes, then fluff with a fork.', durationMinutes: 5 },
      { stepNumber: 12, instruction: 'Garnish with fresh coriander and serve hot.', durationMinutes: 1 },
    ],
    dataSource: 'internal',
    createdBy: 'nutrition_team',
  }),

  createRecipeDto({
    name: 'Moong Dal Cheela with Vegetables',
    description: 'Protein-rich savory pancakes made from yellow lentils, loaded with fresh vegetables. Perfect for a healthy breakfast or snack.',
    cuisine: 'Indian',
    dietType: [DietType.VEGETARIAN],
    mealType: [MealType.BREAKFAST, MealType.SNACK],
    difficultyLevel: DifficultyLevel.EASY,
    prepTimeMinutes: 20,
    cookTimeMinutes: 15,
    servingsCount: 4,
    isDiabeticFriendly: true,
    isHighProtein: true,
    isLowCalorie: true,
    isGlutenFree: true,
    tags: ['moong-dal', 'cheela', 'protein', 'vegetables', 'healthy-breakfast'],
    allergens: [],
    ingredients: [
      { ingredientName: 'yellow moong dal', quantity: 200, unit: 'g', preparationNote: 'soaked for 3 hours', sortOrder: 1 },
      { ingredientName: 'onion', quantity: 1, unit: 'small', preparationNote: 'finely chopped', sortOrder: 2 },
      { ingredientName: 'tomato', quantity: 1, unit: 'small', preparationNote: 'finely chopped', sortOrder: 3 },
      { ingredientName: 'green chilies', quantity: 2, unit: 'pcs', preparationNote: 'finely chopped', sortOrder: 4 },
      { ingredientName: 'ginger', quantity: 1, unit: 'inch', preparationNote: 'grated', sortOrder: 5 },
      { ingredientName: 'spinach', quantity: 50, unit: 'g', preparationNote: 'finely chopped', sortOrder: 6 },
      { ingredientName: 'coriander leaves', quantity: 2, unit: 'tbsp', preparationNote: 'chopped', sortOrder: 7 },
      { ingredientName: 'cumin powder', quantity: 0.5, unit: 'tsp', sortOrder: 8 },
      { ingredientName: 'turmeric powder', quantity: 0.25, unit: 'tsp', sortOrder: 9 },
      { ingredientName: 'salt', quantity: 1, unit: 'tsp', sortOrder: 10 },
      { ingredientName: 'coconut oil', quantity: 2, unit: 'tsp', sortOrder: 11 },
    ],
    steps: [
      { stepNumber: 1, instruction: 'Drain and grind soaked moong dal to a smooth paste with minimal water.', durationMinutes: 5 },
      { stepNumber: 2, instruction: 'Transfer to a bowl and add all vegetables and spices.', durationMinutes: 2 },
      { stepNumber: 3, instruction: 'Mix well to form a thick batter. Add water if needed.', durationMinutes: 2 },
      { stepNumber: 4, instruction: 'Heat a non-stick pan over medium heat and brush with oil.', durationMinutes: 1, cookingMethod: 'fry' },
      { stepNumber: 5, instruction: 'Pour a ladleful of batter and spread into a thin circle.', durationMinutes: 1 },
      { stepNumber: 6, instruction: 'Cook for 2-3 minutes until bottom is golden.', durationMinutes: 3, cookingMethod: 'fry' },
      { stepNumber: 7, instruction: 'Flip and cook the other side for 2 minutes.', durationMinutes: 2, cookingMethod: 'fry' },
      { stepNumber: 8, instruction: 'Repeat with remaining batter.', durationMinutes: 8 },
      { stepNumber: 9, instruction: 'Serve hot with mint chutney or yogurt.', durationMinutes: 1 },
    ],
    dataSource: 'internal',
    createdBy: 'nutrition_team',
  }),

  // Mediterranean Recipes
  createRecipeDto({
    name: 'Mediterranean Chickpea Salad Bowl',
    description: 'A refreshing and protein-packed salad bowl with chickpeas, fresh vegetables, and a zesty lemon-herb dressing.',
    cuisine: 'Mediterranean',
    dietType: [DietType.VEGETARIAN, DietType.VEGAN],
    mealType: [MealType.LUNCH, MealType.DINNER],
    difficultyLevel: DifficultyLevel.EASY,
    prepTimeMinutes: 15,
    cookTimeMinutes: 0,
    servingsCount: 3,
    isDiabeticFriendly: true,
    isHighProtein: true,
    isLowCalorie: true,
    isGlutenFree: true,
    tags: ['chickpeas', 'salad', 'mediterranean', 'raw', 'protein-rich'],
    allergens: [],
    ingredients: [
      { ingredientName: 'chickpeas', quantity: 400, unit: 'g', preparationNote: 'cooked and drained', sortOrder: 1 },
      { ingredientName: 'cucumber', quantity: 1, unit: 'large', preparationNote: 'diced', sortOrder: 2 },
      { ingredientName: 'cherry tomatoes', quantity: 200, unit: 'g', preparationNote: 'halved', sortOrder: 3 },
      { ingredientName: 'red onion', quantity: 1, unit: 'small', preparationNote: 'thinly sliced', sortOrder: 4 },
      { ingredientName: 'bell pepper', quantity: 1, unit: 'medium', preparationNote: 'diced', sortOrder: 5 },
      { ingredientName: 'olives', quantity: 50, unit: 'g', preparationNote: 'pitted and sliced', sortOrder: 6 },
      { ingredientName: 'feta cheese', quantity: 100, unit: 'g', preparationNote: 'crumbled', isOptional: true, sortOrder: 7 },
      { ingredientName: 'fresh parsley', quantity: 3, unit: 'tbsp', preparationNote: 'chopped', sortOrder: 8 },
      { ingredientName: 'lemon juice', quantity: 3, unit: 'tbsp', sortOrder: 9 },
      { ingredientName: 'extra virgin olive oil', quantity: 2, unit: 'tbsp', sortOrder: 10 },
      { ingredientName: 'oregano', quantity: 1, unit: 'tsp', preparationNote: 'dried', sortOrder: 11 },
      { ingredientName: 'salt', quantity: 0.5, unit: 'tsp', sortOrder: 12 },
      { ingredientName: 'black pepper', quantity: 0.25, unit: 'tsp', sortOrder: 13 },
    ],
    steps: [
      { stepNumber: 1, instruction: 'In a large bowl, combine chickpeas, cucumber, tomatoes, onion, and bell pepper.', durationMinutes: 3, cookingMethod: 'mix' },
      { stepNumber: 2, instruction: 'Add olives and feta cheese if using.', durationMinutes: 1, cookingMethod: 'mix' },
      { stepNumber: 3, instruction: 'In a small bowl, whisk together lemon juice, olive oil, oregano, salt, and pepper.', durationMinutes: 2, cookingMethod: 'mix' },
      { stepNumber: 4, instruction: 'Pour dressing over the salad and toss well to combine.', durationMinutes: 2, cookingMethod: 'mix' },
      { stepNumber: 5, instruction: 'Let sit for 10 minutes to allow flavors to meld.', durationMinutes: 10 },
      { stepNumber: 6, instruction: 'Garnish with fresh parsley and serve chilled.', durationMinutes: 1 },
    ],
    dataSource: 'internal',
    createdBy: 'nutrition_team',
  }),

  // Asian-Inspired Healthy Recipe
  createRecipeDto({
    name: 'Thai-Style Zucchini Noodles with Peanut Sauce',
    description: 'Light and flavorful zucchini noodles with a creamy peanut sauce, packed with vegetables and plant-based protein.',
    cuisine: 'Thai',
    dietType: [DietType.VEGETARIAN, DietType.VEGAN],
    mealType: [MealType.LUNCH, MealType.DINNER],
    difficultyLevel: DifficultyLevel.MEDIUM,
    prepTimeMinutes: 20,
    cookTimeMinutes: 5,
    servingsCount: 3,
    isDiabeticFriendly: false,
    isHighProtein: true,
    isLowCalorie: true,
    isGlutenFree: true,
    tags: ['zucchini-noodles', 'thai', 'peanut-sauce', 'raw', 'low-carb'],
    allergens: ['peanuts'],
    ingredients: [
      { ingredientName: 'zucchini', quantity: 3, unit: 'large', preparationNote: 'spiralized into noodles', sortOrder: 1 },
      { ingredientName: 'carrots', quantity: 2, unit: 'medium', preparationNote: 'julienned', sortOrder: 2 },
      { ingredientName: 'red bell pepper', quantity: 1, unit: 'medium', preparationNote: 'thinly sliced', sortOrder: 3 },
      { ingredientName: 'edamame', quantity: 150, unit: 'g', preparationNote: 'shelled and cooked', sortOrder: 4 },
      { ingredientName: 'peanut butter', quantity: 3, unit: 'tbsp', preparationNote: 'natural, unsweetened', sortOrder: 5 },
      { ingredientName: 'lime juice', quantity: 2, unit: 'tbsp', sortOrder: 6 },
      { ingredientName: 'soy sauce', quantity: 2, unit: 'tbsp', preparationNote: 'low sodium', sortOrder: 7 },
      { ingredientName: 'sesame oil', quantity: 1, unit: 'tsp', sortOrder: 8 },
      { ingredientName: 'garlic', quantity: 2, unit: 'cloves', preparationNote: 'minced', sortOrder: 9 },
      { ingredientName: 'ginger', quantity: 1, unit: 'inch', preparationNote: 'grated', sortOrder: 10 },
      { ingredientName: 'red chili flakes', quantity: 0.25, unit: 'tsp', isOptional: true, sortOrder: 11 },
      { ingredientName: 'water', quantity: 2, unit: 'tbsp', sortOrder: 12 },
      { ingredientName: 'peanuts', quantity: 2, unit: 'tbsp', preparationNote: 'chopped for garnish', sortOrder: 13 },
      { ingredientName: 'cilantro', quantity: 2, unit: 'tbsp', preparationNote: 'chopped', sortOrder: 14 },
    ],
    steps: [
      { stepNumber: 1, instruction: 'Prepare zucchini noodles using a spiralizer or vegetable peeler.', durationMinutes: 5 },
      { stepNumber: 2, instruction: 'In a large bowl, combine zucchini noodles, carrots, bell pepper, and edamame.', durationMinutes: 2, cookingMethod: 'mix' },
      { stepNumber: 3, instruction: 'In a small bowl, whisk together peanut butter, lime juice, soy sauce, sesame oil, garlic, ginger, and chili flakes.', durationMinutes: 3, cookingMethod: 'mix' },
      { stepNumber: 4, instruction: 'Add water gradually to achieve desired consistency for the sauce.', durationMinutes: 1, cookingMethod: 'mix' },
      { stepNumber: 5, instruction: 'Pour sauce over the vegetable noodle mixture and toss well.', durationMinutes: 2, cookingMethod: 'mix' },
      { stepNumber: 6, instruction: 'Let sit for 5 minutes to allow flavors to meld.', durationMinutes: 5 },
      { stepNumber: 7, instruction: 'Garnish with chopped peanuts and cilantro before serving.', durationMinutes: 1 },
    ],
    dataSource: 'internal',
    createdBy: 'nutrition_team',
  }),

  // Craving-Killer Alternative: Healthy Pizza
  createRecipeDto({
    name: 'Cauliflower Crust Margherita Pizza',
    description: 'A guilt-free pizza alternative with cauliflower crust, topped with fresh tomatoes, basil, and light cheese.',
    cuisine: 'Italian',
    dietType: [DietType.VEGETARIAN],
    mealType: [MealType.LUNCH, MealType.DINNER, MealType.SNACK],
    difficultyLevel: DifficultyLevel.MEDIUM,
    prepTimeMinutes: 30,
    cookTimeMinutes: 25,
    servingsCount: 4,
    isDiabeticFriendly: true,
    isLowCalorie: true,
    isGlutenFree: true,
    tags: ['cauliflower-crust', 'pizza', 'healthy-alternative', 'low-carb', 'guilt-free'],
    allergens: ['dairy'],
    ingredients: [
      { ingredientName: 'cauliflower', quantity: 1, unit: 'large head', preparationNote: 'riced', sortOrder: 1 },
      { ingredientName: 'mozzarella cheese', quantity: 100, unit: 'g', preparationNote: 'part-skim, shredded', sortOrder: 2 },
      { ingredientName: 'parmesan cheese', quantity: 30, unit: 'g', preparationNote: 'grated', sortOrder: 3 },
      { ingredientName: 'egg', quantity: 1, unit: 'large', sortOrder: 4 },
      { ingredientName: 'garlic powder', quantity: 1, unit: 'tsp', sortOrder: 5 },
      { ingredientName: 'oregano', quantity: 1, unit: 'tsp', preparationNote: 'dried', sortOrder: 6 },
      { ingredientName: 'salt', quantity: 0.5, unit: 'tsp', sortOrder: 7 },
      { ingredientName: 'tomato sauce', quantity: 80, unit: 'ml', preparationNote: 'low sodium', sortOrder: 8 },
      { ingredientName: 'cherry tomatoes', quantity: 150, unit: 'g', preparationNote: 'sliced', sortOrder: 9 },
      { ingredientName: 'fresh basil', quantity: 10, unit: 'leaves', sortOrder: 10 },
      { ingredientName: 'olive oil', quantity: 1, unit: 'tsp', sortOrder: 11 },
    ],
    steps: [
      { stepNumber: 1, instruction: 'Preheat oven to 220°C (425°F).', temperatureCelsius: 220, durationMinutes: 5 },
      { stepNumber: 2, instruction: 'Steam cauliflower rice for 5 minutes, then cool and squeeze out excess moisture.', durationMinutes: 8, cookingMethod: 'steam' },
      { stepNumber: 3, instruction: 'Mix cauliflower with 60g mozzarella, parmesan, egg, garlic powder, oregano, and salt.', durationMinutes: 3, cookingMethod: 'mix' },
      { stepNumber: 4, instruction: 'Press mixture into a thin circle on parchment-lined baking sheet.', durationMinutes: 5 },
      { stepNumber: 5, instruction: 'Bake crust for 15 minutes until golden and firm.', durationMinutes: 15, cookingMethod: 'bake', temperatureCelsius: 220 },
      { stepNumber: 6, instruction: 'Spread tomato sauce evenly over crust.', durationMinutes: 2 },
      { stepNumber: 7, instruction: 'Top with remaining mozzarella and cherry tomatoes.', durationMinutes: 2 },
      { stepNumber: 8, instruction: 'Bake for another 10 minutes until cheese melts.', durationMinutes: 10, cookingMethod: 'bake', temperatureCelsius: 220 },
      { stepNumber: 9, instruction: 'Garnish with fresh basil and drizzle with olive oil.', durationMinutes: 1 },
      { stepNumber: 10, instruction: 'Let cool for 3 minutes before slicing and serving.', durationMinutes: 3 },
    ],
    dataSource: 'internal',
    createdBy: 'nutrition_team',
  }),

  // PCOS-Friendly Recipe
  createRecipeDto({
    name: 'Hormone-Balancing Buddha Bowl',
    description: 'A nutrient-dense bowl designed to support hormonal balance with anti-inflammatory ingredients, healthy fats, and fiber-rich vegetables.',
    cuisine: 'International',
    dietType: [DietType.VEGETARIAN],
    mealType: [MealType.LUNCH, MealType.DINNER],
    difficultyLevel: DifficultyLevel.EASY,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    servingsCount: 2,
    isPcosFriendly: true,
    isDiabeticFriendly: true,
    isHighProtein: true,
    isLowCalorie: true,
    tags: ['buddha-bowl', 'pcos-friendly', 'hormone-balancing', 'anti-inflammatory', 'nutrient-dense'],
    allergens: [],
    ingredients: [
      { ingredientName: 'sweet potato', quantity: 200, unit: 'g', preparationNote: 'cubed', sortOrder: 1 },
      { ingredientName: 'broccoli', quantity: 200, unit: 'g', preparationNote: 'florets', sortOrder: 2 },
      { ingredientName: 'quinoa', quantity: 100, unit: 'g', preparationNote: 'cooked', sortOrder: 3 },
      { ingredientName: 'chickpeas', quantity: 150, unit: 'g', preparationNote: 'cooked', sortOrder: 4 },
      { ingredientName: 'avocado', quantity: 1, unit: 'medium', preparationNote: 'sliced', sortOrder: 5 },
      { ingredientName: 'pumpkin seeds', quantity: 2, unit: 'tbsp', sortOrder: 6 },
      { ingredientName: 'spinach', quantity: 100, unit: 'g', preparationNote: 'fresh', sortOrder: 7 },
      { ingredientName: 'tahini', quantity: 2, unit: 'tbsp', sortOrder: 8 },
      { ingredientName: 'lemon juice', quantity: 1, unit: 'tbsp', sortOrder: 9 },
      { ingredientName: 'turmeric powder', quantity: 0.5, unit: 'tsp', sortOrder: 10 },
      { ingredientName: 'olive oil', quantity: 1, unit: 'tbsp', sortOrder: 11 },
      { ingredientName: 'salt', quantity: 0.5, unit: 'tsp', sortOrder: 12 },
    ],
    steps: [
      { stepNumber: 1, instruction: 'Preheat oven to 200°C (400°F).', temperatureCelsius: 200, durationMinutes: 2 },
      { stepNumber: 2, instruction: 'Toss sweet potato cubes with half the olive oil and roast for 20 minutes.', durationMinutes: 20, cookingMethod: 'roast', temperatureCelsius: 200 },
      { stepNumber: 3, instruction: 'Steam broccoli for 5 minutes until tender-crisp.', durationMinutes: 5, cookingMethod: 'steam' },
      { stepNumber: 4, instruction: 'Mix tahini, lemon juice, turmeric, remaining olive oil, and salt for dressing.', durationMinutes: 2, cookingMethod: 'mix' },
      { stepNumber: 5, instruction: 'Arrange spinach in bowls as base.', durationMinutes: 1 },
      { stepNumber: 6, instruction: 'Top with quinoa, roasted sweet potato, steamed broccoli, and chickpeas.', durationMinutes: 3 },
      { stepNumber: 7, instruction: 'Add avocado slices and sprinkle with pumpkin seeds.', durationMinutes: 2 },
      { stepNumber: 8, instruction: 'Drizzle with tahini dressing and serve immediately.', durationMinutes: 1 },
    ],
    dataSource: 'internal',
    createdBy: 'nutrition_team',
  }),
];

/**
 * Recipe categories for organized seeding
 */
export const RECIPE_CATEGORIES = {
  INDIAN_VEGETARIAN: 'Indian Vegetarian',
  MEDITERRANEAN: 'Mediterranean',
  ASIAN_INSPIRED: 'Asian Inspired',
  HEALTHY_ALTERNATIVES: 'Healthy Alternatives',
  PCOS_FRIENDLY: 'PCOS Friendly',
  DIABETIC_FRIENDLY: 'Diabetic Friendly',
  HIGH_PROTEIN: 'High Protein',
  LOW_CALORIE: 'Low Calorie',
  CRAVING_KILLERS: 'Craving Killers',
};

/**
 * Get recipes by category
 */
export function getRecipesByCategory(category: string): CreateRecipeDto[] {
  switch (category) {
    case RECIPE_CATEGORIES.INDIAN_VEGETARIAN:
      return RECIPE_SEED_DATA.filter(recipe => 
        recipe.cuisine === 'Indian' && recipe.dietType.includes(DietType.VEGETARIAN)
      );
    case RECIPE_CATEGORIES.MEDITERRANEAN:
      return RECIPE_SEED_DATA.filter(recipe => recipe.cuisine === 'Mediterranean');
    case RECIPE_CATEGORIES.PCOS_FRIENDLY:
      return RECIPE_SEED_DATA.filter(recipe => recipe.isPcosFriendly);
    case RECIPE_CATEGORIES.HIGH_PROTEIN:
      return RECIPE_SEED_DATA.filter(recipe => recipe.isHighProtein);
    case RECIPE_CATEGORIES.HEALTHY_ALTERNATIVES:
      return RECIPE_SEED_DATA.filter(recipe => 
        recipe.tags?.some(tag => tag.includes('alternative') || tag.includes('guilt-free'))
      );
    default:
      return RECIPE_SEED_DATA;
  }
}

/**
 * Get recipes suitable for specific health conditions
 */
export function getRecipesForHealthCondition(condition: string): CreateRecipeDto[] {
  switch (condition.toLowerCase()) {
    case 'diabetes':
      return RECIPE_SEED_DATA.filter(recipe => recipe.isDiabeticFriendly);
    case 'pcos':
      return RECIPE_SEED_DATA.filter(recipe => recipe.isPcosFriendly);
    case 'weight-loss':
      return RECIPE_SEED_DATA.filter(recipe => recipe.isLowCalorie);
    default:
      return [];
  }
}