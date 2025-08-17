import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import styles from './Toast.module.scss';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export function ToastProvider({ 
  children, 
  maxToasts = 5, 
  defaultDuration = 5000 
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? defaultDuration,
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });

    return id;
  }, [maxToasts, defaultDuration]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className={styles.toastContainer}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
}

function ToastItem({ toast }: ToastItemProps) {
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast.persistent && toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.persistent]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300); // Match animation duration
  }, [toast.id, removeToast]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  };

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]} ${
        isVisible ? styles.visible : ''
      } ${isExiting ? styles.exiting : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.toastContent}>
        <div className={styles.toastIcon}>
          {getIcon()}
        </div>
        
        <div className={styles.toastText}>
          {toast.title && (
            <div className={styles.toastTitle}>{toast.title}</div>
          )}
          <div className={styles.toastMessage}>{toast.message}</div>
        </div>

        {toast.action && (
          <button
            type="button"
            className={styles.toastAction}
            onClick={toast.action.onClick}
          >
            {toast.action.label}
          </button>
        )}

        <button
          type="button"
          className={styles.toastClose}
          onClick={handleClose}
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>

      {!toast.persistent && toast.duration && (
        <div 
          className={styles.toastProgress}
          style={{ 
            animationDuration: `${toast.duration}ms`,
            animationPlayState: isExiting ? 'paused' : 'running'
          }}
        />
      )}
    </div>
  );
}

// Convenience hooks for different toast types
export const useToastHelpers = () => {
  const { addToast } = useToast();

  const success = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ ...options, type: 'success', message });
  }, [addToast]);

  const error = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ ...options, type: 'error', message, persistent: true });
  }, [addToast]);

  const warning = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ ...options, type: 'warning', message });
  }, [addToast]);

  const info = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ ...options, type: 'info', message });
  }, [addToast]);

  return { success, error, warning, info };
};
