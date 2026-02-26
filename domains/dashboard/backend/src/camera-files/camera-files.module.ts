import { Module } from '@nestjs/common';
import { CameraFilesController } from './camera-files.controller';
import { CameraFilesService } from './camera-files.service';
import { CameraFilesRepository } from './camera-files.repository';

@Module({
  controllers: [CameraFilesController],
  providers: [CameraFilesService, CameraFilesRepository],
  exports: [CameraFilesService],
})
export class CameraFilesModule {}
