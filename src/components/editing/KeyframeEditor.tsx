import { useState, useCallback, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { type Keyframe, type AnimationProperty, PropertyType } from '../../core/timeline/types';
import { getEasingFunction } from '../../core/transition/easing';
import styles from './KeyframeEditor.module.scss';

export interface KeyframeEditorProps {
  trackId: string;
  propertyId: string;
  property: AnimationProperty;
  timelineWidth: number;
  timelineDuration: number;
  currentTime: number;
  onKeyframeAdd: (time: number, value: unknown) => void;
  onKeyframeUpdate: (keyframeId: string, updates: Partial<Keyframe>) => void;
  onKeyframeDelete: (keyframeId: string) => void;
  onKeyframeSelect: (keyframeId: string, selected: boolean) => void;
  selectedKeyframes: Set<string>;
}

interface KeyframeItemProps {
  keyframe: Keyframe;
  property: AnimationProperty;
  position: number;
  isSelected: boolean;
  onUpdate: (updates: Partial<Keyframe>) => void;
  onDelete: () => void;
  onSelect: (selected: boolean) => void;
}

function KeyframeItem({
  keyframe,
  property,
  position,
  isSelected,
  onUpdate,
  onDelete,
  onSelect,
}: KeyframeItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(keyframe.value);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    onSelect(true);
  }, [onSelect]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditValue(keyframe.value);
  }, [keyframe.value]);

  const handleValueSubmit = useCallback(() => {
    onUpdate({ value: editValue });
    setIsEditing(false);
  }, [editValue, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValueSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(keyframe.value);
    } else if (e.key === 'Delete') {
      onDelete();
    }
  }, [handleValueSubmit, keyframe.value, onDelete]);

  const renderValueEditor = () => {
    switch (property.type) {
      case PropertyType.NUMBER:
        return (
          <input
            type="number"
            value={editValue as number}
            onChange={(e) => setEditValue(Number(e.target.value))}
            onBlur={handleValueSubmit}
            onKeyDown={handleKeyDown}
            className={styles.valueInput}
            autoFocus
            min={property.min}
            max={property.max}
            step={property.step}
          />
        );
      case PropertyType.COLOR:
        return (
          <input
            type="color"
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleValueSubmit}
            onKeyDown={handleKeyDown}
            className={styles.colorInput}
            autoFocus
          />
        );
      case PropertyType.BOOLEAN:
        return (
          <input
            type="checkbox"
            checked={editValue as boolean}
            onChange={(e) => {
              setEditValue(e.target.checked);
              onUpdate({ value: e.target.checked });
              setIsEditing(false);
            }}
            className={styles.booleanInput}
            autoFocus
          />
        );
      default:
        return (
          <input
            type="text"
            value={String(editValue)}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleValueSubmit}
            onKeyDown={handleKeyDown}
            className={styles.textInput}
            autoFocus
          />
        );
    }
  };

  return (
    <div
      className={`${styles.keyframe} ${isSelected ? styles.selected : ''} ${
        isDragging ? styles.dragging : ''
      }`}
      style={{ left: `${position}px` }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title={`Time: ${keyframe.time}ms, Value: ${keyframe.value}`}
    >
      <div className={styles.keyframeHandle} />
      
      {isEditing && (
        <div className={styles.valueEditor}>
          {renderValueEditor()}
        </div>
      )}

      {isSelected && (
        <div className={styles.keyframeInfo}>
          <div className={styles.infoItem}>
            <label>Time:</label>
            <span>{keyframe.time}ms</span>
          </div>
          <div className={styles.infoItem}>
            <label>Value:</label>
            <span>{String(keyframe.value)}</span>
          </div>
          {keyframe.easing && (
            <div className={styles.infoItem}>
              <label>Easing:</label>
              <span>{keyframe.easing}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KeyframeEditor({
  trackId,
  propertyId,
  property,
  timelineWidth,
  timelineDuration,
  currentTime,
  onKeyframeAdd,
  onKeyframeUpdate,
  onKeyframeDelete,
  onKeyframeSelect,
  selectedKeyframes,
}: KeyframeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedKeyframe, setDraggedKeyframe] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  // Convert time to pixel position
  const timeToPixel = useCallback(
    (time: number) => {
      return (time / timelineDuration) * timelineWidth;
    },
    [timelineDuration, timelineWidth]
  );

  // Convert pixel position to time
  const pixelToTime = useCallback(
    (pixel: number) => {
      return (pixel / timelineWidth) * timelineDuration;
    },
    [timelineWidth, timelineDuration]
  );

  // Handle timeline click to add keyframe
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = pixelToTime(x);

      // Get current value at this time or use default
      const currentValue = property.defaultValue;
      onKeyframeAdd(time, currentValue);
    },
    [pixelToTime, property.defaultValue, onKeyframeAdd]
  );

  // Handle keyframe dragging
  useEffect(() => {
    if (!draggedKeyframe) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const deltaX = x - dragStartX;
      const deltaTime = pixelToTime(deltaX) - pixelToTime(0);
      const newTime = Math.max(0, Math.min(timelineDuration, dragStartTime + deltaTime));

      onKeyframeUpdate(draggedKeyframe, { time: newTime });
    };

    const handleMouseUp = () => {
      setDraggedKeyframe(null);
      setDragStartX(0);
      setDragStartTime(0);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    draggedKeyframe,
    dragStartX,
    dragStartTime,
    pixelToTime,
    timelineDuration,
    onKeyframeUpdate,
  ]);

  // Handle keyframe selection
  const handleKeyframeMouseDown = useCallback(
    (keyframeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const keyframe = property.keyframes.find(k => k.id === keyframeId);
      
      if (keyframe) {
        setDraggedKeyframe(keyframeId);
        setDragStartX(x);
        setDragStartTime(keyframe.time);
        onKeyframeSelect(keyframeId, true);
      }
    },
    [property.keyframes, onKeyframeSelect]
  );

  // Render property curve (simplified)
  const renderPropertyCurve = () => {
    if (property.keyframes.length < 2) return null;

    const sortedKeyframes = [...property.keyframes].sort((a, b) => a.time - b.time);
    let pathData = '';

    sortedKeyframes.forEach((keyframe, index) => {
      const x = timeToPixel(keyframe.time);
      const y = 50; // Simplified - would need proper value-to-pixel conversion
      
      if (index === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        const prevKeyframe = sortedKeyframes[index - 1];
        const prevX = timeToPixel(prevKeyframe.time);
        
        if (keyframe.easing) {
          // Create bezier curve based on easing
          const easingFunc = getEasingFunction(keyframe.easing);
          const controlX1 = prevX + (x - prevX) * 0.33;
          const controlY1 = 50 - easingFunc(0.33) * 20;
          const controlX2 = prevX + (x - prevX) * 0.66;
          const controlY2 = 50 - easingFunc(0.66) * 20;
          
          pathData += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${x} ${y}`;
        } else {
          pathData += ` L ${x} ${y}`;
        }
      }
    });

    return (
      <svg className={styles.propertyCurve} width={timelineWidth} height="100">
        <path
          d={pathData}
          stroke="var(--accent-color)"
          strokeWidth="2"
          fill="none"
          opacity="0.6"
        />
      </svg>
    );
  };

  return (
    <div className={styles.keyframeEditor}>
      <div className={styles.propertyHeader}>
        <span className={styles.propertyName}>{property.name}</span>
        <span className={styles.propertyType}>{property.type}</span>
      </div>

      <div
        ref={containerRef}
        className={styles.keyframeTrack}
        onClick={handleTimelineClick}
        style={{ width: timelineWidth }}
      >
        {/* Property curve */}
        {renderPropertyCurve()}

        {/* Current time indicator */}
        <div
          className={styles.currentTimeIndicator}
          style={{ left: `${timeToPixel(currentTime)}px` }}
        />

        {/* Keyframes */}
        {property.keyframes.map((keyframe) => (
          <KeyframeItem
            key={keyframe.id}
            keyframe={keyframe}
            property={property}
            position={timeToPixel(keyframe.time)}
            isSelected={selectedKeyframes.has(keyframe.id)}
            onUpdate={(updates) => onKeyframeUpdate(keyframe.id, updates)}
            onDelete={() => onKeyframeDelete(keyframe.id)}
            onSelect={(selected) => onKeyframeSelect(keyframe.id, selected)}
          />
        ))}

        {/* Grid lines */}
        <div className={styles.gridLines}>
          {Array.from({ length: 11 }, (_, i) => (
            <div
              key={i}
              className={styles.gridLine}
              style={{ left: `${(i / 10) * timelineWidth}px` }}
            />
          ))}
        </div>
      </div>

      {/* Property controls */}
      <div className={styles.propertyControls}>
        <div className={styles.controlGroup}>
          <label>Default:</label>
          <span className={styles.defaultValue}>{String(property.defaultValue)}</span>
        </div>
        
        {property.min !== undefined && (
          <div className={styles.controlGroup}>
            <label>Min:</label>
            <span>{property.min}</span>
          </div>
        )}
        
        {property.max !== undefined && (
          <div className={styles.controlGroup}>
            <label>Max:</label>
            <span>{property.max}</span>
          </div>
        )}
      </div>
    </div>
  );
}
