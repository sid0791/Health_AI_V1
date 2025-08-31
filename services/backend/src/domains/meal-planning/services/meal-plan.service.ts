import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between } from 'typeorm';
import { MealPlan, MealPlanStatus, MealPlanType } from '../entities/meal-plan.entity';
import { MealPlanEntry, MealType } from '../entities/meal-plan-entry.entity';
import { CreateMealPlanDto } from '../dto/create-meal-plan.dto';
import { UpdateMealPlanDto } from '../dto/update-meal-plan.dto';
import { MealPlanQueryDto } from '../dto/meal-plan-query.dto';

@Injectable()
export class MealPlanService {
  constructor(
    @InjectRepository(MealPlan)
    private mealPlanRepository: Repository<MealPlan>,
    @InjectRepository(MealPlanEntry)
    private mealPlanEntryRepository: Repository<MealPlanEntry>,
  ) {}

  async create(createMealPlanDto: CreateMealPlanDto, userId: string): Promise<MealPlan> {
    // Deactivate any existing active plans if this is being activated
    if (createMealPlanDto.isActive) {
      await this.deactivateExistingPlans(userId);
    }

    const mealPlan = this.mealPlanRepository.create({
      ...createMealPlanDto,
      userId,
    });

    const savedPlan = await this.mealPlanRepository.save(mealPlan);

    // Create default meal entries for a 7-day plan
    if (createMealPlanDto.generateDefaultEntries !== false) {
      await this.generateDefaultMealEntries(savedPlan);
    }

    return this.findOne(savedPlan.id, userId);
  }

  async findAllByUser(userId: string, query: MealPlanQueryDto): Promise<MealPlan[]> {
    const where: any = { userId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.planType) {
      where.planType = query.planType;
    }

    if (query.active !== undefined) {
      where.isActive = query.active;
    }

    const options: FindManyOptions<MealPlan> = {
      where,
      order: { createdAt: 'DESC' },
      relations: ['entries'],
    };

    if (query.limit) {
      options.take = query.limit;
    }

    if (query.offset) {
      options.skip = query.offset;
    }

    return this.mealPlanRepository.find(options);
  }

  async findOne(id: string, userId: string): Promise<MealPlan | null> {
    const mealPlan = await this.mealPlanRepository.findOne({
      where: { id, userId },
      relations: ['entries', 'entries.recipe'],
    });

    return mealPlan || null;
  }

  async findActivePlan(userId: string): Promise<MealPlan | null> {
    return this.mealPlanRepository.findOne({
      where: {
        userId,
        isActive: true,
        status: MealPlanStatus.ACTIVE,
      },
      relations: ['entries', 'entries.recipe'],
      order: { activatedAt: 'DESC' },
    });
  }

  async getCurrentWeekPlan(userId: string): Promise<MealPlan | null> {
    const activePlan = await this.findActivePlan(userId);

    if (!activePlan) {
      return null;
    }

    // Check if the active plan is within the current week
    const now = new Date();
    if (now >= activePlan.startDate && now <= activePlan.endDate) {
      return activePlan;
    }

    return null;
  }

