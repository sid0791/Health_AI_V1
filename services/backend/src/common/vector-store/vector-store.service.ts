import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
  category?: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly dimensions: number;
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.dimensions = parseInt(this.configService.get('PGVECTOR_DIMENSIONS', '1536'));
    this.isEnabled = this.configService.get('PGVECTOR_ENABLED', 'false') === 'true';

    if (this.isEnabled) {
      this.initializeVectorStore();
    } else {
      this.logger.warn('Vector store is disabled. Set PGVECTOR_ENABLED=true to enable.');
    }
  }

  private async initializeVectorStore(): Promise<void> {
    try {
      // Enable pgvector extension if not already enabled
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
      
      // Create vector documents table if it doesn't exist
      await this.createVectorTable();
      
      this.logger.log('Vector store initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize vector store', error);
      throw error;
    }
  }

  private async createVectorTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS vector_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        embedding vector(${this.dimensions}) NOT NULL,
        metadata JSONB DEFAULT '{}',
        category VARCHAR(100),
        source VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_vector_documents_embedding 
        ON vector_documents USING ivfflat (embedding vector_cosine_ops);
      
      CREATE INDEX IF NOT EXISTS idx_vector_documents_category 
        ON vector_documents (category);
        
      CREATE INDEX IF NOT EXISTS idx_vector_documents_source 
        ON vector_documents (source);
        
      CREATE INDEX IF NOT EXISTS idx_vector_documents_metadata 
        ON vector_documents USING gin (metadata);
    `;

    await this.dataSource.query(createTableQuery);
  }

  /**
   * Store a document with its embedding in the vector store
   */
  async storeDocument(document: Omit<VectorDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('Vector store is not enabled');
    }

    if (document.embedding.length !== this.dimensions) {
      throw new Error(`Embedding dimension mismatch. Expected ${this.dimensions}, got ${document.embedding.length}`);
    }

    try {
      const result = await this.dataSource.query(
        `INSERT INTO vector_documents (content, embedding, metadata, category, source)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          document.content,
          JSON.stringify(document.embedding),
          JSON.stringify(document.metadata || {}),
          document.category,
          document.source,
        ]
      );

      const documentId = result[0].id;
      this.logger.debug(`Stored document with ID: ${documentId}`);
      return documentId;
    } catch (error) {
      this.logger.error('Failed to store document in vector store', error);
      throw error;
    }
  }

  /**
   * Search for similar documents using vector similarity
   */
  async searchSimilar(
    embedding: number[],
    limit: number = 10,
    threshold: number = 0.7,
    category?: string,
    source?: string
  ): Promise<VectorSearchResult[]> {
    if (!this.isEnabled) {
      throw new Error('Vector store is not enabled');
    }

    if (embedding.length !== this.dimensions) {
      throw new Error(`Embedding dimension mismatch. Expected ${this.dimensions}, got ${embedding.length}`);
    }

    try {
      let query = `
        SELECT 
          id,
          content,
          metadata,
          1 - (embedding <=> $1::vector) as similarity
        FROM vector_documents
        WHERE 1 - (embedding <=> $1::vector) > $2
      `;
      
      const params: any[] = [JSON.stringify(embedding), threshold];
      let paramIndex = 3;

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (source) {
        query += ` AND source = $${paramIndex}`;
        params.push(source);
        paramIndex++;
      }

      query += `
        ORDER BY similarity DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);

      const results = await this.dataSource.query(query, params);

      return results.map((row: any) => ({
        id: row.id,
        content: row.content,
        similarity: parseFloat(row.similarity),
        metadata: row.metadata,
      }));
    } catch (error) {
      this.logger.error('Failed to search similar documents', error);
      throw error;
    }
  }

  /**
   * Update an existing document
   */
  async updateDocument(id: string, updates: Partial<Omit<VectorDocument, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    if (!this.isEnabled) {
      throw new Error('Vector store is not enabled');
    }

    if (updates.embedding && updates.embedding.length !== this.dimensions) {
      throw new Error(`Embedding dimension mismatch. Expected ${this.dimensions}, got ${updates.embedding.length}`);
    }

    try {
      const setParts: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.content !== undefined) {
        setParts.push(`content = $${paramIndex++}`);
        params.push(updates.content);
      }

      if (updates.embedding !== undefined) {
        setParts.push(`embedding = $${paramIndex++}`);
        params.push(JSON.stringify(updates.embedding));
      }

      if (updates.metadata !== undefined) {
        setParts.push(`metadata = $${paramIndex++}`);
        params.push(JSON.stringify(updates.metadata));
      }

      if (updates.category !== undefined) {
        setParts.push(`category = $${paramIndex++}`);
        params.push(updates.category);
      }

      if (updates.source !== undefined) {
        setParts.push(`source = $${paramIndex++}`);
        params.push(updates.source);
      }

      if (setParts.length === 0) {
        return; // Nothing to update
      }

      setParts.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const query = `
        UPDATE vector_documents 
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
      `;

      await this.dataSource.query(query, params);
      this.logger.debug(`Updated document with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to update document ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete a document from the vector store
   */
  async deleteDocument(id: string): Promise<void> {
    if (!this.isEnabled) {
      throw new Error('Vector store is not enabled');
    }

    try {
      await this.dataSource.query('DELETE FROM vector_documents WHERE id = $1', [id]);
      this.logger.debug(`Deleted document with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${id}`, error);
      throw error;
    }
  }

  /**
   * Get a document by ID
   */
  async getDocument(id: string): Promise<VectorDocument | null> {
    if (!this.isEnabled) {
      throw new Error('Vector store is not enabled');
    }

    try {
      const result = await this.dataSource.query(
        'SELECT * FROM vector_documents WHERE id = $1',
        [id]
      );

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        id: row.id,
        content: row.content,
        embedding: JSON.parse(row.embedding),
        metadata: row.metadata,
        category: row.category,
        source: row.source,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      this.logger.error(`Failed to get document ${id}`, error);
      throw error;
    }
  }

  /**
   * Get vector store statistics
   */
  async getStats(): Promise<{
    totalDocuments: number;
    documentsByCategory: Record<string, number>;
    documentsBySource: Record<string, number>;
    isEnabled: boolean;
    dimensions: number;
  }> {
    if (!this.isEnabled) {
      return {
        totalDocuments: 0,
        documentsByCategory: {},
        documentsBySource: {},
        isEnabled: false,
        dimensions: this.dimensions,
      };
    }

    try {
      const [totalResult, categoryResult, sourceResult] = await Promise.all([
        this.dataSource.query('SELECT COUNT(*) as count FROM vector_documents'),
        this.dataSource.query(`
          SELECT category, COUNT(*) as count 
          FROM vector_documents 
          WHERE category IS NOT NULL 
          GROUP BY category
        `),
        this.dataSource.query(`
          SELECT source, COUNT(*) as count 
          FROM vector_documents 
          WHERE source IS NOT NULL 
          GROUP BY source
        `),
      ]);

      const documentsByCategory: Record<string, number> = {};
      categoryResult.forEach((row: any) => {
        documentsByCategory[row.category] = parseInt(row.count);
      });

      const documentsBySource: Record<string, number> = {};
      sourceResult.forEach((row: any) => {
        documentsBySource[row.source] = parseInt(row.count);
      });

      return {
        totalDocuments: parseInt(totalResult[0].count),
        documentsByCategory,
        documentsBySource,
        isEnabled: true,
        dimensions: this.dimensions,
      };
    } catch (error) {
      this.logger.error('Failed to get vector store stats', error);
      throw error;
    }
  }

  /**
   * Health check for vector store
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Vector store health check failed', error);
      return false;
    }
  }

  /**
   * Clear all documents (use with caution)
   */
  async clearAll(): Promise<void> {
    if (!this.isEnabled) {
      throw new Error('Vector store is not enabled');
    }

    try {
      await this.dataSource.query('TRUNCATE TABLE vector_documents');
      this.logger.warn('All documents cleared from vector store');
    } catch (error) {
      this.logger.error('Failed to clear vector store', error);
      throw error;
    }
  }
}