/**
 * Animation templates and presets for common code animation patterns
 */

import { 
  type Timeline, 
  type TimelineTrack, 
  type AnimationProperty,
  type Keyframe,
  TrackType,
  PropertyType 
} from '../timeline/types';

export interface AnimationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number;
  tracks: TimelineTrack[];
  preview?: string;
  tags: string[];
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  templates: AnimationTemplate[];
}

// Helper function to create keyframes
function createKeyframe(time: number, value: unknown, easing = 'easeInOut'): Keyframe {
  return {
    id: `keyframe-${Date.now()}-${Math.random()}`,
    time,
    value,
    easing,
  };
}

// Helper function to create animation property
function createProperty(
  name: string,
  type: PropertyType,
  keyframes: Keyframe[],
  defaultValue: unknown
): AnimationProperty {
  return {
    id: `property-${Date.now()}-${Math.random()}`,
    name,
    type,
    keyframes,
    defaultValue,
  };
}

// Helper function to create track
function createTrack(
  name: string,
  type: TrackType,
  properties: AnimationProperty[],
  color = '#007acc'
): TimelineTrack {
  return {
    id: `track-${Date.now()}-${Math.random()}`,
    name,
    type,
    properties,
    enabled: true,
    locked: false,
    collapsed: false,
    color,
  };
}

// Code typing animation template
export const CODE_TYPING_TEMPLATE: AnimationTemplate = {
  id: 'code-typing',
  name: 'Code Typing',
  description: 'Simulates typing code with cursor and character reveals',
  category: 'Text Effects',
  duration: 3000,
  preview: 'function hello() { ... }',
  tags: ['typing', 'text', 'cursor', 'reveal'],
  tracks: [
    createTrack('Cursor', TrackType.TRANSFORM, [
      createProperty('Opacity', PropertyType.OPACITY, [
        createKeyframe(0, 1),
        createKeyframe(500, 0),
        createKeyframe(1000, 1),
        createKeyframe(1500, 0),
        createKeyframe(2000, 1),
        createKeyframe(2500, 0),
        createKeyframe(3000, 1),
      ], 1),
      createProperty('Position X', PropertyType.NUMBER, [
        createKeyframe(0, 0),
        createKeyframe(500, 50),
        createKeyframe(1000, 120),
        createKeyframe(1500, 180),
        createKeyframe(2000, 220),
        createKeyframe(2500, 280),
        createKeyframe(3000, 320),
      ], 0),
    ], '#ff6b6b'),
    createTrack('Text Reveal', TrackType.STYLE, [
      createProperty('Width', PropertyType.NUMBER, [
        createKeyframe(0, 0),
        createKeyframe(3000, 320, 'easeOut'),
      ], 0),
    ], '#4caf50'),
  ],
};

// Syntax highlighting animation template
export const SYNTAX_HIGHLIGHT_TEMPLATE: AnimationTemplate = {
  id: 'syntax-highlight',
  name: 'Syntax Highlighting',
  description: 'Progressive syntax highlighting with color transitions',
  category: 'Code Effects',
  duration: 2000,
  preview: 'Keywords → Colors',
  tags: ['syntax', 'highlighting', 'colors', 'progressive'],
  tracks: [
    createTrack('Keywords', TrackType.STYLE, [
      createProperty('Color', PropertyType.COLOR, [
        createKeyframe(0, '#ffffff'),
        createKeyframe(500, '#ff6b6b', 'easeInOut'),
      ], '#ffffff'),
    ], '#ff6b6b'),
    createTrack('Strings', TrackType.STYLE, [
      createProperty('Color', PropertyType.COLOR, [
        createKeyframe(500, '#ffffff'),
        createKeyframe(1000, '#4caf50', 'easeInOut'),
      ], '#ffffff'),
    ], '#4caf50'),
    createTrack('Comments', TrackType.STYLE, [
      createProperty('Color', PropertyType.COLOR, [
        createKeyframe(1000, '#ffffff'),
        createKeyframe(1500, '#9e9e9e', 'easeInOut'),
      ], '#ffffff'),
    ], '#9e9e9e'),
  ],
};

// Code morphing animation template
export const CODE_MORPH_TEMPLATE: AnimationTemplate = {
  id: 'code-morph',
  name: 'Code Morphing',
  description: 'Smooth transformation between different code structures',
  category: 'Transformations',
  duration: 2500,
  preview: 'if → for → while',
  tags: ['morph', 'transform', 'structure', 'smooth'],
  tracks: [
    createTrack('Morph Transform', TrackType.TRANSFORM, [
      createProperty('Scale X', PropertyType.NUMBER, [
        createKeyframe(0, 1),
        createKeyframe(500, 0.8, 'easeInOut'),
        createKeyframe(1000, 1.2, 'easeInOut'),
        createKeyframe(1500, 0.9, 'easeInOut'),
        createKeyframe(2000, 1.1, 'easeInOut'),
        createKeyframe(2500, 1, 'easeInOut'),
      ], 1),
      createProperty('Opacity', PropertyType.OPACITY, [
        createKeyframe(0, 1),
        createKeyframe(400, 0.3, 'easeIn'),
        createKeyframe(600, 1, 'easeOut'),
        createKeyframe(1000, 0.3, 'easeIn'),
        createKeyframe(1200, 1, 'easeOut'),
        createKeyframe(1600, 0.3, 'easeIn'),
        createKeyframe(1800, 1, 'easeOut'),
        createKeyframe(2500, 1),
      ], 1),
    ], '#9c27b0'),
  ],
};

