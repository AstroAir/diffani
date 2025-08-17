import { ReactNode } from 'react';
import styles from './LoadingSpinner.module.scss';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'accent' | 'white';
  className?: string;
}

export interface LoadingOverlayProps extends LoadingSpinnerProps {
  isLoading: boolean;
  children: ReactNode;
  message?: string;
  backdrop?: boolean;
}

export function LoadingSpinner({ 
  size = 'medium', 
  color = 'accent', 
  className 
}: LoadingSpinnerProps) {
  return (
    <div 
      className={`${styles.spinner} ${styles[size]} ${styles[color]} ${className || ''}`}
      role="status"
      aria-label="Loading"
    >
      <div className={styles.spinnerRing}>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
}

export function LoadingOverlay({
  isLoading,
  children,
  message = 'Loading...',
  backdrop = true,
  size = 'large',
  color = 'accent',
  className,
}: LoadingOverlayProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className={`${styles.loadingOverlay} ${className || ''}`}>
      {children}
      <div className={`${styles.overlay} ${backdrop ? styles.withBackdrop : ''}`}>
        <div className={styles.loadingContent}>
          <LoadingSpinner size={size} color={color} />
          {message && <p className={styles.loadingMessage}>{message}</p>}
        </div>
      </div>
    </div>
  );
}

export interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  animate?: boolean;
}

export function SkeletonLoader({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  className,
  animate = true,
}: SkeletonLoaderProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
  };

  return (
    <div 
      className={`${styles.skeleton} ${animate ? styles.animate : ''} ${className || ''}`}
      style={style}
      role="status"
      aria-label="Loading content"
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={`${styles.skeletonText} ${className || ''}`}>
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonLoader
          key={index}
          height="16px"
          width={index === lines - 1 ? '60%' : '100%'}
          className={styles.skeletonLine}
        />
      ))}
    </div>
  );
}

export interface LoadingDotsProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'accent' | 'white';
  className?: string;
}

export function LoadingDots({ 
  size = 'medium', 
  color = 'accent', 
  className 
}: LoadingDotsProps) {
  return (
    <div 
      className={`${styles.loadingDots} ${styles[size]} ${styles[color]} ${className || ''}`}
      role="status"
      aria-label="Loading"
    >
      <div className={styles.dot}></div>
      <div className={styles.dot}></div>
      <div className={styles.dot}></div>
    </div>
  );
}

// Progress bar component
export interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
  showPercentage?: boolean;
  className?: string;
  animated?: boolean;
}

export function ProgressBar({
  progress,
  size = 'medium',
  color = 'accent',
  showPercentage = false,
  className,
  animated = true,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`${styles.progressContainer} ${className || ''}`}>
      <div className={`${styles.progressBar} ${styles[size]} ${styles[color]}`}>
        <div 
          className={`${styles.progressFill} ${animated ? styles.animated : ''}`}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showPercentage && (
        <span className={styles.progressText}>
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
}
