import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CameraFilesService } from './camera-files.service';
import {
  ListCameraFilesDto,
  CameraFileResponseDto,
  CameraFilesListResponseDto,
  CameraFilesStatsResponseDto,
} from './dto/camera-files.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('camera-files')
@UseGuards(JwtAuthGuard)
export class CameraFilesController {
  constructor(private cameraFilesService: CameraFilesService) {}

  @Get()
  async findAll(@Query() dto: ListCameraFilesDto): Promise<CameraFilesListResponseDto> {
    return this.cameraFilesService.findAll(dto);
  }

  @Get('stats')
  async getStats(): Promise<CameraFilesStatsResponseDto> {
    return this.cameraFilesService.getStats();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<CameraFileResponseDto> {
    return this.cameraFilesService.findById(id);
  }
}
