import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';
import { config } from './config';
import { logger } from './logger';
import { FileUploadResult } from './types';

export class StorageUploader {
    private storage: Storage;
    private bucketName: string;

    constructor() {
        this.storage = new Storage(
            config.gcsProjectId ? { projectId: config.gcsProjectId } : {}
        );
        this.bucketName = config.gcsBucket;
        logger.info(`StorageUploader initialized for bucket: ${this.bucketName}`);
    }

    async uploadFile(localFilePath: string): Promise<FileUploadResult> {
        const startTime = Date.now();
        const fileName = path.basename(localFilePath);

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const gcsPath = `${year}/${month}/${day}/${fileName}`;

        try {
            logger.debug(`Starting upload: ${localFilePath} -> gs://${this.bucketName}/${gcsPath}`);

            if (!fs.existsSync(localFilePath)) {
                throw new Error(`File does not exist: ${localFilePath}`);
            }

            const stats = fs.statSync(localFilePath);
            if (!stats.isFile()) {
                throw new Error(`Not a file: ${localFilePath}`);
            }

            await this.storage.bucket(this.bucketName).upload(localFilePath, {
                destination: gcsPath,
                metadata: {
                    contentType: this.getContentType(fileName),
                    metadata: {
                        uploadedAt: new Date().toISOString(),
                        originalPath: localFilePath,
                    },
                },
            });

            const duration = Date.now() - startTime;
            logger.info(`✓ Uploaded ${fileName} in ${duration}ms (${this.formatBytes(stats.size)})`);

            if (config.deleteAfterUpload) {
                try {
                    fs.unlinkSync(localFilePath);
                    logger.debug(`Deleted local file: ${localFilePath}`);
                } catch (unlinkError) {
                    // If we can't delete (e.g., read-only filesystem), just log a warning
                    logger.warn(`Could not delete local file ${localFilePath}: ${(unlinkError as Error).message}`);
                    logger.debug(`File will remain in FTP directory`);
                }
            }

            return {
                success: true,
                filePath: localFilePath,
                gcsPath: `gs://${this.bucketName}/${gcsPath}`,
                uploadedAt: new Date(),
            };
        } catch (error) {
            logger.error(`✗ Failed to upload ${fileName}:`, error);
            return {
                success: false,
                filePath: localFilePath,
                gcsPath: `gs://${this.bucketName}/${gcsPath}`,
                error: error as Error,
                uploadedAt: new Date(),
            };
        }
    }

    private getContentType(fileName: string): string {
        const ext = path.extname(fileName).toLowerCase();
        const contentTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
        };
        return contentTypes[ext] || 'application/octet-stream';
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}