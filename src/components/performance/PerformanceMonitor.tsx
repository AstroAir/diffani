import React, { useState, useEffect, useCallback } from 'react';
import { MemoryManager } from '../../utils/performance';
import styles from './PerformanceMonitor.module.scss';

interface PerformanceMetrics {
  fps: number;
  frameDrops: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  } | null;
  renderTime: number;
  lastUpdate: number;
}

interface PerformanceMonitorProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isVisible = false,
  onToggle,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameDrops: 0,
    memoryUsage: null,
    renderTime: 0,
    lastUpdate: Date.now(),
  });

  const [history, setHistory] = useState<PerformanceMetrics[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Update metrics
  const updateMetrics = useCallback(() => {
    const now = Date.now();
    const memoryManager = MemoryManager.getInstance();
    
    let memoryUsage = null;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      };
    }

    const newMetrics: PerformanceMetrics = {
      fps: 60, // This would be updated by the actual FPS monitor
      frameDrops: 0, // This would be updated by the actual frame drop counter
      memoryUsage,
      renderTime: 0, // This would be updated by render timing
      lastUpdate: now,
    };

    setMetrics(newMetrics);

    if (isRecording) {
      setHistory(prev => {
        const updated = [...prev, newMetrics];
        // Keep only last 100 entries
        return updated.slice(-100);
      });
    }
  }, [isRecording]);

  // Set up monitoring interval
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, [isVisible, updateMetrics]);

  // Memory cleanup warning
  useEffect(() => {
    const memoryManager = MemoryManager.getInstance();
    
    const handleMemoryWarning = () => {
      console.warn('High memory usage detected!');
      // Could trigger UI notification here
    };

    memoryManager.addObserver(handleMemoryWarning);
    
    return () => {
      memoryManager.removeObserver(handleMemoryWarning);
    };
  }, []);

  const formatBytes = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getPerformanceStatus = (): 'good' | 'warning' | 'critical' => {
    if (!metrics.memoryUsage) return 'good';
    
    if (metrics.memoryUsage.percentage > 80) return 'critical';
    if (metrics.memoryUsage.percentage > 60) return 'warning';
    return 'good';
  };

  const exportMetrics = () => {
    const data = {
      currentMetrics: metrics,
      history: history,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diffani-performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isVisible) {
    return (
      <button
        className={styles.toggleButton}
        onClick={onToggle}
        title="Show Performance Monitor"
      >
        📊
      </button>
    );
  }

  const status = getPerformanceStatus();

  return (
    <div className={`${styles.monitor} ${styles[status]}`}>
      <div className={styles.header}>
        <h3>Performance Monitor</h3>
        <div className={styles.controls}>
          <button
            className={styles.recordButton}
            onClick={() => setIsRecording(!isRecording)}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? '⏹️' : '⏺️'}
          </button>
          <button
            className={styles.exportButton}
            onClick={exportMetrics}
            title="Export Metrics"
            disabled={history.length === 0}
          >
            💾
          </button>
          <button
            className={styles.closeButton}
            onClick={onToggle}
            title="Hide Monitor"
          >
            ✕
          </button>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <label>FPS:</label>
          <span className={metrics.fps < 30 ? styles.warning : ''}>{metrics.fps}</span>
        </div>

        <div className={styles.metric}>
          <label>Frame Drops:</label>
          <span className={metrics.frameDrops > 5 ? styles.warning : ''}>{metrics.frameDrops}</span>
        </div>

        {metrics.memoryUsage && (
          <>
            <div className={styles.metric}>
              <label>Memory:</label>
              <span>{formatBytes(metrics.memoryUsage.used)} / {formatBytes(metrics.memoryUsage.total)}</span>
            </div>

            <div className={styles.metric}>
              <label>Memory %:</label>
              <span className={metrics.memoryUsage.percentage > 80 ? styles.critical : 
                              metrics.memoryUsage.percentage > 60 ? styles.warning : ''}>
                {metrics.memoryUsage.percentage.toFixed(1)}%
              </span>
            </div>
          </>
        )}

        <div className={styles.metric}>
          <label>Render Time:</label>
          <span>{metrics.renderTime.toFixed(2)}ms</span>
        </div>
      </div>

      {isRecording && (
        <div className={styles.recording}>
          <span>🔴 Recording ({history.length} samples)</span>
        </div>
      )}

      <div className={styles.status}>
        Status: <span className={styles[status]}>{status.toUpperCase()}</span>
      </div>
    </div>
  );
};
