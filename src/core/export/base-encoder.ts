import { type RawDoc, getSumDuration } from '../doc/raw-doc';
import { MovieRenderer } from '../renderer';
import { sleep } from '../../utils/sleep';
import {
  type ExportEncoder,
  type ExportSettings,
  type ExportResult,
  type ExportProgress,
  type ExportFormat,
  type ExportQuality,
  QUALITY_SETTINGS,
} from './types';

export abstract class BaseExportEncoder implements ExportEncoder {
  abstract readonly format: ExportFormat;
  abstract readonly supportedQualities: ExportQuality[];

  protected readonly renderer: MovieRenderer;
  protected readonly duration: number;
  protected readonly dedupeFrames: number[];
  protected aborted = false;

  // Event handlers
  onProgress?: (progress: ExportProgress) => void;
  onError?: (error: Error) => void;

  constructor(protected readonly doc: RawDoc) {
    const canvas = document.createElement('canvas');
    this.renderer = new MovieRenderer(canvas);
    this.renderer.setDoc(doc);
    this.duration = getSumDuration(doc);
    this.dedupeFrames = [];
  }

  abstract encode(settings: ExportSettings): Promise<ExportResult>;

  abort(): void {
    this.aborted = true;
  }

  protected async waitForRenderer(): Promise<void> {
    await this.renderer.readyPromise;
  }

  protected getFrameCount(frameRate: number): number {
    return Math.ceil((this.duration / 1000) * frameRate);
  }

  protected getFrameDuration(frameRate: number): number {
    return 1000 / frameRate;
  }

  protected getDedupeFrames(frameRate: number): number[] {
    const frameCount = this.getFrameCount(frameRate);
    const frameDuration = this.getFrameDuration(frameRate);
    const frames: number[] = [];

    for (let frame = 0; frame < frameCount; frame++) {
      const prevFrameTime = frameDuration * (frame - 1);
      const currentFrameTime = frameDuration * frame;
      const shouldReRender = this.renderer.shouldReRender(
        prevFrameTime,
        currentFrameTime,
      );

      if (shouldReRender) {
        frames.push(frame);
      }
    }

    return frames;
  }

  protected applyQualitySettings(
    settings: ExportSettings,
  ): Required<ExportSettings> {
    const qualityDefaults = QUALITY_SETTINGS[settings.quality];

    return {
      format: settings.format,
      quality: settings.quality,
      frameRate: settings.frameRate,
      width: settings.width || this.doc.width,
      height: settings.height || this.doc.height,
      webmQuality: settings.webmQuality ?? qualityDefaults.webmQuality,
      jpegQuality: settings.jpegQuality ?? qualityDefaults.jpegQuality,
      pngCompression: settings.pngCompression ?? qualityDefaults.pngCompression,
      gifColors: settings.gifColors ?? qualityDefaults.gifColors,
      gifDither: settings.gifDither ?? true,
    };
  }

  protected updateProgress(
    current: number,
    total: number,
    stage: string,
    startTime?: number,
  ): void {
    const percentage = Math.round((current / total) * 100);
    let estimatedTimeRemaining: number | undefined;

    if (startTime && current > 0) {
      const elapsed = performance.now() - startTime;
      const rate = current / elapsed;
      estimatedTimeRemaining = (total - current) / rate;
    }

    const progress: ExportProgress = {
      current,
      total,
      percentage,
      stage,
      estimatedTimeRemaining,
    };

    this.onProgress?.(progress);
  }

  protected async renderFrame(
    frameIndex: number,
    frameDuration: number,
  ): Promise<void> {
    const time = frameIndex * frameDuration;
    this.renderer.render(time);
    await sleep(0); // Allow UI updates

    if (this.aborted) {
      throw new Error('Export aborted');
    }
  }

  protected generateFilename(
    format: ExportFormat,
    quality: ExportQuality,
  ): string {
    const timestamp = Date.now();
    const qualityStr = quality !== ExportQuality.MEDIUM ? `-${quality}` : '';

    switch (format) {
      case ExportFormat.WEBM:
        return `animation${qualityStr}-${timestamp}.webm`;
      case ExportFormat.MP4:
        return `animation${qualityStr}-${timestamp}.mp4`;
      case ExportFormat.GIF:
        return `animation${qualityStr}-${timestamp}.gif`;
      case ExportFormat.WEBP:
        return `animation${qualityStr}-${timestamp}.webp`;
      case ExportFormat.PNG_SEQUENCE:
        return `animation${qualityStr}-${timestamp}.zip`;
      case ExportFormat.JPEG_SEQUENCE:
        return `animation${qualityStr}-${timestamp}.zip`;
      default:
        return `animation-${timestamp}`;
    }
  }

  protected checkAborted(): void {
    if (this.aborted) {
      throw new Error('Export aborted');
    }
  }
}