  async getTodayMeals(userId: string): Promise<any> {
    const activePlan = await this.getCurrentWeekPlan(userId);

    if (!activePlan) {
      return {
        totalMeals: 0,
        completedMeals: 0,
        meals: [],
        nutritionSummary: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      };
    }

    // Calculate which day of the plan we're on
    const now = new Date();
    const startDate = new Date(activePlan.startDate);
    const diffTime = now.getTime() - startDate.getTime();
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Get today's meals
    const todayMeals = activePlan.entries.filter((entry) => entry.dayNumber === dayNumber);
    const completedMeals = todayMeals.filter((entry) => entry.isCompleted()).length;

    // Calculate nutrition summary
    const nutritionSummary = todayMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + Number(meal.calories),
        protein: acc.protein + Number(meal.proteinGrams),
        carbs: acc.carbs + Number(meal.carbsGrams),
        fat: acc.fat + Number(meal.fatGrams),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      totalMeals: todayMeals.length,
      completedMeals,
      meals: todayMeals.map((meal) => ({
        id: meal.id,
        mealType: meal.mealType,
        mealName: meal.mealName,
        calories: meal.calories,
        status: meal.status,
        plannedTime: meal.plannedTime,
        prepTimeMinutes: meal.prepTimeMinutes,
        isCompleted: meal.isCompleted(),
      })),
      nutritionSummary,
      dayNumber,
      planName: activePlan.name,
    };
  }

  async update(
    id: string,
    updateMealPlanDto: UpdateMealPlanDto,
    userId: string,
  ): Promise<MealPlan> {
    const existingPlan = await this.findOne(id, userId);
    if (!existingPlan) {
      throw new NotFoundException('Meal plan not found');
    }

    // If activating this plan, deactivate others
    if (updateMealPlanDto.isActive && !existingPlan.isActive) {
      await this.deactivateExistingPlans(userId);
    }

    await this.mealPlanRepository.update(id, updateMealPlanDto);
    return this.findOne(id, userId);
  }

  async activate(id: string, userId: string): Promise<MealPlan> {
    const mealPlan = await this.findOne(id, userId);
    if (!mealPlan) {
      throw new NotFoundException('Meal plan not found');
    }

    await this.deactivateExistingPlans(userId);

    mealPlan.activate();
    await this.mealPlanRepository.save(mealPlan);

    return mealPlan;
  }

  async pause(id: string, userId: string): Promise<MealPlan> {
    const mealPlan = await this.findOne(id, userId);
    if (!mealPlan) {
      throw new NotFoundException('Meal plan not found');
    }

    mealPlan.pause();
    await this.mealPlanRepository.save(mealPlan);

    return mealPlan;
  }

  async complete(id: string, userId: string): Promise<MealPlan> {
    const mealPlan = await this.findOne(id, userId);
    if (!mealPlan) {
      throw new NotFoundException('Meal plan not found');
    }

    mealPlan.complete();
    await this.mealPlanRepository.save(mealPlan);

    return mealPlan;
  }

  async generateShoppingList(id: string, userId: string): Promise<any> {
    const mealPlan = await this.findOne(id, userId);
    if (!mealPlan) {
      throw new NotFoundException('Meal plan not found');
    }

    // Group ingredients by category
    const shoppingList: Record<string, any[]> = {
      vegetables: [],
      fruits: [],
      grains: [],
      proteins: [],
      dairy: [],
      spices: [],
      other: [],
    };

    // Process each meal entry to extract ingredients
    for (const entry of mealPlan.entries) {
      if (entry.recipe) {
        // If recipe exists, get ingredients from recipe
        // This would require joining with recipe ingredients
        // For now, add placeholder items
        shoppingList.other.push({
          name: `Ingredients for ${entry.mealName}`,
          quantity: entry.portionSize,
          unit: 'serving',
          estimatedCost: entry.estimatedCostInr || 0,
        });
      }
    }

    // Calculate total estimated cost
    const totalEstimatedCost = Object.values(shoppingList)
      .flat()
      .reduce((sum, item) => sum + (item.estimatedCost || 0), 0);

    // Mark shopping list as generated
    mealPlan.shoppingListGenerated = true;
    await this.mealPlanRepository.save(mealPlan);

    return {
      mealPlanId: id,
      mealPlanName: mealPlan.name,
      shoppingList,
      totalEstimatedCost,
      generatedAt: new Date(),
    };
  }

  async remove(id: string, userId: string): Promise<void> {
    const mealPlan = await this.findOne(id, userId);
    if (!mealPlan) {
      throw new NotFoundException('Meal plan not found');
    }

    await this.mealPlanRepository.remove(mealPlan);
  }

  private async deactivateExistingPlans(userId: string): Promise<void> {
    await this.mealPlanRepository.update(
      { userId, isActive: true },
      { isActive: false, status: MealPlanStatus.PAUSED },
    );
  }

  private async generateDefaultMealEntries(mealPlan: MealPlan): Promise<void> {
    const defaultMeals = [
      {
        mealType: MealType.BREAKFAST,
        mealName: 'Healthy Breakfast',
        calories: 350,
        proteinGrams: 15,
        carbsGrams: 45,
        fatGrams: 12,
        plannedTime: '08:00',
        prepTimeMinutes: 15,
      },
      {
        mealType: MealType.LUNCH,
        mealName: 'Nutritious Lunch',
        calories: 450,
        proteinGrams: 25,
        carbsGrams: 50,
        fatGrams: 18,
        plannedTime: '13:00',
        prepTimeMinutes: 25,
      },
      {
        mealType: MealType.SNACK,
        mealName: 'Healthy Snack',
        calories: 150,
        proteinGrams: 8,
        carbsGrams: 15,
        fatGrams: 7,
        plannedTime: '16:00',
        prepTimeMinutes: 5,
      },
      {
        mealType: MealType.DINNER,
        mealName: 'Balanced Dinner',
        calories: 500,
        proteinGrams: 30,
        carbsGrams: 45,
        fatGrams: 22,
        plannedTime: '19:00',
        prepTimeMinutes: 30,
      },
    ];

    const entries = [];
    for (let day = 1; day <= 7; day++) {
      for (const meal of defaultMeals) {
        const entry = this.mealPlanEntryRepository.create({
          ...meal,
          mealPlanId: mealPlan.id,
          dayNumber: day,
          portionSize: 1.0,
        });
        entries.push(entry);
      }
    }

    await this.mealPlanEntryRepository.save(entries);
  }
}
