import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StructuredEntity, EntityType, CriticalityLevel } from '../entities/structured-entity.entity';

@Injectable()
export class StructuredEntityService {
  constructor(
    @InjectRepository(StructuredEntity)
    private readonly structuredEntityRepository: Repository<StructuredEntity>,
  ) {}

  /**
   * Find entities by health report ID
   */
  async findByHealthReportId(healthReportId: string): Promise<StructuredEntity[]> {
    return this.structuredEntityRepository.find({ 
      where: { healthReportId },
      order: { category: 'ASC', entityName: 'ASC' },
    });
  }

  /**
   * Find entities by health report ID and category
   */
  async findByHealthReportIdAndCategory(
    healthReportId: string, 
    category: string,
  ): Promise<StructuredEntity[]> {
    return this.structuredEntityRepository.find({ 
      where: { healthReportId, category },
      order: { entityName: 'ASC' },
    });
  }

  /**
   * Find abnormal entities by health report ID
   */
  async findAbnormalByHealthReportId(healthReportId: string): Promise<StructuredEntity[]> {
    return this.structuredEntityRepository.find({ 
      where: { healthReportId, isAbnormal: true },
      order: { criticalityLevel: 'DESC', entityName: 'ASC' },
    });
  }

  /**
   * Find critical entities by health report ID
   */
  async findCriticalByHealthReportId(healthReportId: string): Promise<StructuredEntity[]> {
    return this.structuredEntityRepository
      .createQueryBuilder('entity')
      .where('entity.healthReportId = :healthReportId', { healthReportId })
      .andWhere('entity.criticalityLevel IN (:...levels)', { 
        levels: [CriticalityLevel.CRITICAL_HIGH, CriticalityLevel.CRITICAL_LOW] 
      })
      .orderBy('entity.criticalityLevel', 'DESC')
      .addOrderBy('entity.entityName', 'ASC')
      .getMany();
  }

  /**
   * Get entity summary by category
   */
  async getEntitySummaryByCategory(healthReportId: string): Promise<{
    category: string;
    totalEntities: number;
    normalEntities: number;
    abnormalEntities: number;
    criticalEntities: number;
  }[]> {
    const result = await this.structuredEntityRepository
      .createQueryBuilder('entity')
      .select('entity.category', 'category')
      .addSelect('COUNT(*)', 'totalEntities')
      .addSelect('SUM(CASE WHEN entity.isAbnormal = false THEN 1 ELSE 0 END)', 'normalEntities')
      .addSelect('SUM(CASE WHEN entity.isAbnormal = true THEN 1 ELSE 0 END)', 'abnormalEntities')
      .addSelect(`SUM(CASE WHEN entity.criticalityLevel IN ('${CriticalityLevel.CRITICAL_HIGH}', '${CriticalityLevel.CRITICAL_LOW}') THEN 1 ELSE 0 END)`, 'criticalEntities')
      .where('entity.healthReportId = :healthReportId', { healthReportId })
      .groupBy('entity.category')
      .orderBy('entity.category', 'ASC')
      .getRawMany();

    return result.map(row => ({
      category: row.category || 'Uncategorized',
      totalEntities: parseInt(row.totalEntities),
      normalEntities: parseInt(row.normalEntities),
      abnormalEntities: parseInt(row.abnormalEntities),
      criticalEntities: parseInt(row.criticalEntities),
    }));
  }

  /**
   * Get biomarker trends across multiple reports
   */
  async getBiomarkerTrends(
    userId: string, 
    entityName: string, 
    limitReports: number = 10,
  ): Promise<{
    reportId: string;
    testDate: Date;
    value: any;
    unit: string;
    isAbnormal: boolean;
    criticalityLevel: CriticalityLevel;
  }[]> {
    const result = await this.structuredEntityRepository
      .createQueryBuilder('entity')
      .innerJoin('entity.healthReport', 'report')
      .select([
        'entity.valueNumeric as value',
        'entity.valueText as textValue',
        'entity.unit as unit',
        'entity.isAbnormal as isAbnormal',
        'entity.criticalityLevel as criticalityLevel',
        'report.id as reportId',
        'report.testDate as testDate',
      ])
      .where('report.userId = :userId', { userId })
      .andWhere('entity.entityName = :entityName', { entityName })
      .andWhere('report.processingStatus = :status', { status: 'processed' })
      .orderBy('report.testDate', 'DESC')
      .limit(limitReports)
      .getRawMany();

    return result.map(row => ({
      reportId: row.reportId,
      testDate: new Date(row.testDate),
      value: row.value || row.textValue,
      unit: row.unit,
      isAbnormal: row.isAbnormal,
      criticalityLevel: row.criticalityLevel,
    }));
  }

