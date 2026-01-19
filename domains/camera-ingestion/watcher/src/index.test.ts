import { main } from './index';
import { validateConfig } from './config';
import { logger } from './logger';
import { FileWatcher } from './fileWatcher';
import { closeMongo, initMongo } from './db';

jest.mock('./config', () => ({
    config: {
        watchDir: '/test/watch',
        gcsBucket: 'test-bucket',
        deleteAfterUpload: false,
    },
    validateConfig: jest.fn(),
}));
jest.mock('./logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock('./fileWatcher');
jest.mock('./db');

describe('main', () => {
    let mockWatcher: {
        start: jest.Mock;
        stop: jest.Mock;
        getStats: jest.Mock;
    };
    let processExitSpy: jest.SpyInstance;
    let processOnSpy: jest.SpyInstance;
    let signalHandlers: Record<string, Function>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        mockWatcher = {
            start: jest.fn(),
            stop: jest.fn(),
            getStats: jest.fn().mockReturnValue({
                filesProcessed: 10,
                filesUploaded: 8,
                filesFailed: 2,
            }),
        };
        (FileWatcher as jest.Mock).mockImplementation(() => mockWatcher);

        (initMongo as jest.Mock).mockResolvedValue({});
        (closeMongo as jest.Mock).mockResolvedValue(undefined);
        (validateConfig as jest.Mock).mockImplementation(() => {});

        signalHandlers = {};
        processOnSpy = jest.spyOn(process, 'on').mockImplementation(
            ((signal: string, handler: Function) => {
                signalHandlers[signal] = handler;
                return process;
            }) as any
        );

        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        jest.useRealTimers();
        processExitSpy.mockRestore();
        processOnSpy.mockRestore();
    });

    describe('startup', () => {
        it('should validate config', async () => {
            await main();

            expect(validateConfig).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith('Configuration validated successfully');
        });

        it('should initialize MongoDB', async () => {
            await main();

            expect(initMongo).toHaveBeenCalled();
        });

        it('should create and start FileWatcher', async () => {
            await main();

            expect(FileWatcher).toHaveBeenCalled();
            expect(mockWatcher.start).toHaveBeenCalled();
        });

        it('should log startup information', async () => {
            await main();

            expect(logger.info).toHaveBeenCalledWith('Camera Watcher starting...');
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Environment:'));
            expect(logger.info).toHaveBeenCalledWith('Watch directory: /test/watch');
            expect(logger.info).toHaveBeenCalledWith('GCS bucket: test-bucket');
            expect(logger.info).toHaveBeenCalledWith('Delete after upload: false');
        });

        it('should register signal handlers', async () => {
            await main();

            expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
            expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
        });
    });

    describe('shutdown', () => {
        it('should stop watcher on SIGTERM', async () => {
            await main();

            await signalHandlers['SIGTERM']();

            expect(logger.info).toHaveBeenCalledWith('Shutdown signal received');
            expect(mockWatcher.stop).toHaveBeenCalled();
            expect(closeMongo).toHaveBeenCalled();
            expect(processExitSpy).toHaveBeenCalledWith(0);
        });

        it('should stop watcher on SIGINT', async () => {
            await main();

            await signalHandlers['SIGINT']();

            expect(mockWatcher.stop).toHaveBeenCalled();
            expect(closeMongo).toHaveBeenCalled();
            expect(processExitSpy).toHaveBeenCalledWith(0);
        });
    });

    describe('stats interval', () => {
        it('should log stats every 5 minutes', async () => {
            await main();
            jest.clearAllMocks();

            jest.advanceTimersByTime(5 * 60 * 1000);

            expect(mockWatcher.getStats).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(
                'Stats - Processed: 10, Uploaded: 8, Failed: 2'
            );
        });

        it('should log stats multiple times', async () => {
            await main();

            jest.advanceTimersByTime(15 * 60 * 1000);

            expect(mockWatcher.getStats).toHaveBeenCalledTimes(3);
        });
    });

    describe('error handling', () => {
        it('should exit with code 1 on config validation error', async () => {
            (validateConfig as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid config');
            });

            await main();

            expect(logger.error).toHaveBeenCalledWith('Fatal error:', expect.any(Error));
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should exit with code 1 on MongoDB connection error', async () => {
            (initMongo as jest.Mock).mockRejectedValue(new Error('MongoDB connection failed'));

            await main();

            expect(logger.error).toHaveBeenCalledWith('Fatal error:', expect.any(Error));
            expect(processExitSpy).toHaveBeenCalledWith(1);
        });

        it('should not start watcher if MongoDB fails', async () => {
            (initMongo as jest.Mock).mockRejectedValue(new Error('MongoDB error'));

            await main();

            expect(mockWatcher.start).not.toHaveBeenCalled();
        });
    });
});