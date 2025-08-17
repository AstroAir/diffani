/**
 * Touch support utilities for mobile devices
 */

import { useEffect, useRef, useCallback } from 'react';

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

export interface TouchGesture {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch' | 'pan' | 'rotate';
  startPoint: TouchPoint;
  currentPoint: TouchPoint;
  endPoint?: TouchPoint;
  distance?: number;
  angle?: number;
  scale?: number;
  rotation?: number;
  velocity?: { x: number; y: number };
  duration: number;
}

export interface TouchOptions {
  tapThreshold?: number;
  doubleTapDelay?: number;
  longPressDelay?: number;
  swipeThreshold?: number;
  pinchThreshold?: number;
  panThreshold?: number;
  preventDefault?: boolean;
}

export class TouchManager {
  private element: HTMLElement;
  private options: Required<TouchOptions>;
  private touches: Map<number, TouchPoint> = new Map();
  private lastTap: TouchPoint | null = null;
  private longPressTimer: NodeJS.Timeout | null = null;
  private callbacks: Map<string, (gesture: TouchGesture) => void> = new Map();

  constructor(element: HTMLElement, options: TouchOptions = {}) {
    this.element = element;
    this.options = {
      tapThreshold: 10,
      doubleTapDelay: 300,
      longPressDelay: 500,
      swipeThreshold: 50,
      pinchThreshold: 10,
      panThreshold: 5,
      preventDefault: true,
      ...options,
    };

    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: !this.options.preventDefault });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: !this.options.preventDefault });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: !this.options.preventDefault });
    this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: !this.options.preventDefault });
  }

  private handleTouchStart = (event: TouchEvent): void => {
    if (this.options.preventDefault) {
      event.preventDefault();
    }

    const now = Date.now();
    
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchPoint: TouchPoint = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        timestamp: now,
      };

      this.touches.set(touch.identifier, touchPoint);

      // Start long press timer for single touch
      if (this.touches.size === 1) {
        this.longPressTimer = setTimeout(() => {
          this.triggerGesture({
            type: 'long-press',
            startPoint: touchPoint,
            currentPoint: touchPoint,
            duration: now - touchPoint.timestamp,
          });
        }, this.options.longPressDelay);
      }
    }
  };

  private handleTouchMove = (event: TouchEvent): void => {
    if (this.options.preventDefault) {
      event.preventDefault();
    }

    const now = Date.now();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const startPoint = this.touches.get(touch.identifier);
      
      if (!startPoint) continue;

      const currentPoint: TouchPoint = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        timestamp: now,
      };

      const distance = this.calculateDistance(startPoint, currentPoint);

      // Cancel long press if moved too much
      if (distance > this.options.tapThreshold && this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      // Handle different gestures based on touch count
      if (this.touches.size === 1) {
        // Single touch - pan or swipe
        if (distance > this.options.panThreshold) {
          this.triggerGesture({
            type: 'pan',
            startPoint,
            currentPoint,
            distance,
            angle: this.calculateAngle(startPoint, currentPoint),
            velocity: this.calculateVelocity(startPoint, currentPoint),
            duration: now - startPoint.timestamp,
          });
        }
      } else if (this.touches.size === 2) {
        // Two touches - pinch or rotate
        const touches = Array.from(this.touches.values());
        if (touches.length === 2) {
          this.handleTwoTouchGesture(touches, now);
        }
      }

      // Update touch position
      this.touches.set(touch.identifier, currentPoint);
    }
  };

  private handleTouchEnd = (event: TouchEvent): void => {
    if (this.options.preventDefault) {
      event.preventDefault();
    }

    const now = Date.now();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const startPoint = this.touches.get(touch.identifier);
      
      if (!startPoint) continue;

      const endPoint: TouchPoint = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        timestamp: now,
      };

      const distance = this.calculateDistance(startPoint, endPoint);
      const duration = now - startPoint.timestamp;

      // Determine gesture type
      if (distance < this.options.tapThreshold) {
        // Tap or double tap
        if (this.lastTap && 
            now - this.lastTap.timestamp < this.options.doubleTapDelay &&
            this.calculateDistance(this.lastTap, endPoint) < this.options.tapThreshold) {
          // Double tap
          this.triggerGesture({
            type: 'double-tap',
            startPoint,
            currentPoint: endPoint,
            endPoint,
            duration,
          });
          this.lastTap = null;
        } else {
          // Single tap
          this.triggerGesture({
            type: 'tap',
            startPoint,
            currentPoint: endPoint,
            endPoint,
            duration,
          });
          this.lastTap = endPoint;
        }
      } else if (distance > this.options.swipeThreshold) {
        // Swipe
        this.triggerGesture({
          type: 'swipe',
          startPoint,
          currentPoint: endPoint,
          endPoint,
          distance,
          angle: this.calculateAngle(startPoint, endPoint),
          velocity: this.calculateVelocity(startPoint, endPoint),
          duration,
        });
      }

      this.touches.delete(touch.identifier);
    }

    // Clear long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  };

  private handleTouchCancel = (event: TouchEvent): void => {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touches.delete(touch.identifier);
    }

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  };

  private handleTwoTouchGesture(touches: TouchPoint[], now: number): void {
    const [touch1, touch2] = touches;
    
    // Calculate current distance and angle
    const currentDistance = this.calculateDistance(touch1, touch2);
    const currentAngle = this.calculateAngle(touch1, touch2);
    
    // Get initial positions (this would need to be stored when two touches start)
    // For now, we'll use a simplified approach
    const centerPoint: TouchPoint = {
      id: -1,
      x: (touch1.x + touch2.x) / 2,
      y: (touch1.y + touch2.y) / 2,
      timestamp: now,
    };

    // This is a simplified implementation - in a real app, you'd track initial state
    this.triggerGesture({
      type: 'pinch',
      startPoint: centerPoint,
      currentPoint: centerPoint,
      scale: 1, // Would calculate based on initial distance
      rotation: currentAngle,
      duration: now - Math.min(touch1.timestamp, touch2.timestamp),
    });
  }

  private calculateDistance(point1: TouchPoint, point2: TouchPoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateAngle(point1: TouchPoint, point2: TouchPoint): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  private calculateVelocity(startPoint: TouchPoint, endPoint: TouchPoint): { x: number; y: number } {
    const dt = endPoint.timestamp - startPoint.timestamp;
    if (dt === 0) return { x: 0, y: 0 };

    return {
      x: (endPoint.x - startPoint.x) / dt,
      y: (endPoint.y - startPoint.y) / dt,
    };
  }

  private triggerGesture(gesture: TouchGesture): void {
    const callback = this.callbacks.get(gesture.type);
    if (callback) {
      callback(gesture);
    }

    // Also trigger generic gesture callback
    const genericCallback = this.callbacks.get('gesture');
    if (genericCallback) {
      genericCallback(gesture);
    }
  }

  on(event: string, callback: (gesture: TouchGesture) => void): void {
    this.callbacks.set(event, callback);
  }

  off(event: string): void {
    this.callbacks.delete(event);
  }

  destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
    
    this.touches.clear();
    this.callbacks.clear();
  }
}

