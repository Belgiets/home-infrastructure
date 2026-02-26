import { Injectable, NotFoundException } from '@nestjs/common';
import { CameraFilesRepository, CameraFile } from './camera-files.repository';
import { GcsService } from '../gcs/gcs.service';
import {
  ListCameraFilesDto,
  CameraFileResponseDto,
  CameraFilesListResponseDto,
  CameraFilesStatsResponseDto,
} from './dto/camera-files.dto';

@Injectable()
export class CameraFilesService {
  constructor(
    private cameraFilesRepository: CameraFilesRepository,
    private gcsService: GcsService,
  ) {}

  async findAll(dto: ListCameraFilesDto): Promise<CameraFilesListResponseDto> {
    const { page = 1, limit = 20, search, dateFrom, dateTo } = dto;

    const { files, total } = await this.cameraFilesRepository.findAll({
      page,
      limit,
      search,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });

    // Generate signed URLs for all files in parallel
    const filesWithUrls = await Promise.all(
      files.map(async (file) => this.mapToResponseDto(file)),
    );

    return {
      data: filesWithUrls,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<CameraFileResponseDto> {
    const file = await this.cameraFilesRepository.findById(id);

    if (!file) {
      throw new NotFoundException(`Camera file with id ${id} not found`);
    }

    return await this.mapToResponseDto(file);
  }

  async getStats(): Promise<CameraFilesStatsResponseDto> {
    const now = new Date();

    // Start of today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Start of this week (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Start of this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalFiles, uploadedToday, uploadedThisWeek, uploadedThisMonth, recentUploads] =
      await Promise.all([
        this.cameraFilesRepository.getTotalCount(),
        this.cameraFilesRepository.getCountByDateRange(todayStart, now),
        this.cameraFilesRepository.getCountByDateRange(weekStart, now),
        this.cameraFilesRepository.getCountByDateRange(monthStart, now),
        this.cameraFilesRepository.getUploadsByDay(7),
      ]);

    return {
      totalFiles,
      uploadedToday,
      uploadedThisWeek,
      uploadedThisMonth,
      recentUploads,
    };
  }

  private async mapToResponseDto(file: CameraFile): Promise<CameraFileResponseDto> {
    let imageUrl = '';

    if (file.gcsPath && this.gcsService.isConfigured()) {
      try {
        imageUrl = await this.gcsService.generateSignedUrl(file.gcsPath);
      } catch (error) {
        // Log error but don't fail the request
        console.error(`Failed to generate signed URL for ${file.gcsPath}:`, error);
      }
    }

    return {
      id: file._id.toString(),
      fileName: file.fileName,
      gcsPath: file.gcsPath,
      status: file.status,
      uploadedAt: file.uploadedAt,
      createdAt: file.createdAt,
      imageUrl,
    };
  }
}
