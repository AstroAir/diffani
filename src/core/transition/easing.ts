import {
  easeLinear,
  easeQuad,
  easeQuadIn,
  easeQuadOut,
  easeQuadInOut,
  easeCubic,
  easeCubicIn,
  easeCubicOut,
  easeCubicInOut,
  // Quartic and Quintic easing functions are not available in d3-ease v3
  // easeQuart, easeQuartIn, easeQuartOut, easeQuartInOut,
  // easeQuint, easeQuintIn, easeQuintOut, easeQuintInOut,
  easeSin,
  easeSinIn,
  easeSinOut,
  easeSinInOut,
  easeExp,
  easeExpIn,
  easeExpOut,
  easeExpInOut,
  easeCircle,
  easeCircleIn,
  easeCircleOut,
  easeCircleInOut,
  easeBounce,
  easeBounceIn,
  easeBounceOut,
  easeBounceInOut,
  easeBack,
  easeBackIn,
  easeBackOut,
  easeBackInOut,
  easeElastic,
  easeElasticIn,
  easeElasticOut,
  easeElasticInOut,
} from 'd3-ease';

export type EasingFunction = (t: number) => number;

export interface EasingOption {
  id: string;
  name: string;
  category: string;
  func: EasingFunction;
  description: string;
}

export const EASING_CATEGORIES = {
  LINEAR: 'Linear',
  QUAD: 'Quadratic',
  CUBIC: 'Cubic',
  QUART: 'Quartic',
  QUINT: 'Quintic',
  SIN: 'Sinusoidal',
  EXP: 'Exponential',
  CIRCLE: 'Circular',
  BOUNCE: 'Bounce',
  BACK: 'Back',
  ELASTIC: 'Elastic',
} as const;

