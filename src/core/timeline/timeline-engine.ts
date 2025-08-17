import { getEasingFunction } from '../transition/easing';
import {
  type Timeline,
  // type TimelineTrack, // Unused for now
  type AnimationProperty,
  type Keyframe,
  InterpolationType,
  PropertyType,
  // PlaybackState, // Unused for now
} from './types';

export class TimelineEngine {
  private timeline: Timeline;
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;
  private playbackStartTime: number = 0;
  private playbackStartPosition: number = 0;

  constructor(timeline: Timeline) {
    this.timeline = timeline;
  }

  /**
   * Update the timeline reference
   */
  setTimeline(timeline: Timeline): void {
    this.timeline = timeline;
  }

  /**
   * Get the current timeline
   */
  getTimeline(): Timeline {
    return this.timeline;
  }

  /**
   * Calculate the interpolated value for a property at a specific time
   */
  getPropertyValueAtTime(property: AnimationProperty, time: number): unknown {
    const { keyframes, type, defaultValue } = property;

    if (keyframes.length === 0) {
      return defaultValue;
    }

    // Sort keyframes by time
    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);

    // If time is before first keyframe, return first keyframe value
    if (time <= sortedKeyframes[0].time) {
      return sortedKeyframes[0].value;
    }

    // If time is after last keyframe, return last keyframe value
    const lastKeyframe = sortedKeyframes[sortedKeyframes.length - 1];
    if (time >= lastKeyframe.time) {
      return lastKeyframe.value;
    }

    // Find the two keyframes to interpolate between
    let startKeyframe: Keyframe | null = null;
    let endKeyframe: Keyframe | null = null;

    for (let i = 0; i < sortedKeyframes.length - 1; i++) {
      if (
        time >= sortedKeyframes[i].time &&
        time <= sortedKeyframes[i + 1].time
      ) {
        startKeyframe = sortedKeyframes[i];
        endKeyframe = sortedKeyframes[i + 1];
        break;
      }
    }

    if (!startKeyframe || !endKeyframe) {
      return defaultValue;
    }

    // Calculate interpolation progress
    const duration = endKeyframe.time - startKeyframe.time;
    const elapsed = time - startKeyframe.time;
    let progress = duration > 0 ? elapsed / duration : 0;

    // Apply easing function
    if (startKeyframe.easing) {
      const easingFunction = getEasingFunction(startKeyframe.easing);
      progress = easingFunction(progress);
    }

    // Interpolate based on property type
    return this.interpolateValue(
      startKeyframe.value,
      endKeyframe.value,
      progress,
      type,
      startKeyframe.interpolation || InterpolationType.LINEAR,
    );
  }

  /**
   * Interpolate between two values based on property type
   */
  private interpolateValue(
    startValue: unknown,
    endValue: unknown,
    progress: number,
    type: PropertyType,
    interpolationType: InterpolationType,
  ): unknown {
    switch (interpolationType) {
      case InterpolationType.STEP:
        return progress < 1 ? startValue : endValue;

      case InterpolationType.HOLD:
        return startValue;

      case InterpolationType.LINEAR:
      case InterpolationType.BEZIER:
      default:
        return this.linearInterpolate(startValue, endValue, progress, type);
    }
  }

  /**
   * Linear interpolation for different property types
   */
  private linearInterpolate(
    startValue: unknown,
    endValue: unknown,
    progress: number,
    type: PropertyType,
  ): unknown {
    switch (type) {
      case PropertyType.NUMBER:
      case PropertyType.OPACITY:
      case PropertyType.ROTATION:
        return startValue + (endValue - startValue) * progress;

      case PropertyType.POSITION:
      case PropertyType.SCALE:
        return {
          x: startValue.x + (endValue.x - startValue.x) * progress,
          y: startValue.y + (endValue.y - startValue.y) * progress,
        };

      case PropertyType.COLOR:
        return this.interpolateColor(startValue, endValue, progress);

      case PropertyType.TEXT:
        return progress < 0.5 ? startValue : endValue;

      case PropertyType.BOOLEAN:
        return progress < 0.5 ? startValue : endValue;

      default:
        return progress < 0.5 ? startValue : endValue;
    }
  }

  /**
   * Interpolate between two colors
   */
  private interpolateColor(
    startColor: string,
    endColor: string,
    progress: number,
  ): string {
    // Simple RGB interpolation
    const start = this.hexToRgb(startColor);
    const end = this.hexToRgb(endColor);

    if (!start || !end) {
      return progress < 0.5 ? startColor : endColor;
    }

    const r = Math.round(start.r + (end.r - start.r) * progress);
    const g = Math.round(start.g + (end.g - start.g) * progress);
    const b = Math.round(start.b + (end.b - start.b) * progress);

    return this.rgbToHex(r, g, b);
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * Convert RGB to hex color
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  /**
   * Get all animated values at a specific time
   */
  getAnimationStateAtTime(
    time: number,
  ): Record<string, Record<string, unknown>> {
    const state: Record<string, Record<string, unknown>> = {};

    for (const track of this.timeline.tracks) {
      if (!track.enabled) continue;

      state[track.id] = {};

      for (const property of track.properties) {
        state[track.id][property.id] = this.getPropertyValueAtTime(
          property,
          time,
        );
      }
    }

    return state;
  }

  /**
   * Add a keyframe to a property
   */
  addKeyframe(trackId: string, propertyId: string, keyframe: Keyframe): void {
    const track = this.timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const property = track.properties.find((p) => p.id === propertyId);
    if (!property) return;

    // Remove existing keyframe at the same time
    property.keyframes = property.keyframes.filter(
      (k) => k.time !== keyframe.time,
    );

    // Add new keyframe
    property.keyframes.push(keyframe);

    // Sort keyframes by time
    property.keyframes.sort((a, b) => a.time - b.time);
  }

  /**
   * Remove a keyframe from a property
   */
  removeKeyframe(
    trackId: string,
    propertyId: string,
    keyframeId: string,
  ): void {
    const track = this.timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const property = track.properties.find((p) => p.id === propertyId);
    if (!property) return;

    property.keyframes = property.keyframes.filter((k) => k.id !== keyframeId);
  }

  /**
   * Update a keyframe's value
   */
  updateKeyframe(
    trackId: string,
    propertyId: string,
    keyframeId: string,
    updates: Partial<Keyframe>,
  ): void {
    const track = this.timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const property = track.properties.find((p) => p.id === propertyId);
    if (!property) return;

    const keyframe = property.keyframes.find((k) => k.id === keyframeId);
    if (!keyframe) return;

    Object.assign(keyframe, updates);

    // Re-sort if time was changed
    if (updates.time !== undefined) {
      property.keyframes.sort((a, b) => a.time - b.time);
    }
  }

  /**
   * Get keyframes within a time range
   */
  getKeyframesInRange(startTime: number, endTime: number): Keyframe[] {
    const keyframes: Keyframe[] = [];

    for (const track of this.timeline.tracks) {
      for (const property of track.properties) {
        for (const keyframe of property.keyframes) {
          if (keyframe.time >= startTime && keyframe.time <= endTime) {
            keyframes.push(keyframe);
          }
        }
      }
    }

    return keyframes.sort((a, b) => a.time - b.time);
  }

  /**
   * Set the current time and update animation state
   */
  setCurrentTime(time: number): void {
    this.timeline.currentTime = Math.max(
      0,
      Math.min(time, this.timeline.duration),
    );
  }

  /**
   * Get the current animation state
   */
  getCurrentAnimationState(): Record<string, Record<string, unknown>> {
    return this.getAnimationStateAtTime(this.timeline.currentTime);
  }
}
