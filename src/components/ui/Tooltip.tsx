import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDebounce } from '../../utils/performance';
import styles from './Tooltip.module.scss';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  trigger?: 'hover' | 'click' | 'focus' | 'manual';
  delay?: number;
  hideDelay?: number;
  disabled?: boolean;
  className?: string;
  maxWidth?: number;
  offset?: number;
  arrow?: boolean;
  interactive?: boolean;
  zIndex?: number;
  onShow?: () => void;
  onHide?: () => void;
}

export interface TooltipPosition {
  top: number;
  left: number;
  position: 'top' | 'bottom' | 'left' | 'right';
}

function calculateTooltipPosition(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  preferredPosition: string,
  offset: number
): TooltipPosition {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };

  const positions = {
    top: {
      top: triggerRect.top + viewport.scrollY - tooltipRect.height - offset,
      left: triggerRect.left + viewport.scrollX + (triggerRect.width - tooltipRect.width) / 2,
      position: 'top' as const,
    },
    bottom: {
      top: triggerRect.bottom + viewport.scrollY + offset,
      left: triggerRect.left + viewport.scrollX + (triggerRect.width - tooltipRect.width) / 2,
      position: 'bottom' as const,
    },
    left: {
      top: triggerRect.top + viewport.scrollY + (triggerRect.height - tooltipRect.height) / 2,
      left: triggerRect.left + viewport.scrollX - tooltipRect.width - offset,
      position: 'left' as const,
    },
    right: {
      top: triggerRect.top + viewport.scrollY + (triggerRect.height - tooltipRect.height) / 2,
      left: triggerRect.right + viewport.scrollX + offset,
      position: 'right' as const,
    },
  };

  // Check if preferred position fits
  const preferred = positions[preferredPosition as keyof typeof positions];
  if (preferred && isPositionValid(preferred, tooltipRect, viewport)) {
    return preferred;
  }

  // Try other positions if preferred doesn't fit
  const fallbackOrder = ['top', 'bottom', 'right', 'left'];
  for (const pos of fallbackOrder) {
    const position = positions[pos as keyof typeof positions];
    if (isPositionValid(position, tooltipRect, viewport)) {
      return position;
    }
  }

  // Fallback to top if nothing fits
  return preferred || positions.top;
}

function isPositionValid(
  position: TooltipPosition,
  tooltipRect: DOMRect,
  viewport: { width: number; height: number; scrollX: number; scrollY: number }
): boolean {
  return (
    position.left >= 0 &&
    position.top >= 0 &&
    position.left + tooltipRect.width <= viewport.width &&
    position.top + tooltipRect.height <= viewport.height
  );
}

export default function Tooltip({
  content,
  children,
  position = 'auto',
  trigger = 'hover',
  delay = 200,
  hideDelay = 100,
  disabled = false,
  className,
  maxWidth = 300,
  offset = 8,
  arrow = true,
  interactive = false,
  zIndex = 1000,
  onShow,
  onHide,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();
  const isManuallyControlled = trigger === 'manual';

  // Debounced position calculation for performance
  const debouncedCalculatePosition = useDebounce(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    const pos = calculateTooltipPosition(
      triggerRect,
      tooltipRect,
      position === 'auto' ? 'top' : position,
      offset
    );
    
    setTooltipPosition(pos);
  }, 16);

  const showTooltip = useCallback(() => {
    if (disabled || isManuallyControlled) return;
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }

    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      onShow?.();
    }, delay);
  }, [disabled, isManuallyControlled, delay, onShow]);

  const hideTooltip = useCallback(() => {
    if (disabled || isManuallyControlled) return;

    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = undefined;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      onHide?.();
    }, hideDelay);
  }, [disabled, isManuallyControlled, hideDelay, onHide]);

  const handleMouseEnter = useCallback(() => {
    if (trigger === 'hover') {
      showTooltip();
    }
  }, [trigger, showTooltip]);

  const handleMouseLeave = useCallback(() => {
    if (trigger === 'hover') {
      hideTooltip();
    }
  }, [trigger, hideTooltip]);

  const handleClick = useCallback(() => {
    if (trigger === 'click') {
      if (isVisible) {
        hideTooltip();
      } else {
        showTooltip();
      }
    }
  }, [trigger, isVisible, showTooltip, hideTooltip]);

  const handleFocus = useCallback(() => {
    if (trigger === 'focus') {
      showTooltip();
    }
  }, [trigger, showTooltip]);

  const handleBlur = useCallback(() => {
    if (trigger === 'focus') {
      hideTooltip();
    }
  }, [trigger, hideTooltip]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isVisible) {
      hideTooltip();
    }
  }, [isVisible, hideTooltip]);

  // Calculate position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      debouncedCalculatePosition();
    }
  }, [isVisible, debouncedCalculatePosition]);

  // Recalculate position on scroll/resize
  useEffect(() => {
    if (!isVisible) return;

    const handleResize = () => debouncedCalculatePosition();
    const handleScroll = () => debouncedCalculatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isVisible, debouncedCalculatePosition]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Handle interactive tooltips
  const handleTooltipMouseEnter = useCallback(() => {
    if (interactive && hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }
  }, [interactive]);

  const handleTooltipMouseLeave = useCallback(() => {
    if (interactive && trigger === 'hover') {
      hideTooltip();
    }
  }, [interactive, trigger, hideTooltip]);

  // Clone children to add event handlers
  const triggerElement = React.cloneElement(
    children as React.ReactElement,
    {
      ref: (node: HTMLElement) => {
        triggerRef.current = node;
        
        // Handle existing ref
        const originalRef = (children as any).ref;
        if (typeof originalRef === 'function') {
          originalRef(node);
        } else if (originalRef) {
          originalRef.current = node;
        }
      },
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      'aria-describedby': isVisible ? 'tooltip' : undefined,
    }
  );

  const tooltipContent = isVisible && tooltipPosition && (
    <div
      ref={tooltipRef}
      className={`${styles.tooltip} ${styles[tooltipPosition.position]} ${className || ''}`}
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        maxWidth,
        zIndex,
      }}
      role="tooltip"
      id="tooltip"
      onMouseEnter={handleTooltipMouseEnter}
      onMouseLeave={handleTooltipMouseLeave}
    >
      <div className={styles.content}>
        {content}
      </div>
      {arrow && <div className={styles.arrow} />}
    </div>
  );

  return (
    <>
      {triggerElement}
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
}

// Utility component for simple text tooltips
export function TextTooltip({
  text,
  children,
  ...props
}: Omit<TooltipProps, 'content'> & { text: string }) {
  return (
    <Tooltip content={<span>{text}</span>} {...props}>
      {children}
    </Tooltip>
  );
}

// Utility component for rich content tooltips
export function RichTooltip({
  title,
  description,
  shortcut,
  children,
  ...props
}: Omit<TooltipProps, 'content'> & {
  title?: string;
  description?: string;
  shortcut?: string;
}) {
  const content = (
    <div className={styles.richContent}>
      {title && <div className={styles.title}>{title}</div>}
      {description && <div className={styles.description}>{description}</div>}
      {shortcut && <div className={styles.shortcut}>{shortcut}</div>}
    </div>
  );

  return (
    <Tooltip content={content} {...props}>
      {children}
    </Tooltip>
  );
}

// Hook for programmatic tooltip control
export function useTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible(prev => !prev), []);

  return {
    isVisible,
    show,
    hide,
    toggle,
    props: {
      trigger: 'manual' as const,
      // You would need to manually control visibility here
    },
  };
}
