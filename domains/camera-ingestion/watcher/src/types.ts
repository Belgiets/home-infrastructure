export interface WatcherConfig {
    watchDir: string;
    gcsBucket: string;
    gcsProjectId?: string;
    deleteAfterUpload: boolean;
    logLevel: string;
    debounceTime: number;
}

export interface FileUploadResult {
    success: boolean;
    filePath: string;
    gcsPath: string;
    error?: Error;
    uploadedAt: Date;
}

export interface WatcherStats {
    filesProcessed: number;
    filesUploaded: number;
    filesFailed: number;
    startTime: Date;
}