// Error highlighting animation template
export const ERROR_HIGHLIGHT_TEMPLATE: AnimationTemplate = {
  id: 'error-highlight',
  name: 'Error Highlighting',
  description: 'Attention-grabbing error indication with shake and glow',
  category: 'Feedback',
  duration: 1500,
  preview: '❌ Shake & Glow',
  tags: ['error', 'shake', 'glow', 'attention', 'feedback'],
  tracks: [
    createTrack('Shake Effect', TrackType.TRANSFORM, [
      createProperty('Position X', PropertyType.NUMBER, [
        createKeyframe(0, 0),
        createKeyframe(100, -5, 'easeInOut'),
        createKeyframe(200, 5, 'easeInOut'),
        createKeyframe(300, -3, 'easeInOut'),
        createKeyframe(400, 3, 'easeInOut'),
        createKeyframe(500, -1, 'easeInOut'),
        createKeyframe(600, 1, 'easeInOut'),
        createKeyframe(700, 0, 'easeInOut'),
      ], 0),
    ], '#f44336'),
    createTrack('Error Glow', TrackType.STYLE, [
      createProperty('Box Shadow Blur', PropertyType.NUMBER, [
        createKeyframe(0, 0),
        createKeyframe(300, 20, 'easeOut'),
        createKeyframe(700, 15, 'easeInOut'),
        createKeyframe(1000, 10, 'easeInOut'),
        createKeyframe(1500, 0, 'easeIn'),
      ], 0),
      createProperty('Box Shadow Color', PropertyType.COLOR, [
        createKeyframe(0, '#f44336'),
        createKeyframe(1500, '#f44336'),
      ], '#f44336'),
    ], '#f44336'),
  ],
};

// Success animation template
export const SUCCESS_ANIMATION_TEMPLATE: AnimationTemplate = {
  id: 'success-animation',
  name: 'Success Animation',
  description: 'Celebratory success animation with scale and glow',
  category: 'Feedback',
  duration: 2000,
  preview: '✅ Scale & Glow',
  tags: ['success', 'celebration', 'scale', 'glow', 'feedback'],
  tracks: [
    createTrack('Success Scale', TrackType.TRANSFORM, [
      createProperty('Scale', PropertyType.NUMBER, [
        createKeyframe(0, 1),
        createKeyframe(300, 1.2, 'easeBackOut'),
        createKeyframe(800, 1.05, 'easeInOut'),
        createKeyframe(2000, 1, 'easeOut'),
      ], 1),
    ], '#4caf50'),
    createTrack('Success Glow', TrackType.STYLE, [
      createProperty('Box Shadow Blur', PropertyType.NUMBER, [
        createKeyframe(0, 0),
        createKeyframe(400, 25, 'easeOut'),
        createKeyframe(1200, 15, 'easeInOut'),
        createKeyframe(2000, 0, 'easeIn'),
      ], 0),
      createProperty('Opacity', PropertyType.OPACITY, [
        createKeyframe(0, 1),
        createKeyframe(400, 0.9),
        createKeyframe(800, 1),
        createKeyframe(1200, 0.95),
        createKeyframe(2000, 1),
      ], 1),
    ], '#4caf50'),
  ],
};

// Loading animation template
export const LOADING_ANIMATION_TEMPLATE: AnimationTemplate = {
  id: 'loading-animation',
  name: 'Loading Animation',
  description: 'Smooth loading indicator with dots and fade',
  category: 'UI Effects',
  duration: 1500,
  preview: '● ● ● Loading...',
  tags: ['loading', 'dots', 'fade', 'indicator', 'ui'],
  tracks: [
    createTrack('Dot 1', TrackType.STYLE, [
      createProperty('Opacity', PropertyType.OPACITY, [
        createKeyframe(0, 0.3),
        createKeyframe(200, 1, 'easeInOut'),
        createKeyframe(400, 0.3, 'easeInOut'),
        createKeyframe(1500, 0.3),
      ], 0.3),
    ], '#2196f3'),
    createTrack('Dot 2', TrackType.STYLE, [
      createProperty('Opacity', PropertyType.OPACITY, [
        createKeyframe(0, 0.3),
        createKeyframe(300, 1, 'easeInOut'),
        createKeyframe(500, 0.3, 'easeInOut'),
        createKeyframe(1500, 0.3),
      ], 0.3),
    ], '#2196f3'),
    createTrack('Dot 3', TrackType.STYLE, [
      createProperty('Opacity', PropertyType.OPACITY, [
        createKeyframe(0, 0.3),
        createKeyframe(400, 1, 'easeInOut'),
        createKeyframe(600, 0.3, 'easeInOut'),
        createKeyframe(1500, 0.3),
      ], 0.3),
    ], '#2196f3'),
  ],
};

