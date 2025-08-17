import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MovieRenderer } from '../index';
import { type RawDoc } from '../../doc/raw-doc';
import { Language } from '../../code-languages/languages';

// Mock PIXI.js
vi.mock('pixi.js', () => ({
  Application: vi.fn(() => ({
    stage: {
      addChild: vi.fn(),
    },
    init: vi.fn().mockResolvedValue(undefined),
    render: vi.fn(),
    renderer: {
      resize: vi.fn(),
    },
  })),
  BitmapFontManager: {
    install: vi.fn(),
    measureText: vi.fn(() => ({
      width: 10,
      height: 16,
      scale: 1,
    })),
  },
  TextStyle: vi.fn(),
  Text: vi.fn(() => ({
    style: {},
    text: '',
    x: 0,
    y: 0,
    alpha: 1,
    visible: true,
    scale: {
      set: vi.fn(),
    },
  })),
  Container: vi.fn(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    removeChildren: vi.fn(),
    children: [],
    x: 0,
    y: 0,
  })),
}));

// Mock d3-ease
vi.mock('d3-ease', () => ({
  easeLinear: vi.fn((x: number) => x),
  easeQuad: vi.fn((x: number) => x),
  easeQuadIn: vi.fn((x: number) => x),
  easeQuadOut: vi.fn((x: number) => x),
  easeQuadInOut: vi.fn((x: number) => x),
  easeCubic: vi.fn((x: number) => x),
  easeCubicIn: vi.fn((x: number) => x),
  easeCubicOut: vi.fn((x: number) => x),
  easeCubicInOut: vi.fn((x: number) => x),
  easeSin: vi.fn((x: number) => x),
  easeSinIn: vi.fn((x: number) => x),
  easeSinOut: vi.fn((x: number) => x),
  easeSinInOut: vi.fn((x: number) => x),
  easeExp: vi.fn((x: number) => x),
  easeExpIn: vi.fn((x: number) => x),
  easeExpOut: vi.fn((x: number) => x),
  easeExpInOut: vi.fn((x: number) => x),
  easeCircle: vi.fn((x: number) => x),
  easeCircleIn: vi.fn((x: number) => x),
  easeCircleOut: vi.fn((x: number) => x),
  easeCircleInOut: vi.fn((x: number) => x),
  easeBounce: vi.fn((x: number) => x),
  easeBounceIn: vi.fn((x: number) => x),
  easeBounceOut: vi.fn((x: number) => x),
  easeBounceInOut: vi.fn((x: number) => x),
  easeBack: vi.fn((x: number) => x),
  easeBackIn: vi.fn((x: number) => x),
  easeBackOut: vi.fn((x: number) => x),
  easeBackInOut: vi.fn((x: number) => x),
  easeElastic: vi.fn((x: number) => x),
  easeElasticIn: vi.fn((x: number) => x),
  easeElasticOut: vi.fn((x: number) => x),
  easeElasticInOut: vi.fn((x: number) => x),
}));

// Mock doc creation
vi.mock('../../doc/doc', () => ({
  createDoc: vi.fn((rawDoc) => ({
    raw: rawDoc,
    snapshots: rawDoc.snapshots.map((snapshot: any) => ({
      tokens: [
        { value: 'const', types: ['keyword'] },
        { value: ' ', types: [] },
        { value: 'a', types: ['variable'] },
        { value: ' = ', types: [] },
        { value: '1', types: ['number'] },
        { value: ';', types: [] },
      ],
      linesCount: 1,
    })),
    transitions: [
      {
        diffs: [
          { leftIndex: 0, rightIndex: 0 },
          { leftIndex: 1, rightIndex: 1 },
        ],
        left: [
          { value: 'const', types: ['keyword'] },
          { value: ' a = 1;', types: ['text'] },
        ],
        right: [
          { value: 'const', types: ['keyword'] },
          { value: ' a = 2;', types: ['text'] },
        ],
      },
    ],
  })),
}));

// Mock theme
vi.mock('../../theme/index', () => ({
  Theme: {
    getTheme: vi.fn(() => ({
      data: {
        fontFace: 'monospace',
        fontSize: 16,
        lineHeight: 20,
      },
      getTypesStyle: vi.fn(() => ({ color: '#ffffff' })),
    })),
  },
}));

