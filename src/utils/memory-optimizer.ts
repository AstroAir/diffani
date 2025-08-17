/**
 * Advanced Memory Optimization Utilities for DiffAni
 */

export interface MemoryOptimizationConfig {
  maxCacheSize: number;
  cleanupInterval: number;
  memoryThreshold: number;
  enableAutoCleanup: boolean;
}

export class AdvancedMemoryOptimizer {
  private static instance: AdvancedMemoryOptimizer;
  private config: MemoryOptimizationConfig;
  private caches: Map<string, Map<string, any>> = new Map();
  private accessTimes: Map<string, Map<string, number>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(config: Partial<MemoryOptimizationConfig> = {}) {
    this.config = {
      maxCacheSize: 1000,
      cleanupInterval: 30000, // 30 seconds
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      enableAutoCleanup: true,
      ...config,
    };

    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  static getInstance(config?: Partial<MemoryOptimizationConfig>): AdvancedMemoryOptimizer {
    if (!AdvancedMemoryOptimizer.instance) {
      AdvancedMemoryOptimizer.instance = new AdvancedMemoryOptimizer(config);
    }
    return AdvancedMemoryOptimizer.instance;
  }

  /**
   * Create or get a named cache
   */
  getCache<T = any>(name: string): Map<string, T> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new Map());
      this.accessTimes.set(name, new Map());
    }
    return this.caches.get(name)!;
  }

  /**
   * Set a value in a named cache with LRU eviction
   */
  setCacheValue<T>(cacheName: string, key: string, value: T): void {
    const cache = this.getCache<T>(cacheName);
    const accessTime = this.accessTimes.get(cacheName)!;

    // Remove oldest entries if cache is full
    if (cache.size >= this.config.maxCacheSize) {
      this.evictLRU(cacheName);
    }

    cache.set(key, value);
    accessTime.set(key, Date.now());
  }

  /**
   * Get a value from a named cache
   */
  getCacheValue<T>(cacheName: string, key: string): T | undefined {
    const cache = this.getCache<T>(cacheName);
    const accessTime = this.accessTimes.get(cacheName)!;

    if (cache.has(key)) {
      accessTime.set(key, Date.now()); // Update access time
      return cache.get(key);
    }

    return undefined;
  }

  /**
   * Evict least recently used items from cache
   */
  private evictLRU(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    const accessTime = this.accessTimes.get(cacheName);

    if (!cache || !accessTime) return;

    // Find the oldest accessed item
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, time] of accessTime.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      accessTime.delete(oldestKey);
    }
  }

  /**
   * Clear a specific cache
   */
  clearCache(cacheName: string): void {
    this.caches.delete(cacheName);
    this.accessTimes.delete(cacheName);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.caches.clear();
    this.accessTimes.clear();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    totalCaches: number;
    totalEntries: number;
    cacheDetails: Array<{
      name: string;
      size: number;
      memoryEstimate: number;
    }>;
  } {
    const cacheDetails = Array.from(this.caches.entries()).map(([name, cache]) => ({
      name,
      size: cache.size,
      memoryEstimate: this.estimateCacheMemory(cache),
    }));

    return {
      totalCaches: this.caches.size,
      totalEntries: cacheDetails.reduce((sum, cache) => sum + cache.size, 0),
      cacheDetails,
    };
  }

  /**
   * Estimate memory usage of a cache (rough approximation)
   */
  private estimateCacheMemory(cache: Map<string, any>): number {
    let estimate = 0;
    
    for (const [key, value] of cache.entries()) {
      // Rough estimation: key size + value size
      estimate += key.length * 2; // 2 bytes per character for UTF-16
      
      if (typeof value === 'string') {
        estimate += value.length * 2;
      } else if (typeof value === 'object' && value !== null) {
        estimate += JSON.stringify(value).length * 2;
      } else {
        estimate += 8; // Rough estimate for primitives
      }
    }
    
    return estimate;
  }

  /**
   * Start automatic cleanup process
   */
  private startAutoCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup process
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Perform memory cleanup based on usage and thresholds
   */
  performCleanup(): void {
    const memoryUsage = this.getCurrentMemoryUsage();
    
    if (memoryUsage && memoryUsage > this.config.memoryThreshold) {
      console.warn('Memory threshold exceeded, performing cleanup...');
      
      // Clear least recently used caches first
      const stats = this.getMemoryStats();
      const sortedCaches = stats.cacheDetails.sort((a, b) => a.memoryEstimate - b.memoryEstimate);
      
      // Clear the largest caches first
      for (let i = sortedCaches.length - 1; i >= 0 && this.getCurrentMemoryUsage()! > this.config.memoryThreshold; i--) {
        this.clearCache(sortedCaches[i].name);
        console.log(`Cleared cache: ${sortedCaches[i].name}`);
      }
      
      // Force garbage collection if available
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }
    }
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }
    return null;
  }

  /**
   * Create a memoized function with automatic cache management
   */
  createMemoizedFunction<T extends (...args: any[]) => any>(
    fn: T,
    cacheName: string,
    keyGenerator?: (...args: Parameters<T>) => string,
  ): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      let result = this.getCacheValue<ReturnType<T>>(cacheName, key);
      
      if (result === undefined) {
        result = fn(...args);
        this.setCacheValue(cacheName, key, result);
      }
      
      return result;
    }) as T;
  }

  /**
   * Destroy the optimizer and clean up resources
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.clearAllCaches();
  }
}

/**
 * Global memory optimizer instance
 */
export const memoryOptimizer = AdvancedMemoryOptimizer.getInstance({
  maxCacheSize: 500,
  cleanupInterval: 30000,
  memoryThreshold: 150 * 1024 * 1024, // 150MB
  enableAutoCleanup: true,
});

/**
 * Decorator for automatic memoization
 */
export function memoized(cacheName: string, keyGenerator?: (...args: any[]) => string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    if (descriptor.value) {
      descriptor.value = memoryOptimizer.createMemoizedFunction(
        descriptor.value,
        `${target.constructor.name}.${propertyKey}`,
        keyGenerator,
      );
    }
    return descriptor;
  };
}
