import { Db } from 'mongodb';

export class FileRepository {
    constructor(private readonly db: Db) {}

    async markUploaded(data: {
        fileName: string;
        gcsPath: string;
    }) {
        await this.db.collection('files').updateOne(
            { fileName: data.fileName },
            {
                $setOnInsert: {
                    createdAt: new Date(),
                },
                $set: {
                    gcsPath: data.gcsPath,
                    status: 'uploaded',
                    uploadedAt: new Date(),
                },
            },
            { upsert: true }
        );
    }
}
