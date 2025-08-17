export enum ExportFormat {
  WEBM = 'webm',
  MP4 = 'mp4',
  PNG_SEQUENCE = 'png-sequence',
  JPEG_SEQUENCE = 'jpeg-sequence',
  GIF = 'gif',
  WEBP = 'webp',
}

export enum ExportQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

export interface ExportSettings {
  format: ExportFormat;
  quality: ExportQuality;
  frameRate: number;
  width?: number;
  height?: number;
  // Format-specific settings
  webmQuality?: number; // 0-1
  jpegQuality?: number; // 0-1
  pngCompression?: number; // 0-9
  gifColors?: number; // 2-256
  gifDither?: boolean;
}

export interface ExportProgress {
  current: number;
  total: number;
  percentage: number;
  stage: string;
  estimatedTimeRemaining?: number;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  format: ExportFormat;
  size: number;
  duration?: number;
}

export interface ExportEncoder {
  readonly format: ExportFormat;
  readonly supportedQualities: ExportQuality[];

  encode(settings: ExportSettings): Promise<ExportResult>;
  abort(): void;

  // Event handlers
  onProgress?: (progress: ExportProgress) => void;
  onError?: (error: Error) => void;
}

export interface BatchExportJob {
  id: string;
  settings: ExportSettings;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: ExportProgress;
  result?: ExportResult;
  error?: Error;
  createdAt: Date;
  completedAt?: Date;
}

export interface BatchExportOptions {
  concurrent?: number; // Number of concurrent exports
  onJobComplete?: (job: BatchExportJob) => void;
  onAllComplete?: (jobs: BatchExportJob[]) => void;
  onProgress?: (completedJobs: number, totalJobs: number) => void;
}

// Export presets for common use cases
export const EXPORT_PRESETS = {
  WEB_OPTIMIZED: {
    format: ExportFormat.WEBM,
    quality: ExportQuality.MEDIUM,
    frameRate: 30,
  },
  HIGH_QUALITY_VIDEO: {
    format: ExportFormat.WEBM,
    quality: ExportQuality.HIGH,
    frameRate: 60,
  },
  SOCIAL_MEDIA: {
    format: ExportFormat.MP4,
    quality: ExportQuality.MEDIUM,
    frameRate: 30,
  },
  ANIMATED_GIF: {
    format: ExportFormat.GIF,
    quality: ExportQuality.MEDIUM,
    frameRate: 24,
    gifColors: 128,
    gifDither: true,
  },
  IMAGE_SEQUENCE_PNG: {
    format: ExportFormat.PNG_SEQUENCE,
    quality: ExportQuality.HIGH,
    frameRate: 60,
    pngCompression: 6,
  },
  IMAGE_SEQUENCE_JPEG: {
    format: ExportFormat.JPEG_SEQUENCE,
    quality: ExportQuality.HIGH,
    frameRate: 60,
    jpegQuality: 0.9,
  },
} as const;

// Quality settings mapping
export const QUALITY_SETTINGS = {
  [ExportQuality.LOW]: {
    webmQuality: 0.6,
    jpegQuality: 0.6,
    pngCompression: 3,
    gifColors: 64,
  },
  [ExportQuality.MEDIUM]: {
    webmQuality: 0.8,
    jpegQuality: 0.8,
    pngCompression: 6,
    gifColors: 128,
  },
  [ExportQuality.HIGH]: {
    webmQuality: 0.9,
    jpegQuality: 0.9,
    pngCompression: 9,
    gifColors: 256,
  },
  [ExportQuality.ULTRA]: {
    webmQuality: 0.95,
    jpegQuality: 0.95,
    pngCompression: 9,
    gifColors: 256,
  },
} as const;
