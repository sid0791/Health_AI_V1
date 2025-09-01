import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketVersioningCommand,
  PutBucketEncryptionCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  encryption?: boolean;
  expirationDays?: number;
  category?:
    | 'health-reports'
    | 'profile-images'
    | 'meal-photos'
    | 'workout-videos'
    | 'documents'
    | 'other';
  userId?: string;
}

export interface UploadResult {
  fileId: string;
  url: string;
  bucket: string;
  key: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, string>;
}

export interface DownloadOptions {
  expirationSeconds?: number;
  responseContentType?: string;
  responseContentDisposition?: string;
}

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly baseUrl: string;
  private readonly encryptionEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get('S3_ENDPOINT');
    const accessKeyId = this.configService.get('S3_ACCESS_KEY');
    const secretAccessKey = this.configService.get('S3_SECRET_KEY');

    this.bucket = this.configService.get('S3_BUCKET') || 'healthcoachai-storage';
    this.region = this.configService.get('S3_REGION', 'us-east-1');
    this.encryptionEnabled = this.configService.get('S3_ENCRYPTION_ENABLED', 'true') === 'true';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('S3 credentials (S3_ACCESS_KEY, S3_SECRET_KEY) are required');
    }

    // Configure S3 client
    this.s3 = new S3Client({
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region: this.region,
      forcePathStyle: this.configService.get('S3_FORCE_PATH_STYLE', 'false') === 'true',
      maxAttempts: 3,
    });

    this.baseUrl = endpoint || `https://s3.${this.region}.amazonaws.com`;

    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Check if bucket exists, create if it doesn't
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Storage bucket '${this.bucket}' is ready`);
    } catch (error: any) {
      if (error.$metadata?.httpStatusCode === 404) {
        await this.createBucket();
      } else {
        this.logger.error('Failed to initialize storage', error);
        throw error;
      }
    }
  }

  private async createBucket(): Promise<void> {
    try {
      const createBucketParams: any = {
        Bucket: this.bucket,
      };

      // LocationConstraint should not be set for us-east-1
      if (this.region !== 'us-east-1') {
        createBucketParams.CreateBucketConfiguration = {
          LocationConstraint: this.region,
        };
      }

      await this.s3.send(new CreateBucketCommand(createBucketParams));

      // Configure bucket for security and lifecycle
      await this.configureBucket();

      this.logger.log(`Created storage bucket '${this.bucket}'`);
    } catch (error) {
      this.logger.error(`Failed to create bucket '${this.bucket}'`, error);
      throw error;
    }
  }

  private async configureBucket(): Promise<void> {
    try {
      // Enable versioning
      await this.s3.send(
        new PutBucketVersioningCommand({
          Bucket: this.bucket,
          VersioningConfiguration: {
            Status: 'Enabled',
          },
        }),
      );

      // Configure server-side encryption
      if (this.encryptionEnabled) {
        await this.s3.send(
          new PutBucketEncryptionCommand({
            Bucket: this.bucket,
            ServerSideEncryptionConfiguration: {
              Rules: [
                {
                  ApplyServerSideEncryptionByDefault: {
                    SSEAlgorithm: 'AES256',
                  },
                  BucketKeyEnabled: true,
                },
              ],
            },
          }),
        );
      }

      // Configure lifecycle policy
      await this.s3.send(
        new PutBucketLifecycleConfigurationCommand({
          Bucket: this.bucket,
          LifecycleConfiguration: {
            Rules: [
              {
                ID: 'temporary-files-cleanup',
                Status: 'Enabled',
                Filter: { Prefix: 'temp/' },
                Expiration: { Days: 7 },
              },
              {
                ID: 'incomplete-multipart-uploads',
                Status: 'Enabled',
                AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
              },
              {
                ID: 'old-versions-cleanup',
                Status: 'Enabled',
                NoncurrentVersionExpiration: { NoncurrentDays: 30 },
              },
            ],
          },
        }),
      );

      // Configure CORS for web access
      await this.s3.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                AllowedOrigins: ['*'], // Should be restricted in production
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3000,
              },
            ],
          },
        }),
      );
    } catch (error) {
      this.logger.warn('Some bucket configuration failed', error);
      // Don't throw here as the bucket might still be usable
    }
  }

  /**
   * Upload a file to object storage
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const {
      contentType = 'application/octet-stream',
      metadata = {},
      encryption = this.encryptionEnabled,
      expirationDays,
      category = 'other',
      userId,
    } = options;

    try {
      const fileId = uuidv4();
      const fileExtension = path.extname(originalName);
      const sanitizedName = this.sanitizeFileName(path.basename(originalName, fileExtension));
      const key = this.generateStorageKey(fileId, sanitizedName, fileExtension, category);

      // Prepare upload parameters
      const uploadParams: any = {
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          originalName,
          fileId,
          category,
          uploadedAt: new Date().toISOString(),
          ...(userId && { userId }),
          checksum: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
        },
      };

      // Add server-side encryption if enabled
      if (encryption) {
        uploadParams.ServerSideEncryption = 'AES256';
      }

      // Add expiration if specified
      if (expirationDays) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + expirationDays);
        uploadParams.Expires = expirationDate;
      }

      // Upload file using multipart upload for better performance
      const upload = new Upload({
        client: this.s3,
        params: uploadParams,
      });

      const result = await upload.done();

      this.logger.debug(`File uploaded successfully: ${key}`);

      return {
        fileId,
        url: result.Location || `${this.baseUrl}/${this.bucket}/${key}`,
        bucket: this.bucket,
        key,
        size: fileBuffer.length,
        contentType,
        uploadedAt: new Date(),
        ...(expirationDays && {
          expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),
        }),
        metadata: uploadParams.Metadata,
      };
    } catch (error) {
      this.logger.error('Failed to upload file', error);
      throw new Error('File upload failed');
    }
  }

  /**
   * Download a file from object storage
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const result = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      if (!result.Body) {
        throw new Error('File not found or empty');
      }

      // Convert the stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = result.Body.transformToWebStream().getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Failed to download file: ${key}`, error);
      throw new Error('File download failed');
    }
  }

  /**
   * Generate a pre-signed URL for file access
   */
  async getSignedUrl(
    key: string,
    operation: 'getObject' | 'putObject' = 'getObject',
    options: DownloadOptions = {},
  ): Promise<string> {
    const {
      expirationSeconds = 3600, // 1 hour default
      responseContentType,
      responseContentDisposition,
    } = options;

    try {
      const commandParams: any = {
        Bucket: this.bucket,
        Key: key,
      };

      if (responseContentType) {
        commandParams.ResponseContentType = responseContentType;
      }

      if (responseContentDisposition) {
        commandParams.ResponseContentDisposition = responseContentDisposition;
      }

      const command =
        operation === 'getObject'
          ? new GetObjectCommand(commandParams)
          : new PutObjectCommand(commandParams);

      const url = await getSignedUrl(this.s3, command, { expiresIn: expirationSeconds });
      this.logger.debug(`Generated signed URL for: ${key}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for: ${key}`, error);
      throw new Error('Failed to generate file access URL');
    }
  }

  /**
   * Delete a file from object storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      this.logger.debug(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${key}`, error);
      throw new Error('File deletion failed');
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    metadata: Record<string, string>;
    etag: string;
  }> {
    try {
      const result = await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return {
        size: result.ContentLength || 0,
        contentType: result.ContentType || 'application/octet-stream',
        lastModified: result.LastModified || new Date(),
        metadata: result.Metadata || {},
        etag: result.ETag || '',
      };
    } catch (error) {
      this.logger.error(`Failed to get file metadata: ${key}`, error);
      throw new Error('Failed to get file metadata');
    }
  }

  /**
   * List files with optional prefix filter
   */
  async listFiles(
    prefix?: string,
    maxKeys: number = 100,
  ): Promise<
    Array<{
      key: string;
      size: number;
      lastModified: Date;
      etag: string;
    }>
  > {
    try {
      const result = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: maxKeys,
        }),
      );

      return (result.Contents || []).map((object) => ({
        key: object.Key || '',
        size: object.Size || 0,
        lastModified: object.LastModified || new Date(),
        etag: object.ETag || '',
      }));
    } catch (error) {
      this.logger.error('Failed to list files', error);
      throw new Error('Failed to list files');
    }
  }

  /**
   * Copy a file within the bucket
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.s3.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${sourceKey}`,
          Key: destinationKey,
        }),
      );

      this.logger.debug(`File copied from ${sourceKey} to ${destinationKey}`);
    } catch (error) {
      this.logger.error(`Failed to copy file from ${sourceKey} to ${destinationKey}`, error);
      throw new Error('File copy failed');
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error: any) {
      if (error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    bucketName: string;
    totalObjects: number;
    totalSize: number;
    isEncryptionEnabled: boolean;
  }> {
    try {
      // Note: This is a simplified version. For large buckets, you'd need pagination
      const result = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
        }),
      );

      const totalObjects = result.KeyCount || 0;
      const totalSize = (result.Contents || []).reduce((sum, obj) => sum + (obj.Size || 0), 0);

      return {
        bucketName: this.bucket,
        totalObjects,
        totalSize,
        isEncryptionEnabled: this.encryptionEnabled,
      };
    } catch (error) {
      this.logger.error('Failed to get storage stats', error);
      throw new Error('Failed to get storage statistics');
    }
  }

  /**
   * Health check for object storage
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (error) {
      this.logger.error('Storage health check failed', error);
      return false;
    }
  }

  private generateStorageKey(
    fileId: string,
    sanitizedName: string,
    extension: string,
    category: string,
  ): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');

    return `${category}/${year}/${month}/${day}/${fileId}-${sanitizedName}${extension}`;
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100); // Limit length
  }
}
