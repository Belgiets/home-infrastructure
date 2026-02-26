import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GcsService } from './gcs.service';
import { Storage } from '@google-cloud/storage';

jest.mock('@google-cloud/storage');

describe('GcsService', () => {
  let service: GcsService;
  let configService: ConfigService;

  const mockGetSignedUrl = jest.fn();
  const mockExists = jest.fn();
  const mockFile = jest.fn(() => ({
    getSignedUrl: mockGetSignedUrl,
    exists: mockExists,
  }));
  const mockBucket = jest.fn(() => ({ file: mockFile }));

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        GCS_PROJECT_ID: 'test-project',
        GCS_BUCKET: 'test-bucket',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (Storage as jest.Mock).mockImplementation(() => ({
      bucket: mockBucket,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GcsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GcsService>(GcsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('isConfigured', () => {
    it('should return true when GCS_BUCKET is set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when GCS_BUCKET is empty', async () => {
      const emptyConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'GCS_BUCKET') return '';
          return 'test-project';
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GcsService,
          { provide: ConfigService, useValue: emptyConfigService },
        ],
      }).compile();

      const unconfiguredService = module.get<GcsService>(GcsService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  describe('generateSignedUrl', () => {
    const signedUrl = 'https://storage.googleapis.com/test-bucket/path/file.jpg?signature=abc123';

    beforeEach(() => {
      mockGetSignedUrl.mockResolvedValue([signedUrl]);
    });

    it('should generate signed URL for valid path', async () => {
      const result = await service.generateSignedUrl('path/to/file.jpg');

      expect(result).toBe(signedUrl);
      expect(mockBucket).toHaveBeenCalledWith('test-bucket');
      expect(mockFile).toHaveBeenCalledWith('path/to/file.jpg');
      expect(mockGetSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'read',
        expires: expect.any(Number),
      });
    });

    it('should strip gs://bucket/ prefix from path', async () => {
      await service.generateSignedUrl('gs://test-bucket/path/to/file.jpg');

      expect(mockFile).toHaveBeenCalledWith('path/to/file.jpg');
    });

    it('should strip any bucket prefix from path', async () => {
      await service.generateSignedUrl('gs://other-bucket/2026/01/20/image.jpg');

      expect(mockFile).toHaveBeenCalledWith('2026/01/20/image.jpg');
    });

    it('should throw error when bucket not configured', async () => {
      const emptyConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'GCS_BUCKET') return '';
          return 'test-project';
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GcsService,
          { provide: ConfigService, useValue: emptyConfigService },
        ],
      }).compile();

      const unconfiguredService = module.get<GcsService>(GcsService);

      await expect(
        unconfiguredService.generateSignedUrl('path/to/file.jpg'),
      ).rejects.toThrow('GCS_BUCKET not configured');
    });

    it('should propagate GCS API errors', async () => {
      const gcsError = new Error('GCS API Error');
      mockGetSignedUrl.mockRejectedValue(gcsError);

      await expect(
        service.generateSignedUrl('path/to/file.jpg'),
      ).rejects.toThrow('GCS API Error');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockExists.mockResolvedValue([true]);

      const result = await service.fileExists('path/to/file.jpg');

      expect(result).toBe(true);
      expect(mockFile).toHaveBeenCalledWith('path/to/file.jpg');
    });

    it('should return false when file does not exist', async () => {
      mockExists.mockResolvedValue([false]);

      const result = await service.fileExists('path/to/nonexistent.jpg');

      expect(result).toBe(false);
    });

    it('should strip gs://bucket/ prefix from path', async () => {
      mockExists.mockResolvedValue([true]);

      await service.fileExists('gs://test-bucket/path/to/file.jpg');

      expect(mockFile).toHaveBeenCalledWith('path/to/file.jpg');
    });

    it('should return false when bucket not configured', async () => {
      const emptyConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'GCS_BUCKET') return '';
          return 'test-project';
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GcsService,
          { provide: ConfigService, useValue: emptyConfigService },
        ],
      }).compile();

      const unconfiguredService = module.get<GcsService>(GcsService);

      const result = await unconfiguredService.fileExists('path/to/file.jpg');

      expect(result).toBe(false);
      expect(mockExists).not.toHaveBeenCalled();
    });
  });
});
