import { Test, TestingModule } from '@nestjs/testing';
import { ObjectId } from 'mongodb';
import { CameraFilesRepository, CameraFile } from './camera-files.repository';
import { MongoService } from '../mongo/mongo.service';

describe('CameraFilesRepository', () => {
  let repository: CameraFilesRepository;

  const mockToArray = jest.fn();
  const mockLimit = jest.fn(() => ({ toArray: mockToArray }));
  const mockSkip = jest.fn(() => ({ limit: mockLimit }));
  const mockSort = jest.fn(() => ({ skip: mockSkip }));
  const mockFind = jest.fn(() => ({ sort: mockSort }));
  const mockFindOne = jest.fn();
  const mockCountDocuments = jest.fn();
  const mockAggregate = jest.fn(() => ({ toArray: mockToArray }));

  const mockCollection = {
    find: mockFind,
    findOne: mockFindOne,
    countDocuments: mockCountDocuments,
    aggregate: mockAggregate,
  };

  const mockMongoService = {
    getDb: jest.fn(() => ({
      collection: jest.fn(() => mockCollection),
    })),
  };

  const mockCameraFile: CameraFile = {
    _id: new ObjectId('507f1f77bcf86cd799439011'),
    fileName: 'IMG_20260120_140616.jpg',
    gcsPath: 'gs://bucket/2026/01/20/IMG_20260120_140616.jpg',
    status: 'uploaded',
    uploadedAt: new Date('2026-01-20T14:06:16Z'),
    createdAt: new Date('2026-01-20T14:06:16Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CameraFilesRepository,
        { provide: MongoService, useValue: mockMongoService },
      ],
    }).compile();

    repository = module.get<CameraFilesRepository>(CameraFilesRepository);
  });

  describe('findAll', () => {
    it('should return paginated files with total count', async () => {
      const files = [mockCameraFile];
      mockToArray.mockResolvedValue(files);
      mockCountDocuments.mockResolvedValue(1);

      const result = await repository.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({ files, total: 1 });
      expect(mockFind).toHaveBeenCalledWith({});
      expect(mockSort).toHaveBeenCalledWith({ uploadedAt: -1 });
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(20);
    });

    it('should calculate correct skip for page 2', async () => {
      mockToArray.mockResolvedValue([]);
      mockCountDocuments.mockResolvedValue(0);

      await repository.findAll({ page: 2, limit: 20 });

      expect(mockSkip).toHaveBeenCalledWith(20);
    });

    it('should calculate correct skip for page 3 with limit 10', async () => {
      mockToArray.mockResolvedValue([]);
      mockCountDocuments.mockResolvedValue(0);

      await repository.findAll({ page: 3, limit: 10 });

      expect(mockSkip).toHaveBeenCalledWith(20);
    });

    it('should apply search filter with case-insensitive regex', async () => {
      mockToArray.mockResolvedValue([]);
      mockCountDocuments.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 20, search: 'IMG_2026' });

      expect(mockFind).toHaveBeenCalledWith({
        fileName: { $regex: 'IMG_2026', $options: 'i' },
      });
    });

    it('should apply dateFrom filter', async () => {
      mockToArray.mockResolvedValue([]);
      mockCountDocuments.mockResolvedValue(0);
      const dateFrom = new Date('2026-01-01');

      await repository.findAll({ page: 1, limit: 20, dateFrom });

      expect(mockFind).toHaveBeenCalledWith({
        uploadedAt: { $gte: dateFrom },
      });
    });

    it('should apply dateTo filter', async () => {
      mockToArray.mockResolvedValue([]);
      mockCountDocuments.mockResolvedValue(0);
      const dateTo = new Date('2026-01-31');

      await repository.findAll({ page: 1, limit: 20, dateTo });

      expect(mockFind).toHaveBeenCalledWith({
        uploadedAt: { $lte: dateTo },
      });
    });

    it('should apply both dateFrom and dateTo filters', async () => {
      mockToArray.mockResolvedValue([]);
      mockCountDocuments.mockResolvedValue(0);
      const dateFrom = new Date('2026-01-01');
      const dateTo = new Date('2026-01-31');

      await repository.findAll({ page: 1, limit: 20, dateFrom, dateTo });

      expect(mockFind).toHaveBeenCalledWith({
        uploadedAt: { $gte: dateFrom, $lte: dateTo },
      });
    });

    it('should combine search and date filters', async () => {
      mockToArray.mockResolvedValue([]);
      mockCountDocuments.mockResolvedValue(0);
      const dateFrom = new Date('2026-01-01');

      await repository.findAll({
        page: 1,
        limit: 20,
        search: 'IMG',
        dateFrom,
      });

      expect(mockFind).toHaveBeenCalledWith({
        fileName: { $regex: 'IMG', $options: 'i' },
        uploadedAt: { $gte: dateFrom },
      });
    });
  });

  describe('findById', () => {
    it('should return file when found', async () => {
      mockFindOne.mockResolvedValue(mockCameraFile);

      const result = await repository.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockCameraFile);
      expect(mockFindOne).toHaveBeenCalledWith({
        _id: new ObjectId('507f1f77bcf86cd799439011'),
      });
    });

    it('should return null when file not found', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await repository.findById('507f1f77bcf86cd799439012');

      expect(result).toBeNull();
    });

    it('should return null for invalid ObjectId format', async () => {
      const result = await repository.findById('invalid-id');

      expect(result).toBeNull();
      expect(mockFindOne).not.toHaveBeenCalled();
    });
  });

  describe('getTotalCount', () => {
    it('should return total document count', async () => {
      mockCountDocuments.mockResolvedValue(150);

      const result = await repository.getTotalCount();

      expect(result).toBe(150);
      expect(mockCountDocuments).toHaveBeenCalledWith();
    });
  });

  describe('getCountByDateRange', () => {
    it('should return count of documents in date range', async () => {
      mockCountDocuments.mockResolvedValue(42);
      const from = new Date('2026-01-01');
      const to = new Date('2026-01-31');

      const result = await repository.getCountByDateRange(from, to);

      expect(result).toBe(42);
      expect(mockCountDocuments).toHaveBeenCalledWith({
        uploadedAt: { $gte: from, $lte: to },
      });
    });
  });

  describe('getUploadsByDay', () => {
    it('should return aggregated daily upload counts', async () => {
      const aggregateResult = [
        { _id: '2026-01-19', count: 10 },
        { _id: '2026-01-20', count: 15 },
      ];
      mockToArray.mockResolvedValue(aggregateResult);

      const result = await repository.getUploadsByDay(7);

      expect(result).toEqual([
        { date: '2026-01-19', count: 10 },
        { date: '2026-01-20', count: 15 },
      ]);
      expect(mockAggregate).toHaveBeenCalledWith([
        {
          $match: {
            uploadedAt: { $gte: expect.any(Date) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$uploadedAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
    });

    it('should return empty array when no uploads', async () => {
      mockToArray.mockResolvedValue([]);

      const result = await repository.getUploadsByDay(7);

      expect(result).toEqual([]);
    });
  });
});
