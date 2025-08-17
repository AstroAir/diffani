import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useShallow } from 'zustand/shallow';
import { Play, Pause } from 'lucide-react';
import { getSumDuration, type RawDoc } from '../../core/doc/raw-doc';
import { MovieRenderer } from '../../core/renderer';
import { useStore } from '../../store';
import { Button } from '../../components/ui/button';
import { Slider } from '../../components/ui/slider';
import playIcon from '../../assets/icons/play.svg';
import pauseIcon from '../../assets/icons/pause.svg';
import Icon from '../icon';
import { VideoExport } from '../video-export';
import { FrameRateControl } from '../frame-rate-control';
import { ExportPanel } from '../export-panel';
import { PresetManagerUI } from '../preset-manager';
import { Timeline } from '../timeline';
import { ThemeSelector } from '../theme-selector';
import styles from './index.module.scss';

interface PlayerProps {
  currentTime: number;
  doc: RawDoc;
}

export default function Player({ currentTime, doc }: PlayerProps) {
  const { setCurrentTime, setPlaying, playing } = useStore(
    useShallow((state) => ({
      setCurrentTime: state.setCurrentTime,
      setPlaying: state.setPlaying,
      playing: state.playing,
    })),
  );

  const [showPresetManager, setShowPresetManager] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    export: true,
    playback: true,
    customize: false,
  });

  const toggleGroup = (group: keyof typeof expandedGroups) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };
  const duration = useMemo(() => getSumDuration(doc), [doc]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MovieRenderer>();

  useEffect(() => {
    const renderer = new MovieRenderer(canvasRef.current as HTMLCanvasElement);
    rendererRef.current = renderer;

    Object.assign(window, {
      __renderer: renderer,
    });
  }, []);

  useEffect(() => {
    rendererRef.current?.setDoc(doc);
    rendererRef.current?.render(currentTime);
  }, [doc, currentTime]);

  return (
    <div className={styles.player}>
      <canvas ref={canvasRef} />

      {/* Playback Controls */}
      <div className={styles.playbackControls}>
        <Button
          variant="outline"
          size="icon"
          className={`${styles.playButton} ${playing ? styles.playing : ''}`}
          onClick={() => {
            setPlaying(!playing);
          }}
          title={playing ? 'Pause' : 'Play'}
          aria-label={playing ? 'Pause animation' : 'Play animation'}
        >
          {playing ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </Button>

        <Slider
          value={[currentTime]}
          min={0}
          max={duration}
          step={1}
          className={styles.slider}
          onValueChange={(value) => {
            setCurrentTime(value[0]);
          }}
        />
      </div>

      {/* Control Bar */}
      <div className={styles.controlBar}>
        {/* Export Controls Group */}
        <div
          className={`${styles.controlGroup} ${expandedGroups.export ? styles.expanded : styles.collapsed}`}
        >
          <button
            className={styles.groupHeader}
            onClick={() => toggleGroup('export')}
            aria-expanded={expandedGroups.export}
          >
            <span className={styles.groupLabel}>📤 Export</span>
            <span
              className={`${styles.expandIcon} ${expandedGroups.export ? styles.rotated : ''}`}
            >
              ▼
            </span>
          </button>
          <div className={styles.groupControls}>
            <VideoExport />
            <ExportPanel />
          </div>
        </div>

        {/* Playback Controls Group */}
        <div
          className={`${styles.controlGroup} ${expandedGroups.playback ? styles.expanded : styles.collapsed}`}
        >
          <button
            className={styles.groupHeader}
            onClick={() => toggleGroup('playback')}
            aria-expanded={expandedGroups.playback}
          >
            <span className={styles.groupLabel}>⏯️ Playback</span>
            <span
              className={`${styles.expandIcon} ${expandedGroups.playback ? styles.rotated : ''}`}
            >
              ▼
            </span>
          </button>
          <div className={styles.groupControls}>
            <FrameRateControl />
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => setShowTimeline(!showTimeline)}
              title="Toggle Timeline View"
            >
              📊 Timeline
            </button>
          </div>
        </div>

        {/* Customization Controls Group */}
        <div
          className={`${styles.controlGroup} ${expandedGroups.customize ? styles.expanded : styles.collapsed}`}
        >
          <button
            className={styles.groupHeader}
            onClick={() => toggleGroup('customize')}
            aria-expanded={expandedGroups.customize}
          >
            <span className={styles.groupLabel}>🎨 Customize</span>
            <span
              className={`${styles.expandIcon} ${expandedGroups.customize ? styles.rotated : ''}`}
            >
              ▼
            </span>
          </button>
          <div className={styles.groupControls}>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => setShowPresetManager(true)}
              title="Manage Presets"
            >
              🎨 Presets
            </button>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => setShowThemeSelector(true)}
              title="Select Theme"
            >
              🎨 Themes
            </button>
          </div>
        </div>
      </div>

      {showTimeline && (
        <div className={styles.timelineContainer}>
          <Timeline
            height={200}
            onTimeChange={setCurrentTime}
            onPlaybackStateChange={(state) => {
              setPlaying(state === 'playing');
            }}
          />
        </div>
      )}

      {showPresetManager && (
        <PresetManagerUI
          onPresetApply={(preset) => {
            // Apply preset logic would go here
            console.log('Applying preset:', preset);
            setShowPresetManager(false);
          }}
          onClose={() => setShowPresetManager(false)}
        />
      )}

      {showThemeSelector && (
        <ThemeSelector
          onThemeChange={(theme) => {
            console.log('Theme changed:', theme);
          }}
          onClose={() => setShowThemeSelector(false)}
        />
      )}
    </div>
  );
}
