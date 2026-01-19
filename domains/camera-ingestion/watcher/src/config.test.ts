import { config, validateConfig } from './config';

describe('config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('config object', () => {
        it('should use default values when environment variables are not set', () => {
            delete process.env.WATCH_DIR;
            delete process.env.GCS_BUCKET;
            delete process.env.GOOGLE_CLOUD_PROJECT;
            delete process.env.DELETE_AFTER_UPLOAD;
            delete process.env.LOG_LEVEL;
            delete process.env.DEBOUNCE_TIME;
            delete process.env.MONGODB_URI;

            // Reload the module to pick up new env
            const { config: reloadedConfig } = require('./config');

            expect(reloadedConfig.watchDir).toBe('');
            expect(reloadedConfig.gcsBucket).toBe('');
            expect(reloadedConfig.gcsProjectId).toBeUndefined();
            expect(reloadedConfig.deleteAfterUpload).toBe(false);
            expect(reloadedConfig.logLevel).toBe('info');
            expect(reloadedConfig.debounceTime).toBe(2000);
            expect(reloadedConfig.mongoUri).toBe('');
        });

        it('should use environment variables when set', () => {
            process.env.WATCH_DIR = '/custom/watch';
            process.env.GCS_BUCKET = 'my-bucket';
            process.env.GOOGLE_CLOUD_PROJECT = 'my-project';
            process.env.DELETE_AFTER_UPLOAD = 'true';
            process.env.LOG_LEVEL = 'debug';
            process.env.DEBOUNCE_TIME = '5000';
            process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

            const { config: reloadedConfig } = require('./config');

            expect(reloadedConfig.watchDir).toBe('/custom/watch');
            expect(reloadedConfig.gcsBucket).toBe('my-bucket');
            expect(reloadedConfig.gcsProjectId).toBe('my-project');
            expect(reloadedConfig.deleteAfterUpload).toBe(true);
            expect(reloadedConfig.logLevel).toBe('debug');
            expect(reloadedConfig.debounceTime).toBe(5000);
            expect(reloadedConfig.mongoUri).toBe('mongodb://localhost:27017/test');
        });

        it('should parse debounceTime as integer', () => {
            process.env.DEBOUNCE_TIME = '3000';

            const { config: reloadedConfig } = require('./config');

            expect(reloadedConfig.debounceTime).toBe(3000);
            expect(typeof reloadedConfig.debounceTime).toBe('number');
        });

        it('should handle deleteAfterUpload as boolean', () => {
            process.env.DELETE_AFTER_UPLOAD = 'false';

            const { config: reloadedConfig } = require('./config');

            expect(reloadedConfig.deleteAfterUpload).toBe(false);
        });
    });

    describe('validateConfig', () => {
        it('should not throw when all required environment variables are set', () => {
            process.env.WATCH_DIR = '/watch';
            process.env.GCS_BUCKET = 'bucket';
            process.env.MONGODB_URI = 'uri';

            const { validateConfig: reloadedValidate } = require('./config');

            expect(() => reloadedValidate()).not.toThrow();
        });

        it('should throw error when GCS_BUCKET is missing', () => {
            process.env.WATCH_DIR = '/watch';
            delete process.env.GCS_BUCKET;
            process.env.MONGODB_URI = 'uri';

            const { validateConfig: reloadedValidate } = require('./config');

            expect(() => reloadedValidate()).toThrow('GCS_BUCKET environment variable is required');
        });

        it('should throw error when WATCH_DIR is missing', () => {
            delete process.env.WATCH_DIR;
            process.env.GCS_BUCKET = 'bucket';
            process.env.MONGODB_URI = 'uri';

            const { validateConfig: reloadedValidate } = require('./config');

            expect(() => reloadedValidate()).toThrow('WATCH_DIR environment variable is required');
        });

        it('should throw error when MONGODB_URI is missing', () => {
            process.env.WATCH_DIR = '/watch';
            process.env.GCS_BUCKET = 'bucket';
            delete process.env.MONGODB_URI;

            const { validateConfig: reloadedValidate } = require('./config');

            expect(() => reloadedValidate()).toThrow('MONGODB_URI environment variable is required');
        });

        it('should throw error when WATCH_DIR is empty string', () => {
            process.env.WATCH_DIR = '';
            process.env.GCS_BUCKET = 'bucket';
            process.env.MONGODB_URI = 'uri';

            const { validateConfig: reloadedValidate } = require('./config');

            expect(() => reloadedValidate()).toThrow('WATCH_DIR environment variable is required');
        });
    });
});