import { config, validateConfig } from './config';
import { logger } from './logger';
import { FileWatcher } from './fileWatcher';

async function main() {
    try {
        logger.info('Camera Watcher starting...');
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

        validateConfig();
        logger.info('Configuration validated successfully');
        logger.info(`Watch directory: ${config.watchDir}`);
        logger.info(`GCS bucket: ${config.gcsBucket}`);
        logger.info(`Delete after upload: ${config.deleteAfterUpload}`);

        const watcher = new FileWatcher();
        watcher.start();

        const shutdown = async () => {
            logger.info('Shutdown signal received');
            watcher.stop();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        setInterval(() => {
            const stats = watcher.getStats();
            logger.info(`Stats - Processed: ${stats.filesProcessed}, Uploaded: ${stats.filesUploaded}, Failed: ${stats.filesFailed}`);
        }, 5 * 60 * 1000);

    } catch (error) {
        logger.error('Fatal error:', error);
        process.exit(1);
    }
}

main();