import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePerformanceMonitor, useThrottle } from '../../utils/performance';
import { useTouchGestures } from '../../utils/touch';
import styles from './CurveEditor.module.scss';

export interface CurvePoint {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}

export interface CurveEditorProps {
  width?: number;
  height?: number;
  points: CurvePoint[];
  onPointsChange: (points: CurvePoint[]) => void;
  gridSize?: number;
  snapToGrid?: boolean;
  showHandles?: boolean;
  readOnly?: boolean;
  className?: string;
  onCurveChange?: (curve: string) => void;
}

export default function CurveEditor({
  width = 400,
  height = 300,
  points,
  onPointsChange,
  gridSize = 20,
  snapToGrid = false,
  showHandles = true,
  readOnly = false,
  className,
  onCurveChange,
}: CurveEditorProps) {
  usePerformanceMonitor('CurveEditor');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPoint, setDraggedPoint] = useState<number | null>(null);
  const [draggedHandle, setDraggedHandle] = useState<{ pointIndex: number; handle: 'in' | 'out' } | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  // Touch support
  const { on: onTouch } = useTouchGestures(canvasRef);

  // Throttled drawing for performance
  const throttledDraw = useThrottle(() => {
    draw();
  }, 16);

  // Convert canvas coordinates to curve coordinates (0-1 range)
  const canvasToCurve = useCallback((canvasX: number, canvasY: number) => {
    return {
      x: Math.max(0, Math.min(1, canvasX / width)),
      y: Math.max(0, Math.min(1, 1 - canvasY / height)),
    };
  }, [width, height]);

  // Convert curve coordinates to canvas coordinates
  const curveToCanvas = useCallback((curveX: number, curveY: number) => {
    return {
      x: curveX * width,
      y: (1 - curveY) * height,
    };
  }, [width, height]);

  // Snap to grid if enabled
  const snapPoint = useCallback((point: { x: number; y: number }) => {
    if (!snapToGrid) return point;

    const gridX = gridSize / width;
    const gridY = gridSize / height;

    return {
      x: Math.round(point.x / gridX) * gridX,
      y: Math.round(point.y / gridY) * gridY,
    };
  }, [snapToGrid, gridSize, width, height]);

  // Find point near coordinates
  const findPointNear = useCallback((canvasX: number, canvasY: number, threshold = 10) => {
    for (let i = 0; i < points.length; i++) {
      const canvas = curveToCanvas(points[i].x, points[i].y);
      const distance = Math.sqrt(
        Math.pow(canvas.x - canvasX, 2) + Math.pow(canvas.y - canvasY, 2)
      );
      if (distance <= threshold) {
        return i;
      }
    }
    return null;
  }, [points, curveToCanvas]);

  // Find handle near coordinates
  const findHandleNear = useCallback((canvasX: number, canvasY: number, threshold = 8) => {
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const canvas = curveToCanvas(point.x, point.y);

      if (point.handleIn) {
        const handleCanvas = curveToCanvas(
          point.x + point.handleIn.x,
          point.y + point.handleIn.y
        );
        const distance = Math.sqrt(
          Math.pow(handleCanvas.x - canvasX, 2) + Math.pow(handleCanvas.y - canvasY, 2)
        );
        if (distance <= threshold) {
          return { pointIndex: i, handle: 'in' as const };
        }
      }

      if (point.handleOut) {
        const handleCanvas = curveToCanvas(
          point.x + point.handleOut.x,
          point.y + point.handleOut.y
        );
        const distance = Math.sqrt(
          Math.pow(handleCanvas.x - canvasX, 2) + Math.pow(handleCanvas.y - canvasY, 2)
        );
        if (distance <= threshold) {
          return { pointIndex: i, handle: 'out' as const };
        }
      }
    }
    return null;
  }, [points, curveToCanvas]);

  // Generate cubic bezier curve path
  const generateCurvePath = useCallback(() => {
    if (points.length < 2) return '';

    let path = '';
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);

    for (let i = 0; i < sortedPoints.length; i++) {
      const point = sortedPoints[i];
      const canvas = curveToCanvas(point.x, point.y);

      if (i === 0) {
        path += `M ${canvas.x} ${canvas.y}`;
      } else {
        const prevPoint = sortedPoints[i - 1];
        const prevCanvas = curveToCanvas(prevPoint.x, prevPoint.y);

        // Calculate control points
        let cp1x = prevCanvas.x;
        let cp1y = prevCanvas.y;
        let cp2x = canvas.x;
        let cp2y = canvas.y;

        if (prevPoint.handleOut) {
          const handleCanvas = curveToCanvas(
            prevPoint.x + prevPoint.handleOut.x,
            prevPoint.y + prevPoint.handleOut.y
          );
          cp1x = handleCanvas.x;
          cp1y = handleCanvas.y;
        }

        if (point.handleIn) {
          const handleCanvas = curveToCanvas(
            point.x + point.handleIn.x,
            point.y + point.handleIn.y
          );
          cp2x = handleCanvas.x;
          cp2y = handleCanvas.y;
        }

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${canvas.x} ${canvas.y}`;
      }
    }

    return path;
  }, [points, curveToCanvas]);

  // Draw the curve editor
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    if (gridSize > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Draw curve
    if (points.length >= 2) {
      const sortedPoints = [...points].sort((a, b) => a.x - b.x);
      
      ctx.strokeStyle = '#007acc';
      ctx.lineWidth = 3;
      ctx.beginPath();

      for (let i = 0; i < sortedPoints.length; i++) {
        const point = sortedPoints[i];
        const canvas = curveToCanvas(point.x, point.y);

        if (i === 0) {
          ctx.moveTo(canvas.x, canvas.y);
        } else {
          const prevPoint = sortedPoints[i - 1];
          const prevCanvas = curveToCanvas(prevPoint.x, prevPoint.y);

          // Calculate control points
          let cp1x = prevCanvas.x + (canvas.x - prevCanvas.x) * 0.33;
          let cp1y = prevCanvas.y;
          let cp2x = prevCanvas.x + (canvas.x - prevCanvas.x) * 0.66;
          let cp2y = canvas.y;

          if (prevPoint.handleOut) {
            const handleCanvas = curveToCanvas(
              prevPoint.x + prevPoint.handleOut.x,
              prevPoint.y + prevPoint.handleOut.y
            );
            cp1x = handleCanvas.x;
            cp1y = handleCanvas.y;
          }

          if (point.handleIn) {
            const handleCanvas = curveToCanvas(
              point.x + point.handleIn.x,
              point.y + point.handleIn.y
            );
            cp2x = handleCanvas.x;
            cp2y = handleCanvas.y;
          }

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, canvas.x, canvas.y);
        }
      }

      ctx.stroke();
    }

    // Draw points and handles
    points.forEach((point, index) => {
      const canvas = curveToCanvas(point.x, point.y);
      const isSelected = selectedPoint === index;
      const isHovered = hoveredPoint === index;

      // Draw handles
      if (showHandles && (isSelected || isHovered)) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;

        if (point.handleIn) {
          const handleCanvas = curveToCanvas(
            point.x + point.handleIn.x,
            point.y + point.handleIn.y
          );
          ctx.beginPath();
          ctx.moveTo(canvas.x, canvas.y);
          ctx.lineTo(handleCanvas.x, handleCanvas.y);
          ctx.stroke();

          // Handle point
          ctx.fillStyle = '#ff6b6b';
          ctx.beginPath();
          ctx.arc(handleCanvas.x, handleCanvas.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        if (point.handleOut) {
          const handleCanvas = curveToCanvas(
            point.x + point.handleOut.x,
            point.y + point.handleOut.y
          );
          ctx.beginPath();
          ctx.moveTo(canvas.x, canvas.y);
          ctx.lineTo(handleCanvas.x, handleCanvas.y);
          ctx.stroke();

          // Handle point
          ctx.fillStyle = '#ff6b6b';
          ctx.beginPath();
          ctx.arc(handleCanvas.x, handleCanvas.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw point
      ctx.fillStyle = isSelected ? '#00d4ff' : isHovered ? '#007acc' : '#ffffff';
      ctx.beginPath();
      ctx.arc(canvas.x, canvas.y, isSelected ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();

      // Point border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [points, width, height, gridSize, showHandles, selectedPoint, hoveredPoint, curveToCanvas]);

  // Handle mouse events
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (readOnly) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    // Check for handle drag first
    const handle = findHandleNear(canvasX, canvasY);
    if (handle) {
      setDraggedHandle(handle);
      setIsDragging(true);
      return;
    }

    // Check for point drag
    const pointIndex = findPointNear(canvasX, canvasY);
    if (pointIndex !== null) {
      setDraggedPoint(pointIndex);
      setSelectedPoint(pointIndex);
      setIsDragging(true);
      return;
    }

    // Add new point
    const curveCoords = canvasToCurve(canvasX, canvasY);
    const snappedCoords = snapPoint(curveCoords);
    
    const newPoint: CurvePoint = {
      x: snappedCoords.x,
      y: snappedCoords.y,
      handleIn: { x: -0.1, y: 0 },
      handleOut: { x: 0.1, y: 0 },
    };

    const newPoints = [...points, newPoint];
    onPointsChange(newPoints);
    setSelectedPoint(newPoints.length - 1);
  }, [readOnly, findHandleNear, findPointNear, canvasToCurve, snapPoint, points, onPointsChange]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    if (isDragging) {
      if (draggedHandle) {
        // Drag handle
        const point = points[draggedHandle.pointIndex];
        const pointCanvas = curveToCanvas(point.x, point.y);
        const handleOffset = {
          x: (canvasX - pointCanvas.x) / width,
          y: -(canvasY - pointCanvas.y) / height,
        };

        const newPoints = [...points];
        if (draggedHandle.handle === 'in') {
          newPoints[draggedHandle.pointIndex] = {
            ...point,
            handleIn: handleOffset,
          };
        } else {
          newPoints[draggedHandle.pointIndex] = {
            ...point,
            handleOut: handleOffset,
          };
        }

        onPointsChange(newPoints);
      } else if (draggedPoint !== null) {
        // Drag point
        const curveCoords = canvasToCurve(canvasX, canvasY);
        const snappedCoords = snapPoint(curveCoords);

        const newPoints = [...points];
        newPoints[draggedPoint] = {
          ...newPoints[draggedPoint],
          ...snappedCoords,
        };

        onPointsChange(newPoints);
      }
    } else {
      // Update hover state
      const pointIndex = findPointNear(canvasX, canvasY);
      setHoveredPoint(pointIndex);
    }
  }, [isDragging, draggedHandle, draggedPoint, points, curveToCanvas, canvasToCurve, snapPoint, onPointsChange, findPointNear, width, height]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedPoint(null);
    setDraggedHandle(null);
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (readOnly || selectedPoint === null) return;

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const newPoints = points.filter((_, index) => index !== selectedPoint);
      onPointsChange(newPoints);
      setSelectedPoint(null);
    }
  }, [readOnly, selectedPoint, points, onPointsChange]);

  // Touch support
  useEffect(() => {
    onTouch('tap', (gesture) => {
      if (readOnly) return;
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const canvasX = gesture.currentPoint.x - rect.left;
      const canvasY = gesture.currentPoint.y - rect.top;

      const pointIndex = findPointNear(canvasX, canvasY);
      if (pointIndex !== null) {
        setSelectedPoint(pointIndex);
      }
    });

    onTouch('pan', (gesture) => {
      if (readOnly || selectedPoint === null) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const canvasX = gesture.currentPoint.x - rect.left;
      const canvasY = gesture.currentPoint.y - rect.top;
      const curveCoords = canvasToCurve(canvasX, canvasY);
      const snappedCoords = snapPoint(curveCoords);

      const newPoints = [...points];
      newPoints[selectedPoint] = {
        ...newPoints[selectedPoint],
        ...snappedCoords,
      };

      onPointsChange(newPoints);
    });
  }, [onTouch, readOnly, selectedPoint, findPointNear, canvasToCurve, snapPoint, points, onPointsChange]);

  // Redraw when points change
  useEffect(() => {
    throttledDraw();
  }, [points, selectedPoint, hoveredPoint, throttledDraw]);

  // Generate curve string when points change
  useEffect(() => {
    if (onCurveChange) {
      const curvePath = generateCurvePath();
      onCurveChange(curvePath);
    }
  }, [points, onCurveChange, generateCurvePath]);

  return (
    <div className={`${styles.curveEditor} ${className || ''}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={styles.canvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      />
      
      {selectedPoint !== null && (
        <div className={styles.pointInfo}>
          <div className={styles.infoItem}>
            <label>X:</label>
            <span>{points[selectedPoint].x.toFixed(3)}</span>
          </div>
          <div className={styles.infoItem}>
            <label>Y:</label>
            <span>{points[selectedPoint].y.toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
