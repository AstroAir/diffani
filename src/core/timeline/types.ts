export interface Keyframe {
  id: string;
  time: number; // Time in milliseconds
  value: unknown; // The value at this keyframe
  easing?: string; // Easing function to use from this keyframe to the next
  interpolation?: InterpolationType;
}

export enum InterpolationType {
  LINEAR = 'linear',
  BEZIER = 'bezier',
  STEP = 'step',
  HOLD = 'hold',
}

export interface AnimationProperty {
  id: string;
  name: string;
  type: PropertyType;
  keyframes: Keyframe[];
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
}

export enum PropertyType {
  NUMBER = 'number',
  COLOR = 'color',
  POSITION = 'position',
  SCALE = 'scale',
  ROTATION = 'rotation',
  OPACITY = 'opacity',
  TEXT = 'text',
  BOOLEAN = 'boolean',
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  properties: AnimationProperty[];
  enabled: boolean;
  locked: boolean;
  collapsed: boolean;
  color?: string;
}

export enum TrackType {
  TRANSFORM = 'transform',
  APPEARANCE = 'appearance',
  TEXT = 'text',
  EFFECTS = 'effects',
  AUDIO = 'audio',
}

export interface Timeline {
  id: string;
  name: string;
  duration: number; // Total duration in milliseconds
  currentTime: number;
  playbackRate: number;
  tracks: TimelineTrack[];
  markers: TimelineMarker[];
  loop: boolean;
  autoPlay: boolean;
}

export interface TimelineMarker {
  id: string;
  time: number;
  name: string;
  color?: string;
  type: MarkerType;
}

export enum MarkerType {
  BOOKMARK = 'bookmark',
  SECTION = 'section',
  CUE = 'cue',
  WARNING = 'warning',
}

export interface TimelineState {
  timeline: Timeline;
  selectedKeyframes: string[];
  selectedTracks: string[];
  selectedProperties: string[];
  playbackState: PlaybackState;
  viewportStart: number; // Start time of visible timeline area
  viewportEnd: number; // End time of visible timeline area
  snapToGrid: boolean;
  gridSize: number; // Grid size in milliseconds
  showGrid: boolean;
  showRuler: boolean;
}

export enum PlaybackState {
  STOPPED = 'stopped',
  PLAYING = 'playing',
  PAUSED = 'paused',
  SCRUBBING = 'scrubbing',
}

export interface KeyframeInterpolationOptions {
  type: InterpolationType;
  tension?: number; // For bezier curves
  bias?: number; // For bezier curves
  continuity?: number; // For bezier curves
  customEasing?: string; // Custom easing function ID
}

export interface TimelineAction {
  type: TimelineActionType;
  payload: unknown;
  timestamp: number;
  undoable: boolean;
}

export enum TimelineActionType {
  ADD_KEYFRAME = 'ADD_KEYFRAME',
  REMOVE_KEYFRAME = 'REMOVE_KEYFRAME',
  MOVE_KEYFRAME = 'MOVE_KEYFRAME',
  UPDATE_KEYFRAME_VALUE = 'UPDATE_KEYFRAME_VALUE',
  ADD_TRACK = 'ADD_TRACK',
  REMOVE_TRACK = 'REMOVE_TRACK',
  ADD_PROPERTY = 'ADD_PROPERTY',
  REMOVE_PROPERTY = 'REMOVE_PROPERTY',
  SET_CURRENT_TIME = 'SET_CURRENT_TIME',
  SET_PLAYBACK_STATE = 'SET_PLAYBACK_STATE',
  ADD_MARKER = 'ADD_MARKER',
  REMOVE_MARKER = 'REMOVE_MARKER',
  ZOOM_TIMELINE = 'ZOOM_TIMELINE',
  PAN_TIMELINE = 'PAN_TIMELINE',
}

/* Default timeline configuration */
export const DEFAULT_TIMELINE_CONFIG = {
  duration: 10000, // 10 seconds
  playbackRate: 1.0,
  gridSize: 100, // 100ms grid
  snapToGrid: true,
  showGrid: true,
  showRuler: true,
  autoSave: true,
  maxUndoSteps: 50,
} as const;

/* Common animation property presets */
export const ANIMATION_PROPERTY_PRESETS = {
  OPACITY: {
    type: PropertyType.OPACITY,
    defaultValue: 1,
    min: 0,
    max: 1,
    step: 0.01,
  },
  SCALE: {
    type: PropertyType.SCALE,
    defaultValue: { x: 1, y: 1 },
    min: 0,
    max: 5,
    step: 0.01,
  },
  ROTATION: {
    type: PropertyType.ROTATION,
    defaultValue: 0,
    min: -360,
    max: 360,
    step: 1,
  },
  POSITION: {
    type: PropertyType.POSITION,
    defaultValue: { x: 0, y: 0 },
    min: -1000,
    max: 1000,
    step: 1,
  },
} as const;
