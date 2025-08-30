import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OnboardingService } from '../services/onboarding.service';
import { AuthenticatedRequest } from '../../auth/guards/optional-auth.guard';
import {
  OnboardingBasicInfoDto,
  OnboardingLifestyleDto,
  OnboardingHealthDto,
  OnboardingPreferencesDto,
  OnboardingGoalsDto,
  OnboardingProgressDto,
} from '../dto/onboarding.dto';

@ApiTags('onboarding')
@Controller('onboarding')
@UseGuards(ThrottlerGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user onboarding progress' })
  @ApiResponse({ status: 200, description: 'Onboarding progress retrieved successfully' })
  async getProgress(@Req() req: AuthenticatedRequest): Promise<OnboardingProgressDto> {
    return this.onboardingService.getProgress(req.user.userId);
  }

  @Post('basic-info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save basic information during onboarding' })
  @ApiResponse({ status: 200, description: 'Basic information saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async saveBasicInfo(
    @Req() req: AuthenticatedRequest,
    @Body(ValidationPipe) basicInfoDto: OnboardingBasicInfoDto,
  ): Promise<{ success: boolean; nextStep: number }> {
    return this.onboardingService.saveBasicInfo(req.user.userId, basicInfoDto);
  }

  @Post('lifestyle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save lifestyle information during onboarding' })
  @ApiResponse({ status: 200, description: 'Lifestyle information saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async saveLifestyle(
    @Req() req: AuthenticatedRequest,
    @Body(ValidationPipe) lifestyleDto: OnboardingLifestyleDto,
  ): Promise<{ success: boolean; nextStep: number }> {
    return this.onboardingService.saveLifestyle(req.user.userId, lifestyleDto);
  }

  @Post('health')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save health information during onboarding' })
  @ApiResponse({ status: 200, description: 'Health information saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async saveHealth(
    @Req() req: AuthenticatedRequest,
    @Body(ValidationPipe) healthDto: OnboardingHealthDto,
  ): Promise<{ success: boolean; nextStep: number }> {
    return this.onboardingService.saveHealth(req.user.userId, healthDto);
  }

  @Post('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save food preferences during onboarding' })
  @ApiResponse({ status: 200, description: 'Preferences saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async savePreferences(
    @Req() req: AuthenticatedRequest,
    @Body(ValidationPipe) preferencesDto: OnboardingPreferencesDto,
  ): Promise<{ success: boolean; nextStep: number }> {
    return this.onboardingService.savePreferences(req.user.userId, preferencesDto);
  }

  @Post('goals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save goals and complete onboarding' })
  @ApiResponse({ status: 200, description: 'Goals saved and onboarding completed' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async saveGoals(
    @Req() req: AuthenticatedRequest,
    @Body(ValidationPipe) goalsDto: OnboardingGoalsDto,
  ): Promise<{ success: boolean; onboardingComplete: boolean }> {
    return this.onboardingService.saveGoals(req.user.userId, goalsDto);
  }

  @Put('skip-step')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip current onboarding step' })
  @ApiResponse({ status: 200, description: 'Step skipped successfully' })
  async skipStep(
    @Req() req: AuthenticatedRequest,
    @Body() body: { step: number },
  ): Promise<{ success: boolean; nextStep: number }> {
    return this.onboardingService.skipStep(req.user.userId, body.step);
  }

  @Put('restart')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart onboarding process' })
  @ApiResponse({ status: 200, description: 'Onboarding restarted successfully' })
  async restartOnboarding(@Req() req: AuthenticatedRequest): Promise<{ success: boolean }> {
    return this.onboardingService.restartOnboarding(req.user.userId);
  }
}
