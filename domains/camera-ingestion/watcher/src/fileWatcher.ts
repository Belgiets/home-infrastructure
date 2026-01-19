import chokidar from 'chokidar';
import * as path from 'path';
import { config } from './config';
import { logger } from './logger';
import { StorageUploader } from './storageUploader';
import { WatcherStats } from './types';
import { FileRepository } from "./fileRepository";
import { getDb } from "./db";

export class FileWatcher {
    private uploader: StorageUploader;
    private watcher: chokidar.FSWatcher | null = null;
    private stats: WatcherStats;
    private processingFiles = new Set<string>();
    private debounceTimers = new Map<string, NodeJS.Timeout>();
    private fileRepo: FileRepository;

    constructor() {
        this.uploader = new StorageUploader();
        this.fileRepo = new FileRepository(getDb());
        this.stats = {
            filesProcessed: 0,
            filesUploaded: 0,
            filesFailed: 0,
            startTime: new Date(),
        };
    }

    start(): void {
        logger.info(`Starting file watcher on directory: ${config.watchDir}`);
        logger.info(`Debounce time: ${config.debounceTime}ms`);

        this.watcher = chokidar.watch(config.watchDir, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: false,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100,
            },
        });

        this.watcher
            .on('add', (filePath: string) => this.handleNewFile(filePath))
            .on('error', (error: Error) => logger.error('Watcher error:', error))
            .on('ready', () => logger.info('File watcher is ready and scanning for files'));
    }

    private handleNewFile(filePath: string): void {
        if (this.processingFiles.has(filePath)) {
            return;
        }

        const existingTimer = this.debounceTimers.get(filePath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(async () => {
            await this.processFile(filePath);
            this.debounceTimers.delete(filePath);
        }, config.debounceTime);

        this.debounceTimers.set(filePath, timer);
    }

    private async processFile(filePath: string): Promise<void> {
        this.processingFiles.add(filePath);
        this.stats.filesProcessed++;

        const fileName = path.basename(filePath);
        logger.info(`Processing file: ${fileName}`);

        try {
            const result = await this.uploader.uploadFile(filePath);

            if (result.success) {
                this.stats.filesUploaded++;
                await this.fileRepo.markUploaded({
                    fileName, gcsPath: result.gcsPath
                })
                logger.info(`Upload successful: ${result.gcsPath}`);
            } else {
                this.stats.filesFailed++;
                logger.error(`Upload failed for: ${fileName}`);
            }
        } catch (error) {
            this.stats.filesFailed++;
            logger.error(`Error processing file ${fileName}:`, error);
        } finally {
            this.processingFiles.delete(filePath);
        }
    }

    stop(): void {
        if (this.watcher) {
            logger.info('Stopping file watcher...');

            this.debounceTimers.forEach((timer) => clearTimeout(timer));
            this.debounceTimers.clear();

            this.watcher.close();
            this.watcher = null;

            this.logStats();
        }
    }

    getStats(): WatcherStats {
        return { ...this.stats };
    }

    private logStats(): void {
        const uptime = Date.now() - this.stats.startTime.getTime();
        const uptimeSeconds = Math.floor(uptime / 1000);

        logger.info('=== Watcher Statistics ===');
        logger.info(`Uptime: ${uptimeSeconds}s`);
        logger.info(`Files processed: ${this.stats.filesProcessed}`);
        logger.info(`Files uploaded: ${this.stats.filesUploaded}`);
        logger.info(`Files failed: ${this.stats.filesFailed}`);
        logger.info('=========================');
    }
}