// Slide transition template
export const SLIDE_TRANSITION_TEMPLATE: AnimationTemplate = {
  id: 'slide-transition',
  name: 'Slide Transition',
  description: 'Smooth slide transition between code blocks',
  category: 'Transitions',
  duration: 1000,
  preview: '← → Slide',
  tags: ['slide', 'transition', 'smooth', 'blocks'],
  tracks: [
    createTrack('Slide Out', TrackType.TRANSFORM, [
      createProperty('Position X', PropertyType.NUMBER, [
        createKeyframe(0, 0),
        createKeyframe(500, -100, 'easeInOut'),
      ], 0),
      createProperty('Opacity', PropertyType.OPACITY, [
        createKeyframe(0, 1),
        createKeyframe(500, 0, 'easeIn'),
      ], 1),
    ], '#ff9800'),
    createTrack('Slide In', TrackType.TRANSFORM, [
      createProperty('Position X', PropertyType.NUMBER, [
        createKeyframe(500, 100),
        createKeyframe(1000, 0, 'easeInOut'),
      ], 100),
      createProperty('Opacity', PropertyType.OPACITY, [
        createKeyframe(500, 0),
        createKeyframe(1000, 1, 'easeOut'),
      ], 0),
    ], '#ff9800'),
  ],
};

// All available templates
export const ANIMATION_TEMPLATES: AnimationTemplate[] = [
  CODE_TYPING_TEMPLATE,
  SYNTAX_HIGHLIGHT_TEMPLATE,
  CODE_MORPH_TEMPLATE,
  ERROR_HIGHLIGHT_TEMPLATE,
  SUCCESS_ANIMATION_TEMPLATE,
  LOADING_ANIMATION_TEMPLATE,
  SLIDE_TRANSITION_TEMPLATE,
];

// Template categories
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'text-effects',
    name: 'Text Effects',
    description: 'Animations focused on text and typography',
    templates: ANIMATION_TEMPLATES.filter(t => t.category === 'Text Effects'),
  },
  {
    id: 'code-effects',
    name: 'Code Effects',
    description: 'Animations specific to code visualization',
    templates: ANIMATION_TEMPLATES.filter(t => t.category === 'Code Effects'),
  },
  {
    id: 'transformations',
    name: 'Transformations',
    description: 'Morphing and transformation animations',
    templates: ANIMATION_TEMPLATES.filter(t => t.category === 'Transformations'),
  },
  {
    id: 'feedback',
    name: 'Feedback',
    description: 'User feedback and status animations',
    templates: ANIMATION_TEMPLATES.filter(t => t.category === 'Feedback'),
  },
  {
    id: 'ui-effects',
    name: 'UI Effects',
    description: 'General user interface animations',
    templates: ANIMATION_TEMPLATES.filter(t => t.category === 'UI Effects'),
  },
  {
    id: 'transitions',
    name: 'Transitions',
    description: 'Smooth transitions between states',
    templates: ANIMATION_TEMPLATES.filter(t => t.category === 'Transitions'),
  },
];

// Template manager class
export class AnimationTemplateManager {
  private templates: Map<string, AnimationTemplate> = new Map();
  private categories: Map<string, TemplateCategory> = new Map();

  constructor() {
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    ANIMATION_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });

    TEMPLATE_CATEGORIES.forEach(category => {
      this.categories.set(category.id, category);
    });
  }

  getTemplate(id: string): AnimationTemplate | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): AnimationTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(categoryId: string): AnimationTemplate[] {
    return this.getAllTemplates().filter(template => 
      template.category === this.categories.get(categoryId)?.name
    );
  }

  getTemplatesByTag(tag: string): AnimationTemplate[] {
    return this.getAllTemplates().filter(template =>
      template.tags.includes(tag)
    );
  }

  searchTemplates(query: string): AnimationTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTemplates().filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  addTemplate(template: AnimationTemplate): void {
    this.templates.set(template.id, template);
  }

  removeTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  getCategories(): TemplateCategory[] {
    return Array.from(this.categories.values());
  }

  applyTemplate(templateId: string, timeline: Timeline): Timeline {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return {
      ...timeline,
      duration: template.duration,
      tracks: [...timeline.tracks, ...template.tracks],
    };
  }

  createTimelineFromTemplate(templateId: string): Timeline {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return {
      id: `timeline-${Date.now()}`,
      name: template.name,
      duration: template.duration,
      currentTime: 0,
      playbackRate: 1.0,
      tracks: template.tracks,
      markers: [],
      loop: false,
      autoPlay: false,
    };
  }
}
