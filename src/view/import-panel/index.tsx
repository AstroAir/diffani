import { useState, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import {
  ImportExportFormat,
  DataType,
  ConflictResolutionStrategy,
  type ImportOptions,
  type ImportProgress,
  type ImportResult,
} from '../../core/import-export/types';
import { detectFileFormat, isSupportedImportFile, formatFileSize } from '../../core/import-export/utils/file-utils';
import uploadIcon from '../../assets/icons/upload.svg';
import Icon from '../icon';
import styles from './index.module.scss';

interface ImportPanelProps {
  onImportComplete?: (result: ImportResult) => void;
  onImportError?: (error: Error) => void;
}

export function ImportPanel({ onImportComplete, onImportError }: ImportPanelProps) {
  const {
    importInProgress,
    importProgress,
    importPreferences,
    updateImportPreferences,
    importProject,
    importBatch,
    previewImport,
    cancelImport,
  } = useStore(
    useShallow((state) => ({
      importInProgress: state.importInProgress,
      importProgress: state.importProgress,
      importPreferences: state.importPreferences,
      updateImportPreferences: state.updateImportPreferences,
      importProject: state.importProject,
      importBatch: state.importBatch,
      previewImport: state.previewImport,
      cancelImport: state.cancelImport,
    })),
  );

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [importOptions, setImportOptions] = useState<Partial<ImportOptions>>({});
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // File Selection Handlers
  // ============================================================================

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files).filter(isSupportedImportFile);
    setSelectedFiles(fileArray);
    setPreviewData(null);
    setShowPreview(false);
  }, []);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    handleFileSelect(event.dataTransfer.files);
  }, [handleFileSelect]);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  }, []);

  const handleClearFiles = useCallback(() => {
    setSelectedFiles([]);
    setPreviewData(null);
    setShowPreview(false);
  }, []);

  // ============================================================================
  // Import Options Handlers
  // ============================================================================

  const handleOptionChange = useCallback((key: keyof ImportOptions, value: any) => {
    setImportOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  const handlePreferenceChange = useCallback((key: keyof typeof importPreferences, value: any) => {
    updateImportPreferences({ [key]: value });
  }, [updateImportPreferences]);

  // ============================================================================
  // Import Actions
  // ============================================================================

  const handlePreview = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      const file = selectedFiles[0];
      const options = {
        ...importPreferences,
        ...importOptions,
        format: importOptions.format || detectFileFormat(file),
      };

      const preview = await previewImport(file, options);
      setPreviewData(preview);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
      onImportError?.(error instanceof Error ? error : new Error('Preview failed'));
    }
  }, [selectedFiles, importPreferences, importOptions, previewImport, onImportError]);

  const handleImport = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      const options = {
        ...importPreferences,
        ...importOptions,
      };

      let result: ImportResult;

      if (selectedFiles.length === 1) {
        const file = selectedFiles[0];
        const finalOptions = {
          ...options,
          format: options.format || detectFileFormat(file),
        };
        result = await importProject(file, finalOptions);
      } else {
        const results = await importBatch(selectedFiles, options);
        // For batch import, we'll use the first result or create a summary
        result = results[0] || {
          success: false,
          importedItems: [],
          skippedItems: [],
          errors: [{ type: 'system_error' as any, message: 'No results', recoverable: false }],
          warnings: [],
          stats: {
            totalItems: 0,
            importedItems: 0,
            skippedItems: 0,
            errorCount: 1,
            warningCount: 0,
            itemsByType: {} as any,
            processingTime: 0,
            averageItemTime: 0,
          },
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
        };
      }

      if (result.success) {
        setSelectedFiles([]);
        setPreviewData(null);
        setShowPreview(false);
        onImportComplete?.(result);
      } else {
        const errorMessage = result.errors.length > 0 
          ? result.errors[0].message 
          : 'Import failed';
        onImportError?.(new Error(errorMessage));
      }
    } catch (error) {
      console.error('Import failed:', error);
      onImportError?.(error instanceof Error ? error : new Error('Import failed'));
    }
  }, [selectedFiles, importPreferences, importOptions, importProject, importBatch, onImportComplete, onImportError]);

  const handleCancel = useCallback(() => {
    cancelImport();
  }, [cancelImport]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderFileList = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <div className={styles.fileList}>
        <div className={styles.fileListHeader}>
          <span>Selected Files ({selectedFiles.length})</span>
          <button type="button" onClick={handleClearFiles} className={styles.clearButton}>
            Clear All
          </button>
        </div>
        {selectedFiles.map((file, index) => (
          <div key={index} className={styles.fileItem}>
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
              <span className={styles.fileFormat}>
                {detectFileFormat(file).toUpperCase()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveFile(index)}
              className={styles.removeButton}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderProgress = () => {
    if (!importInProgress || !importProgress) return null;

    return (
      <div className={styles.progressContainer}>
        <div className={styles.progressHeader}>
          <span>{importProgress.message}</span>
          <span>{Math.round(importProgress.percentage)}%</span>
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${importProgress.percentage}%` }}
          />
        </div>
        <div className={styles.progressDetails}>
          <span>Stage: {importProgress.stage}</span>
          <span>{importProgress.current} / {importProgress.total}</span>
        </div>
      </div>
    );
  };

  const renderAdvancedOptions = () => {
    if (!showAdvanced) return null;

    return (
      <div className={styles.advancedOptions}>
        <div className={styles.optionGroup}>
          <label>
            <span>Format:</span>
            <select
              value={importOptions.format || 'auto'}
              onChange={(e) => handleOptionChange('format', e.target.value === 'auto' ? undefined : e.target.value)}
            >
              <option value="auto">Auto-detect</option>
              <option value={ImportExportFormat.JSON}>JSON</option>
              <option value={ImportExportFormat.CSV}>CSV</option>
              <option value={ImportExportFormat.XML}>XML</option>
              <option value={ImportExportFormat.ZIP}>ZIP</option>
            </select>
          </label>
        </div>

        <div className={styles.optionGroup}>
          <label>
            <span>Data Type:</span>
            <select
              value={importOptions.dataType || DataType.PROJECT}
              onChange={(e) => handleOptionChange('dataType', e.target.value)}
            >
              <option value={DataType.PROJECT}>Complete Project</option>
              <option value={DataType.DOCUMENT}>Document Only</option>
              <option value={DataType.SNAPSHOTS}>Snapshots Only</option>
              <option value={DataType.THEMES}>Themes Only</option>
              <option value={DataType.PRESETS}>Presets Only</option>
            </select>
          </label>
        </div>

        <div className={styles.optionGroup}>
          <label>
            <span>Conflict Resolution:</span>
            <select
              value={importOptions.conflictResolution || importPreferences.defaultConflictResolution}
              onChange={(e) => handleOptionChange('conflictResolution', e.target.value)}
            >
              <option value={ConflictResolutionStrategy.INTERACTIVE}>Interactive</option>
              <option value={ConflictResolutionStrategy.OVERWRITE}>Overwrite</option>
              <option value={ConflictResolutionStrategy.MERGE}>Merge</option>
              <option value={ConflictResolutionStrategy.SKIP}>Skip</option>
              <option value={ConflictResolutionStrategy.CREATE_NEW}>Create New</option>
            </select>
          </label>
        </div>

        <div className={styles.checkboxGroup}>
          <label>
            <input
              type="checkbox"
              checked={importOptions.validateData ?? importPreferences.validateData}
              onChange={(e) => handleOptionChange('validateData', e.target.checked)}
            />
            <span>Validate imported data</span>
          </label>
        </div>

        <div className={styles.checkboxGroup}>
          <label>
            <input
              type="checkbox"
              checked={importOptions.createBackup ?? importPreferences.createBackup}
              onChange={(e) => handleOptionChange('createBackup', e.target.checked)}
            />
            <span>Create backup before import</span>
          </label>
        </div>

        <div className={styles.checkboxGroup}>
          <label>
            <input
              type="checkbox"
              checked={importOptions.preserveIds ?? importPreferences.preserveIds}
              onChange={(e) => handleOptionChange('preserveIds', e.target.checked)}
            />
            <span>Preserve original IDs</span>
          </label>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    if (!showPreview || !previewData) return null;

    return (
      <div className={styles.previewContainer}>
        <div className={styles.previewHeader}>
          <span>Import Preview</span>
          <button type="button" onClick={() => setShowPreview(false)}>×</button>
        </div>
        <div className={styles.previewContent}>
          {previewData.valid ? (
            <div className={styles.previewValid}>
              <p>✓ Data is valid and ready to import</p>
              {previewData.conflicts.length > 0 && (
                <p>⚠ {previewData.conflicts.length} conflicts detected</p>
              )}
            </div>
          ) : (
            <div className={styles.previewInvalid}>
              <p>✗ Data validation failed</p>
              {previewData.errors.map((error: any, index: number) => (
                <p key={index} className={styles.error}>{error.message}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className={styles.importPanel}>
      <div className={styles.header}>
        <h3>Import Project</h3>
      </div>

      {/* File Drop Zone */}
      <div
        className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Icon name={uploadIcon} className={styles.uploadIcon} />
        <p>Drop files here or click to select</p>
        <p className={styles.supportedFormats}>
          Supported: JSON, CSV, XML, ZIP
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json,.csv,.xml,.zip"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* File List */}
      {renderFileList()}

      {/* Progress */}
      {renderProgress()}

      {/* Preview */}
      {renderPreview()}

      {/* Advanced Options */}
      <div className={styles.optionsSection}>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={styles.toggleButton}
        >
          Advanced Options {showAdvanced ? '▼' : '▶'}
        </button>
        {renderAdvancedOptions()}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {selectedFiles.length > 0 && !importInProgress && (
          <>
            <button
              type="button"
              onClick={handlePreview}
              className={styles.previewButton}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={handleImport}
              className={styles.importButton}
            >
              Import {selectedFiles.length > 1 ? `${selectedFiles.length} Files` : ''}
            </button>
          </>
        )}
        {importInProgress && (
          <button
            type="button"
            onClick={handleCancel}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
