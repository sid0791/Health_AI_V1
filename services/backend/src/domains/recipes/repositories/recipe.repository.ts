import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder, In } from 'typeorm';
import { Recipe, DietType, MealType, DifficultyLevel } from '../entities/recipe.entity';

export interface RecipeFilterOptions {
  cuisine?: string[];
  dietType?: DietType[];
  mealType?: MealType[];
  difficultyLevel?: DifficultyLevel[];
  maxPrepTime?: number;
  maxCookTime?: number;
  maxCalories?: number;
  isHealthConditionFriendly?: {
    diabetes?: boolean;
    hypertension?: boolean;
    pcos?: boolean;
    fattyLiver?: boolean;
  };
  allergens?: string[];
  excludeIngredients?: string[];
  tags?: string[];
  isActive?: boolean;
  isVerified?: boolean;
  minQualityScore?: number;
  isHighProtein?: boolean;
  isLowCalorie?: boolean;
  cookingMethod?: string[];
}

@Injectable()
export class RecipeRepository {
  private repository: Repository<Recipe>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(Recipe);
  }

  async create(recipeData: Partial<Recipe>): Promise<Recipe> {
    const recipe = this.repository.create(recipeData);
    return this.repository.save(recipe);
  }

  async findById(id: string): Promise<Recipe | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['ingredients', 'steps', 'nutrition'],
    });
  }

  async findByExternalId(externalId: string, dataSource?: string): Promise<Recipe | null> {
    const where: any = { externalId };
    if (dataSource) {
      where.dataSource = dataSource;
    }
    return this.repository.findOne({ where });
  }

  async findWithFilters(
    filters: RecipeFilterOptions,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ recipes: Recipe[]; total: number }> {
    const queryBuilder = this.createFilterQuery(filters);

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const recipes = await queryBuilder
      .skip(offset)
      .take(limit)
      .leftJoinAndSelect('recipe.ingredients', 'ingredients')
      .leftJoinAndSelect('recipe.nutrition', 'nutrition')
      .orderBy('recipe.popularityScore', 'DESC')
      .addOrderBy('recipe.qualityScore', 'DESC')
      .getMany();

    return { recipes, total };
  }

  async findByIds(ids: string[]): Promise<Recipe[]> {
    return this.repository.find({
      where: { id: In(ids) },
      relations: ['ingredients', 'steps', 'nutrition'],
    });
  }

  async update(id: string, updateData: Partial<Recipe>): Promise<Recipe | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async findByCuisine(cuisine: string, limit: number = 10): Promise<Recipe[]> {
    return this.repository.find({
      where: { cuisine, isActive: true },
      take: limit,
      order: { popularityScore: 'DESC' },
      relations: ['ingredients', 'nutrition'],
    });
  }

  async findByDietType(dietType: DietType, limit: number = 10): Promise<Recipe[]> {
    return this.repository
      .createQueryBuilder('recipe')
      .where(':dietType = ANY(recipe.dietType)', { dietType })
      .andWhere('recipe.isActive = :isActive', { isActive: true })
      .limit(limit)
      .orderBy('recipe.popularityScore', 'DESC')
      .leftJoinAndSelect('recipe.ingredients', 'ingredients')
      .leftJoinAndSelect('recipe.nutrition', 'nutrition')
      .getMany();
  }

  async findPopular(limit: number = 10): Promise<Recipe[]> {
    return this.repository.find({
      where: { isActive: true },
      take: limit,
      order: { popularityScore: 'DESC' },
      relations: ['ingredients', 'nutrition'],
    });
  }

  async findRecentlyAdded(limit: number = 10): Promise<Recipe[]> {
    return this.repository.find({
      where: { isActive: true },
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['ingredients', 'nutrition'],
    });
  }

  async incrementPopularityScore(id: string): Promise<void> {
    await this.repository.increment({ id }, 'popularityScore', 1);
  }

  async bulkCreate(recipes: Partial<Recipe>[]): Promise<Recipe[]> {
    const createdRecipes = this.repository.create(recipes);
    return this.repository.save(createdRecipes);
  }

  private createFilterQuery(filters: RecipeFilterOptions): SelectQueryBuilder<Recipe> {
    const queryBuilder = this.repository.createQueryBuilder('recipe');

    // Basic filters
    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('recipe.isActive = :isActive', { isActive: filters.isActive });
    } else {
      queryBuilder.andWhere('recipe.isActive = :isActive', { isActive: true });
    }

    if (filters.isVerified !== undefined) {
      queryBuilder.andWhere('recipe.isVerified = :isVerified', { isVerified: filters.isVerified });
    }

    if (filters.minQualityScore !== undefined) {
      queryBuilder.andWhere('recipe.qualityScore >= :minQualityScore', {
        minQualityScore: filters.minQualityScore,
      });
    }

    // Cuisine filter
    if (filters.cuisine && filters.cuisine.length > 0) {
      queryBuilder.andWhere('recipe.cuisine IN (:...cuisines)', { cuisines: filters.cuisine });
    }

    // Diet type filter
    if (filters.dietType && filters.dietType.length > 0) {
      queryBuilder.andWhere('recipe.dietType && :dietTypes', { dietTypes: filters.dietType });
    }

    // Meal type filter
    if (filters.mealType && filters.mealType.length > 0) {
      queryBuilder.andWhere('recipe.mealType && :mealTypes', { mealTypes: filters.mealType });
    }

    // Difficulty filter
    if (filters.difficultyLevel && filters.difficultyLevel.length > 0) {
      queryBuilder.andWhere('recipe.difficultyLevel IN (:...difficulties)', {
        difficulties: filters.difficultyLevel,
      });
    }

    // Time filters
    if (filters.maxPrepTime !== undefined) {
      queryBuilder.andWhere('recipe.prepTimeMinutes <= :maxPrepTime', {
        maxPrepTime: filters.maxPrepTime,
      });
    }

    if (filters.maxCookTime !== undefined) {
      queryBuilder.andWhere('recipe.cookTimeMinutes <= :maxCookTime', {
        maxCookTime: filters.maxCookTime,
      });
    }

    // Calorie filter
    if (filters.maxCalories !== undefined) {
      queryBuilder.andWhere('recipe.caloriesPerServing <= :maxCalories', {
        maxCalories: filters.maxCalories,
      });
    }

    // Health condition filters
    if (filters.isHealthConditionFriendly) {
      const conditions = filters.isHealthConditionFriendly;
      if (conditions.diabetes) {
        queryBuilder.andWhere('recipe.isDiabeticFriendly = :diabeticFriendly', {
          diabeticFriendly: true,
        });
      }
      if (conditions.hypertension) {
        queryBuilder.andWhere('recipe.isHypertensionFriendly = :hypertensionFriendly', {
          hypertensionFriendly: true,
        });
      }
      if (conditions.pcos) {
        queryBuilder.andWhere('recipe.isPcosFriendly = :pcosFriendly', {
          pcosFriendly: true,
        });
      }
      if (conditions.fattyLiver) {
        queryBuilder.andWhere('recipe.isFattyLiverFriendly = :fattyLiverFriendly', {
          fattyLiverFriendly: true,
        });
      }
    }

    // Allergen exclusion
    if (filters.allergens && filters.allergens.length > 0) {
      queryBuilder.andWhere('NOT (recipe.allergens && :allergens)', {
        allergens: filters.allergens,
      });
    }

    // Tag filter
    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('recipe.tags && :tags', { tags: filters.tags });
    }

    // Health flags
    if (filters.isHighProtein !== undefined) {
      queryBuilder.andWhere('recipe.isHighProtein = :isHighProtein', {
        isHighProtein: filters.isHighProtein,
      });
    }

    if (filters.isLowCalorie !== undefined) {
      queryBuilder.andWhere('recipe.isLowCalorie = :isLowCalorie', {
        isLowCalorie: filters.isLowCalorie,
      });
    }

    // Cooking method filter (requires join with steps)
    if (filters.cookingMethod && filters.cookingMethod.length > 0) {
      queryBuilder.andWhere(
        `
        recipe.id IN (
          SELECT rs.recipeId 
          FROM recipe_steps rs 
          WHERE rs.cookingMethod IN (:...cookingMethods)
        )
      `,
        { cookingMethods: filters.cookingMethod },
      );
    }

    // Ingredient exclusion (requires join with ingredients)
    if (filters.excludeIngredients && filters.excludeIngredients.length > 0) {
      queryBuilder.andWhere(
        `
        recipe.id NOT IN (
          SELECT ri.recipeId 
          FROM recipe_ingredients ri 
          WHERE ri.ingredientName IN (:...excludeIngredients)
        )
      `,
        { excludeIngredients: filters.excludeIngredients },
      );
    }

    return queryBuilder;
  }
}
