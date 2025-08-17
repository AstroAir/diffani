import WebMWriter from 'webm-writer';
import { BaseExportEncoder } from './base-encoder';
import {
  type ExportSettings,
  type ExportResult,
  ExportFormat,
  ExportQuality,
} from './types';

export class WebMEncoder extends BaseExportEncoder {
  readonly format = ExportFormat.WEBM;
  readonly supportedQualities = [
    ExportQuality.LOW,
    ExportQuality.MEDIUM,
    ExportQuality.HIGH,
    ExportQuality.ULTRA,
  ];

  async encode(settings: ExportSettings): Promise<ExportResult> {
    await this.waitForRenderer();

    const appliedSettings = this.applyQualitySettings(settings);
    const { frameRate, webmQuality, width, height } = appliedSettings;

    const frameCount = this.getFrameCount(frameRate);
    const frameDuration = this.getFrameDuration(frameRate);
    const dedupeFrames = this.getDedupeFrames(frameRate);

    const writer = new WebMWriter({
      quality: webmQuality,
      frameDuration,
      frameRate,
      transparent: true,
    });

    const startTime = performance.now();
    this.updateProgress(
      0,
      dedupeFrames.length,
      'Initializing export',
      startTime,
    );

    // Resize canvas if needed
    if (width !== this.doc.width || height !== this.doc.height) {
      // Note: This would require renderer modifications to support resizing
      console.warn('Canvas resizing not yet implemented');
    }

    for (let i = 0; i < dedupeFrames.length; i++) {
      this.checkAborted();

      const frameIndex = dedupeFrames[i];
      // const time = frameIndex * frameDuration; // Unused for now
      const n =
        i === dedupeFrames.length - 1
          ? frameCount - frameIndex
          : dedupeFrames[i + 1] - frameIndex;

      await this.renderFrame(frameIndex, frameDuration);
      writer.addFrame(this.renderer.canvas, n * frameDuration);

      this.updateProgress(
        i + 1,
        dedupeFrames.length,
        'Encoding frames',
        startTime,
      );
    }

    this.updateProgress(
      dedupeFrames.length,
      dedupeFrames.length,
      'Finalizing',
      startTime,
    );

    const blob = await writer.complete();
    const filename = this.generateFilename(this.format, settings.quality);

    return {
      blob,
      filename,
      format: this.format,
      size: blob.size,
      duration: this.duration,
    };
  }
}
