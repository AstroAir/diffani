/**
 * Performance Configuration for DiffAni
 * Centralized configuration for all performance optimizations
 */

export interface PerformanceConfig {
  // Renderer optimizations
  renderer: {
    enableTextStyleCaching: boolean;
    enableTextMeasurementCaching: boolean;
    enablePositionCaching: boolean;
    maxCachedSnapshots: number;
    clearCacheOnDocChange: boolean;
  };

  // Animation optimizations
  animation: {
    enableConditionalRAF: boolean;
    fpsMonitoringInterval: number;
    frameDropThreshold: number;
    maxFrameDrops: number;
  };

  // Memory management
  memory: {
    enableAutoCleanup: boolean;
    cleanupInterval: number;
    memoryThreshold: number;
    maxCacheSize: number;
    enableMemoryMonitoring: boolean;
  };

  // Bundle optimizations
  bundle: {
    enableCodeSplitting: boolean;
    enableTreeShaking: boolean;
    enableSourceMaps: boolean;
    chunkSizeWarningLimit: number;
  };

  // Development optimizations
  development: {
    enablePerformanceMonitor: boolean;
    enableBenchmarking: boolean;
    enableMemoryProfiler: boolean;
    logPerformanceWarnings: boolean;
  };

  // Production optimizations
  production: {
    enableMinification: boolean;
    enableCompression: boolean;
    enableCaching: boolean;
    enableServiceWorker: boolean;
  };
}

/**
 * Default performance configuration
 */
export const defaultPerformanceConfig: PerformanceConfig = {
  renderer: {
    enableTextStyleCaching: true,
    enableTextMeasurementCaching: true,
    enablePositionCaching: true,
    maxCachedSnapshots: 100,
    clearCacheOnDocChange: true,
  },

  animation: {
    enableConditionalRAF: true,
    fpsMonitoringInterval: 500,
    frameDropThreshold: 1.5,
    maxFrameDrops: 10,
  },

  memory: {
    enableAutoCleanup: true,
    cleanupInterval: 30000, // 30 seconds
    memoryThreshold: 150 * 1024 * 1024, // 150MB
    maxCacheSize: 500,
    enableMemoryMonitoring: true,
  },

  bundle: {
    enableCodeSplitting: true,
    enableTreeShaking: true,
    enableSourceMaps: true,
    chunkSizeWarningLimit: 1000,
  },

  development: {
    enablePerformanceMonitor: true,
    enableBenchmarking: true,
    enableMemoryProfiler: true,
    logPerformanceWarnings: true,
  },

  production: {
    enableMinification: true,
    enableCompression: true,
    enableCaching: true,
    enableServiceWorker: false, // Can be enabled when implemented
  },
};

/**
 * Environment-specific configurations
 */
export const developmentConfig: Partial<PerformanceConfig> = {
  development: {
    enablePerformanceMonitor: true,
    enableBenchmarking: true,
    enableMemoryProfiler: true,
    logPerformanceWarnings: true,
  },
  memory: {
    enableAutoCleanup: true,
    cleanupInterval: 10000, // More frequent cleanup in development
    memoryThreshold: 100 * 1024 * 1024, // Lower threshold for development
    maxCacheSize: 200,
    enableMemoryMonitoring: true,
  },
};

export const productionConfig: Partial<PerformanceConfig> = {
  development: {
    enablePerformanceMonitor: false,
    enableBenchmarking: false,
    enableMemoryProfiler: false,
    logPerformanceWarnings: false,
  },
  memory: {
    enableAutoCleanup: true,
    cleanupInterval: 60000, // Less frequent cleanup in production
    memoryThreshold: 200 * 1024 * 1024, // Higher threshold for production
    maxCacheSize: 1000,
    enableMemoryMonitoring: false,
  },
  production: {
    enableMinification: true,
    enableCompression: true,
    enableCaching: true,
    enableServiceWorker: true,
  },
};

/**
 * Performance configuration manager
 */
export class PerformanceConfigManager {
  private static instance: PerformanceConfigManager;
  private config: PerformanceConfig;

  private constructor() {
    this.config = this.mergeConfigs(
      defaultPerformanceConfig,
      this.getEnvironmentConfig(),
    );
  }

  static getInstance(): PerformanceConfigManager {
    if (!PerformanceConfigManager.instance) {
      PerformanceConfigManager.instance = new PerformanceConfigManager();
    }
    return PerformanceConfigManager.instance;
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PerformanceConfig>): void {
    this.config = this.mergeConfigs(this.config, updates);
  }

  /**
   * Get environment-specific configuration
   */
  private getEnvironmentConfig(): Partial<PerformanceConfig> {
    const isDevelopment = process.env.NODE_ENV === 'development';
    return isDevelopment ? developmentConfig : productionConfig;
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfigs(
    base: PerformanceConfig,
    override: Partial<PerformanceConfig>,
  ): PerformanceConfig {
    const result = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key as keyof PerformanceConfig] = {
          ...result[key as keyof PerformanceConfig],
          ...value,
        } as any;
      } else {
        result[key as keyof PerformanceConfig] = value as any;
      }
    }

    return result;
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...defaultPerformanceConfig };
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(configJson: string): void {
    try {
      const imported = JSON.parse(configJson);
      this.config = this.mergeConfigs(defaultPerformanceConfig, imported);
    } catch (error) {
      console.error('Failed to import performance configuration:', error);
    }
  }
}

/**
 * Global performance configuration instance
 */
export const performanceConfig = PerformanceConfigManager.getInstance();

/**
 * Utility functions for checking configuration
 */
export const isFeatureEnabled = {
  textStyleCaching: () => performanceConfig.getConfig().renderer.enableTextStyleCaching,
  conditionalRAF: () => performanceConfig.getConfig().animation.enableConditionalRAF,
  autoCleanup: () => performanceConfig.getConfig().memory.enableAutoCleanup,
  performanceMonitor: () => performanceConfig.getConfig().development.enablePerformanceMonitor,
  memoryMonitoring: () => performanceConfig.getConfig().memory.enableMemoryMonitoring,
};

/**
 * Performance thresholds
 */
export const performanceThresholds = {
  get memoryThreshold() {
    return performanceConfig.getConfig().memory.memoryThreshold;
  },
  get frameDropThreshold() {
    return performanceConfig.getConfig().animation.frameDropThreshold;
  },
  get maxCacheSize() {
    return performanceConfig.getConfig().memory.maxCacheSize;
  },
};
