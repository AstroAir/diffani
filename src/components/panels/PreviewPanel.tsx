import { useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { getSumDuration } from '../../core/doc/raw-doc';
import Player from '../../view/player';
import DashboardPanel from '../dashboard/DashboardPanel';
import playIcon from '../../assets/icons/play.svg';
import pauseIcon from '../../assets/icons/pause.svg';
import Icon from '../../view/icon';
import styles from './PreviewPanel.module.scss';

export interface PreviewPanelProps {
  className?: string;
}

export default function PreviewPanel({ className }: PreviewPanelProps) {
  const {
    doc,
    currentTime,
    playing,
    setPlaying,
    frameRate,
    actualFPS,
  } = useStore(
    useShallow((state) => ({
      doc: state.doc,
      currentTime: state.currentTime,
      playing: state.playing,
      setPlaying: state.setPlaying,
      frameRate: state.frameRate,
      actualFPS: state.actualFPS,
    }))
  );

  const duration = getSumDuration(doc);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handlePlayToggle = useCallback(() => {
    setPlaying(!playing);
  }, [playing, setPlaying]);

  const panelActions = (
    <div className={styles.previewActions}>
      <button
        type="button"
        className={`${styles.playButton} ${playing ? styles.playing : ''}`}
        onClick={handlePlayToggle}
        title={playing ? 'Pause' : 'Play'}
        aria-label={playing ? 'Pause animation' : 'Play animation'}
      >
        <Icon name={playing ? pauseIcon : playIcon} />
      </button>
      
      <div className={styles.statusIndicators}>
        <div className={styles.fpsIndicator}>
          {Math.round(actualFPS)} FPS
        </div>
        <div className={styles.progressIndicator}>
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );

  return (
    <DashboardPanel
      id="preview"
      title="Animation Preview"
      className={`${styles.previewPanel} ${className || ''}`}
      actions={panelActions}
      collapsible={true}
      resizable={true}
    >
      <div className={styles.playerContainer}>
        <Player currentTime={currentTime} doc={doc} />
      </div>
      
      <div className={styles.previewFooter}>
        <div className={styles.timeInfo}>
          <span className={styles.currentTime}>
            {(currentTime / 1000).toFixed(1)}s
          </span>
          <span className={styles.separator}>/</span>
          <span className={styles.totalTime}>
            {(duration / 1000).toFixed(1)}s
          </span>
        </div>
        
        <div className={styles.playbackInfo}>
          <span className={styles.frameRate}>
            Target: {frameRate} FPS
          </span>
          <span className={styles.resolution}>
            {doc.width} × {doc.height}
          </span>
        </div>
      </div>
    </DashboardPanel>
  );
}
