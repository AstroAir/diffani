import JSZip from 'jszip';
import { BaseExportEncoder } from './base-encoder';
import {
  type ExportSettings,
  type ExportResult,
  ExportFormat,
  ExportQuality,
} from './types';

export class ImageSequenceEncoder extends BaseExportEncoder {
  readonly format: ExportFormat;
  readonly supportedQualities = [
    ExportQuality.LOW,
    ExportQuality.MEDIUM,
    ExportQuality.HIGH,
    ExportQuality.ULTRA,
  ];

  constructor(
    doc: unknown,
    format: ExportFormat.PNG_SEQUENCE | ExportFormat.JPEG_SEQUENCE,
  ) {
    super(doc);
    this.format = format;
  }

  async encode(settings: ExportSettings): Promise<ExportResult> {
    await this.waitForRenderer();

    const appliedSettings = this.applyQualitySettings(settings);
    const { frameRate, jpegQuality, pngCompression } = appliedSettings;

    // const frameCount = this.getFrameCount(frameRate); // Unused for now
    const frameDuration = this.getFrameDuration(frameRate);
    const dedupeFrames = this.getDedupeFrames(frameRate);

    const zip = new JSZip();
    const startTime = performance.now();

    this.updateProgress(
      0,
      dedupeFrames.length,
      'Initializing export',
      startTime,
    );

    const isJPEG = this.format === ExportFormat.JPEG_SEQUENCE;
    const mimeType = isJPEG ? 'image/jpeg' : 'image/png';
    const extension = isJPEG ? 'jpg' : 'png';

    // Add metadata file
    const metadata = {
      format: this.format,
      frameRate,
      frameCount: dedupeFrames.length,
      duration: this.duration,
      width: this.doc.width,
      height: this.doc.height,
      quality: settings.quality,
      createdAt: new Date().toISOString(),
    };

    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    for (let i = 0; i < dedupeFrames.length; i++) {
      this.checkAborted();

      const frameIndex = dedupeFrames[i];
      await this.renderFrame(frameIndex, frameDuration);

      // Convert canvas to blob
      const blob = await this.canvasToBlob(
        mimeType,
        isJPEG ? jpegQuality : undefined,
      );

      // Add to zip with zero-padded filename
      const paddedIndex = String(i).padStart(6, '0');
      const filename = `frame_${paddedIndex}.${extension}`;

      zip.file(filename, blob);

      this.updateProgress(
        i + 1,
        dedupeFrames.length,
        `Capturing frame ${i + 1}`,
        startTime,
      );
    }

    this.updateProgress(
      dedupeFrames.length,
      dedupeFrames.length,
      'Creating archive',
      startTime,
    );

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: pngCompression,
      },
    });

    const filename = this.generateFilename(this.format, settings.quality);

    return {
      blob: zipBlob,
      filename,
      format: this.format,
      size: zipBlob.size,
      duration: this.duration,
    };
  }

  private canvasToBlob(mimeType: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.renderer.canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        mimeType,
        quality,
      );
    });
  }
}

// Factory functions for specific formats
export class PNGSequenceEncoder extends ImageSequenceEncoder {
  constructor(doc: unknown) {
    super(doc, ExportFormat.PNG_SEQUENCE);
  }
}

export class JPEGSequenceEncoder extends ImageSequenceEncoder {
  constructor(doc: unknown) {
    super(doc, ExportFormat.JPEG_SEQUENCE);
  }
}
