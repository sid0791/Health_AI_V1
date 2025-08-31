import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

// Observability Services
import { DistributedTracingService } from './distributed-tracing.service';
import { MetricsCollectionService } from './metrics-collection.service';
import { SecurityAnomalyDetectionService } from './security-anomaly-detection.service';
import { SyntheticTestingService } from './synthetic-testing.service';
import { CostControlsService } from './cost-controls.service';
import { ObservabilityController } from './observability.controller';

@Global()
@Module({
  imports: [
    HttpModule,
  ],
  providers: [
    DistributedTracingService,
    MetricsCollectionService,
    SecurityAnomalyDetectionService,
    SyntheticTestingService,
    CostControlsService,
  ],
  controllers: [
    ObservabilityController,
  ],
  exports: [
    DistributedTracingService,
    MetricsCollectionService,
    SecurityAnomalyDetectionService,
    SyntheticTestingService,
    CostControlsService,
  ],
})
export class ObservabilityModule {}