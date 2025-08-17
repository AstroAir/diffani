import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import styles from './index.module.scss';

const FRAME_RATE_OPTIONS = [
  { value: 24, label: '24 FPS' },
  { value: 30, label: '30 FPS' },
  { value: 60, label: '60 FPS' },
  { value: 120, label: '120 FPS' },
];

export function FrameRateControl() {
  const { frameRate, actualFPS, frameDrops, setFrameRate } = useStore(
    useShallow((state) => ({
      frameRate: state.frameRate,
      actualFPS: state.actualFPS,
      frameDrops: state.frameDrops,
      setFrameRate: state.setFrameRate,
    })),
  );

  const handleFrameRateChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setFrameRate(Number(event.target.value));
  };

  const formatFPS = (fps: number) => {
    return fps > 0 ? fps.toFixed(1) : '0.0';
  };

  const getPerformanceStatus = () => {
    if (actualFPS === 0) return 'idle';
    const efficiency = actualFPS / frameRate;
    if (efficiency >= 0.95) return 'excellent';
    if (efficiency >= 0.85) return 'good';
    if (efficiency >= 0.7) return 'fair';
    return 'poor';
  };

  return (
    <div className={styles.frameRateControl}>
      <div className={styles.settings}>
        <label htmlFor="frameRate" className={styles.label}>
          Target FPS:
        </label>
        <select
          id="frameRate"
          value={frameRate}
          onChange={handleFrameRateChange}
          className={styles.select}
        >
          {FRAME_RATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.monitoring}>
        <div className={styles.fpsDisplay}>
          <span className={styles.label}>Actual FPS:</span>
          <span className={`${styles.value} ${styles[getPerformanceStatus()]}`}>
            {formatFPS(actualFPS)}
          </span>
        </div>

        {frameDrops > 0 && (
          <div className={styles.frameDrops}>
            <span className={styles.label}>Frame Drops:</span>
            <span className={styles.value}>{frameDrops}</span>
          </div>
        )}

        <div className={styles.performanceIndicator}>
          <div
            className={`${styles.indicator} ${styles[getPerformanceStatus()]}`}
          />
          <span className={styles.status}>{getPerformanceStatus()}</span>
        </div>
      </div>
    </div>
  );
}
