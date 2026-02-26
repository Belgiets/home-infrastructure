import { Injectable } from '@nestjs/common';
import { MongoService } from '../mongo/mongo.service';
import { ObjectId, Filter } from 'mongodb';

export interface CameraFile {
  _id: ObjectId;
  fileName: string;
  gcsPath: string;
  status: string;
  uploadedAt: Date;
  createdAt: Date;
}

export interface FindFilesOptions {
  page: number;
  limit: number;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface FindFilesResult {
  files: CameraFile[];
  total: number;
}

@Injectable()
export class CameraFilesRepository {
  private readonly collectionName = 'files';

  constructor(private mongoService: MongoService) {}

  private get collection() {
    return this.mongoService.getDb().collection<CameraFile>(this.collectionName);
  }

  async findAll(options: FindFilesOptions): Promise<FindFilesResult> {
    const { page, limit, search, dateFrom, dateTo } = options;
    const skip = (page - 1) * limit;

    const filter: Filter<CameraFile> = {};

    // Search by fileName
    if (search) {
      filter.fileName = { $regex: search, $options: 'i' };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.uploadedAt = {};
      if (dateFrom) {
        filter.uploadedAt.$gte = dateFrom;
      }
      if (dateTo) {
        filter.uploadedAt.$lte = dateTo;
      }
    }

    const [files, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter),
    ]);

    return { files, total };
  }

  async findById(id: string): Promise<CameraFile | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async getTotalCount(): Promise<number> {
    return this.collection.countDocuments();
  }

  async getCountByDateRange(from: Date, to: Date): Promise<number> {
    return this.collection.countDocuments({
      uploadedAt: { $gte: from, $lte: to },
    });
  }

  async getUploadsByDay(days: number): Promise<{ date: string; count: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const result = await this.collection
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            uploadedAt: { $gte: startDate },
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
      ])
      .toArray();

    return result.map((r) => ({ date: r._id, count: r.count }));
  }
}
