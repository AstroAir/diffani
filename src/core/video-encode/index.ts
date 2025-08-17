import WebMWriter from 'webm-writer';
import { getSumDuration, type RawDoc } from '../doc/raw-doc';
import { MovieRenderer } from '../renderer';
import { sleep } from '../../utils/sleep';

interface VideoEncodeOptions {
  frameRate?: number;
  onProgress?: (progress: number) => void;
  onFPSUpdate?: (actualFPS: number, frameDrops: number) => void;
}

export class VideoEncoder {
  readonly renderer: MovieRenderer;

  readonly duration: number;

  readonly dedupeFrames: number[];

  private aborted = false;

  private frameDrops = 0;

  private lastFPSUpdate = 0;

  private encodedFrameCount = 0;

  constructor(
    private readonly doc: RawDoc,
    private readonly options: VideoEncodeOptions = {},
  ) {
    const canvas = document.createElement('canvas');
    const renderer = new MovieRenderer(canvas);

    renderer.setDoc(doc);

    this.renderer = renderer;
    this.duration = getSumDuration(doc);
    this.dedupeFrames = this.getDedupeFrames();
  }

  private get frameRate() {
    return this.options.frameRate ?? 60;
  }

  private get frameCount() {
    return (this.duration / 1000) * this.frameRate;
  }

  private get frameDuration() {
    return 1000 / this.frameRate;
  }

  /**
   * Dedupe frames index
   */
  private getDedupeFrames(): number[] {
    const { renderer } = this;
    const frames: number[] = [];

    for (let frame = 0; frame < this.frameCount; frame++) {
      const prevFrameTime = this.frameDuration * (frame - 1);
      const currentFrameTime = this.frameDuration * frame;
      const shouldReRender = renderer.shouldReRender(
        prevFrameTime,
        currentFrameTime,
      );

      if (shouldReRender) {
        frames.push(frame);
      }
    }

    return frames;
  }

  async encode(): Promise<Blob> {
    const { renderer, frameCount, frameDuration, dedupeFrames } = this;
    await renderer.readyPromise;
    const { onProgress, onFPSUpdate } = this.options;
    const writer = new WebMWriter({
      quality: 0.9,
      frameDuration,
      frameRate: this.frameRate,
      transparent: true,
    });

    console.time('encode');
    const startTime = performance.now();
    this.encodedFrameCount = 0;
    this.frameDrops = 0;
    this.lastFPSUpdate = startTime;

    for (let i = 0; i < dedupeFrames.length; i++) {
      const frameIndex = dedupeFrames[i];
      const time = frameIndex * frameDuration;
      const n =
        i === dedupeFrames.length - 1
          ? frameCount - frameIndex
          : dedupeFrames[i + 1] - frameIndex;

      const frameStartTime = performance.now();
      renderer.render(time);

      console.log('add frame', frameIndex, n, time);

      writer.addFrame(renderer.canvas, n * frameDuration);
      this.encodedFrameCount++;

      // Calculate actual FPS and frame drops
      const frameEndTime = performance.now();
      const frameRenderTime = frameEndTime - frameStartTime;
      const targetFrameTime = 1000 / this.frameRate;

      if (frameRenderTime > targetFrameTime * 1.5) {
        this.frameDrops++;
      }

      // Update FPS monitoring every 500ms
      if (frameEndTime - this.lastFPSUpdate > 500) {
        const actualFPS =
          this.encodedFrameCount / ((frameEndTime - startTime) / 1000);
        if (onFPSUpdate) {
          onFPSUpdate(actualFPS, this.frameDrops);
        }
        this.lastFPSUpdate = frameEndTime;
      }

      if (onProgress !== undefined) {
        onProgress(i / dedupeFrames.length);
      }

      await sleep(0);
      if (this.aborted) {
        throw new Error('Aborted');
      }
    }
    console.timeEnd('encode');

    const blob = await writer.complete();

    return blob;
  }

  abort() {
    this.aborted = true;
  }
}
