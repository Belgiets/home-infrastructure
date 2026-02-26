import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class GcsService {
  private storage: Storage;
  private bucketName: string;
  private readonly logger = new Logger(GcsService.name);

  // Signed URL expiry: 1 hour
  private readonly signedUrlExpiry = 60 * 60 * 1000; // 1 hour in ms

  constructor(private configService: ConfigService) {
    const projectId = this.configService.get<string>('GCS_PROJECT_ID');
    this.bucketName = this.configService.get<string>('GCS_BUCKET') || '';

    if (!this.bucketName) {
      this.logger.warn('GCS_BUCKET not configured, GCS features disabled');
    }

    this.storage = new Storage({
      projectId,
    });
  }

  /**
   * Generates a signed URL for a file in GCS
   * @param gcsPath - Full GCS path (e.g., "gs://bucket/path/file.jpg" or just "path/file.jpg")
   * @returns Signed URL valid for 1 hour
   */
  async generateSignedUrl(gcsPath: string): Promise<string> {
    if (!this.bucketName) {
      throw new Error('GCS_BUCKET not configured');
    }

    // Remove gs://bucket-name/ prefix if present
    const cleanPath = gcsPath.replace(/^gs:\/\/[^/]+\//, '');

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(cleanPath);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + this.signedUrlExpiry,
    });

    return signedUrl;
  }

  /**
   * Checks if a file exists in GCS
   * @param gcsPath - Full GCS path or relative path
   * @returns true if file exists
   */
  async fileExists(gcsPath: string): Promise<boolean> {
    if (!this.bucketName) {
      return false;
    }

    const cleanPath = gcsPath.replace(/^gs:\/\/[^/]+\//, '');
    const file = this.storage.bucket(this.bucketName).file(cleanPath);
    const [exists] = await file.exists();
    return exists;
  }

  /**
   * Checks if GCS is properly configured
   */
  isConfigured(): boolean {
    return !!this.bucketName;
  }
}
