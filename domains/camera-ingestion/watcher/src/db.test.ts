jest.mock('./config', () => ({
  config: { mongoUri: 'mongodb://test-uri' },
}));
jest.mock('./logger', () => ({
  logger: { info: jest.fn() },
}));

describe('initMongo', () => {
  let mockConnect: jest.Mock;
  let mockDb: jest.Mock;
  let mockDbInstance: object;

  beforeEach(() => {
    jest.resetModules();

    mockDbInstance = { collection: jest.fn() };
    mockConnect = jest.fn().mockResolvedValue(undefined);
    mockDb = jest.fn().mockReturnValue(mockDbInstance);

    jest.doMock('mongodb', () => ({
      MongoClient: jest.fn().mockImplementation(() => ({
        connect: mockConnect,
        db: mockDb,
      })),
      ServerApiVersion: { v1: '1' },
    }));
  });

  it('should connect to MongoDB with correct config', async () => {
    const { MongoClient } = await import('mongodb');
    const { initMongo } = await import('./db');

    await initMongo();

    expect(MongoClient).toHaveBeenCalledWith('mongodb://test-uri', {
      maxPoolSize: 10,
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      },
    });
    expect(mockConnect).toHaveBeenCalled();
  });

  it('should return db instance', async () => {
    const { initMongo } = await import('./db');

    const result = await initMongo();

    expect(result).toBe(mockDbInstance);
  });

  it('should log connection messages', async () => {
    const { logger } = await import('./logger');
    const { initMongo } = await import('./db');

    await initMongo();

    expect(logger.info).toHaveBeenCalledWith('Connecting to MongoDB...');
    expect(logger.info).toHaveBeenCalledWith('MongoDB connected');
  });

  it('should return cached db on subsequent calls', async () => {
    const { MongoClient } = await import('mongodb');
    const { initMongo } = await import('./db');

    const first = await initMongo();
    const second = await initMongo();

    expect(first).toBe(second);
    expect(first).toBe(mockDbInstance);
    expect(MongoClient).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('should throw error if connection fails', async () => {
    mockConnect.mockRejectedValue(new Error('Connection failed'));
    const { initMongo } = await import('./db');

    await expect(initMongo()).rejects.toThrow('Connection failed');
  });
});
