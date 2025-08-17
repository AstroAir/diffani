import React, {
  Suspense,
  lazy,
  ComponentType,
  useRef,
  useEffect,
  useState,
} from 'react';
import { useLazyLoading, usePerformanceMonitor } from '../../utils/performance';
import { Button } from './button';
import LoadingSpinner from './LoadingSpinner';
import styles from './LazyComponent.module.scss';

export interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  minHeight?: number;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  options: LazyLoadOptions = {},
) {
  const LazyWrappedComponent = React.forwardRef<any, P & LazyComponentProps>(
    (props, ref) => {
      const {
        threshold = 0.1,
        fallback,
        onLoad,
        onError,
        className,
        ...componentProps
      } = props;
      const [hasLoaded, setHasLoaded] = useState(false);
      const [error, setError] = useState<Error | null>(null);

      const { elementRef, isVisible, addCallback, removeCallback } =
        useLazyLoading(threshold);
      usePerformanceMonitor(
        `LazyComponent(${Component.displayName || Component.name})`,
      );

      useEffect(() => {
        const loadCallback = () => {
          if (!hasLoaded) {
            setHasLoaded(true);
            onLoad?.();
          }
        };

        addCallback(loadCallback);
        return () => removeCallback(loadCallback);
      }, [hasLoaded, onLoad, addCallback, removeCallback]);

      const handleError = (err: Error) => {
        setError(err);
        onError?.(err);
      };

      if (error) {
        return (
          <div
            className={`${styles.lazyComponent} ${styles.error} ${className || ''}`}
            ref={elementRef}
          >
            <div className={styles.errorContent}>
              <h3>Failed to load component</h3>
              <p>{error.message}</p>
              <button
                onClick={() => {
                  setError(null);
                  setHasLoaded(false);
                }}
                className={styles.retryButton}
              >
                Retry
              </button>
            </div>
          </div>
        );
      }

      return (
        <div
          className={`${styles.lazyComponent} ${className || ''}`}
          ref={elementRef}
        >
          {hasLoaded ? (
            <Suspense fallback={fallback || <LoadingSpinner />}>
              <Component {...(componentProps as P)} ref={ref} />
            </Suspense>
          ) : (
            <div className={styles.placeholder}>
              {fallback || <LoadingSpinner />}
            </div>
          )}
        </div>
      );
    },
  );

  LazyWrappedComponent.displayName = `LazyLoaded(${Component.displayName || Component.name})`;
  return LazyWrappedComponent;
}

// Lazy component wrapper
export default function LazyComponent({
  children,
  fallback,
  threshold = 0.1,
  minHeight = 100,
  placeholder,
  onLoad,
  onError,
  className,
}: LazyComponentProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { elementRef, isVisible, addCallback, removeCallback } =
    useLazyLoading(threshold);
  usePerformanceMonitor('LazyComponent');

  useEffect(() => {
    const loadCallback = () => {
      if (!isLoaded) {
        try {
          setIsLoaded(true);
          onLoad?.();
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          setError(error);
          onError?.(error);
        }
      }
    };

    if (isVisible) {
      // Add a small delay to prevent loading too many components at once
      const timeoutId = setTimeout(loadCallback, 50);
      return () => clearTimeout(timeoutId);
    }

    addCallback(loadCallback);
    return () => removeCallback(loadCallback);
  }, [isVisible, isLoaded, onLoad, onError, addCallback, removeCallback]);

  const handleRetry = () => {
    setError(null);
    setIsLoaded(false);
  };

  if (error) {
    return (
      <div
        className={`${styles.lazyComponent} ${styles.error} ${className || ''}`}
        ref={elementRef}
        style={{ minHeight }}
      >
        <div className={styles.errorContent}>
          <h3>Failed to load content</h3>
          <p>{error.message}</p>
          <Button
            onClick={handleRetry}
            className={styles.retryButton}
            variant="outline"
            size="sm"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.lazyComponent} ${className || ''}`}
      ref={elementRef}
      style={{ minHeight }}
    >
      {isLoaded ? (
        <div className={styles.content}>{children}</div>
      ) : (
        <div className={styles.placeholder} style={{ minHeight }}>
          {placeholder || fallback || <LoadingSpinner />}
        </div>
      )}
    </div>
  );
}

// Utility function to create lazy-loaded components
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyLoadOptions = {},
) {
  const LazyLoadedComponent = lazy(importFn);

  return withLazyLoading(LazyLoadedComponent, options);
}

// Pre-built lazy components for common heavy components
export const LazyEnhancedTimeline = createLazyComponent(
  () => import('../editing/EnhancedTimeline'),
  { threshold: 0.2 },
);

export const LazyVirtualizedTimeline = createLazyComponent(
  () => import('../editing/VirtualizedTimeline'),
  { threshold: 0.2 },
);

export const LazyAnimationPropertyPanel = createLazyComponent(
  () => import('../panels/AnimationPropertyPanel'),
  { threshold: 0.1 },
);

export const LazyVisualEffectsPanel = createLazyComponent(
  () => import('../panels/VisualEffectsPanel'),
  { threshold: 0.1 },
);

export const LazyKeyframeEditor = createLazyComponent(
  () => import('../editing/KeyframeEditor'),
  { threshold: 0.1 },
);

// Intersection Observer-based lazy loading hook for images
export function useLazyImage(src: string, options: LazyLoadOptions = {}) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const { elementRef, isVisible } = useLazyLoading(options.threshold || 0.1);

  useEffect(() => {
    if (isVisible && !imageSrc && !error) {
      const img = new Image();

      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };

      img.onerror = () => {
        setError(new Error(`Failed to load image: ${src}`));
      };

      img.src = src;
    }
  }, [isVisible, src, imageSrc, error]);

  return {
    ref: elementRef,
    src: imageSrc,
    isLoaded,
    error,
    retry: () => {
      setError(null);
      setImageSrc(undefined);
      setIsLoaded(false);
    },
  };
}

// Lazy loading for code splitting
export function useLazyModule<T>(
  importFn: () => Promise<T>,
  deps: React.DependencyList = [],
) {
  const [module, setModule] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadModule = React.useCallback(async () => {
    if (module || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const loadedModule = await importFn();
      setModule(loadedModule);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to load module');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [importFn, module, isLoading]);

  React.useEffect(() => {
    loadModule();
  }, deps);

  return {
    module,
    isLoading,
    error,
    reload: loadModule,
  };
}

// Performance-aware component loader
export function usePerformantLoader<T>(
  loadFn: () => Promise<T>,
  options: {
    delay?: number;
    timeout?: number;
    retries?: number;
  } = {},
) {
  const { delay = 0, timeout = 10000, retries = 3 } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const load = React.useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Add delay if specified
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Load timeout')), timeout);
      });

      // Race between load and timeout
      const result = await Promise.race([loadFn(), timeoutPromise]);
      setData(result);
      setAttempt(0);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Load failed');

      if (attempt < retries) {
        setAttempt((prev) => prev + 1);
        // Exponential backoff
        setTimeout(() => load(), Math.pow(2, attempt) * 1000);
      } else {
        setError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadFn, delay, timeout, retries, attempt, isLoading]);

  return {
    data,
    isLoading,
    error,
    load,
    retry: () => {
      setAttempt(0);
      load();
    },
  };
}