export const EASING_FUNCTIONS: EasingOption[] = [
  // Linear
  {
    id: 'linear',
    name: 'Linear',
    category: EASING_CATEGORIES.LINEAR,
    func: easeLinear,
    description: 'Constant speed throughout',
  },

  // Quadratic
  {
    id: 'quad',
    name: 'Quad',
    category: EASING_CATEGORIES.QUAD,
    func: easeQuad,
    description: 'Quadratic ease-in-out',
  },
  {
    id: 'quadIn',
    name: 'Quad In',
    category: EASING_CATEGORIES.QUAD,
    func: easeQuadIn,
    description: 'Quadratic ease-in',
  },
  {
    id: 'quadOut',
    name: 'Quad Out',
    category: EASING_CATEGORIES.QUAD,
    func: easeQuadOut,
    description: 'Quadratic ease-out',
  },
  {
    id: 'quadInOut',
    name: 'Quad In-Out',
    category: EASING_CATEGORIES.QUAD,
    func: easeQuadInOut,
    description: 'Quadratic ease-in-out',
  },

  // Cubic
  {
    id: 'cubic',
    name: 'Cubic',
    category: EASING_CATEGORIES.CUBIC,
    func: easeCubic,
    description: 'Cubic ease-in-out',
  },
  {
    id: 'cubicIn',
    name: 'Cubic In',
    category: EASING_CATEGORIES.CUBIC,
    func: easeCubicIn,
    description: 'Cubic ease-in',
  },
  {
    id: 'cubicOut',
    name: 'Cubic Out',
    category: EASING_CATEGORIES.CUBIC,
    func: easeCubicOut,
    description: 'Cubic ease-out',
  },
  {
    id: 'cubicInOut',
    name: 'Cubic In-Out',
    category: EASING_CATEGORIES.CUBIC,
    func: easeCubicInOut,
    description: 'Cubic ease-in-out',
  },

  // Quartic (using cubic as fallback since quartic is not available in d3-ease v3)
  {
    id: 'quart',
    name: 'Quart',
    category: EASING_CATEGORIES.QUART,
    func: easeCubicInOut, // Fallback to cubic
    description: 'Quartic ease-in-out (using cubic fallback)',
  },
  {
    id: 'quartIn',
    name: 'Quart In',
    category: EASING_CATEGORIES.QUART,
    func: easeCubicIn, // Fallback to cubic
    description: 'Quartic ease-in (using cubic fallback)',
  },
  {
    id: 'quartOut',
    name: 'Quart Out',
    category: EASING_CATEGORIES.QUART,
    func: easeCubicOut, // Fallback to cubic
    description: 'Quartic ease-out (using cubic fallback)',
  },
  {
    id: 'quartInOut',
    name: 'Quart In-Out',
    category: EASING_CATEGORIES.QUART,
    func: easeCubicInOut, // Fallback to cubic
    description: 'Quartic ease-in-out (using cubic fallback)',
  },

  // Quintic (using cubic as fallback since quintic is not available in d3-ease v3)
  {
    id: 'quint',
    name: 'Quint',
    category: EASING_CATEGORIES.QUINT,
    func: easeCubicInOut, // Fallback to cubic
    description: 'Quintic ease-in-out (using cubic fallback)',
  },
  {
    id: 'quintIn',
    name: 'Quint In',
    category: EASING_CATEGORIES.QUINT,
    func: easeCubicIn, // Fallback to cubic
    description: 'Quintic ease-in (using cubic fallback)',
  },
  {
    id: 'quintOut',
    name: 'Quint Out',
    category: EASING_CATEGORIES.QUINT,
    func: easeCubicOut, // Fallback to cubic
    description: 'Quintic ease-out (using cubic fallback)',
  },
  {
    id: 'quintInOut',
    name: 'Quint In-Out',
    category: EASING_CATEGORIES.QUINT,
    func: easeCubicInOut, // Fallback to cubic
    description: 'Quintic ease-in-out (using cubic fallback)',
  },

  // Sinusoidal
  {
    id: 'sin',
    name: 'Sin',
    category: EASING_CATEGORIES.SIN,
    func: easeSin,
    description: 'Sinusoidal ease-in-out',
  },
  {
    id: 'sinIn',
    name: 'Sin In',
    category: EASING_CATEGORIES.SIN,
    func: easeSinIn,
    description: 'Sinusoidal ease-in',
  },
  {
    id: 'sinOut',
    name: 'Sin Out',
    category: EASING_CATEGORIES.SIN,
    func: easeSinOut,
    description: 'Sinusoidal ease-out',
  },
  {
    id: 'sinInOut',
    name: 'Sin In-Out',
    category: EASING_CATEGORIES.SIN,
    func: easeSinInOut,
    description: 'Sinusoidal ease-in-out',
  },

  // Exponential
  {
    id: 'exp',
    name: 'Exp',
    category: EASING_CATEGORIES.EXP,
    func: easeExp,
    description: 'Exponential ease-in-out',
  },
  {
    id: 'expIn',
    name: 'Exp In',
    category: EASING_CATEGORIES.EXP,
    func: easeExpIn,
    description: 'Exponential ease-in',
  },
  {
    id: 'expOut',
    name: 'Exp Out',
    category: EASING_CATEGORIES.EXP,
    func: easeExpOut,
    description: 'Exponential ease-out',
  },
  {
    id: 'expInOut',
    name: 'Exp In-Out',
    category: EASING_CATEGORIES.EXP,
    func: easeExpInOut,
    description: 'Exponential ease-in-out',
  },

  // Circular
  {
    id: 'circle',
    name: 'Circle',
    category: EASING_CATEGORIES.CIRCLE,
    func: easeCircle,
    description: 'Circular ease-in-out',
  },
  {
    id: 'circleIn',
    name: 'Circle In',
    category: EASING_CATEGORIES.CIRCLE,
    func: easeCircleIn,
    description: 'Circular ease-in',
  },
  {
    id: 'circleOut',
    name: 'Circle Out',
    category: EASING_CATEGORIES.CIRCLE,
    func: easeCircleOut,
    description: 'Circular ease-out',
  },
  {
    id: 'circleInOut',
    name: 'Circle In-Out',
    category: EASING_CATEGORIES.CIRCLE,
    func: easeCircleInOut,
    description: 'Circular ease-in-out',
  },

  // Bounce
  {
    id: 'bounce',
    name: 'Bounce',
    category: EASING_CATEGORIES.BOUNCE,
    func: easeBounce,
    description: 'Bounce ease-in-out',
  },
  {
    id: 'bounceIn',
    name: 'Bounce In',
    category: EASING_CATEGORIES.BOUNCE,
    func: easeBounceIn,
    description: 'Bounce ease-in',
  },
  {
    id: 'bounceOut',
    name: 'Bounce Out',
    category: EASING_CATEGORIES.BOUNCE,
    func: easeBounceOut,
    description: 'Bounce ease-out',
  },
  {
    id: 'bounceInOut',
    name: 'Bounce In-Out',
    category: EASING_CATEGORIES.BOUNCE,
    func: easeBounceInOut,
    description: 'Bounce ease-in-out',
  },

  // Back
  {
    id: 'back',
    name: 'Back',
    category: EASING_CATEGORIES.BACK,
    func: easeBack,
    description: 'Back ease-in-out',
  },
  {
    id: 'backIn',
    name: 'Back In',
    category: EASING_CATEGORIES.BACK,
    func: easeBackIn,
    description: 'Back ease-in',
  },
  {
    id: 'backOut',
    name: 'Back Out',
    category: EASING_CATEGORIES.BACK,
    func: easeBackOut,
    description: 'Back ease-out',
  },
  {
    id: 'backInOut',
    name: 'Back In-Out',
    category: EASING_CATEGORIES.BACK,
    func: easeBackInOut,
    description: 'Back ease-in-out',
  },

  // Elastic
  {
    id: 'elastic',
    name: 'Elastic',
    category: EASING_CATEGORIES.ELASTIC,
    func: easeElastic,
    description: 'Elastic ease-in-out',
  },
  {
    id: 'elasticIn',
    name: 'Elastic In',
    category: EASING_CATEGORIES.ELASTIC,
    func: easeElasticIn,
    description: 'Elastic ease-in',
  },
  {
    id: 'elasticOut',
    name: 'Elastic Out',
    category: EASING_CATEGORIES.ELASTIC,
    func: easeElasticOut,
    description: 'Elastic ease-out',
  },
  {
    id: 'elasticInOut',
    name: 'Elastic In-Out',
    category: EASING_CATEGORIES.ELASTIC,
    func: easeElasticInOut,
    description: 'Elastic ease-in-out',
  },
];

/**
 * Get easing function by ID
 */
export function getEasingFunction(id: string): EasingFunction {
  const easing = EASING_FUNCTIONS.find((e) => e.id === id);
  return easing?.func || easeQuadInOut;
}

/**
 * Get easing functions grouped by category
 */
export function getEasingFunctionsByCategory(): Record<string, EasingOption[]> {
  return EASING_FUNCTIONS.reduce(
    (acc, easing) => {
      if (!acc[easing.category]) {
        acc[easing.category] = [];
      }
      acc[easing.category].push(easing);
      return acc;
    },
    {} as Record<string, EasingOption[]>,
  );
}

/**
 * Default easing function (backward compatibility)
 */
export const DEFAULT_EASING = 'quadInOut';
