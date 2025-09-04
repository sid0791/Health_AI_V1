import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface FoodLogEntry {
  id: string;
  userId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  timestamp: string;
  recipe?: any;
  customFood?: {
    name: string;
    nutrition: any;
    portionSize: number;
    unit: string;
  };
  portionSize: number;
  notes?: string;
  source: 'meal_plan' | 'manual_entry' | 'photo_log';
}

interface DailyFoodLog {
  date: string;
  entries: FoodLogEntry[];
  totalNutrition: any;
  plannedVsActual?: any;
}

interface LogFoodRequest {
  userId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: string;
  customFood?: {
    name: string;
    nutrition: any;
    portionSize: number;
    unit: string;
  };
  portionSize: number;
  notes?: string;
  source: 'meal_plan' | 'manual_entry' | 'photo_log';
}

@ApiTags('food-log')
@Controller('api/food-log')
export class FoodLogController {
  // Simple in-memory store for development
  private foodLogs: Map<string, FoodLogEntry> = new Map();
  private dailyLogs: Map<string, DailyFoodLog> = new Map();

  @Post('entries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log a food entry' })
  @ApiResponse({ status: 200, description: 'Food entry logged successfully' })
  async logFood(@Body() request: LogFoodRequest): Promise<FoodLogEntry> {
    console.log('🍽️ Logging food entry:', request);

    const entry: FoodLogEntry = {
      id: `log-${Date.now()}`,
      userId: request.userId,
      date: request.date,
      mealType: request.mealType,
      timestamp: new Date().toISOString(),
      portionSize: request.portionSize,
      notes: request.notes,
      source: request.source
    };

    // Add recipe or custom food data
    if (request.recipeId) {
      entry.recipe = {
        id: request.recipeId,
        name: 'Sample Recipe',
        nutrition: {
          calories: 350,
          protein: 25,
          carbs: 35,
          fat: 12
        }
      };
    } else if (request.customFood) {
      entry.customFood = request.customFood;
    }

    this.foodLogs.set(entry.id, entry);

    // Update daily log
    this.updateDailyLog(request.userId, request.date, entry);

    console.log('✅ Food entry logged successfully');
    return entry;
  }

  @Get(':userId/daily/:date')
  @ApiOperation({ summary: 'Get daily food log' })
  @ApiResponse({ status: 200, description: 'Daily food log retrieved' })
  async getDailyLog(@Param('userId') userId: string, @Param('date') date: string): Promise<DailyFoodLog> {
    const key = `${userId}-${date}`;
    let dailyLog = this.dailyLogs.get(key);

    if (!dailyLog) {
      // Create empty daily log
      dailyLog = {
        date,
        entries: [],
        totalNutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      };
      this.dailyLogs.set(key, dailyLog);
    }

    return dailyLog;
  }

  @Get(':userId/range')
  @ApiOperation({ summary: 'Get food log for date range' })
  @ApiResponse({ status: 200, description: 'Food log range retrieved' })
  async getLogRange(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<DailyFoodLog[]> {
    const logs: DailyFoodLog[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dailyLog = await this.getDailyLog(userId, dateStr);
      logs.push(dailyLog);
    }

    return logs;
  }

  @Patch('entries/:entryId')
  @ApiOperation({ summary: 'Update food log entry' })
  @ApiResponse({ status: 200, description: 'Food entry updated' })
  async updateEntry(
    @Param('entryId') entryId: string,
    @Body() updates: Partial<LogFoodRequest>
  ): Promise<FoodLogEntry> {
    const entry = this.foodLogs.get(entryId);
    if (!entry) {
      throw new Error('Food log entry not found');
    }

    // Update entry
    Object.assign(entry, updates);
    this.foodLogs.set(entryId, entry);

    // Update daily log
    this.updateDailyLog(entry.userId, entry.date, entry);

    return entry;
  }

  @Delete('entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete food log entry' })
  @ApiResponse({ status: 204, description: 'Food entry deleted' })
  async deleteEntry(@Param('entryId') entryId: string): Promise<void> {
    const entry = this.foodLogs.get(entryId);
    if (entry) {
      this.foodLogs.delete(entryId);
      // Remove from daily log
      const key = `${entry.userId}-${entry.date}`;
      const dailyLog = this.dailyLogs.get(key);
      if (dailyLog) {
        dailyLog.entries = dailyLog.entries.filter(e => e.id !== entryId);
        this.recalculateDailyNutrition(dailyLog);
      }
    }
  }

  @Get(':userId/stats')
  @ApiOperation({ summary: 'Get food logging statistics' })
  @ApiResponse({ status: 200, description: 'Food log statistics retrieved' })
  async getStats(
    @Param('userId') userId: string,
    @Query('period') period: 'week' | 'month',
    @Query('endDate') endDate?: string
  ): Promise<any> {
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date(end);
    
    if (period === 'week') {
      start.setDate(start.getDate() - 7);
    } else {
      start.setMonth(start.getMonth() - 1);
    }

    const logs = await this.getLogRange(
      userId,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );

    const totalCalories = logs.reduce((sum, log) => sum + log.totalNutrition.calories, 0);
    const avgDailyCalories = totalCalories / logs.length;

    return {
      period,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      averageDailyCalories: Math.round(avgDailyCalories),
      averageAdherenceScore: 85, // Mock adherence score
      nutritionTrends: {
        calories: logs.map(log => log.totalNutrition.calories),
        protein: logs.map(log => log.totalNutrition.protein),
        carbs: logs.map(log => log.totalNutrition.carbs),
        fat: logs.map(log => log.totalNutrition.fat)
      },
      insights: [
        'Your protein intake has been consistent this week',
        'Consider adding more vegetables for fiber',
        'Great job staying within your calorie goals!'
      ]
    };
  }

  @Get(':userId/adherence/:date')
  @ApiOperation({ summary: 'Get adherence analysis for a date' })
  @ApiResponse({ status: 200, description: 'Adherence analysis retrieved' })
  async getAdherenceAnalysis(
    @Param('userId') userId: string,
    @Param('date') date: string
  ): Promise<any> {
    const dailyLog = await this.getDailyLog(userId, date);
    
    // Mock planned nutrition (would come from meal plan)
    const planned = {
      calories: 1800,
      protein: 135,
      carbs: 203,
      fat: 60
    };

    const actual = dailyLog.totalNutrition;
    
    // Calculate adherence score
    const calorieAdherence = Math.max(0, 100 - Math.abs(actual.calories - planned.calories) / planned.calories * 100);
    const proteinAdherence = Math.max(0, 100 - Math.abs(actual.protein - planned.protein) / planned.protein * 100);
    const adherenceScore = Math.round((calorieAdherence + proteinAdherence) / 2);

    return {
      planned,
      actual,
      adherenceScore,
      insights: [
        adherenceScore > 80 ? 'Excellent adherence to your meal plan!' : 'Room for improvement in following your meal plan',
        actual.calories < planned.calories * 0.8 ? 'Consider eating more to meet your calorie goals' : 'Good calorie intake',
        actual.protein < planned.protein * 0.8 ? 'Try to include more protein-rich foods' : 'Great protein intake'
      ],
      recommendations: [
        'Log your meals consistently for better tracking',
        'Prepare meals in advance to stay on track',
        'Consider portion sizes when logging food'
      ]
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search food database' })
  @ApiResponse({ status: 200, description: 'Food search results' })
  async searchFoods(@Query('q') query: string): Promise<any[]> {
    // Mock food database search
    const mockFoods = [
      {
        id: 'food-1',
        name: 'Banana',
        brand: 'Fresh',
        nutrition: {
          calories: 89,
          protein: 1.1,
          carbs: 22.8,
          fat: 0.3,
          fiber: 2.6
        },
        commonPortions: [
          { name: 'Small (101g)', amount: 101, unit: 'g' },
          { name: 'Medium (118g)', amount: 118, unit: 'g' },
          { name: 'Large (136g)', amount: 136, unit: 'g' }
        ]
      },
      {
        id: 'food-2',
        name: 'Chicken Breast',
        brand: 'Fresh',
        nutrition: {
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
          fiber: 0
        },
        commonPortions: [
          { name: '100g', amount: 100, unit: 'g' },
          { name: '150g', amount: 150, unit: 'g' },
          { name: '1 breast (200g)', amount: 200, unit: 'g' }
        ]
      }
    ];

    // Filter by query
    return mockFoods.filter(food => 
      food.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  private updateDailyLog(userId: string, date: string, entry: FoodLogEntry): void {
    const key = `${userId}-${date}`;
    let dailyLog = this.dailyLogs.get(key);

    if (!dailyLog) {
      dailyLog = {
        date,
        entries: [],
        totalNutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      };
    }

    // Update or add entry
    const existingIndex = dailyLog.entries.findIndex(e => e.id === entry.id);
    if (existingIndex >= 0) {
      dailyLog.entries[existingIndex] = entry;
    } else {
      dailyLog.entries.push(entry);
    }

    this.recalculateDailyNutrition(dailyLog);
    this.dailyLogs.set(key, dailyLog);
  }

  private recalculateDailyNutrition(dailyLog: DailyFoodLog): void {
    const total = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };

    dailyLog.entries.forEach(entry => {
      const nutrition = entry.recipe?.nutrition || entry.customFood?.nutrition;
      if (nutrition) {
        const multiplier = entry.portionSize;
        total.calories += nutrition.calories * multiplier;
        total.protein += nutrition.protein * multiplier;
        total.carbs += nutrition.carbs * multiplier;
        total.fat += nutrition.fat * multiplier;
      }
    });

    dailyLog.totalNutrition = total;
  }
}