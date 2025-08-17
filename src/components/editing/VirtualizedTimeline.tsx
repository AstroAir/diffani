import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { useVirtualScroll, usePerformanceMonitor, useThrottle } from '../../utils/performance';
import { 
  type Timeline, 
  type TimelineTrack, 
  type Keyframe,
  TrackType,
  PlaybackState,
  DEFAULT_TIMELINE_CONFIG 
} from '../../core/timeline/types';
import { TimelineEngine } from '../../core/timeline/timeline-engine';
import KeyframeEditor from './KeyframeEditor';
import styles from './VirtualizedTimeline.module.scss';

export interface VirtualizedTimelineProps {
  height?: number;
  onTimeChange?: (time: number) => void;
  onPlaybackStateChange?: (state: PlaybackState) => void;
  showKeyframeEditor?: boolean;
  enableRealTimePreview?: boolean;
  itemHeight?: number;
  overscan?: number;
}

interface VirtualTrackItemProps {
  track: TimelineTrack;
  index: number;
  style: React.CSSProperties;
  timelineWidth: number;
  timelineDuration: number;
  currentTime: number;
  selectedKeyframes: Set<string>;
  onKeyframeAdd: (trackId: string, propertyId: string, time: number, value: unknown) => void;
  onKeyframeUpdate: (trackId: string, propertyId: string, keyframeId: string, updates: Partial<Keyframe>) => void;
  onKeyframeDelete: (trackId: string, propertyId: string, keyframeId: string) => void;
  onKeyframeSelect: (keyframeId: string, selected: boolean) => void;
  onTrackToggle: (trackId: string) => void;
  onTrackRemove: (trackId: string) => void;
}