  /**
   * Update entity verification status
   */
  async verifyEntity(entityId: string, notes?: string): Promise<StructuredEntity> {
    const entity = await this.structuredEntityRepository.findOne({ where: { id: entityId } });
    if (!entity) {
      throw new Error('Entity not found');
    }

    entity.verify(notes);
    return this.structuredEntityRepository.save(entity);
  }

  /**
   * Bulk verify entities
   */
  async bulkVerifyEntities(entityIds: string[], notes?: string): Promise<StructuredEntity[]> {
    const entities = await this.structuredEntityRepository.findByIds(entityIds);
    
    entities.forEach(entity => entity.verify(notes));
    return this.structuredEntityRepository.save(entities);
  }

  /**
   * Search entities by name pattern
   */
  async searchEntitiesByName(
    pattern: string,
    userId?: string,
    limit: number = 50,
  ): Promise<StructuredEntity[]> {
    const queryBuilder = this.structuredEntityRepository
      .createQueryBuilder('entity')
      .innerJoin('entity.healthReport', 'report')
      .where('LOWER(entity.entityName) LIKE LOWER(:pattern)', { pattern: `%${pattern}%` })
      .orderBy('entity.entityName', 'ASC')
      .limit(limit);

    if (userId) {
      queryBuilder.andWhere('report.userId = :userId', { userId });
    }

    return queryBuilder.getMany();
  }

  /**
   * Get unique entity names for user
   */
  async getUniqueEntityNames(userId: string): Promise<string[]> {
    const result = await this.structuredEntityRepository
      .createQueryBuilder('entity')
      .innerJoin('entity.healthReport', 'report')
      .select('DISTINCT entity.entityName', 'entityName')
      .where('report.userId = :userId', { userId })
      .andWhere('report.processingStatus = :status', { status: 'processed' })
      .orderBy('entity.entityName', 'ASC')
      .getRawMany();

    return result.map(row => row.entityName);
  }

  /**
   * Create new structured entity
   */
  async create(data: Partial<StructuredEntity>): Promise<StructuredEntity> {
    const entity = this.structuredEntityRepository.create(data);
    
    // Update criticality if value and reference range are provided
    if (entity.dataType && entity.getValue() && entity.referenceRangeMin !== undefined || entity.referenceRangeMax !== undefined) {
      entity.updateCriticality();
    }
    
    return this.structuredEntityRepository.save(entity);
  }

  /**
   * Update existing structured entity
   */
  async update(id: string, data: Partial<StructuredEntity>): Promise<StructuredEntity> {
    const entity = await this.structuredEntityRepository.findOne({ where: { id } });
    if (!entity) {
      throw new Error('Entity not found');
    }

    Object.assign(entity, data);
    
    // Update criticality after changes
    if (entity.dataType && entity.getValue() && (entity.referenceRangeMin !== undefined || entity.referenceRangeMax !== undefined)) {
      entity.updateCriticality();
    }
    
    return this.structuredEntityRepository.save(entity);
  }

  /**
   * Delete structured entity
   */
  async delete(id: string): Promise<void> {
    const result = await this.structuredEntityRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Entity not found');
    }
  }

  /**
   * Get entities by type
   */
  async findByEntityType(entityType: EntityType, userId?: string): Promise<StructuredEntity[]> {
    const queryBuilder = this.structuredEntityRepository
      .createQueryBuilder('entity')
      .innerJoin('entity.healthReport', 'report')
      .where('entity.entityType = :entityType', { entityType })
      .orderBy('entity.entityName', 'ASC');

    if (userId) {
      queryBuilder.andWhere('report.userId = :userId', { userId });
    }

    return queryBuilder.getMany();
  }
}
