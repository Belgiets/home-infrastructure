import * as dotenv from 'dotenv';
import { WatcherConfig } from './types';

dotenv.config();

export const config: WatcherConfig = {
    watchDir: process.env.WATCH_DIR || '/watch-dir',
    gcsBucket: process.env.GCS_BUCKET || '',
    gcsProjectId: process.env.GOOGLE_CLOUD_PROJECT,
    deleteAfterUpload: process.env.DELETE_AFTER_UPLOAD === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    debounceTime: parseInt(process.env.DEBOUNCE_TIME || '2000', 10),
    mongoUri: process.env.MONGO_URI || '',
};

export function validateConfig(): void {
    if (!config.gcsBucket) {
        throw new Error('GCS_BUCKET environment variable is required');
    }

    if (!config.watchDir) {
        throw new Error('WATCH_DIR environment variable is required');
    }

    if (!config.mongoUri) {
        throw new Error('MONGO_URI environment variable is required');
    }
}