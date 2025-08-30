import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserConsentService } from '../../users/services/user-consent.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ConsentType, ConsentStatus } from '../../users/entities/user-consent.entity';
import { AuthenticatedRequest } from '../guards/optional-auth.guard';
import { IsEnum, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class GrantConsentDto {
  @ApiProperty({
    description: 'Type of consent',
    enum: ConsentType,
    example: ConsentType.PRIVACY_POLICY,
  })
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @ApiProperty({
    description: 'Version of the consent document',
    example: '1.0.0',
  })
  @IsString()
  consentVersion: string;

  @ApiProperty({
    description: 'Whether consent is granted',
    example: true,
  })
  @IsBoolean()
  granted: boolean;

  @ApiProperty({
    description: 'Consent expiration date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'Legal basis for processing',
    required: false,
    example: 'consent',
  })
  @IsOptional()
  @IsString()
  legalBasis?: string;

  @ApiProperty({
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Consent method',
    required: false,
    example: 'mobile_app',
  })
  @IsOptional()
  @IsString()
  consentMethod?: string;
}

class UpdateConsentDto {
  @ApiProperty({
    description: 'Whether consent is granted',
    example: true,
  })
  @IsBoolean()
  granted: boolean;

  @ApiProperty({
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

class BatchGrantConsentDto {
  @ApiProperty({
    description: 'Array of consent requests',
    type: [GrantConsentDto],
  })
  consents: GrantConsentDto[];
}

@ApiTags('Consent Management')
@Controller('consent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConsentController {
  constructor(private readonly consentService: UserConsentService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user consents',
    description: 'Retrieve all consents for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User consents retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        consents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              consentType: { type: 'string', enum: Object.values(ConsentType) },
              status: { type: 'string', enum: Object.values(ConsentStatus) },
              consentVersion: { type: 'string' },
              grantedAt: { type: 'string', format: 'date-time' },
              withdrawnAt: { type: 'string', format: 'date-time' },
              expiresAt: { type: 'string', format: 'date-time' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getUserConsents(@Req() req: AuthenticatedRequest) {
    const consents = await this.consentService.findByUserId(req.user.userId);

    return {
      consents: consents.map((consent) => ({
        id: consent.id,
        consentType: consent.consentType,
        status: consent.status,
        consentVersion: consent.consentVersion,
        grantedAt: consent.grantedAt,
        withdrawnAt: consent.withdrawnAt,
        expiresAt: consent.expiresAt,
        isActive: consent.isActive(),
        createdAt: consent.createdAt,
        legalBasis: consent.legalBasis,
        consentMethod: consent.consentMethod,
        notes: consent.notes,
      })),
    };
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get active consents',
    description: 'Retrieve only active (granted and non-expired) consents.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active consents retrieved successfully',
  })
  async getActiveConsents(@Req() req: AuthenticatedRequest) {
    const consents = await this.consentService.getActiveConsents(req.user.userId);

    return {
      consents: consents.map((consent) => ({
        consentType: consent.consentType,
        consentVersion: consent.consentVersion,
        grantedAt: consent.grantedAt,
        expiresAt: consent.expiresAt,
        legalBasis: consent.legalBasis,
      })),
    };
  }

  @Get(':consentType')
  @ApiOperation({
    summary: 'Get specific consent',
    description: 'Retrieve a specific consent by type.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Consent not found',
  })
  async getConsentByType(
    @Param('consentType') consentType: ConsentType,
    @Req() req: AuthenticatedRequest,
  ) {
    const consent = await this.consentService.getConsentByType(req.user.userId, consentType);

    if (!consent) {
      return {
        consentType,
        status: ConsentStatus.DENIED,
        hasConsent: false,
      };
    }

    return {
      id: consent.id,
      consentType: consent.consentType,
      status: consent.status,
      consentVersion: consent.consentVersion,
      grantedAt: consent.grantedAt,
      withdrawnAt: consent.withdrawnAt,
      expiresAt: consent.expiresAt,
      isActive: consent.isActive(),
      hasConsent: consent.isActive(),
      createdAt: consent.createdAt,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Grant consent',
    description: 'Grant a new consent for the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Consent granted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Consent already granted or invalid request',
  })
  async grantConsent(@Body() dto: GrantConsentDto, @Req() req: AuthenticatedRequest) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const consent = await this.consentService.grantConsent(req.user.userId, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      message: `Consent ${dto.consentType} ${dto.granted ? 'granted' : 'denied'} successfully`,
      consent: {
        id: consent.id,
        consentType: consent.consentType,
        status: consent.status,
        grantedAt: consent.grantedAt,
      },
    };
  }

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Batch grant consents',
    description: 'Grant multiple consents in a single request.',
  })
  @ApiResponse({
    status: 201,
    description: 'Consents granted successfully',
  })
  async batchGrantConsents(@Body() dto: BatchGrantConsentDto, @Req() req: AuthenticatedRequest) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const requests = dto.consents.map((consent) => ({
      ...consent,
      expiresAt: consent.expiresAt ? new Date(consent.expiresAt) : undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    }));

    const consents = await this.consentService.batchGrantConsents(req.user.userId, requests);

    return {
      message: `${consents.length} consents processed successfully`,
      consents: consents.map((consent) => ({
        id: consent.id,
        consentType: consent.consentType,
        status: consent.status,
        grantedAt: consent.grantedAt,
      })),
    };
  }

  @Put(':consentType')
  @ApiOperation({
    summary: 'Update consent',
    description: 'Update an existing consent (grant or withdraw).',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Consent not found',
  })
  async updateConsent(
    @Param('consentType') consentType: ConsentType,
    @Body() dto: UpdateConsentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const consent = await this.consentService.updateConsent(req.user.userId, consentType, {
      ...dto,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      message: `Consent ${consentType} ${dto.granted ? 'granted' : 'withdrawn'} successfully`,
      consent: {
        id: consent.id,
        consentType: consent.consentType,
        status: consent.status,
        grantedAt: consent.grantedAt,
        withdrawnAt: consent.withdrawnAt,
      },
    };
  }

  @Delete(':consentType')
  @ApiOperation({
    summary: 'Withdraw consent',
    description: 'Withdraw a specific consent.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent withdrawn successfully',
  })
  async withdrawConsent(
    @Param('consentType') consentType: ConsentType,
    @Req() req: AuthenticatedRequest,
  ) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const consent = await this.consentService.withdrawConsent(
      req.user.userId,
      consentType,
      context.ipAddress,
      context.userAgent,
    );

    return {
      message: `Consent ${consentType} withdrawn successfully`,
      consent: {
        id: consent.id,
        consentType: consent.consentType,
        status: consent.status,
        withdrawnAt: consent.withdrawnAt,
      },
    };
  }

  @Delete()
  @ApiOperation({
    summary: 'Withdraw all consents',
    description: 'Withdraw all active consents for the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'All consents withdrawn successfully',
  })
  async withdrawAllConsents(@Req() req: AuthenticatedRequest) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const consents = await this.consentService.withdrawAllConsents(
      req.user.userId,
      context.ipAddress,
      context.userAgent,
    );

    return {
      message: `${consents.length} consents withdrawn successfully`,
      withdrawnConsents: consents.map((consent) => consent.consentType),
    };
  }

  @Get('history/all')
  @ApiOperation({
    summary: 'Get consent history',
    description: 'Retrieve consent history for the authenticated user.',
  })
  @ApiQuery({ name: 'consentType', required: false, enum: ConsentType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Consent history retrieved successfully',
  })
  async getConsentHistory(
    @Req() req: AuthenticatedRequest,
    @Query('consentType') consentType?: ConsentType,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    const { consents, total } = await this.consentService.getConsentHistory(
      req.user.userId,
      consentType,
      limit,
      offset,
    );

    return {
      consents: consents.map((consent) => ({
        id: consent.id,
        consentType: consent.consentType,
        status: consent.status,
        consentVersion: consent.consentVersion,
        grantedAt: consent.grantedAt,
        withdrawnAt: consent.withdrawnAt,
        createdAt: consent.createdAt,
      })),
      total,
      limit,
      offset,
    };
  }

  @Get('export/data')
  @ApiOperation({
    summary: 'Export consent data',
    description: 'Export all consent data for GDPR compliance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent data exported successfully',
  })
  async exportConsentData(@Req() req: AuthenticatedRequest) {
    return this.consentService.exportUserConsentData(req.user.userId);
  }

  @Delete('data/all')
  @ApiOperation({
    summary: 'Delete all consent data',
    description: 'Delete all consent data for GDPR compliance (irreversible).',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent data deleted successfully',
  })
  async deleteAllConsentData(@Req() req: AuthenticatedRequest) {
    const result = await this.consentService.deleteUserConsentData(req.user.userId);

    return {
      message: 'All consent data deleted successfully',
      ...result,
    };
  }
}
