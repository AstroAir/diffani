import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { EncodeStatus } from '../../store/encode-task';
import { getSumDuration } from '../../core/doc/raw-doc';
import DashboardPanel from '../dashboard/DashboardPanel';
import { VideoExport } from '../../view/video-export';
import { FrameRateControl } from '../../view/frame-rate-control';
import { ThemeSelector } from '../../view/theme-selector';
import { PresetManagerUI } from '../../view/preset-manager';
import downloadIcon from '../../assets/icons/download.svg';
import Icon from '../../view/icon';
import styles from './ToolsPanel.module.scss';

export interface ToolsPanelProps {
  className?: string;
}

export default function ToolsPanel({ className }: ToolsPanelProps) {
  const {
    doc,
    frameRate,
    playing,
    setPlaying,
    encodeState,
    startEncodeTask,
    abortEncodeTask,
  } = useStore(
    useShallow((state) => ({
      doc: state.doc,
      frameRate: state.frameRate,
      playing: state.playing,
      setPlaying: state.setPlaying,
      encodeState: state.encodeState,
      startEncodeTask: state.startEncodeTask,
      abortEncodeTask: state.abortEncodeTask,
    })),
  );

  const [activeTab, setActiveTab] = useState<'export' | 'settings' | 'presets'>(
    'export',
  );
  // Get export progress and status from the existing encode system
  const isExporting = encodeState?.status === EncodeStatus.Encoding;
  const exportProgress =
    encodeState?.status === EncodeStatus.Encoding ? encodeState.progress : 0;
  const exportComplete = encodeState?.status === EncodeStatus.Done;
  const exportError = encodeState?.status === EncodeStatus.Error;

  const handleVideoExport = useCallback(() => {
    if (isExporting) {
      abortEncodeTask();
    } else {
      // Pause playback during export
      if (playing) {
        setPlaying(false);
      }
      startEncodeTask();
    }
  }, [isExporting, playing, setPlaying, startEncodeTask, abortEncodeTask]);

  const panelActions = (
    <div className={styles.toolsActions}>
      <div className={styles.tabButtons}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'export' ? styles.active : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <Icon name={downloadIcon} />
          Export
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'presets' ? styles.active : ''}`}
          onClick={() => setActiveTab('presets')}
        >
          📋 Presets
        </button>
      </div>
    </div>
  );

  return (
    <DashboardPanel
      id="tools"
      title="Tools & Export"
      className={`${styles.toolsPanel} ${className || ''}`}
      actions={panelActions}
      collapsible={true}
      resizable={true}
      loading={isExporting}
    >
      <div className={styles.toolsContainer}>
        {activeTab === 'export' && (
          <div className={styles.exportTab}>
            <div className={styles.exportSection}>
              <h4 className={styles.sectionTitle}>Video Export</h4>

              <div className={styles.exportOptions}>
                <div className={styles.exportOption}>
                  <label>Frame Rate:</label>
                  <span className={styles.frameRateDisplay}>
                    {frameRate} FPS
                  </span>
                </div>

                <div className={styles.exportOption}>
                  <label>Duration:</label>
                  <span className={styles.durationDisplay}>
                    {(getSumDuration(doc) / 1000).toFixed(1)}s
                  </span>
                </div>

                <div className={styles.exportOption}>
                  <label>Resolution:</label>
                  <span className={styles.resolutionDisplay}>
                    {doc.width} × {doc.height}
                  </span>
                </div>
              </div>

              {isExporting && (
                <div className={styles.exportProgress}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${Math.round(exportProgress * 100)}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>
                    {Math.round(exportProgress * 100)}%
                  </span>
                </div>
              )}

              {exportError && (
                <div className={styles.exportError}>
                  Export failed. Please try again.
                </div>
              )}

              <button
                type="button"
                className={`${styles.exportButton} ${isExporting ? styles.exporting : ''} ${exportComplete ? styles.complete : ''}`}
                onClick={handleVideoExport}
                disabled={false}
              >
                {isExporting
                  ? 'Cancel Export'
                  : exportComplete
                    ? 'Download Video'
                    : 'Export Video (WebM)'}
              </button>
            </div>

            <div className={styles.exportSection}>
              <h4 className={styles.sectionTitle}>Advanced Export</h4>
              <VideoExport />
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={styles.settingsTab}>
            <div className={styles.settingsSection}>
              <h4 className={styles.sectionTitle}>Playback</h4>
              <FrameRateControl />
            </div>

            <div className={styles.settingsSection}>
              <h4 className={styles.sectionTitle}>Appearance</h4>
              <ThemeSelector />
            </div>
          </div>
        )}

        {activeTab === 'presets' && (
          <div className={styles.presetsTab}>
            <PresetManagerUI />
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}
