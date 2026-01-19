import { Db, Collection } from 'mongodb';
import { FileRepository } from './fileRepository';

describe('FileRepository', () => {
    let mockCollection: jest.Mocked<Partial<Collection>>;
    let mockDb: jest.Mocked<Partial<Db>>;
    let repository: FileRepository;

    beforeEach(() => {
        mockCollection = {
            updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
        };

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
        };

        repository = new FileRepository(mockDb as Db);
    });

    describe('markUploaded', () => {
        it('should call updateOne with correct parameters', async () => {
            const data = {
                fileName: 'test-file.pdf',
                gcsPath: 'gs://bucket/test-file.pdf',
            };

            await repository.markUploaded(data);

            expect(mockDb.collection).toHaveBeenCalledWith('files');
            expect(mockCollection.updateOne).toHaveBeenCalledWith(
                { fileName: 'test-file.pdf' },
                {
                    $setOnInsert: {
                        createdAt: expect.any(Date),
                    },
                    $set: {
                        gcsPath: 'gs://bucket/test-file.pdf',
                        status: 'uploaded',
                        uploadedAt: expect.any(Date),
                    },
                },
                { upsert: true }
            );
        });

        it('should use upsert option', async () => {
            await repository.markUploaded({
                fileName: 'file.txt',
                gcsPath: 'gs://bucket/file.txt',
            });

            const updateOneCall = (mockCollection.updateOne as jest.Mock).mock.calls[0];
            const options = updateOneCall[2];

            expect(options.upsert).toBe(true);
        });

        it('should throw error if updateOne fails', async () => {
            (mockCollection.updateOne as jest.Mock).mockRejectedValue(
                new Error('Database error')
            );

            await expect(
                repository.markUploaded({
                    fileName: 'file.txt',
                    gcsPath: 'gs://bucket/file.txt',
                })
            ).rejects.toThrow('Database error');
        });
    });
});