import winston from 'winston';

describe('logger', () => {
    let capturedConfig: winston.LoggerOptions;
    let mockCreateLogger: jest.Mock;

    beforeEach(() => {
        jest.resetModules();

        capturedConfig = undefined as any;

        mockCreateLogger = jest.fn((options) => {
            capturedConfig = options as winston.LoggerOptions;
            return {
                info: jest.fn(),
                error: jest.fn(),
                debug: jest.fn(),
                warn: jest.fn(),
            };
        });

        jest.doMock('./config', () => ({
            config: { logLevel: 'debug' },
        }));

        jest.doMock('winston', () => ({
            ...jest.requireActual('winston'),
            createLogger: mockCreateLogger,
        }));
    });

    it('should create logger with correct log level from config', async () => {
        await import('./logger');

        expect(capturedConfig).toBeDefined();
        expect(capturedConfig.level).toBe('debug');
    });

    it('should use Console transport', async () => {
        await import('./logger');

        expect(capturedConfig).toBeDefined();
        const transports = capturedConfig.transports as winston.transport[];
        expect(transports).toHaveLength(1);
        expect(transports[0]).toBeInstanceOf(winston.transports.Console);
    });

    it('should export logger instance', async () => {
        const { logger } = await import('./logger');

        expect(logger).toBeDefined();
        expect(logger.info).toBeDefined();
        expect(logger.error).toBeDefined();
    });
});

describe('log format', () => {
    beforeEach(() => {
        jest.resetModules();

        jest.doMock('./config', () => ({
            config: { logLevel: 'info' },
        }));
    });

    it('should format regular log messages correctly', async () => {
        let logOutput = '';

        jest.doMock('winston', () => {
            const actual = jest.requireActual('winston');
            return {
                ...actual,
                createLogger: jest.fn((options) => {
                    const format = options?.format;
                    const testInfo = {
                        level: 'info',
                        message: 'Test message',
                        timestamp: '2024-01-15 10:30:00',
                    };

                    if (format && typeof format.transform === 'function') {
                        format.transform(testInfo);
                        logOutput = (testInfo as any)[Symbol.for('message')];
                    }

                    return { info: jest.fn() };
                }),
            };
        });

        await import('./logger');

        expect(logOutput).toContain('[INFO]');
        expect(logOutput).toContain('Test message');
    });

    it('should include stack trace for errors', async () => {
        let logOutput = '';

        jest.doMock('winston', () => {
            const actual = jest.requireActual('winston');
            return {
                ...actual,
                createLogger: jest.fn((options) => {
                    const format = options?.format;
                    const testInfo = {
                        level: 'error',
                        message: 'Error occurred',
                        timestamp: '2024-01-15 10:30:00',
                        stack: 'Error: Test\n    at line 1\n    at line 2',
                    };

                    if (format && typeof format.transform === 'function') {
                        const result = format.transform(testInfo) as any;
                        logOutput = result[Symbol.for('message')];
                    }

                    return { error: jest.fn() };
                }),
            };
        });

        await import('./logger');

        expect(logOutput).toContain('[ERROR]');
        expect(logOutput).toContain('Error occurred');
        expect(logOutput).toContain('at line 1');
    });
});