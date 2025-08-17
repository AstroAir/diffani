import { type TransitionConfig } from '../transition/transition';
import { type ExportSettings } from '../export/types';

export interface AnimationPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  author?: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  thumbnail?: string; // Base64 encoded image or URL

  // Animation configuration
  config: AnimationPresetConfig;

  // Metadata
  metadata: PresetMetadata;
}

export interface AnimationPresetConfig {
  // Frame rate settings
  frameRate: number;

  // Transition settings
  defaultTransition: TransitionConfig;
  snapshotTransitions?: Record<string, TransitionConfig>;

  // Export settings
  exportSettings: ExportSettings;

  // Visual effects
  effects?: VisualEffect[];

  // Timeline settings
  timeline?: TimelinePresetConfig;

  // Document settings
  documentSettings?: DocumentPresetSettings;
}

export interface TimelinePresetConfig {
  duration: number;
  playbackRate: number;
  markers?: Array<{
    time: number;
    name: string;
    type: string;
  }>;
}

export interface DocumentPresetSettings {
  fontSize?: number;
  lineHeight?: number;
  theme?: string;
  padding?: {
    top: number;
    left: number;
    bottom: number;
  };
}

export interface VisualEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, unknown>;
  startTime?: number;
  endTime?: number;
}

export enum EffectType {
  BLUR = 'blur',
  GLOW = 'glow',
  SHADOW = 'shadow',
  COLOR_FILTER = 'colorFilter',
  PARTICLE = 'particle',
  DISTORTION = 'distortion',
}

export interface PresetMetadata {
  downloads: number;
  rating: number;
  ratingCount: number;
  featured: boolean;
  verified: boolean;
  license: PresetLicense;
  compatibility: string[];
  fileSize: number;
}

export enum PresetCategory {
  GENERAL = 'general',
  CODE_REVIEW = 'codeReview',
  TUTORIAL = 'tutorial',
  PRESENTATION = 'presentation',
  SOCIAL_MEDIA = 'socialMedia',
  DOCUMENTATION = 'documentation',
  DEMO = 'demo',
  ARTISTIC = 'artistic',
}

export enum PresetLicense {
  MIT = 'MIT',
  CC0 = 'CC0',
  CC_BY = 'CC-BY',
  CC_BY_SA = 'CC-BY-SA',
  PROPRIETARY = 'proprietary',
}

export interface PresetCollection {
  id: string;
  name: string;
  description: string;
  presets: string[]; // Preset IDs
  author: string;
  public: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresetSearchFilters {
  category?: PresetCategory;
  tags?: string[];
  author?: string;
  minRating?: number;
  license?: PresetLicense;
  featured?: boolean;
  verified?: boolean;
}

export interface PresetSearchResult {
  presets: AnimationPreset[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/* Built-in preset categories and tags */
export const PRESET_CATEGORIES = {
  [PresetCategory.GENERAL]: {
    name: 'General',
    description: 'General purpose animation presets',
    icon: '🎬',
  },
  [PresetCategory.CODE_REVIEW]: {
    name: 'Code Review',
    description: 'Optimized for code review presentations',
    icon: '👀',
  },
  [PresetCategory.TUTORIAL]: {
    name: 'Tutorial',
    description: 'Educational and instructional content',
    icon: '📚',
  },
  [PresetCategory.PRESENTATION]: {
    name: 'Presentation',
    description: 'Professional presentation styles',
    icon: '📊',
  },
  [PresetCategory.SOCIAL_MEDIA]: {
    name: 'Social Media',
    description: 'Optimized for social media platforms',
    icon: '📱',
  },
  [PresetCategory.DOCUMENTATION]: {
    name: 'Documentation',
    description: 'Technical documentation and guides',
    icon: '📖',
  },
  [PresetCategory.DEMO]: {
    name: 'Demo',
    description: 'Product demonstrations and showcases',
    icon: '🚀',
  },
  [PresetCategory.ARTISTIC]: {
    name: 'Artistic',
    description: 'Creative and artistic animations',
    icon: '🎨',
  },
} as const;

export const COMMON_PRESET_TAGS = [
  'smooth',
  'fast',
  'elegant',
  'minimal',
  'colorful',
  'professional',
  'playful',
  'dramatic',
  'subtle',
  'bold',
  'modern',
  'classic',
  'animated',
  'static',
  'interactive',
  'responsive',
  'mobile-friendly',
  'high-quality',
  'web-optimized',
  'social-ready',
] as const;

/* Default preset configurations */
export const DEFAULT_PRESETS: Partial<AnimationPreset>[] = [
  {
    name: 'Smooth Professional',
    description: 'Elegant transitions perfect for professional presentations',
    category: PresetCategory.PRESENTATION,
    tags: ['smooth', 'professional', 'elegant'],
    config: {
      frameRate: 60,
      defaultTransition: {
        outDurationProportion: 0.3,
        moveDurationProportion: 1.2,
        inDurationProportion: 0.3,
        easingId: 'cubicInOut',
        effectType: 'fade',
      },
      exportSettings: {
        format: 'webm' as const,
        quality: 'high' as const,
        frameRate: 60,
      },
    },
  },
  {
    name: 'Quick & Snappy',
    description: 'Fast-paced animations for dynamic content',
    category: PresetCategory.DEMO,
    tags: ['fast', 'dynamic', 'energetic'],
    config: {
      frameRate: 30,
      defaultTransition: {
        outDurationProportion: 0.2,
        moveDurationProportion: 0.8,
        inDurationProportion: 0.2,
        easingId: 'backOut',
        effectType: 'slideLeft',
      },
      exportSettings: {
        format: 'webm' as const,
        quality: 'medium' as const,
        frameRate: 30,
      },
    },
  },
  {
    name: 'Social Media Ready',
    description:
      'Optimized for social media platforms with eye-catching effects',
    category: PresetCategory.SOCIAL_MEDIA,
    tags: ['social-ready', 'colorful', 'engaging'],
    config: {
      frameRate: 30,
      defaultTransition: {
        outDurationProportion: 0.4,
        moveDurationProportion: 1.0,
        inDurationProportion: 0.4,
        easingId: 'bounceOut',
        effectType: 'scale',
      },
      exportSettings: {
        format: 'gif' as const,
        quality: 'medium' as const,
        frameRate: 24,
      },
    },
  },
] as const;
