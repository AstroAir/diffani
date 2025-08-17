import { useState, useRef, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { TimelineEngine } from '../../core/timeline/timeline-engine';
import {
  type Timeline,
  type TimelineTrack,
  // type Keyframe, // Unused for now
  PlaybackState,
  TrackType,
  // PropertyType, // Unused for now
  DEFAULT_TIMELINE_CONFIG,
} from '../../core/timeline/types';
import styles from './index.module.scss';

interface TimelineProps {
  height?: number;
  onTimeChange?: (time: number) => void;
  onPlaybackStateChange?: (state: PlaybackState) => void;
}

export function Timeline({
  height = 300,
  onTimeChange,
  onPlaybackStateChange,
}: TimelineProps) {
  const { /* doc, */ currentTime, playing } = useStore(
    useShallow((state) => ({
      // doc: state.doc, // Unused for now
      currentTime: state.currentTime,
      playing: state.playing,
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
  const [selectedKeyframes, setSelectedKeyframes] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  // Update timeline engine when timeline changes
  useEffect(() => {
    timelineEngine.setTimeline(timeline);
  }, [timeline, timelineEngine]);

  // Sync with main app time
  useEffect(() => {
    setTimeline((prev) => ({ ...prev, currentTime }));
  }, [currentTime]);

  // Convert time to pixel position
  const timeToPixel = useCallback(
    (time: number): number => {
      const viewportDuration = viewportEnd - viewportStart;
      const timelineWidth = timelineRef.current?.clientWidth || 800;
      return ((time - viewportStart) / viewportDuration) * timelineWidth;
    },
    [viewportStart, viewportEnd],
  );

  // Convert pixel position to time
  const pixelToTime = useCallback(
    (pixel: number): number => {
      const viewportDuration = viewportEnd - viewportStart;
      const timelineWidth = timelineRef.current?.clientWidth || 800;
      return viewportStart + (pixel / timelineWidth) * viewportDuration;
    },
    [viewportStart, viewportEnd],
  );

  // Handle timeline click to set current time
  const handleTimelineClick = useCallback(
    (event: React.MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const time = pixelToTime(x);

      onTimeChange?.(time);
    },
    [pixelToTime, onTimeChange],
  );

  // Handle playhead dragging
  const handlePlayheadMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setIsDragging(true);
      setDragStartX(event.clientX);
      setDragStartTime(timeline.currentTime);
    },
    [timeline.currentTime],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return;

      const deltaX = event.clientX - dragStartX;
      const rect = timelineRef.current.getBoundingClientRect();
      const deltaTime = (deltaX / rect.width) * (viewportEnd - viewportStart);
      const newTime = Math.max(
        0,
        Math.min(dragStartTime + deltaTime, timeline.duration),
      );

      onTimeChange?.(newTime);
    },
    [
      isDragging,
      dragStartX,
      dragStartTime,
      viewportStart,
      viewportEnd,
      timeline.duration,
      onTimeChange,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Format time for display
  const formatTime = useCallback((time: number): string => {
    const seconds = Math.floor(time / 1000);
    const milliseconds = Math.floor((time % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  }, []);

  // Generate time ruler marks
  const generateRulerMarks = useCallback(() => {
    const marks = [];
    const viewportDuration = viewportEnd - viewportStart;
    const step =
      viewportDuration > 10000 ? 1000 : viewportDuration > 5000 ? 500 : 100;

    for (
      let time = Math.ceil(viewportStart / step) * step;
      time <= viewportEnd;
      time += step
    ) {
      const position = timeToPixel(time);
      marks.push(
        <div
          key={time}
          className={styles.rulerMark}
          style={{ left: `${position}px` }}
        >
          <div className={styles.rulerTick} />
          <div className={styles.rulerLabel}>{formatTime(time)}</div>
        </div>,
      );
    }

    return marks;
  }, [viewportStart, viewportEnd, timeToPixel, formatTime]);

  // Add a new track
  const addTrack = useCallback((type: TrackType) => {
    const newTrack: TimelineTrack = {
      id: `track-${Date.now()}`,
      name: `${type} Track`,
      type,
      properties: [],
      enabled: true,
      locked: false,
      collapsed: false,
      color: '#007acc',
    };

    setTimeline((prev) => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
    }));
  }, []);

  // Zoom timeline
  const zoomTimeline = useCallback(
    (factor: number, centerTime?: number) => {
      const center = centerTime ?? (viewportStart + viewportEnd) / 2;
      const currentDuration = viewportEnd - viewportStart;
      const newDuration = Math.max(
        1000,
        Math.min(currentDuration * factor, timeline.duration),
      );

      const newStart = Math.max(0, center - newDuration / 2);
      const newEnd = Math.min(timeline.duration, newStart + newDuration);

      setViewportStart(newStart);
      setViewportEnd(newEnd);
    },
    [viewportStart, viewportEnd, timeline.duration],
  );

  return (
    <div className={styles.timeline} style={{ height }}>
      {/* Timeline Header */}
      <div className={styles.header}>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.playButton}
            onClick={() =>
              onPlaybackStateChange?.(
                playing ? PlaybackState.PAUSED : PlaybackState.PLAYING,
              )
            }
          >
            {playing ? '⏸️' : '▶️'}
          </button>

          <div className={styles.timeDisplay}>
            {formatTime(timeline.currentTime)} / {formatTime(timeline.duration)}
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
          style={{ left: `${timeToPixel(timeline.currentTime)}px` }}
          onMouseDown={handlePlayheadMouseDown}
        >
          <div className={styles.playheadLine} />
          <div className={styles.playheadHandle} />
        </div>
      </div>

      {/* Timeline Content */}
      <div
        ref={timelineRef}
        className={styles.content}
        onClick={handleTimelineClick}
      >
        {timeline.tracks.map((track) => (
          <div key={track.id} className={styles.track}>
            <div className={styles.trackHeader}>
              <span className={styles.trackName}>{track.name}</span>
              <div className={styles.trackControls}>
                <button className={styles.trackToggle}>
                  {track.enabled ? '👁️' : '🚫'}
                </button>
              </div>
            </div>

            <div className={styles.trackContent}>
              {track.properties.map((property) => (
                <div key={property.id} className={styles.property}>
                  <div className={styles.propertyName}>{property.name}</div>
                  <div className={styles.keyframes}>
                    {property.keyframes.map((keyframe) => (
                      <div
                        key={keyframe.id}
                        className={`${styles.keyframe} ${
                          selectedKeyframes.includes(keyframe.id)
                            ? styles.selected
                            : ''
                        }`}
                        style={{ left: `${timeToPixel(keyframe.time)}px` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedKeyframes([keyframe.id]);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
