import { Test, TestingModule } from '@nestjs/testing';
import { CameraFilesController } from './camera-files.controller';
import { CameraFilesService } from './camera-files.service';
import {
  CameraFileResponseDto,
  CameraFilesListResponseDto,
  CameraFilesStatsResponseDto,
} from './dto/camera-files.dto';

describe('CameraFilesController', () => {
  let controller: CameraFilesController;
  let service: CameraFilesService;

  const mockCameraFilesService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    getStats: jest.fn(),
  };

  const mockFileResponse: CameraFileResponseDto = {
    id: '507f1f77bcf86cd799439011',
    fileName: 'IMG_20260120_140616.jpg',
    gcsPath: 'gs://bucket/2026/01/20/IMG_20260120_140616.jpg',
    status: 'uploaded',
    uploadedAt: new Date('2026-01-20T14:06:16Z'),
    createdAt: new Date('2026-01-20T14:06:16Z'),
    imageUrl: 'https://storage.googleapis.com/bucket/file.jpg?signature=abc123',
  };

  const mockListResponse: CameraFilesListResponseDto = {
    data: [mockFileResponse],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockStatsResponse: CameraFilesStatsResponseDto = {
    totalFiles: 1000,
    uploadedToday: 50,
    uploadedThisWeek: 200,
    uploadedThisMonth: 500,
    recentUploads: [
      { date: '2026-01-19', count: 10 },
      { date: '2026-01-20', count: 15 },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CameraFilesController],
      providers: [{ provide: CameraFilesService, useValue: mockCameraFilesService }],
    }).compile();

    controller = module.get<CameraFilesController>(CameraFilesController);
    service = module.get<CameraFilesService>(CameraFilesService);
  });

  describe('findAll', () => {
    it('should return paginated response', async () => {
      mockCameraFilesService.findAll.mockResolvedValue(mockListResponse);

      const result = await controller.findAll({ page: 1, limit: 20 });

      expect(result).toEqual(mockListResponse);
      expect(mockCameraFilesService.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('should pass query params to service', async () => {
      mockCameraFilesService.findAll.mockResolvedValue(mockListResponse);

      await controller.findAll({
        page: 2,
        limit: 10,
        search: 'IMG',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });

      expect(mockCameraFilesService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: 'IMG',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });
    });
  });

  describe('getStats', () => {
    it('should return stats response', async () => {
      mockCameraFilesService.getStats.mockResolvedValue(mockStatsResponse);

      const result = await controller.getStats();

      expect(result).toEqual(mockStatsResponse);
      expect(mockCameraFilesService.getStats).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return single file response', async () => {
      mockCameraFilesService.findById.mockResolvedValue(mockFileResponse);

      const result = await controller.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockFileResponse);
      expect(mockCameraFilesService.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should pass id param to service', async () => {
      mockCameraFilesService.findById.mockResolvedValue(mockFileResponse);

      await controller.findById('different-id');

      expect(mockCameraFilesService.findById).toHaveBeenCalledWith('different-id');
    });
  });
});
