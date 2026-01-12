import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import { config } from './config';
import { logger } from './logger';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function initMongo(): Promise<Db> {
    if (db) {
        return db;
    }

    client = new MongoClient(config.mongoUri, {
        maxPoolSize: 10,
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });

    logger.info('Connecting to MongoDB...');
    await client.connect();

    db = client.db();
    logger.info('MongoDB connected');

    return db;
}

export function getDb(): Db {
    if (!db) {
        throw new Error('MongoDB not initialized');
    }
    return db;
}

export async function closeMongo(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        db = null;
        logger.info('MongoDB connection closed');
    }
}