describe('MovieRenderer', () => {
  let canvas: HTMLCanvasElement;
  let renderer: MovieRenderer;

  const mockRawDoc: RawDoc = {
    language: Language.javascript,
    fontSize: 16,
    lineHeight: 20,
    width: 800,
    height: 600,
    theme: 'default',
    padding: { top: 10, left: 10, bottom: 10 },
    snapshots: [
      {
        id: '1',
        code: 'const a = 1;',
        duration: 1000,
        transitionTime: 500,
      },
      {
        id: '2',
        code: 'const a = 2;',
        duration: 1000,
        transitionTime: 500,
      },
    ],
  };

  beforeEach(() => {
    canvas = document.createElement('canvas');
    renderer = new MovieRenderer(canvas);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create renderer with canvas', () => {
      expect(renderer).toBeDefined();
      expect(renderer.canvas).toBe(canvas);
    });

    it('should initialize with ready state', () => {
      // The ready state depends on the PIXI Application initialization
      expect(typeof renderer.ready).toBe('boolean');
    });

    it('should have a ready promise', () => {
      expect(renderer.readyPromise).toBeInstanceOf(Promise);
    });

    it('should initialize current time to -1', () => {
      expect(renderer.currentTime).toBe(-1);
    });
  });

  describe('init', () => {
    it('should initialize PIXI application', async () => {
      await renderer.init();
      expect(renderer.ready).toBe(true);
    });

    it('should handle initialization errors', async () => {
      const errorRenderer = new MovieRenderer(canvas);
      const mockApp = {
        stage: { addChild: vi.fn() },
        init: vi.fn().mockRejectedValue(new Error('Init failed')),
      };
      (errorRenderer as any).app = mockApp;

      await expect(errorRenderer.init()).rejects.toThrow('Init failed');
    });
  });

  describe('setDoc', () => {
    beforeEach(async () => {
      await renderer.init();
    });

    it('should set document and reset state', () => {
      renderer.setDoc(mockRawDoc);
      expect(renderer.currentTime).toBe(-1);
    });

    it('should not recreate doc if same raw doc is provided', () => {
      renderer.setDoc(mockRawDoc);
      const firstDoc = (renderer as any).doc;

      renderer.setDoc(mockRawDoc);
      const secondDoc = (renderer as any).doc;

      expect(firstDoc).toBe(secondDoc);
    });

    it('should recreate doc if different raw doc is provided', () => {
      renderer.setDoc(mockRawDoc);
      const firstDoc = (renderer as any).doc;

      const differentDoc = { ...mockRawDoc, width: 1000 };
      renderer.setDoc(differentDoc);
      const secondDoc = (renderer as any).doc;

      expect(firstDoc).not.toBe(secondDoc);
    });

    it('should resize renderer when ready', async () => {
      const mockResize = vi.fn();
      (renderer as any).app.renderer.resize = mockResize;

      renderer.setDoc(mockRawDoc);
      await renderer.readyPromise;

      // Wait for next tick to allow resize to be called
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockResize).toHaveBeenCalledWith(800, 600);
    });
  });

  describe('render', () => {
    beforeEach(async () => {
      await renderer.init();
      renderer.setDoc(mockRawDoc);
    });

    it('should throw error if no doc is set', () => {
      const emptyRenderer = new MovieRenderer(canvas);
      expect(() => emptyRenderer.render(0)).toThrow();
    });

    it('should not re-render if time has not changed significantly', () => {
      const renderSpy = vi.spyOn(renderer as any, 'renderStatic');

      renderer.render(100);
      renderer.render(100); // Same time

      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should render static frame when not in transition', () => {
      const renderStaticSpy = vi.spyOn(renderer as any, 'renderStatic');

      renderer.render(500); // Within first snapshot, not in transition

      expect(renderStaticSpy).toHaveBeenCalledWith(0);
    });

    it('should render transition when in transition time', () => {
      const renderTransitionSpy = vi.spyOn(renderer as any, 'renderTransition');

      renderer.render(750); // In transition of first snapshot

      expect(renderTransitionSpy).toHaveBeenCalled();
    });

    it('should handle final transition for last snapshot', () => {
      const renderFinalTransitionSpy = vi.spyOn(
        renderer as any,
        'renderFinalTransition',
      );

      renderer.render(1750); // In transition of last snapshot

      expect(renderFinalTransitionSpy).toHaveBeenCalled();
    });

    it('should update current time after render', () => {
      const time = 500;
      renderer.render(time);
      expect(renderer.currentTime).toBe(time);
    });
  });

  describe('shouldReRender', () => {
    beforeEach(async () => {
      await renderer.init();
      renderer.setDoc(mockRawDoc);
    });

    it('should return true for first render', () => {
      const shouldReRender = (renderer as any).shouldReRender(-1, 0);
      expect(shouldReRender).toBe(true);
    });

    it('should return false for same time', () => {
      const shouldReRender = (renderer as any).shouldReRender(100, 100);
      expect(shouldReRender).toBe(false);
    });

    it('should return true for different snapshots', () => {
      // Time 100 is in first snapshot, time 1200 is in second snapshot
      const shouldReRender = (renderer as any).shouldReRender(100, 1200);
      expect(shouldReRender).toBe(true);
    });

    it('should return false for times in same snapshot not in transition', () => {
      // Both times are in first snapshot and not in transition
      const shouldReRender = (renderer as any).shouldReRender(100, 200);
      expect(shouldReRender).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle canvas creation errors gracefully', () => {
      expect(() => new MovieRenderer(null as any)).not.toThrow();
    });

    it('should handle missing document gracefully in render', () => {
      const emptyRenderer = new MovieRenderer(canvas);
      expect(() => emptyRenderer.render(0)).toThrow('renderer.doc is empty');
    });

    it('should handle invalid time values', async () => {
      await renderer.init();
      renderer.setDoc(mockRawDoc);

      expect(() => renderer.render(NaN)).not.toThrow();
      expect(() => renderer.render(Infinity)).not.toThrow();
      expect(() => renderer.render(-Infinity)).not.toThrow();
    });
  });

  describe('Performance considerations', () => {
    beforeEach(async () => {
      await renderer.init();
      renderer.setDoc(mockRawDoc);
    });

    it('should not render if time difference is minimal', () => {
      const renderSpy = vi.spyOn(renderer as any, 'renderStatic');

      renderer.render(100);
      renderer.render(100.1); // Very small difference

      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid successive render calls', () => {
      expect(() => {
        for (let i = 0; i < 100; i++) {
          renderer.render(i * 10);
        }
      }).not.toThrow();
    });
  });

  describe('Memory management', () => {
    it('should clean up resources when setting new doc', () => {
      renderer.setDoc(mockRawDoc);
      const firstTokenPositions = (renderer as any).tokenPositionsList;
      const firstCachedTexts = (renderer as any).cachedTexts;

      renderer.setDoc({ ...mockRawDoc, width: 1000 });

      expect((renderer as any).tokenPositionsList).not.toBe(
        firstTokenPositions,
      );
      expect((renderer as any).cachedTexts).not.toBe(firstCachedTexts);
    });
  });
});
