import { IsOptional, IsInt, Min, Max, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListCameraFilesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class CameraFileResponseDto {
  id: string;
  fileName: string;
  gcsPath: string;
  status: string;
  uploadedAt: Date;
  createdAt: Date;
  imageUrl: string; // Signed GCS URL (1 hour expiry)
}

export class CameraFilesListResponseDto {
  data: CameraFileResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CameraFilesStatsResponseDto {
  totalFiles: number;
  uploadedToday: number;
  uploadedThisWeek: number;
  uploadedThisMonth: number;
  recentUploads: { date: string; count: number }[];
}