// React hook for touch gestures
export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: TouchOptions = {}
) {
  const touchManagerRef = useRef<TouchManager | null>(null);
  const callbacksRef = useRef<Map<string, (gesture: TouchGesture) => void>>(new Map());

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    touchManagerRef.current = new TouchManager(element, options);

    // Set up existing callbacks
    callbacksRef.current.forEach((callback, event) => {
      touchManagerRef.current?.on(event, callback);
    });

    return () => {
      touchManagerRef.current?.destroy();
      touchManagerRef.current = null;
    };
  }, [elementRef, options]);

  const on = useCallback((event: string, callback: (gesture: TouchGesture) => void) => {
    callbacksRef.current.set(event, callback);
    touchManagerRef.current?.on(event, callback);
  }, []);

  const off = useCallback((event: string) => {
    callbacksRef.current.delete(event);
    touchManagerRef.current?.off(event);
  }, []);

  return { on, off };
}

// Specific touch gesture hooks
export function useTap(
  elementRef: React.RefObject<HTMLElement>,
  onTap: (gesture: TouchGesture) => void,
  options: TouchOptions = {}
) {
  const { on } = useTouchGestures(elementRef, options);
  
  useEffect(() => {
    on('tap', onTap);
  }, [on, onTap]);
}

export function useDoubleTap(
  elementRef: React.RefObject<HTMLElement>,
  onDoubleTap: (gesture: TouchGesture) => void,
  options: TouchOptions = {}
) {
  const { on } = useTouchGestures(elementRef, options);
  
  useEffect(() => {
    on('double-tap', onDoubleTap);
  }, [on, onDoubleTap]);
}

export function useSwipe(
  elementRef: React.RefObject<HTMLElement>,
  onSwipe: (gesture: TouchGesture) => void,
  options: TouchOptions = {}
) {
  const { on } = useTouchGestures(elementRef, options);
  
  useEffect(() => {
    on('swipe', onSwipe);
  }, [on, onSwipe]);
}

export function usePinch(
  elementRef: React.RefObject<HTMLElement>,
  onPinch: (gesture: TouchGesture) => void,
  options: TouchOptions = {}
) {
  const { on } = useTouchGestures(elementRef, options);
  
  useEffect(() => {
    on('pinch', onPinch);
  }, [on, onPinch]);
}

export function usePan(
  elementRef: React.RefObject<HTMLElement>,
  onPan: (gesture: TouchGesture) => void,
  options: TouchOptions = {}
) {
  const { on } = useTouchGestures(elementRef, options);
  
  useEffect(() => {
    on('pan', onPan);
  }, [on, onPan]);
}

export function useLongPress(
  elementRef: React.RefObject<HTMLElement>,
  onLongPress: (gesture: TouchGesture) => void,
  options: TouchOptions = {}
) {
  const { on } = useTouchGestures(elementRef, options);
  
  useEffect(() => {
    on('long-press', onLongPress);
  }, [on, onLongPress]);
}

// Utility functions
export function getSwipeDirection(gesture: TouchGesture): 'up' | 'down' | 'left' | 'right' | null {
  if (!gesture.angle) return null;

  const angle = Math.abs(gesture.angle);
  
  if (angle < 45 || angle > 315) return 'right';
  if (angle >= 45 && angle < 135) return gesture.angle > 0 ? 'down' : 'up';
  if (angle >= 135 && angle < 225) return 'left';
  if (angle >= 225 && angle < 315) return gesture.angle > 0 ? 'down' : 'up';
  
  return null;
}

export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function supportsTouchEvents(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
