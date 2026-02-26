import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ObjectId } from 'mongodb';
import { CameraFilesService } from './camera-files.service';
import { CameraFilesRepository, CameraFile } from './camera-files.repository';
import { GcsService } from '../gcs/gcs.service';

describe('CameraFilesService', () => {
  let service: CameraFilesService;
  let repository: CameraFilesRepository;
  let gcsService: GcsService;

  const mockCameraFilesRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    getTotalCount: jest.fn(),
    getCountByDateRange: jest.fn(),
    getUploadsByDay: jest.fn(),
  };

  const mockGcsService = {
    isConfigured: jest.fn(),
    generateSignedUrl: jest.fn(),
  };

  const mockCameraFile: CameraFile = {
    _id: new ObjectId('507f1f77bcf86cd799439011'),
    fileName: 'IMG_20260120_140616.jpg',
    gcsPath: 'gs://bucket/2026/01/20/IMG_20260120_140616.jpg',
    status: 'uploaded',
    uploadedAt: new Date('2026-01-20T14:06:16Z'),
    createdAt: new Date('2026-01-20T14:06:16Z'),
  };

  const signedUrl = 'https://storage.googleapis.com/bucket/file.jpg?signature=abc123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CameraFilesService,
        { provide: CameraFilesRepository, useValue: mockCameraFilesRepository },
        { provide: GcsService, useValue: mockGcsService },
      ],
    }).compile();

    service = module.get<CameraFilesService>(CameraFilesService);
    repository = module.get<CameraFilesRepository>(CameraFilesRepository);
    gcsService = module.get<GcsService>(GcsService);
  });

  describe('findAll', () => {
    beforeEach(() => {
      mockGcsService.isConfigured.mockReturnValue(true);
      mockGcsService.generateSignedUrl.mockResolvedValue(signedUrl);
    });

    it('should return paginated list with signed URLs', async () => {
      mockCameraFilesRepository.findAll.mockResolvedValue({
        files: [mockCameraFile],
        total: 1,
      });

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({
        data: [
          {
            id: '507f1f77bcf86cd799439011',
            fileName: 'IMG_20260120_140616.jpg',
            gcsPath: 'gs://bucket/2026/01/20/IMG_20260120_140616.jpg',
            status: 'uploaded',
            uploadedAt: mockCameraFile.uploadedAt,
            createdAt: mockCameraFile.createdAt,
            imageUrl: signedUrl,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should calculate totalPages correctly', async () => {
      mockCameraFilesRepository.findAll.mockResolvedValue({
        files: [],
        total: 45,
      });

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.totalPages).toBe(3);
    });

    it('should calculate totalPages as 1 for empty result', async () => {
      mockCameraFilesRepository.findAll.mockResolvedValue({
        files: [],
        total: 0,
      });

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.totalPages).toBe(0);
    });

    it('should pass filter options to repository', async () => {
      mockCameraFilesRepository.findAll.mockResolvedValue({ files: [], total: 0 });

      await service.findAll({
        page: 2,
        limit: 10,
        search: 'IMG',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });

      expect(mockCameraFilesRepository.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: 'IMG',
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date),
      });
    });

    it('should use default page and limit values', async () => {
      mockCameraFilesRepository.findAll.mockResolvedValue({ files: [], total: 0 });

      await service.findAll({});

      expect(mockCameraFilesRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        dateFrom: undefined,
        dateTo: undefined,
      });
    });

    it('should handle GCS URL generation failure gracefully', async () => {
      mockCameraFilesRepository.findAll.mockResolvedValue({
        files: [mockCameraFile],
        total: 1,
      });
      mockGcsService.generateSignedUrl.mockRejectedValue(new Error('GCS Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data[0].imageUrl).toBe('');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return empty imageUrl when GCS not configured', async () => {
      mockCameraFilesRepository.findAll.mockResolvedValue({
        files: [mockCameraFile],
        total: 1,
      });
      mockGcsService.isConfigured.mockReturnValue(false);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data[0].imageUrl).toBe('');
      expect(mockGcsService.generateSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    beforeEach(() => {
      mockGcsService.isConfigured.mockReturnValue(true);
      mockGcsService.generateSignedUrl.mockResolvedValue(signedUrl);
    });

    it('should return file with signed URL', async () => {
      mockCameraFilesRepository.findById.mockResolvedValue(mockCameraFile);

      const result = await service.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual({
        id: '507f1f77bcf86cd799439011',
        fileName: 'IMG_20260120_140616.jpg',
        gcsPath: 'gs://bucket/2026/01/20/IMG_20260120_140616.jpg',
        status: 'uploaded',
        uploadedAt: mockCameraFile.uploadedAt,
        createdAt: mockCameraFile.createdAt,
        imageUrl: signedUrl,
      });
    });

    it('should throw NotFoundException when file not found', async () => {
      mockCameraFilesRepository.findById.mockResolvedValue(null);

      await expect(service.findById('507f1f77bcf86cd799439012')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findById('507f1f77bcf86cd799439012')).rejects.toThrow(
        'Camera file with id 507f1f77bcf86cd799439012 not found',
      );
    });
  });

  describe('getStats', () => {
    it('should return correct stats structure', async () => {
      const recentUploads = [
        { date: '2026-01-19', count: 10 },
        { date: '2026-01-20', count: 15 },
      ];

      mockCameraFilesRepository.getTotalCount.mockResolvedValue(1000);
      mockCameraFilesRepository.getCountByDateRange
        .mockResolvedValueOnce(50) // uploadedToday
        .mockResolvedValueOnce(200) // uploadedThisWeek
        .mockResolvedValueOnce(500); // uploadedThisMonth
      mockCameraFilesRepository.getUploadsByDay.mockResolvedValue(recentUploads);

      const result = await service.getStats();

      expect(result).toEqual({
        totalFiles: 1000,
        uploadedToday: 50,
        uploadedThisWeek: 200,
        uploadedThisMonth: 500,
        recentUploads,
      });
    });

    it('should call repository with correct date ranges', async () => {
      mockCameraFilesRepository.getTotalCount.mockResolvedValue(0);
      mockCameraFilesRepository.getCountByDateRange.mockResolvedValue(0);
      mockCameraFilesRepository.getUploadsByDay.mockResolvedValue([]);

      await service.getStats();

      // Verify getTotalCount was called
      expect(mockCameraFilesRepository.getTotalCount).toHaveBeenCalled();

      // Verify getCountByDateRange was called 3 times (today, week, month)
      expect(mockCameraFilesRepository.getCountByDateRange).toHaveBeenCalledTimes(3);

      // Verify getUploadsByDay was called with 7 days
      expect(mockCameraFilesRepository.getUploadsByDay).toHaveBeenCalledWith(7);
    });
  });
});
