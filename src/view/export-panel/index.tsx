import { useState, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { ExportManager } from '../../core/export/export-manager';
import {
  ExportFormat,
  ExportQuality,
  EXPORT_PRESETS,
  type ExportSettings,
  type ExportProgress,
  type ExportResult,
} from '../../core/export/types';
import {
  ImportExportFormat,
  DataType,
  type ExportOptions as DocumentExportOptions,
} from '../../core/import-export/types';
import { downloadBlob } from '../../utils/download';
import downloadIcon from '../../assets/icons/download.svg';
import Icon from '../icon';
import styles from './index.module.scss';

const FORMAT_OPTIONS = [
  {
    value: ExportFormat.WEBM,
    label: 'WebM Video',
    description: 'High quality web video',
  },
  {
    value: ExportFormat.GIF,
    label: 'Animated GIF',
    description: 'Compatible animated image',
  },
  {
    value: ExportFormat.PNG_SEQUENCE,
    label: 'PNG Sequence',
    description: 'Lossless image frames',
  },
  {
    value: ExportFormat.JPEG_SEQUENCE,
    label: 'JPEG Sequence',
    description: 'Compressed image frames',
  },
];

const QUALITY_OPTIONS = [
  { value: ExportQuality.LOW, label: 'Low', description: 'Smaller file size' },
  {
    value: ExportQuality.MEDIUM,
    label: 'Medium',
    description: 'Balanced quality',
  },
  { value: ExportQuality.HIGH, label: 'High', description: 'Better quality' },
  { value: ExportQuality.ULTRA, label: 'Ultra', description: 'Best quality' },
];

const PRESET_OPTIONS = [
  {
    key: 'WEB_OPTIMIZED',
    label: 'Web Optimized',
    ...EXPORT_PRESETS.WEB_OPTIMIZED,
  },
  {
    key: 'HIGH_QUALITY_VIDEO',
    label: 'High Quality Video',
    ...EXPORT_PRESETS.HIGH_QUALITY_VIDEO,
  },
  {
    key: 'SOCIAL_MEDIA',
    label: 'Social Media',
    ...EXPORT_PRESETS.SOCIAL_MEDIA,
  },
  {
    key: 'ANIMATED_GIF',
    label: 'Animated GIF',
    ...EXPORT_PRESETS.ANIMATED_GIF,
  },
  {
    key: 'IMAGE_SEQUENCE_PNG',
    label: 'PNG Sequence',
    ...EXPORT_PRESETS.IMAGE_SEQUENCE_PNG,
  },
  {
    key: 'IMAGE_SEQUENCE_JPEG',
    label: 'JPEG Sequence',
    ...EXPORT_PRESETS.IMAGE_SEQUENCE_JPEG,
  },
];

export function ExportPanel() {
  const {
    doc,
    frameRate,
    exportProject,
    exportInProgress,
    exportProgress,
    exportPreferences,
    updateExportPreferences,
  } = useStore(
    useShallow((state) => ({
      doc: state.doc,
      frameRate: state.frameRate,
      exportProject: state.exportProject,
      exportInProgress: state.exportInProgress,
      exportProgress: state.exportProgress,
      exportPreferences: state.exportPreferences,
      updateExportPreferences: state.updateExportPreferences,
    })),
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [exportType, setExportType] = useState<'video' | 'document'>('video');
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: ExportFormat.WEBM,
    quality: ExportQuality.MEDIUM,
    frameRate: frameRate,
  });
  const [documentExportOptions, setDocumentExportOptions] = useState<
    Partial<DocumentExportOptions>
  >({});

  const [isExporting, setIsExporting] = useState(false);
  const [videoExportProgress, setVideoExportProgress] =
    useState<ExportProgress | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const exportManager = useMemo(() => new ExportManager(doc), [doc]);

  const handlePresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const presetKey = event.target.value;
    const preset = PRESET_OPTIONS.find((p) => p.key === presetKey);
    if (preset) {
      setExportSettings({
        format: preset.format,
        quality: preset.quality,
        frameRate: preset.frameRate,
      });
    }
  };

  const handleSettingChange =
    (field: keyof ExportSettings) =>
    (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      const value =
        event.target.type === 'number'
          ? Number(event.target.value)
          : event.target.value;

      setExportSettings((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleExport = async () => {
    if (isExporting || exportInProgress) return;

    if (exportType === 'video') {
      await handleVideoExport();
    } else {
      await handleDocumentExport();
    }
  };

  const handleVideoExport = async () => {
    setIsExporting(true);
    setVideoExportProgress(null);
    setExportResult(null);

    try {
      const result = await exportManager.export(exportSettings, (progress) => {
        setVideoExportProgress(progress);
      });

      setExportResult(result);
      setVideoExportProgress(null);
    } catch (error) {
      console.error('Video export failed:', error);
      alert(
        `Video export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDocumentExport = async () => {
    try {
      const options = {
        ...exportPreferences,
        ...documentExportOptions,
      };

      const result = await exportProject(options);

      if (result.success) {
        downloadBlob(result.blob, result.filename);
      } else {
        alert('Document export failed');
      }
    } catch (error) {
      console.error('Document export failed:', error);
      alert(
        `Document export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const handleDownload = () => {
    if (exportResult) {
      downloadBlob(exportResult.blob, exportResult.filename);
      setExportResult(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className={styles.exportPanel}>
      <button
        type="button"
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Icon name={downloadIcon} className={styles.icon} />
        Export Options {isExpanded ? '▼' : '▶'}
      </button>

      {isExpanded && (
        <div className={styles.panelContent}>
          <div className={styles.section}>
            <label className={styles.label}>
              Preset:
              <select onChange={handlePresetChange} className={styles.select}>
                <option value="">Custom Settings</option>
                {PRESET_OPTIONS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>
              Export Type:
              <select
                value={exportType}
                onChange={(e) =>
                  setExportType(e.target.value as 'video' | 'document')
                }
                className={styles.select}
              >
                <option value="video">Video/Animation</option>
                <option value="document">Project Document</option>
              </select>
            </label>
          </div>

          {exportType === 'video' && (
            <>
              <div className={styles.section}>
                <label className={styles.label}>
                  Format:
                  <select
                    value={exportSettings.format}
                    onChange={handleSettingChange('format')}
                    className={styles.select}
                  >
                    {FORMAT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.section}>
                <label className={styles.label}>
                  Quality:
                  <select
                    value={exportSettings.quality}
                    onChange={handleSettingChange('quality')}
                    className={styles.select}
                  >
                    {QUALITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.description}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.section}>
                <label className={styles.label}>
                  Frame Rate:
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={exportSettings.frameRate}
                    onChange={handleSettingChange('frameRate')}
                    className={styles.input}
                  />
                  FPS
                </label>
              </div>
            </>
          )}

          {exportType === 'document' && (
            <>
              <div className={styles.section}>
                <label className={styles.label}>
                  Document Format:
                  <select
                    value={
                      documentExportOptions.format || ImportExportFormat.JSON
                    }
                    onChange={(e) =>
                      setDocumentExportOptions((prev) => ({
                        ...prev,
                        format: e.target.value as ImportExportFormat,
                      }))
                    }
                    className={styles.select}
                  >
                    <option value={ImportExportFormat.JSON}>JSON</option>
                    <option value={ImportExportFormat.CSV}>
                      CSV (Snapshots)
                    </option>
                    <option value={ImportExportFormat.XML}>XML</option>
                    <option value={ImportExportFormat.ZIP}>ZIP Archive</option>
                  </select>
                </label>
              </div>

              <div className={styles.section}>
                <label className={styles.label}>
                  Data Type:
                  <select
                    value={documentExportOptions.dataType || DataType.PROJECT}
                    onChange={(e) =>
                      setDocumentExportOptions((prev) => ({
                        ...prev,
                        dataType: e.target.value as DataType,
                      }))
                    }
                    className={styles.select}
                  >
                    <option value={DataType.PROJECT}>Complete Project</option>
                    <option value={DataType.DOCUMENT}>Document Only</option>
                    <option value={DataType.SNAPSHOTS}>Snapshots Only</option>
                  </select>
                </label>
              </div>

              <div className={styles.section}>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={
                        documentExportOptions.includeMetadata ??
                        exportPreferences.includeMetadata
                      }
                      onChange={(e) =>
                        setDocumentExportOptions((prev) => ({
                          ...prev,
                          includeMetadata: e.target.checked,
                        }))
                      }
                    />
                    Include metadata
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={
                        documentExportOptions.compression ??
                        exportPreferences.compression
                      }
                      onChange={(e) =>
                        setDocumentExportOptions((prev) => ({
                          ...prev,
                          compression: e.target.checked,
                        }))
                      }
                    />
                    Enable compression
                  </label>
                </div>

                {documentExportOptions.format === ImportExportFormat.JSON && (
                  <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={
                          documentExportOptions.jsonOptions?.prettyPrint ??
                          exportPreferences.prettyPrint
                        }
                        onChange={(e) =>
                          setDocumentExportOptions((prev) => ({
                            ...prev,
                            jsonOptions: {
                              ...prev.jsonOptions,
                              prettyPrint: e.target.checked,
                            },
                          }))
                        }
                      />
                      Pretty print JSON
                    </label>
                  </div>
                )}
              </div>
            </>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || exportInProgress}
              className={styles.exportButton}
            >
              {isExporting || exportInProgress
                ? `Exporting ${exportType}...`
                : `Export ${exportType === 'video' ? 'Video' : 'Document'}`}
            </button>

            {exportResult && (
              <button
                type="button"
                onClick={handleDownload}
                className={styles.downloadButton}
              >
                Download ({formatFileSize(exportResult.size)})
              </button>
            )}
          </div>

          {(videoExportProgress || exportProgress) && (
            <div className={styles.progress}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${
                      videoExportProgress?.percentage ||
                      exportProgress?.percentage ||
                      0
                    }%`,
                  }}
                />
              </div>
              <div className={styles.progressText}>
                {videoExportProgress?.stage || exportProgress?.stage} -{' '}
                {Math.round(
                  videoExportProgress?.percentage ||
                    exportProgress?.percentage ||
                    0,
                )}
                %
                {(videoExportProgress?.estimatedTimeRemaining ||
                  exportProgress?.estimatedTimeRemaining) && (
                  <span className={styles.eta}>
                    {' '}
                    (~
                    {Math.round(
                      (videoExportProgress?.estimatedTimeRemaining ||
                        exportProgress?.estimatedTimeRemaining ||
                        0) / 1000,
                    )}
                    s remaining)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Advanced Settings for specific formats */}
          {exportSettings.format === ExportFormat.GIF && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>GIF Settings</h4>
              <label className={styles.label}>
                Colors:
                <input
                  type="number"
                  min="2"
                  max="256"
                  value={exportSettings.gifColors || 128}
                  onChange={handleSettingChange('gifColors')}
                  className={styles.input}
                />
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={exportSettings.gifDither !== false}
                  onChange={(e) =>
                    setExportSettings((prev) => ({
                      ...prev,
                      gifDither: e.target.checked,
                    }))
                  }
                />
                Enable Dithering
              </label>
            </div>
          )}

          {exportSettings.format === ExportFormat.JPEG_SEQUENCE && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>JPEG Settings</h4>
              <label className={styles.label}>
                Quality: {Math.round((exportSettings.jpegQuality || 0.8) * 100)}
                %
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={exportSettings.jpegQuality || 0.8}
                  onChange={handleSettingChange('jpegQuality')}
                  className={styles.slider}
                />
              </label>
            </div>
          )}

          {exportSettings.format === ExportFormat.PNG_SEQUENCE && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>PNG Settings</h4>
              <label className={styles.label}>
                Compression: {exportSettings.pngCompression || 6}
                <input
                  type="range"
                  min="0"
                  max="9"
                  step="1"
                  value={exportSettings.pngCompression || 6}
                  onChange={handleSettingChange('pngCompression')}
                  className={styles.slider}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
