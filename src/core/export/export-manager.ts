import { type RawDoc } from '../doc/raw-doc';
import { WebMEncoder } from './webm-encoder';
import {
  PNGSequenceEncoder,
  JPEGSequenceEncoder,
} from './image-sequence-encoder';
import { GIFEncoder } from './gif-encoder';
import {
  type ExportEncoder,
  type ExportSettings,
  type ExportResult,
  type ExportProgress,
  type BatchExportJob,
  type BatchExportOptions,
  ExportFormat,
} from './types';

export class ExportManager {
  private encoders: Map<ExportFormat, () => ExportEncoder> = new Map();
  private activeExports: Map<string, ExportEncoder> = new Map();

  constructor(private readonly doc: RawDoc) {
    this.registerEncoders();
  }

  private registerEncoders(): void {
    this.encoders.set(ExportFormat.WEBM, () => new WebMEncoder(this.doc));
    this.encoders.set(
      ExportFormat.PNG_SEQUENCE,
      () => new PNGSequenceEncoder(this.doc),
    );
    this.encoders.set(
      ExportFormat.JPEG_SEQUENCE,
      () => new JPEGSequenceEncoder(this.doc),
    );
    this.encoders.set(ExportFormat.GIF, () => new GIFEncoder(this.doc));

    // Note: MP4 and WEBP encoders would be added here when implemented
    // this.encoders.set(ExportFormat.MP4, () => new MP4Encoder(this.doc));
    // this.encoders.set(ExportFormat.WEBP, () => new WebPEncoder(this.doc));
  }

  getSupportedFormats(): ExportFormat[] {
    return Array.from(this.encoders.keys());
  }

  getEncoder(format: ExportFormat): ExportEncoder | null {
    const encoderFactory = this.encoders.get(format);
    return encoderFactory ? encoderFactory() : null;
  }

  async export(
    settings: ExportSettings,
    onProgress?: (progress: ExportProgress) => void,
  ): Promise<ExportResult> {
    const encoder = this.getEncoder(settings.format);

    if (!encoder) {
      throw new Error(`Unsupported export format: ${settings.format}`);
    }

    const exportId = this.generateExportId();
    this.activeExports.set(exportId, encoder);

    try {
      if (onProgress) {
        encoder.onProgress = onProgress;
      }

      const result = await encoder.encode(settings);
      return result;
    } finally {
      this.activeExports.delete(exportId);
    }
  }

  async batchExport(
    jobs: ExportSettings[],
    options: BatchExportOptions = {},
  ): Promise<BatchExportJob[]> {
    const {
      concurrent = 1,
      onJobComplete,
      onAllComplete,
      onProgress,
    } = options;

    const batchJobs: BatchExportJob[] = jobs.map((settings, index) => ({
      id: `batch-${Date.now()}-${index}`,
      settings,
      status: 'pending',
      createdAt: new Date(),
    }));

    let completedJobs = 0;
    const runningJobs: Promise<void>[] = [];

    const processJob = async (job: BatchExportJob): Promise<void> => {
      try {
        job.status = 'running';

        const result = await this.export(job.settings, (progress) => {
          job.progress = progress;
        });

        job.result = result;
        job.status = 'completed';
        job.completedAt = new Date();
      } catch (error) {
        job.error = error as Error;
        job.status = 'failed';
        job.completedAt = new Date();
      }

      completedJobs++;
      onJobComplete?.(job);
      onProgress?.(completedJobs, batchJobs.length);
    };

    // Process jobs with concurrency limit
    for (const job of batchJobs) {
      if (runningJobs.length >= concurrent) {
        await Promise.race(runningJobs);
        // Remove completed jobs from running array
        for (let i = runningJobs.length - 1; i >= 0; i--) {
          const jobPromise = runningJobs[i];
          if (
            (await Promise.race([jobPromise, Promise.resolve('pending')])) !==
            'pending'
          ) {
            runningJobs.splice(i, 1);
          }
        }
      }

      const jobPromise = processJob(job);
      runningJobs.push(jobPromise);
    }

    // Wait for all remaining jobs to complete
    await Promise.all(runningJobs);

    onAllComplete?.(batchJobs);
    return batchJobs;
  }

  abortExport(exportId?: string): void {
    if (exportId) {
      const encoder = this.activeExports.get(exportId);
      if (encoder) {
        encoder.abort();
        this.activeExports.delete(exportId);
      }
    } else {
      // Abort all active exports
      for (const [id, encoder] of this.activeExports) {
        encoder.abort();
        this.activeExports.delete(id);
      }
    }
  }

  abortBatchExport(jobs: BatchExportJob[]): void {
    for (const job of jobs) {
      if (job.status === 'running') {
        job.status = 'cancelled';
      }
    }
    this.abortExport(); // Abort all active exports
  }

  getActiveExportCount(): number {
    return this.activeExports.size;
  }

  private generateExportId(): string {
    return `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
