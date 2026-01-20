import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import { StorageUploader } from './storageUploader';
import { logger } from './logger';

jest.mock('@google-cloud/storage');
jest.mock('fs');
jest.mock('./config', () => ({
  config: {
    gcsProjectId: 'test-project',
    gcsBucket: 'test-bucket',
    deleteAfterUpload: false,
  },
}));
jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('StorageUploader', () => {
  let uploader: StorageUploader;
  let mockUpload: jest.Mock;
  let mockBucket: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUpload = jest.fn().mockResolvedValue(undefined);
    mockBucket = jest.fn().mockReturnValue({
      upload: mockUpload,
    });

    (Storage as unknown as jest.Mock).mockImplementation(() => ({
      bucket: mockBucket,
    }));

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.statSync as jest.Mock).mockReturnValue({
      isFile: () => true,
      size: 1024,
    });

    uploader = new StorageUploader();
  });

  describe('constructor', () => {
    it('should initialize Storage with projectId from config', () => {
      expect(Storage).toHaveBeenCalledWith({ projectId: 'test-project' });
    });

    it('should log initialization message', () => {
      expect(logger.info).toHaveBeenCalledWith(
        'StorageUploader initialized for bucket: test-bucket',
      );
    });

    it('should initialize Storage without projectId if not in config', async () => {
      jest.resetModules();

      jest.doMock('./config', () => ({
        config: {
          gcsProjectId: '',
          gcsBucket: 'test-bucket',
          deleteAfterUpload: false,
        },
      }));
      jest.doMock('./logger', () => ({
        logger: {
          info: jest.fn(),
          debug: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
        },
      }));

      const mockStorage = jest.fn(() => ({
        bucket: jest.fn().mockReturnValue({ upload: jest.fn() }),
      }));
      jest.doMock('@google-cloud/storage', () => ({
        Storage: mockStorage,
      }));

      const { StorageUploader } = await import('./storageUploader');
      new StorageUploader();

      expect(mockStorage).toHaveBeenCalledWith({});
    });
  });

  describe('uploadFile', () => {
    it('should upload file to correct GCS path with date prefix', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-15T10:30:00Z'));

      const result = await uploader.uploadFile('/path/to/test.jpg');

      expect(mockBucket).toHaveBeenCalledWith('test-bucket');
      expect(mockUpload).toHaveBeenCalledWith('/path/to/test.jpg', {
        destination: '2024/03/15/test.jpg',
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            uploadedAt: expect.any(String),
            originalPath: '/path/to/test.jpg',
          },
        },
      });
      expect(result.success).toBe(true);
      expect(result.gcsPath).toBe('gs://test-bucket/2024/03/15/test.jpg');

      jest.useRealTimers();
    });

    it('should return success result on successful upload', async () => {
      const result = await uploader.uploadFile('/path/to/file.jpg');

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/path/to/file.jpg');
      expect(result.uploadedAt).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();
    });

    it('should return failure result if file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await uploader.uploadFile('/path/to/missing.jpg');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('File does not exist');
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('should return failure result if path is not a file', async () => {
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => false,
        size: 0,
      });

      const result = await uploader.uploadFile('/path/to/directory');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Not a file');
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it('should return failure result on upload error', async () => {
      mockUpload.mockRejectedValue(new Error('Upload failed'));

      const result = await uploader.uploadFile('/path/to/file.jpg');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Upload failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should log upload duration and file size on success', async () => {
      await uploader.uploadFile('/path/to/file.jpg');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/✓ Uploaded file\.jpg in \d+ms \(1 KB\)/),
      );
    });
  });

  describe('deleteAfterUpload', () => {
    let mockUnlinkSync: jest.Mock;

    beforeEach(() => {
      jest.resetModules();

      mockUnlinkSync = jest.fn();

      jest.doMock('./config', () => ({
        config: {
          gcsProjectId: 'test-project',
          gcsBucket: 'test-bucket',
          deleteAfterUpload: true,
        },
      }));
      jest.doMock('./logger', () => ({
        logger: {
          info: jest.fn(),
          debug: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
        },
      }));
      jest.doMock('@google-cloud/storage', () => ({
        Storage: jest.fn(() => ({
          bucket: jest.fn().mockReturnValue({
            upload: jest.fn().mockResolvedValue(undefined),
          }),
        })),
      }));
      jest.doMock('fs', () => ({
        existsSync: jest.fn().mockReturnValue(true),
        statSync: jest.fn().mockReturnValue({
          isFile: () => true,
          size: 1024,
        }),
        unlinkSync: mockUnlinkSync,
      }));
    });

    it('should delete file after successful upload when enabled', async () => {
      const { StorageUploader } = await import('./storageUploader');
      const uploaderWithDelete = new StorageUploader();

      await uploaderWithDelete.uploadFile('/path/to/file.jpg');

      expect(mockUnlinkSync).toHaveBeenCalledWith('/path/to/file.jpg');
    });

    it('should log warning if delete fails', async () => {
      mockUnlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const { StorageUploader } = await import('./storageUploader');
      const { logger: mockLogger } = await import('./logger');
      const uploaderWithDelete = new StorageUploader();

      const result = await uploaderWithDelete.uploadFile('/path/to/file.jpg');

      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not delete local file'),
      );
    });
  });

  describe('content type detection', () => {
    const testCases = [
      { file: 'photo.jpg', expected: 'image/jpeg' },
      { file: 'photo.jpeg', expected: 'image/jpeg' },
      { file: 'image.png', expected: 'image/png' },
      { file: 'animation.gif', expected: 'image/gif' },
      { file: 'image.bmp', expected: 'image/bmp' },
      { file: 'video.mp4', expected: 'video/mp4' },
      { file: 'video.avi', expected: 'video/x-msvideo' },
      { file: 'unknown.xyz', expected: 'application/octet-stream' },
    ];

    testCases.forEach(({ file, expected }) => {
      it(`should detect content type for ${file}`, async () => {
        await uploader.uploadFile(`/path/to/${file}`);

        expect(mockUpload).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            metadata: expect.objectContaining({
              contentType: expected,
            }),
          }),
        );
      });
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly in upload logs', async () => {
      const testCases = [
        { size: 0, expected: '0 Bytes' },
        { size: 500, expected: '500 Bytes' },
        { size: 1024, expected: '1 KB' },
        { size: 1536, expected: '1.5 KB' },
        { size: 1048576, expected: '1 MB' },
        { size: 1073741824, expected: '1 GB' },
      ];

      for (const { size, expected } of testCases) {
        jest.clearAllMocks();
        (fs.statSync as jest.Mock).mockReturnValue({
          isFile: () => true,
          size,
        });

        await uploader.uploadFile('/path/to/file.jpg');

        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(expected));
      }
    });
  });
});
