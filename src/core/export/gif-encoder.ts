// @ts-expect-error - gif.js types are not available - gif.js doesn't have proper TypeScript definitions
import GIF from 'gif.js';
import { BaseExportEncoder } from './base-encoder';
import {
  type ExportSettings,
  type ExportResult,
  ExportFormat,
  ExportQuality,
} from './types';

export class GIFEncoder extends BaseExportEncoder {
  readonly format = ExportFormat.GIF;
  readonly supportedQualities = [
    ExportQuality.LOW,
    ExportQuality.MEDIUM,
    ExportQuality.HIGH,
    ExportQuality.ULTRA,
  ];

  async encode(settings: ExportSettings): Promise<ExportResult> {
    await this.waitForRenderer();

    const appliedSettings = this.applyQualitySettings(settings);
    const { frameRate, gifColors, gifDither } = appliedSettings;

    const frameCount = this.getFrameCount(frameRate);
    const frameDuration = this.getFrameDuration(frameRate);
    const dedupeFrames = this.getDedupeFrames(frameRate);

    const gif = new GIF({
      workers: 2,
      quality: this.getGIFQuality(settings.quality),
      width: this.doc.width,
      height: this.doc.height,
      workerScript: this.getWorkerScript(),
      dither: gifDither,
      globalPalette: false,
      colors: gifColors,
    });

    const startTime = performance.now();
    this.updateProgress(
      0,
      dedupeFrames.length,
      'Initializing GIF export',
      startTime,
    );

    // Set up progress tracking for GIF generation
    gif.on('progress', (progress: number) => {
      this.updateProgress(
        Math.round(progress * dedupeFrames.length),
        dedupeFrames.length,
        'Generating GIF',
        startTime,
      );
    });

    // Add frames to GIF
    for (let i = 0; i < dedupeFrames.length; i++) {
      this.checkAborted();

      const frameIndex = dedupeFrames[i];
      const nextFrameIndex =
        i < dedupeFrames.length - 1 ? dedupeFrames[i + 1] : frameCount;
      const delay = (nextFrameIndex - frameIndex) * frameDuration;

      await this.renderFrame(frameIndex, frameDuration);

      // Create a copy of the canvas for the GIF frame
      const frameCanvas = this.copyCanvas(this.renderer.canvas);
      gif.addFrame(frameCanvas, { delay });

      this.updateProgress(
        i + 1,
        dedupeFrames.length,
        'Adding frames',
        startTime,
      );
    }

    // Render the GIF
    return new Promise((resolve, reject) => {
      gif.on('finished', (blob: Blob) => {
        const filename = this.generateFilename(this.format, settings.quality);
        resolve({
          blob,
          filename,
          format: this.format,
          size: blob.size,
          duration: this.duration,
        });
      });

      gif.on('error', (error: Error) => {
        reject(error);
      });

      gif.render();
    });
  }

  private getGIFQuality(quality: ExportQuality): number {
    switch (quality) {
      case ExportQuality.LOW:
        return 20;
      case ExportQuality.MEDIUM:
        return 10;
      case ExportQuality.HIGH:
        return 5;
      case ExportQuality.ULTRA:
        return 1;
      default:
        return 10;
    }
  }

  private copyCanvas(originalCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const copyCanvas = document.createElement('canvas');
    const copyContext = copyCanvas.getContext('2d');

    if (!copyContext) {
      throw new Error('Failed to get 2D context for canvas copy');
    }

    copyCanvas.width = originalCanvas.width;
    copyCanvas.height = originalCanvas.height;
    copyContext.drawImage(originalCanvas, 0, 0);

    return copyCanvas;
  }

  private getWorkerScript(): string {
    // Return the path to the gif.js worker script
    // In a real implementation, you might need to configure this based on your build setup
    return '/node_modules/gif.js/dist/gif.worker.js';
  }
}
