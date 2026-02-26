import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from "./prisma/prisma.module";
import { MongoModule } from "./mongo/mongo.module";
import { GcsModule } from "./gcs/gcs.module";
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from "./auth/auth.module";
import { CameraFilesModule } from "./camera-files/camera-files.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    MongoModule,
    GcsModule,
    AuthModule,
    CameraFilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
