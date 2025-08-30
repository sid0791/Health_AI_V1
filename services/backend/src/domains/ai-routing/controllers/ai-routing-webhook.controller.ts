import {
  Controller,
  Post,
  Body,
  Headers,
  HttpStatus,
  HttpException,
  Logger,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { AIRoutingService } from '../services/ai-routing.service';
import { DLPService } from '../../auth/services/dlp.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface N8nWebhookPayload {
  requestType: string;
  content: string;
  userId?: string;
  sessionId?: string;
  contextTokens?: number;
  maxResponseTokens?: number;
  emergencyRequest?: boolean;
  accuracyRequirement?: number;
  callbackUrl?: string;
}

interface WebhookResponse {
  success: boolean;
  data?: any;
  error?: string;
  processingId?: string;
}

@ApiTags('AI Routing Webhooks')
@Controller('webhooks/ai-routing')
export class AIRoutingWebhookController {
  private readonly logger = new Logger(AIRoutingWebhookController.name);

  constructor(
    private readonly aiRoutingService: AIRoutingService,
    private readonly dlpService: DLPService,
    private readonly configService: ConfigService,
  ) {}

  @Post('route')
  @ApiOperation({ summary: 'Webhook endpoint for n8n AI routing' })
  @ApiHeader({ name: 'X-N8N-Signature', description: 'Webhook signature for verification' })
  @ApiBody({ description: 'AI routing request from n8n workflow' })
  @ApiResponse({ status: 200, description: 'Request processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  @ApiResponse({ status: 400, description: 'Invalid request payload' })
  async handleRoutingWebhook(
    @Body() payload: N8nWebhookPayload,
    @Headers('x-n8n-signature') signature: string,
    @Req() request: Request,
  ): Promise<WebhookResponse> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
        throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
      }

      this.logger.debug(`Processing n8n AI routing webhook: ${payload.requestType}`);

      // Process content through DLP
      const dlpResult = await this.dlpService.processText(payload.content);
      
      // Log DLP results
      if (dlpResult.riskScore > 50) {
        this.logger.warn(`High risk content detected (score: ${dlpResult.riskScore}): ${dlpResult.redactedFields.join(', ')}`);
      }

      // Create routing request
      const routingRequest = {
        userId: payload.userId,
        sessionId: payload.sessionId,
        requestType: payload.requestType as any,
        contextTokens: payload.contextTokens,
        maxResponseTokens: payload.maxResponseTokens,
        emergencyRequest: payload.emergencyRequest,
        accuracyRequirement: payload.accuracyRequirement,
      };

      // Route the request
      const result = await this.aiRoutingService.routeRequest(routingRequest);

      // Prepare response
      const response: WebhookResponse = {
        success: true,
        data: {
          routing: {
            provider: result.provider,
            model: result.model,
            endpoint: result.endpoint,
            routingDecision: result.routingDecision,
            routingReason: result.routingReason,
            estimatedCost: result.estimatedCost,
            quotaRemaining: result.quotaRemaining,
            decisionId: result.decisionId,
          },
          dlp: {
            processedContent: dlpResult.processedText,
            riskScore: dlpResult.riskScore,
            redactedFields: dlpResult.redactedFields,
            pseudonymizedFields: dlpResult.pseudonymizedFields,
          },
        },
        processingId: result.decisionId,
      };

      this.logger.debug(`Webhook processed successfully: ${result.decisionId}`);
      return response;
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('failover')
  @ApiOperation({ summary: 'Webhook for provider failover notifications' })
  @ApiHeader({ name: 'X-N8N-Signature', description: 'Webhook signature for verification' })
  async handleFailoverWebhook(
    @Body() payload: { provider: string; reason: string; timestamp: string },
    @Headers('x-n8n-signature') signature: string,
  ): Promise<WebhookResponse> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
        throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
      }

      this.logger.warn(`Provider failover triggered: ${payload.provider} - ${payload.reason}`);

      // Here you could implement logic to:
      // 1. Update provider availability status
      // 2. Trigger alerts
      // 3. Adjust routing weights
      // 4. Log failover events

      return {
        success: true,
        data: {
          acknowledged: true,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Failover webhook processing failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('quota-alert')
  @ApiOperation({ summary: 'Webhook for quota threshold alerts' })
  @ApiHeader({ name: 'X-N8N-Signature', description: 'Webhook signature for verification' })
  async handleQuotaAlertWebhook(
    @Body() payload: { 
      provider: string; 
      quotaUsed: number; 
      quotaLimit: number; 
      percentage: number;
      severity: 'warning' | 'critical';
    },
    @Headers('x-n8n-signature') signature: string,
  ): Promise<WebhookResponse> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
        throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
      }

      this.logger.warn(`Quota alert: ${payload.provider} at ${payload.percentage}% (${payload.severity})`);

      // Implement quota alert handling:
      // 1. Send notifications to administrators
      // 2. Trigger step-down logic if needed
      // 3. Log quota events for analytics

      return {
        success: true,
        data: {
          alertProcessed: true,
          timestamp: new Date().toISOString(),
          action: payload.percentage > 95 ? 'step_down_triggered' : 'monitoring',
        },
      };
    } catch (error) {
      this.logger.error('Quota alert webhook processing failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('audit')
  @ApiOperation({ summary: 'Webhook for audit log entries from n8n' })
  @ApiHeader({ name: 'X-N8N-Signature', description: 'Webhook signature for verification' })
  async handleAuditWebhook(
    @Body() payload: {
      event: string;
      timestamp: string;
      details: Record<string, any>;
      source: string;
    },
    @Headers('x-n8n-signature') signature: string,
  ): Promise<WebhookResponse> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
        throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
      }

      this.logger.log(`Audit event received: ${payload.event} from ${payload.source}`);

      // Process audit log entry
      // In a real implementation, you'd save this to an audit log service
      const auditEntry = {
        ...payload,
        receivedAt: new Date().toISOString(),
        processed: true,
      };

      return {
        success: true,
        data: auditEntry,
      };
    } catch (error) {
      this.logger.error('Audit webhook processing failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify webhook signature from n8n
   */
  private verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>('N8N_WEBHOOK_SECRET');
      if (!webhookSecret) {
        this.logger.warn('N8N_WEBHOOK_SECRET not configured, skipping signature verification');
        return true; // Allow in development, but warn
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const providedSignature = signature?.replace('sha256=', '') || '';
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      this.logger.error('Signature verification failed', error);
      return false;
    }
  }
}