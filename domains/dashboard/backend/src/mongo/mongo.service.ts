import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db } from 'mongodb';

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  private db: Db;
  private readonly logger = new Logger(MongoService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const uri = this.configService.get<string>('MONGODB_URI');

    if (!uri) {
      this.logger.warn('MONGODB_URI not configured, MongoDB connection disabled');
      return;
    }

    try {
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db();
      this.logger.log('Successfully connected to MongoDB');
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
      this.logger.log('MongoDB connection closed');
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected. Check MONGODB_URI configuration.');
    }
    return this.db;
  }

  isConnected(): boolean {
    return !!this.db;
  }
}
