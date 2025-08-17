import { easeQuadInOut } from 'd3-ease';
import { clamp01 } from '../../utils/number';
import { type Position } from '../../types/base';
import {
  // type EasingFunction, // Unused for now
  getEasingFunction,
  DEFAULT_EASING,
} from './easing';

export interface TransitionState {
  /** 0 - 1 */
  outProgress: number;
  /** 0 - 1 */
  inProgress: number;
  /** 0 - 1 */
  moveProgress: number;
}

export enum TransitionEffectType {
  FADE = 'fade',
  CROSSFADE = 'crossfade',
  SLIDE_LEFT = 'slideLeft',
  SLIDE_RIGHT = 'slideRight',
  SLIDE_UP = 'slideUp',
  SLIDE_DOWN = 'slideDown',
  SCALE = 'scale',
  ZOOM_IN = 'zoomIn',
  ZOOM_OUT = 'zoomOut',
}

export interface TransitionConfig {
  outDurationProportion: number;
  moveDurationProportion: number;
  inDurationProportion: number;
  ease: (progress: number) => number;
  easingId?: string;
  effectType?: TransitionEffectType;
  // Effect-specific settings
  slideDistance?: number; // For slide effects
  scaleAmount?: number; // For scale effects
  fadeOpacity?: number; // For fade effects
}

export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  outDurationProportion: 0.5,
  moveDurationProportion: 1.0,
  inDurationProportion: 0.5,
  ease: easeQuadInOut,
  easingId: DEFAULT_EASING,
  effectType: TransitionEffectType.FADE,
  slideDistance: 50,
  scaleAmount: 0.8,
  fadeOpacity: 0.0,
};

/**
 * The transition is divided into three steps:
 * 1. The deleted contents fade away.
 * 2. The unchanged contents move from their original positions to target positions.
 * 3. The added contents fade in.
 * There may be overlapping in time between adjacent steps.
 *
 * @param totalDuration
 * @param currentTime
 */
export function computeTransitionState(
  progress: number,
  config: TransitionConfig = DEFAULT_TRANSITION_CONFIG,
): TransitionState {
  const MOVE_START_PROPORTION =
    (1 - config.outDurationProportion - config.inDurationProportion) / 2 +
    config.outDurationProportion -
    config.moveDurationProportion / 2;

  // Use the specified easing function or fall back to the default
  const easingFunc = config.easingId
    ? getEasingFunction(config.easingId)
    : config.ease;

  const clampProgressAndEase = (progress: number) =>
    easingFunc(clamp01(progress));

  return {
    outProgress: clampProgressAndEase(progress / config.outDurationProportion),
    inProgress: clampProgressAndEase(
      (progress - (1 - config.inDurationProportion)) /
        config.inDurationProportion,
    ),
    moveProgress: clampProgressAndEase(
      (progress - MOVE_START_PROPORTION) / config.moveDurationProportion,
    ),
  };
}

export function applyTransition(
  progress: number,
  from: number,
  to: number,
  ease = easeQuadInOut,
) {
  return from + (to - from) * ease(progress);
}

export function applyPositionTransition(
  progress: number,
  from: Position,
  to: Position,
): Position {
  return {
    x: applyTransition(progress, from.x, to.x),
    y: applyTransition(progress, from.y, to.y),
  };
}

/**
 * Apply transition effects based on the effect type
 */
export function applyTransitionEffect(
  progress: number,
  config: TransitionConfig,
  basePosition: Position,
  targetPosition: Position,
): {
  position: Position;
  alpha: number;
  scale: number;
} {
  const effectType = config.effectType || TransitionEffectType.FADE;
  const slideDistance = config.slideDistance || 50;
  const scaleAmount = config.scaleAmount || 0.8;
  // const fadeOpacity = config.fadeOpacity || 0.0; // Unused for now

  const position = applyPositionTransition(
    progress,
    basePosition,
    targetPosition,
  );
  let alpha = 1;
  let scale = 1;

  switch (effectType) {
    case TransitionEffectType.FADE:
      alpha = progress;
      break;

    case TransitionEffectType.CROSSFADE:
      alpha = progress;
      break;

    case TransitionEffectType.SLIDE_LEFT:
      position.x = targetPosition.x + (1 - progress) * slideDistance;
      alpha = progress;
      break;

    case TransitionEffectType.SLIDE_RIGHT:
      position.x = targetPosition.x - (1 - progress) * slideDistance;
      alpha = progress;
      break;

    case TransitionEffectType.SLIDE_UP:
      position.y = targetPosition.y + (1 - progress) * slideDistance;
      alpha = progress;
      break;

    case TransitionEffectType.SLIDE_DOWN:
      position.y = targetPosition.y - (1 - progress) * slideDistance;
      alpha = progress;
      break;

    case TransitionEffectType.SCALE:
      scale = scaleAmount + (1 - scaleAmount) * progress;
      alpha = progress;
      break;

    case TransitionEffectType.ZOOM_IN:
      scale = progress;
      alpha = progress;
      break;

    case TransitionEffectType.ZOOM_OUT:
      scale = 2 - progress;
      alpha = progress;
      break;

    default:
      alpha = progress;
      break;
  }

  return { position, alpha, scale };
}
