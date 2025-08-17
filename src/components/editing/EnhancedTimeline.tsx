import { useState, useCallback, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import {
  type Timeline,
  type TimelineTrack,
  type Keyframe,
  TrackType,
  PlaybackState,
  DEFAULT_TIMELINE_CONFIG,
} from '../../core/timeline/types';
import { TimelineEngine } from '../../core/timeline/timeline-engine';
import KeyframeEditor from './KeyframeEditor';
import styles from './EnhancedTimeline.module.scss';

export interface EnhancedTimelineProps {
  height?: number;
  onTimeChange?: (time: number) => void;
  onPlaybackStateChange?: (state: PlaybackState) => void;
  showKeyframeEditor?: boolean;
  enableRealTimePreview?: boolean;
}

export default function EnhancedTimeline({
  height = 400,
  onTimeChange,
  onPlaybackStateChange,
  showKeyframeEditor = true,
  enableRealTimePreview = true,
}: EnhancedTimelineProps) {
  const { doc, currentTime, playing, setCurrentTime, setPlaying } = useStore(
    useShallow((state) => ({
      doc: state.doc,
      currentTime: state.currentTime,
      playing: state.playing,
      setCurrentTime: state.setCurrentTime,
      setPlaying: state.setPlaying,
    })),
  );

  const [timeline, setTimeline] = useState<Timeline>(() => ({
    id: 'main-timeline',
    name: 'Main Timeline',
    duration: DEFAULT_TIMELINE_CONFIG.duration,
    currentTime: 0,
    playbackRate: 1.0,
    tracks: [],
    markers: [],
    loop: false,
    autoPlay: false,
  }));

  const [timelineEngine] = useState(() => new TimelineEngine(timeline));
  const [viewportStart, setViewportStart] = useState(0);
  const [viewportEnd, setViewportEnd] = useState(
    DEFAULT_TIMELINE_CONFIG.duration,
  );
  const [selectedKeyframes, setSelectedKeyframes] = useState<Set<string>>(
    new Set(),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const timelineWidth = 800; // Fixed width for now, could be dynamic

  // Convert time to pixel position
  const timeToPixel = useCallback(
    (time: number) => {
      const viewportDuration = viewportEnd - viewportStart;
      return ((time - viewportStart) / viewportDuration) * timelineWidth;
    },
    [viewportStart, viewportEnd, timelineWidth],
  );

  // Convert pixel position to time
  const pixelToTime = useCallback(
    (pixel: number) => {
      const viewportDuration = viewportEnd - viewportStart;
      return viewportStart + (pixel / timelineWidth) * viewportDuration;
    },
    [viewportStart, viewportEnd, timelineWidth],
  );

  // Update timeline engine when timeline changes
  useEffect(() => {
    timelineEngine.setTimeline(timeline);
  }, [timeline, timelineEngine]);

  // Sync current time with store
  useEffect(() => {
    setTimeline((prev) => ({ ...prev, currentTime }));
  }, [currentTime]);

  // Handle timeline click to set current time
  const handleTimelineClick = useCallback(
    (event: React.MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const time = pixelToTime(x);

      setCurrentTime(time);
      onTimeChange?.(time);
    },
    [pixelToTime, setCurrentTime, onTimeChange],
  );

  // Handle playhead dragging
  const handlePlayheadMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setIsDragging(true);
      setDragStartX(event.clientX);
      setDragStartTime(currentTime);
    },
    [currentTime],
  );

  // Handle mouse move for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const time = Math.max(0, Math.min(timeline.duration, pixelToTime(x)));

      setCurrentTime(time);
      onTimeChange?.(time);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging,
    pixelToTime,
    timeline.duration,
    setCurrentTime,
    onTimeChange,
  ]);

  // Add track
  const addTrack = useCallback((type: TrackType) => {
    const newTrack: TimelineTrack = {
      id: `track-${Date.now()}`,
      name: `${type} Track`,
      type,
      properties: [],
      enabled: true,
      locked: false,
      collapsed: false,
      color: type === TrackType.TRANSFORM ? '#007acc' : '#ff6b6b',
    };

    setTimeline((prev) => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
    }));
  }, []);

  // Remove track
  const removeTrack = useCallback((trackId: string) => {
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((track) => track.id !== trackId),
    }));
  }, []);

  // Toggle track enabled/disabled
  const toggleTrack = useCallback((trackId: string) => {
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) =>
        track.id === trackId ? { ...track, enabled: !track.enabled } : track,
      ),
    }));
  }, []);

  // Zoom timeline
  const zoomTimeline = useCallback(
    (factor: number) => {
      const center = (viewportStart + viewportEnd) / 2;
      const newDuration = (viewportEnd - viewportStart) / factor;
      const newStart = Math.max(0, center - newDuration / 2);
      const newEnd = Math.min(timeline.duration, center + newDuration / 2);

      setViewportStart(newStart);
      setViewportEnd(newEnd);
    },
    [viewportStart, viewportEnd, timeline.duration],
  );

  // Generate ruler marks
  const generateRulerMarks = () => {
    const marks = [];
    const viewportDuration = viewportEnd - viewportStart;
    const step = viewportDuration / 10;

    for (let i = 0; i <= 10; i++) {
      const time = viewportStart + i * step;
      const position = (i / 10) * timelineWidth;

      marks.push(
        <div
          key={i}
          className={styles.rulerMark}
          style={{ left: `${position}px` }}
        >
          <div className={styles.rulerLine} />
          <div className={styles.rulerLabel}>
            {Math.round(time / 100) / 10}s
          </div>
        </div>,
      );
    }

    return marks;
  };

  // Format time for display
  const formatTime = (time: number) => {
    const seconds = Math.floor(time / 1000);
    const milliseconds = Math.floor((time % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  // Handle keyframe operations
  const handleKeyframeAdd = useCallback(
    (trackId: string, propertyId: string, time: number, value: unknown) => {
      const keyframe: Keyframe = {
        id: `keyframe-${Date.now()}`,
        time,
        value,
        easing: 'easeInOut',
      };

      timelineEngine.addKeyframe(trackId, propertyId, keyframe);

      // Update timeline state
      setTimeline((prev) => ({
        ...prev,
        tracks: prev.tracks.map((track) => {
          if (track.id === trackId) {
            return {
              ...track,
              properties: track.properties.map((prop) => {
                if (prop.id === propertyId) {
                  return {
                    ...prop,
                    keyframes: [...prop.keyframes, keyframe].sort(
                      (a, b) => a.time - b.time,
                    ),
                  };
                }
                return prop;
              }),
            };
          }
          return track;
        }),
      }));
    },
    [timelineEngine],
  );

  const handleKeyframeUpdate = useCallback(
    (
      trackId: string,
      propertyId: string,
      keyframeId: string,
      updates: Partial<Keyframe>,
    ) => {
      timelineEngine.updateKeyframe(trackId, propertyId, keyframeId, updates);

      // Update timeline state
      setTimeline((prev) => ({
        ...prev,
        tracks: prev.tracks.map((track) => {
          if (track.id === trackId) {
            return {
              ...track,
              properties: track.properties.map((prop) => {
                if (prop.id === propertyId) {
                  return {
                    ...prop,
                    keyframes: prop.keyframes
                      .map((kf) =>
                        kf.id === keyframeId ? { ...kf, ...updates } : kf,
                      )
                      .sort((a, b) => a.time - b.time),
                  };
                }
                return prop;
              }),
            };
          }
          return track;
        }),
      }));
    },
    [timelineEngine],
  );

  const handleKeyframeDelete = useCallback(
    (trackId: string, propertyId: string, keyframeId: string) => {
      timelineEngine.removeKeyframe(trackId, propertyId, keyframeId);

      // Update timeline state
      setTimeline((prev) => ({
        ...prev,
        tracks: prev.tracks.map((track) => {
          if (track.id === trackId) {
            return {
              ...track,
              properties: track.properties.map((prop) => {
                if (prop.id === propertyId) {
                  return {
                    ...prop,
                    keyframes: prop.keyframes.filter(
                      (kf) => kf.id !== keyframeId,
                    ),
                  };
                }
                return prop;
              }),
            };
          }
          return track;
        }),
      }));
    },
    [timelineEngine],
  );

  const handleKeyframeSelect = useCallback(
    (keyframeId: string, selected: boolean) => {
      setSelectedKeyframes((prev) => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(keyframeId);
        } else {
          newSet.delete(keyframeId);
        }
        return newSet;
      });
    },
    [],
  );

  return (
    <div className={styles.enhancedTimeline} style={{ height }}>
      {/* Timeline Header */}
      <div className={styles.header}>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.playButton}
            onClick={() => {
              const newPlaying = !playing;
              setPlaying(newPlaying);
              onPlaybackStateChange?.(
                newPlaying ? PlaybackState.PLAYING : PlaybackState.PAUSED,
              );
            }}
          >
            {playing ? '⏸️' : '▶️'}
          </button>

          <div className={styles.timeDisplay}>
            {formatTime(currentTime)} / {formatTime(timeline.duration)}
          </div>

          <button
            type="button"
            className={styles.addTrackButton}
            onClick={() => addTrack(TrackType.TRANSFORM)}
          >
            + Track
          </button>
        </div>

        <div className={styles.zoomControls}>
          <button onClick={() => zoomTimeline(0.5)}>🔍-</button>
          <button onClick={() => zoomTimeline(2)}>🔍+</button>
          <button
            onClick={() => {
              setViewportStart(0);
              setViewportEnd(timeline.duration);
            }}
          >
            Fit
          </button>
        </div>
      </div>

      {/* Timeline Ruler */}
      <div ref={rulerRef} className={styles.ruler}>
        {generateRulerMarks()}

        {/* Playhead */}
        <div
          className={styles.playhead}
          style={{ left: `${timeToPixel(currentTime)}px` }}
          onMouseDown={handlePlayheadMouseDown}
        >
          <div className={styles.playheadLine} />
          <div className={styles.playheadHandle} />
        </div>
      </div>

      {/* Timeline Content */}
      <div
        ref={timelineRef}
        className={styles.timelineContent}
        onClick={handleTimelineClick}
      >
        {/* Tracks */}
        {timeline.tracks.map((track) => (
          <div key={track.id} className={styles.track}>
            <div className={styles.trackHeader}>
              <div className={styles.trackInfo}>
                <input
                  type="checkbox"
                  checked={track.enabled}
                  onChange={() => toggleTrack(track.id)}
                  className={styles.trackToggle}
                />
                <span className={styles.trackName}>{track.name}</span>
                <span className={styles.trackType}>{track.type}</span>
              </div>
              <button
                type="button"
                className={styles.removeTrackButton}
                onClick={() => removeTrack(track.id)}
              >
                ×
              </button>
            </div>

            {showKeyframeEditor && (
              <div className={styles.trackContent}>
                {track.properties.map((property) => (
                  <KeyframeEditor
                    key={property.id}
                    trackId={track.id}
                    propertyId={property.id}
                    property={property}
                    timelineWidth={timelineWidth}
                    timelineDuration={viewportEnd - viewportStart}
                    currentTime={currentTime}
                    onKeyframeAdd={(time, value) =>
                      handleKeyframeAdd(track.id, property.id, time, value)
                    }
                    onKeyframeUpdate={(keyframeId, updates) =>
                      handleKeyframeUpdate(
                        track.id,
                        property.id,
                        keyframeId,
                        updates,
                      )
                    }
                    onKeyframeDelete={(keyframeId) =>
                      handleKeyframeDelete(track.id, property.id, keyframeId)
                    }
                    onKeyframeSelect={handleKeyframeSelect}
                    selectedKeyframes={selectedKeyframes}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {timeline.tracks.length === 0 && (
          <div className={styles.emptyState}>
            <p>
              No tracks yet. Click "+ Track" to add your first animation track.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
