/**
 * Performance optimization utilities for Diffani
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

// Memory management utilities
export class MemoryManager {
  private static instance: MemoryManager;
  private observers: Set<() => void> = new Set();
  private memoryThreshold = 100 * 1024 * 1024; // 100MB threshold

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  addObserver(callback: () => void): void {
    this.observers.add(callback);
  }

  removeObserver(callback: () => void): void {
    this.observers.delete(callback);
  }

  checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      if (memInfo.usedJSHeapSize > this.memoryThreshold) {
        this.observers.forEach(callback => callback());
      }
    }
  }

  forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }
}

// Virtual scrolling hook for large lists
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  items: unknown[];
}

export function useVirtualScroll({
  itemHeight,
  containerHeight,
  overscan = 5,
  items,
}: VirtualScrollOptions) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const scrollTop = useRef(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop.current / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    
    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
      offsetY: Math.max(0, startIndex - overscan) * itemHeight,
    };
  }, [scrollTop.current, itemHeight, containerHeight, overscan, items.length]);

  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLDivElement;
    scrollTop.current = target.scrollTop;
  }, []);

  useEffect(() => {
    const element = scrollElementRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return {
    scrollElementRef,
    visibleRange,
    totalHeight: items.length * itemHeight,
  };
}

// Lazy loading hook with intersection observer
export function useLazyLoading(threshold = 0.1) {
  const elementRef = useRef<HTMLElement>(null);
  const isVisible = useRef(false);
  const callbacks = useRef<Set<() => void>>(new Set());

  const addCallback = useCallback((callback: () => void) => {
    callbacks.current.add(callback);
  }, []);

  const removeCallback = useCallback((callback: () => void) => {
    callbacks.current.delete(callback);
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible.current) {
          isVisible.current = true;
          callbacks.current.forEach(callback => callback());
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return {
    elementRef,
    isVisible: isVisible.current,
    addCallback,
    removeCallback,
  };
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(`${componentName} render took ${renderTime.toFixed(2)}ms`);
    }

    startTime.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
  };
}

// Debounced callback hook for performance
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

// Throttled callback hook for performance
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        callbackRef.current(...args);
      }
    }) as T,
    [delay]
  );
}

// WebGL context management
export class WebGLManager {
  private static instance: WebGLManager;
  private contexts: Map<string, WebGLRenderingContext | WebGL2RenderingContext> = new Map();
  private maxContexts = 16; // WebGL context limit

  static getInstance(): WebGLManager {
    if (!WebGLManager.instance) {
      WebGLManager.instance = new WebGLManager();
    }
    return WebGLManager.instance;
  }

  createContext(
    canvas: HTMLCanvasElement,
    contextId: string,
    options?: WebGLContextAttributes
  ): WebGLRenderingContext | WebGL2RenderingContext | null {
    if (this.contexts.size >= this.maxContexts) {
      console.warn('Maximum WebGL contexts reached');
      return null;
    }

    const context = canvas.getContext('webgl2', options) || 
                   canvas.getContext('webgl', options);
    
    if (context) {
      this.contexts.set(contextId, context);
    }

    return context;
  }

  getContext(contextId: string): WebGLRenderingContext | WebGL2RenderingContext | null {
    return this.contexts.get(contextId) || null;
  }

  destroyContext(contextId: string): void {
    const context = this.contexts.get(contextId);
    if (context) {
      // Clean up WebGL resources
      const ext = context.getExtension('WEBGL_lose_context');
      if (ext) {
        ext.loseContext();
      }
      this.contexts.delete(contextId);
    }
  }

  destroyAllContexts(): void {
    this.contexts.forEach((_, contextId) => {
      this.destroyContext(contextId);
    });
  }
}

// Animation frame management
export class AnimationFrameManager {
  private static instance: AnimationFrameManager;
  private callbacks: Map<string, FrameRequestCallback> = new Map();
  private activeFrame: number | null = null;

  static getInstance(): AnimationFrameManager {
    if (!AnimationFrameManager.instance) {
      AnimationFrameManager.instance = new AnimationFrameManager();
    }
    return AnimationFrameManager.instance;
  }

  addCallback(id: string, callback: FrameRequestCallback): void {
    this.callbacks.set(id, callback);
    this.startLoop();
  }

  removeCallback(id: string): void {
    this.callbacks.delete(id);
    if (this.callbacks.size === 0) {
      this.stopLoop();
    }
  }

  private startLoop(): void {
    if (this.activeFrame === null) {
      this.loop();
    }
  }

  private stopLoop(): void {
    if (this.activeFrame !== null) {
      cancelAnimationFrame(this.activeFrame);
      this.activeFrame = null;
    }
  }

  private loop = (timestamp: number): void => {
    this.callbacks.forEach(callback => callback(timestamp));
    
    if (this.callbacks.size > 0) {
      this.activeFrame = requestAnimationFrame(this.loop);
    } else {
      this.activeFrame = null;
    }
  };
}

// Resource pool for object reuse
export class ResourcePool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private reset?: (item: T) => void;

  constructor(factory: () => T, reset?: (item: T) => void) {
    this.factory = factory;
    this.reset = reset;
  }

  acquire(): T {
    let item = this.available.pop();
    
    if (!item) {
      item = this.factory();
    }

    this.inUse.add(item);
    return item;
  }

  release(item: T): void {
    if (this.inUse.has(item)) {
      this.inUse.delete(item);
      
      if (this.reset) {
        this.reset(item);
      }
      
      this.available.push(item);
    }
  }

  clear(): void {
    this.available.length = 0;
    this.inUse.clear();
  }

  get stats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
    };
  }
}

// Bundle size optimization utilities
export const lazyImport = <T>(importFn: () => Promise<T>) => {
  let promise: Promise<T> | null = null;
  
  return (): Promise<T> => {
    if (!promise) {
      promise = importFn();
    }
    return promise;
  };
};

// Performance measurement utilities
export const measurePerformance = (name: string, fn: () => void): void => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${(end - start).toFixed(2)}ms`);
};

export const measureAsyncPerformance = async (
  name: string, 
  fn: () => Promise<void>
): Promise<void> => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  console.log(`${name} took ${(end - start).toFixed(2)}ms`);
};
