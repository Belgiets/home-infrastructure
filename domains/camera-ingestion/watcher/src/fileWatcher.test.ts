import chokidar from 'chokidar';
import { FileWatcher } from './fileWatcher';
import { config } from './config';
import { logger } from './logger';
import { StorageUploader } from './storageUploader';
import { FileRepository } from './fileRepository';
import { getDb } from './db';

jest.mock('chokidar');
jest.mock('./config', () => ({
    config: {
        watchDir: '/test/watch/dir',
        debounceTime: 100,
    },
}));
jest.mock('./logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock('./storageUploader');
jest.mock('./fileRepository');
jest.mock('./db');

describe('FileWatcher', () => {
    let fileWatcher: FileWatcher;
    let mockWatcher: {
        on: jest.Mock;
        close: jest.Mock;
    };
    let mockUploader: {
        uploadFile: jest.Mock;
    };
    let mockFileRepo: {
        markUploaded: jest.Mock;
    };
    let eventHandlers: Record<string, Function>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        eventHandlers = {};
        mockWatcher = {
            on: jest.fn().mockImplementation((event: string, handler: Function) => {
                eventHandlers[event] = handler;
                return mockWatcher;
            }),
            close: jest.fn(),
        };

        (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);

        mockUploader = {
            uploadFile: jest.fn(),
        };
        (StorageUploader as jest.Mock).mockImplementation(() => mockUploader);

        mockFileRepo = {
            markUploaded: jest.fn().mockResolvedValue(undefined),
        };
        (FileRepository as jest.Mock).mockImplementation(() => mockFileRepo);

        (getDb as jest.Mock).mockReturnValue({});

        fileWatcher = new FileWatcher();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('start', () => {
        it('should initialize chokidar with correct config', () => {
            fileWatcher.start();

            expect(chokidar.watch).toHaveBeenCalledWith('/test/watch/dir', {
                ignored: /(^|[\/\\])\../,
                persistent: true,
                ignoreInitial: false,
                awaitWriteFinish: {
                    stabilityThreshold: 2000,
                    pollInterval: 100,
                },
            });
        });

        it('should register event handlers', () => {
            fileWatcher.start();

            expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
            expect(mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockWatcher.on).toHaveBeenCalledWith('ready', expect.any(Function));
        });

        it('should log start message', () => {
            fileWatcher.start();

            expect(logger.info).toHaveBeenCalledWith(
                'Starting file watcher on directory: /test/watch/dir'
            );
            expect(logger.info).toHaveBeenCalledWith('Debounce time: 100ms');
        });
    });

    describe('file processing', () => {
        beforeEach(() => {
            fileWatcher.start();
        });

        it('should upload file and mark as uploaded on success', async () => {
            mockUploader.uploadFile.mockResolvedValue({
                success: true,
                gcsPath: 'gs://bucket/test.txt',
            });

            eventHandlers['add']('/test/watch/dir/test.txt');
            jest.advanceTimersByTime(config.debounceTime);
            await Promise.resolve();

            expect(mockUploader.uploadFile).toHaveBeenCalledWith('/test/watch/dir/test.txt');
            expect(mockFileRepo.markUploaded).toHaveBeenCalledWith({
                fileName: 'test.txt',
                gcsPath: 'gs://bucket/test.txt',
            });
        });

        it('should increment filesUploaded on success', async () => {
            mockUploader.uploadFile.mockResolvedValue({
                success: true,
                gcsPath: 'gs://bucket/test.txt',
            });

            eventHandlers['add']('/test/watch/dir/test.txt');
            jest.advanceTimersByTime(config.debounceTime);
            await Promise.resolve();

            const stats = fileWatcher.getStats();
            expect(stats.filesProcessed).toBe(1);
            expect(stats.filesUploaded).toBe(1);
            expect(stats.filesFailed).toBe(0);
        });

        it('should increment filesFailed on upload failure', async () => {
            mockUploader.uploadFile.mockResolvedValue({
                success: false,
            });

            eventHandlers['add']('/test/watch/dir/test.txt');
            jest.advanceTimersByTime(config.debounceTime);
            await Promise.resolve();

            const stats = fileWatcher.getStats();
            expect(stats.filesProcessed).toBe(1);
            expect(stats.filesUploaded).toBe(0);
            expect(stats.filesFailed).toBe(1);
        });

        it('should increment filesFailed on exception', async () => {
            mockUploader.uploadFile.mockRejectedValue(new Error('Upload error'));

            eventHandlers['add']('/test/watch/dir/test.txt');
            jest.advanceTimersByTime(config.debounceTime);
            await Promise.resolve();

            const stats = fileWatcher.getStats();
            expect(stats.filesFailed).toBe(1);
            expect(logger.error).toHaveBeenCalledWith(
                'Error processing file test.txt:',
                expect.any(Error)
            );
        });

        it('should debounce multiple events for same file', async () => {
            mockUploader.uploadFile.mockResolvedValue({
                success: true,
                gcsPath: 'gs://bucket/test.txt',
            });

            eventHandlers['add']('/test/watch/dir/test.txt');
            jest.advanceTimersByTime(50);
            eventHandlers['add']('/test/watch/dir/test.txt');
            jest.advanceTimersByTime(50);
            eventHandlers['add']('/test/watch/dir/test.txt');
            jest.advanceTimersByTime(config.debounceTime);
            await Promise.resolve();

            expect(mockUploader.uploadFile).toHaveBeenCalledTimes(1);
        });

        it('should not process file if already processing', async () => {
            mockUploader.uploadFile.mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve({ success: true, gcsPath: 'gs://bucket/test.txt' }), 500))
            );

            eventHandlers['add']('/test/watch/dir/test.txt');
            jest.advanceTimersByTime(config.debounceTime);
            await Promise.resolve();

            // File is now processing, trigger another event
            eventHandlers['add']('/test/watch/dir/test.txt');
            jest.advanceTimersByTime(config.debounceTime);
            await Promise.resolve();

            expect(mockUploader.uploadFile).toHaveBeenCalledTimes(1);
        });
    });

    describe('error handling', () => {
        it('should log watcher errors', () => {
            fileWatcher.start();
            const testError = new Error('Watcher error');

            eventHandlers['error'](testError);

            expect(logger.error).toHaveBeenCalledWith('Watcher error:', testError);
        });

        it('should log ready message', () => {
            fileWatcher.start();

            eventHandlers['ready']();

            expect(logger.info).toHaveBeenCalledWith(
                'File watcher is ready and scanning for files'
            );
        });
    });

    describe('stop', () => {
        it('should close watcher and clear timers', () => {
            fileWatcher.start();
            eventHandlers['add']('/test/watch/dir/test.txt');

            fileWatcher.stop();

            expect(mockWatcher.close).toHaveBeenCalled();
        });

        it('should log statistics on stop', () => {
            fileWatcher.start();
            fileWatcher.stop();

            expect(logger.info).toHaveBeenCalledWith('=== Watcher Statistics ===');
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Uptime:'));
            expect(logger.info).toHaveBeenCalledWith('Files processed: 0');
            expect(logger.info).toHaveBeenCalledWith('Files uploaded: 0');
            expect(logger.info).toHaveBeenCalledWith('Files failed: 0');
        });

        it('should do nothing if watcher not started', () => {
            fileWatcher.stop();

            expect(mockWatcher.close).not.toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        it('should return copy of stats', () => {
            const stats1 = fileWatcher.getStats();
            const stats2 = fileWatcher.getStats();

            expect(stats1).not.toBe(stats2);
            expect(stats1).toEqual(stats2);
        });

        it('should include startTime', () => {
            const stats = fileWatcher.getStats();

            expect(stats.startTime).toBeInstanceOf(Date);
        });
    });
});