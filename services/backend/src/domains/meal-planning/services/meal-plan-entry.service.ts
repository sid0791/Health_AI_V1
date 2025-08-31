import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MealPlanEntry, MealEntryStatus } from '../entities/meal-plan-entry.entity';
import { MealPlan } from '../entities/meal-plan.entity';
import { CreateMealPlanEntryDto } from '../dto/create-meal-plan-entry.dto';
import { UpdateMealPlanEntryDto } from '../dto/update-meal-plan-entry.dto';

@Injectable()
export class MealPlanEntryService {
  constructor(
    @InjectRepository(MealPlanEntry)
    private mealPlanEntryRepository: Repository<MealPlanEntry>,
    @InjectRepository(MealPlan)
    private mealPlanRepository: Repository<MealPlan>,
  ) {}

  async create(
    createMealPlanEntryDto: CreateMealPlanEntryDto,
    userId: string,
  ): Promise<MealPlanEntry> {
    // Verify that the meal plan belongs to the user
    const mealPlan = await this.mealPlanRepository.findOne({
      where: { id: createMealPlanEntryDto.mealPlanId, userId },
    });

    if (!mealPlan) {
      throw new NotFoundException('Meal plan not found');
    }

    const entry = this.mealPlanEntryRepository.create(createMealPlanEntryDto);
    return this.mealPlanEntryRepository.save(entry);
  }

  async findByMealPlan(
    mealPlanId: string,
    userId: string,
    filters?: { dayNumber?: number; mealType?: string },
  ): Promise<MealPlanEntry[]> {
    // Verify that the meal plan belongs to the user
    const mealPlan = await this.mealPlanRepository.findOne({
      where: { id: mealPlanId, userId },
    });

    if (!mealPlan) {
      throw new NotFoundException('Meal plan not found');
    }

    const where: any = { mealPlanId };

    if (filters?.dayNumber) {
      where.dayNumber = filters.dayNumber;
    }

    if (filters?.mealType) {
      where.mealType = filters.mealType;
    }

    return this.mealPlanEntryRepository.find({
      where,
      order: { dayNumber: 'ASC', sortOrder: 'ASC' },
      relations: ['recipe'],
    });
  }

  async findOne(id: string, userId: string): Promise<MealPlanEntry | null> {
    const entry = await this.mealPlanEntryRepository.findOne({
      where: { id },
      relations: ['mealPlan', 'recipe'],
    });

    if (!entry || entry.mealPlan.userId !== userId) {
      return null;
    }

    return entry;
  }

  async update(
    id: string,
    updateMealPlanEntryDto: UpdateMealPlanEntryDto,
    userId: string,
  ): Promise<MealPlanEntry> {
    const existingEntry = await this.findOne(id, userId);
    if (!existingEntry) {
      throw new NotFoundException('Meal plan entry not found');
    }

    await this.mealPlanEntryRepository.update(id, updateMealPlanEntryDto);
    return this.findOne(id, userId);
  }

  async markCompleted(
    id: string,
    userId: string,
    rating?: number,
    feedback?: string,
  ): Promise<MealPlanEntry> {
    const entry = await this.findOne(id, userId);
    if (!entry) {
      throw new NotFoundException('Meal plan entry not found');
    }

    entry.markAsCompleted(rating, feedback);
    await this.mealPlanEntryRepository.save(entry);

    return entry;
  }

  async markSkipped(id: string, userId: string, reason?: string): Promise<MealPlanEntry> {
    const entry = await this.findOne(id, userId);
    if (!entry) {
      throw new NotFoundException('Meal plan entry not found');
    }

    entry.markAsSkipped(reason);
    await this.mealPlanEntryRepository.save(entry);

    return entry;
  }

  async substitute(
    id: string,
    userId: string,
    newRecipeId: string,
    reason?: string,
  ): Promise<MealPlanEntry> {
    const entry = await this.findOne(id, userId);
    if (!entry) {
      throw new NotFoundException('Meal plan entry not found');
    }

    entry.substitute(newRecipeId, reason);
    await this.mealPlanEntryRepository.save(entry);

    return this.findOne(id, userId);
  }

  async updatePortionSize(
    id: string,
    userId: string,
    newPortionSize: number,
  ): Promise<MealPlanEntry> {
    const entry = await this.findOne(id, userId);
    if (!entry) {
      throw new NotFoundException('Meal plan entry not found');
    }

    if (newPortionSize <= 0) {
      throw new BadRequestException('Portion size must be greater than 0');
    }

    entry.updatePortionSize(newPortionSize);
    await this.mealPlanEntryRepository.save(entry);

    return entry;
  }

  async remove(id: string, userId: string): Promise<void> {
    const entry = await this.findOne(id, userId);
    if (!entry) {
      throw new NotFoundException('Meal plan entry not found');
    }

    await this.mealPlanEntryRepository.remove(entry);
  }

  // Helper methods for analytics and reporting
  async getCompletionStats(
    mealPlanId: string,
    userId: string,
  ): Promise<{
    total: number;
    completed: number;
    skipped: number;
    remaining: number;
  }> {
    const entries = await this.findByMealPlan(mealPlanId, userId);

    const total = entries.length;
    const completed = entries.filter((entry) => entry.status === MealEntryStatus.CONSUMED).length;
    const skipped = entries.filter((entry) => entry.status === MealEntryStatus.SKIPPED).length;
    const remaining = total - completed - skipped;

    return { total, completed, skipped, remaining };
  }

  async getTodayEntries(mealPlanId: string, userId: string): Promise<MealPlanEntry[]> {
    // Get the meal plan to determine which day we're on
    const mealPlan = await this.mealPlanRepository.findOne({
      where: { id: mealPlanId, userId },
    });

    if (!mealPlan) {
      throw new NotFoundException('Meal plan not found');
    }

    // Calculate current day number
    const now = new Date();
    const startDate = new Date(mealPlan.startDate);
    const diffTime = now.getTime() - startDate.getTime();
    const dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Return entries for today (current day number)
    if (dayNumber >= 1 && dayNumber <= mealPlan.durationDays) {
      return this.findByMealPlan(mealPlanId, userId, { dayNumber });
    }

    return [];
  }
}