function VirtualTrackItem({
  track,
  index,
  style,
  timelineWidth,
  timelineDuration,
  currentTime,
  selectedKeyframes,
  onKeyframeAdd,
  onKeyframeUpdate,
  onKeyframeDelete,
  onKeyframeSelect,
  onTrackToggle,
  onTrackRemove,
}: VirtualTrackItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={styles.virtualTrackItem} style={style}>
      <div className={styles.trackHeader}>
        <div className={styles.trackInfo}>
          <button
            type="button"
            className={styles.expandButton}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse track' : 'Expand track'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <input
            type="checkbox"
            checked={track.enabled}
            onChange={() => onTrackToggle(track.id)}
            className={styles.trackToggle}
            aria-label={`Toggle ${track.name}`}
          />
          <span className={styles.trackName}>{track.name}</span>
          <span className={styles.trackType}>{track.type}</span>
        </div>
        <button
          type="button"
          className={styles.removeTrackButton}
          onClick={() => onTrackRemove(track.id)}
          aria-label={`Remove ${track.name}`}
        >
          ×
        </button>
      </div>

      {isExpanded && (
        <div className={styles.trackContent}>
          {track.properties.map((property) => (
            <KeyframeEditor
              key={property.id}
              trackId={track.id}
              propertyId={property.id}
              property={property}
              timelineWidth={timelineWidth}
              timelineDuration={timelineDuration}
              currentTime={currentTime}
              onKeyframeAdd={(time, value) =>
                onKeyframeAdd(track.id, property.id, time, value)
              }
              onKeyframeUpdate={(keyframeId, updates) =>
                onKeyframeUpdate(track.id, property.id, keyframeId, updates)
              }
              onKeyframeDelete={(keyframeId) =>
                onKeyframeDelete(track.id, property.id, keyframeId)
              }
              onKeyframeSelect={onKeyframeSelect}
              selectedKeyframes={selectedKeyframes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VirtualizedTimeline({
  height = 400,
  onTimeChange,
  onPlaybackStateChange,
  showKeyframeEditor = true,
  enableRealTimePreview = true,
  itemHeight = 120,
  overscan = 3,
}: VirtualizedTimelineProps) {
  usePerformanceMonitor('VirtualizedTimeline');

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
  const [viewportEnd, setViewportEnd] = useState(DEFAULT_TIMELINE_CONFIG.duration);
  const [selectedKeyframes, setSelectedKeyframes] = useState<Set<string>>(new Set());

  const timelineWidth = 800;
  const headerHeight = 60;
  const contentHeight = height - headerHeight;

  // Virtual scrolling for tracks
  const { scrollElementRef, visibleRange, totalHeight } = useVirtualScroll({
    itemHeight,
    containerHeight: contentHeight,
    overscan,
    items: timeline.tracks,
  });

  // Throttled time change handler for performance
  const throttledTimeChange = useThrottle((time: number) => {
    setCurrentTime(time);
    onTimeChange?.(time);
  }, 16); // ~60fps

  // Convert time to pixel position
  const timeToPixel = useCallback(
    (time: number) => {
      const viewportDuration = viewportEnd - viewportStart;
      return ((time - viewportStart) / viewportDuration) * timelineWidth;
    },
    [viewportStart, viewportEnd, timelineWidth]
  );

  // Convert pixel position to time
  const pixelToTime = useCallback(
    (pixel: number) => {
      const viewportDuration = viewportEnd - viewportStart;
      return viewportStart + (pixel / timelineWidth) * viewportDuration;
    },
    [viewportStart, viewportEnd, timelineWidth]
  );

  // Handle timeline click
  const handleTimelineClick = useCallback(
    (event: React.MouseEvent) => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const x = event.clientX - rect.left;
      const time = pixelToTime(x);
      throttledTimeChange(time);
    },
    [pixelToTime, throttledTimeChange],
  );

  // Track management functions
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

    setTimeline(prev => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
    }));
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setTimeline(prev => ({
      ...prev,
      tracks: prev.tracks.filter(track => track.id !== trackId),
    }));
  }, []);

  const toggleTrack = useCallback((trackId: string) => {
    setTimeline(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId ? { ...track, enabled: !track.enabled } : track
      ),
    }));
  }, []);

  // Keyframe management functions
  const handleKeyframeAdd = useCallback(
    (trackId: string, propertyId: string, time: number, value: unknown) => {
      const keyframe: Keyframe = {
        id: `keyframe-${Date.now()}`,
        time,
        value,
        easing: 'easeInOut',
      };

      timelineEngine.addKeyframe(trackId, propertyId, keyframe);
      
      setTimeline(prev => ({
        ...prev,
        tracks: prev.tracks.map(track => {
          if (track.id === trackId) {
            return {
              ...track,
              properties: track.properties.map(prop => {
                if (prop.id === propertyId) {
                  return {
                    ...prop,
                    keyframes: [...prop.keyframes, keyframe].sort((a, b) => a.time - b.time),
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
    [timelineEngine]
  );

  const handleKeyframeUpdate = useCallback(
    (trackId: string, propertyId: string, keyframeId: string, updates: Partial<Keyframe>) => {
      timelineEngine.updateKeyframe(trackId, propertyId, keyframeId, updates);
      
      setTimeline(prev => ({
        ...prev,
        tracks: prev.tracks.map(track => {
          if (track.id === trackId) {
            return {
              ...track,
              properties: track.properties.map(prop => {
                if (prop.id === propertyId) {
                  return {
                    ...prop,
                    keyframes: prop.keyframes.map(kf =>
                      kf.id === keyframeId ? { ...kf, ...updates } : kf
                    ).sort((a, b) => a.time - b.time),
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
    [timelineEngine]
  );

  const handleKeyframeDelete = useCallback(
    (trackId: string, propertyId: string, keyframeId: string) => {
      timelineEngine.removeKeyframe(trackId, propertyId, keyframeId);
      
      setTimeline(prev => ({
        ...prev,
        tracks: prev.tracks.map(track => {
          if (track.id === trackId) {
            return {
              ...track,
              properties: track.properties.map(prop => {
                if (prop.id === propertyId) {
                  return {
                    ...prop,
                    keyframes: prop.keyframes.filter(kf => kf.id !== keyframeId),
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
    [timelineEngine]
  );

  const handleKeyframeSelect = useCallback((keyframeId: string, selected: boolean) => {
    setSelectedKeyframes(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(keyframeId);
      } else {
        newSet.delete(keyframeId);
      }
      return newSet;
    });
  }, []);

  // Zoom controls
  const zoomTimeline = useCallback((factor: number) => {
    const center = (viewportStart + viewportEnd) / 2;
    const newDuration = (viewportEnd - viewportStart) / factor;
    const newStart = Math.max(0, center - newDuration / 2);
    const newEnd = Math.min(timeline.duration, center + newDuration / 2);

    setViewportStart(newStart);
    setViewportEnd(newEnd);
  }, [viewportStart, viewportEnd, timeline.duration]);

  // Visible tracks for virtual scrolling
  const visibleTracks = useMemo(() => {
    return timeline.tracks.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [timeline.tracks, visibleRange.startIndex, visibleRange.endIndex]);

  return (
    <div className={styles.virtualizedTimeline} style={{ height }}>
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
                newPlaying ? PlaybackState.PLAYING : PlaybackState.PAUSED
              );
            }}
          >
            {playing ? '⏸️' : '▶️'}
          </button>

          <div className={styles.timeDisplay}>
            {Math.round(currentTime / 100) / 10}s / {Math.round(timeline.duration / 100) / 10}s
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

      {/* Timeline Content with Virtual Scrolling */}
      <div
        ref={scrollElementRef}
        className={styles.timelineContent}
        style={{ height: contentHeight }}
        onClick={handleTimelineClick}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Playhead */}
          <div
            className={styles.playhead}
            style={{ 
              left: `${timeToPixel(currentTime)}px`,
              height: totalHeight,
            }}
          />

          {/* Virtual Track Items */}
          {visibleTracks.map((track, index) => (
            <VirtualTrackItem
              key={track.id}
              track={track}
              index={visibleRange.startIndex + index}
              style={{
                position: 'absolute',
                top: visibleRange.offsetY + index * itemHeight,
                left: 0,
                right: 0,
                height: itemHeight,
              }}
              timelineWidth={timelineWidth}
              timelineDuration={viewportEnd - viewportStart}
              currentTime={currentTime}
              selectedKeyframes={selectedKeyframes}
              onKeyframeAdd={handleKeyframeAdd}
              onKeyframeUpdate={handleKeyframeUpdate}
              onKeyframeDelete={handleKeyframeDelete}
              onKeyframeSelect={handleKeyframeSelect}
              onTrackToggle={toggleTrack}
              onTrackRemove={removeTrack}
            />
          ))}

          {timeline.tracks.length === 0 && (
            <div className={styles.emptyState}>
              <p>No tracks yet. Click "+ Track" to add your first animation track.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
