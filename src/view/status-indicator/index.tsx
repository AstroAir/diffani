import { useState, useEffect } from 'react';
import styles from './index.module.scss';

interface StatusIndicatorProps {
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClose?: () => void;
}

export function StatusIndicator({ 
  message = 'Layout enhanced with advanced animations!', 
  type = 'success',
  duration = 5000,
  onClose 
}: StatusIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Entrance animation
    setTimeout(() => setIsAnimating(true), 100);
    
    // Auto-hide after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`${styles.statusIndicator} ${styles[type]} ${isAnimating ? styles.visible : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.content}>
        <div className={styles.icon}>
          {type === 'success' && '✨'}
          {type === 'info' && 'ℹ️'}
          {type === 'warning' && '⚠️'}
          {type === 'error' && '❌'}
        </div>
        <span className={styles.message}>{message}</span>
        <button 
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
      <div className={styles.progressBar} />
    </div>
  );
}
