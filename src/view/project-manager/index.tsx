import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../store';
import { ImportPanel } from '../import-panel';
import { ExportPanel } from '../export-panel';
import { type ImportResult } from '../../core/import-export/types';
import folderIcon from '../../assets/icons/folder.svg';
import Icon from '../icon';
import styles from './index.module.scss';

interface ProjectManagerProps {
  className?: string;
}

export function ProjectManager({ className }: ProjectManagerProps) {
  const {
    importHistory,
    exportHistory,
    backups,
    templates,
    clearImportHistory,
    clearExportHistory,
    listBackups,
    loadTemplates,
    createBackup,
    restoreFromBackup,
    deleteBackup,
  } = useStore(
    useShallow((state) => ({
      importHistory: state.importHistory,
      exportHistory: state.exportHistory,
      backups: state.backups,
      templates: state.templates,
      clearImportHistory: state.clearImportHistory,
      clearExportHistory: state.clearExportHistory,
      listBackups: state.listBackups,
      loadTemplates: state.loadTemplates,
      createBackup: state.createBackup,
      restoreFromBackup: state.restoreFromBackup,
      deleteBackup: state.deleteBackup,
    })),
  );

  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'history' | 'backups' | 'templates'>('import');
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleImportComplete = (result: ImportResult) => {
    if (result.success) {
      setShowNotification(`Successfully imported ${result.importedItems.length} items`);
      setTimeout(() => setShowNotification(null), 3000);
    } else {
      setShowNotification(`Import failed: ${result.errors[0]?.message || 'Unknown error'}`);
      setTimeout(() => setShowNotification(null), 5000);
    }
  };

  const handleImportError = (error: Error) => {
    setShowNotification(`Import error: ${error.message}`);
    setTimeout(() => setShowNotification(null), 5000);
  };

  const handleCreateBackup = async () => {
    try {
      await createBackup('manual');
      setShowNotification('Backup created successfully');
      setTimeout(() => setShowNotification(null), 3000);
    } catch (error) {
      setShowNotification(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setShowNotification(null), 5000);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to restore from this backup? Current data will be replaced.')) {
      return;
    }

    try {
      await restoreFromBackup(backupId);
      setShowNotification('Backup restored successfully');
      setTimeout(() => setShowNotification(null), 3000);
    } catch (error) {
      setShowNotification(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setShowNotification(null), 5000);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) {
      return;
    }

    try {
      await deleteBackup(backupId);
      setShowNotification('Backup deleted successfully');
      setTimeout(() => setShowNotification(null), 3000);
    } catch (error) {
      setShowNotification(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setShowNotification(null), 5000);
    }
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderTabContent = () => {
    switch (activeTab) {
      case 'import':
        return (
          <ImportPanel
            onImportComplete={handleImportComplete}
            onImportError={handleImportError}
          />
        );

      case 'export':
        return <ExportPanel />;

      case 'history':
        return (
          <div className={styles.historyPanel}>
            <div className={styles.historySection}>
              <div className={styles.historyHeader}>
                <h4>Import History</h4>
                <button
                  type="button"
                  onClick={clearImportHistory}
                  className={styles.clearButton}
                >
                  Clear
                </button>
              </div>
              <div className={styles.historyList}>
                {importHistory.length === 0 ? (
                  <p className={styles.emptyMessage}>No import history</p>
                ) : (
                  importHistory.slice(0, 10).map((item) => (
                    <div key={item.id} className={styles.historyItem}>
                      <div className={styles.historyInfo}>
                        <span className={styles.filename}>{item.filename}</span>
                        <span className={styles.timestamp}>
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.historyStatus}>
                        {item.result.success ? (
                          <span className={styles.success}>✓ Success</span>
                        ) : (
                          <span className={styles.error}>✗ Failed</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.historySection}>
              <div className={styles.historyHeader}>
                <h4>Export History</h4>
                <button
                  type="button"
                  onClick={clearExportHistory}
                  className={styles.clearButton}
                >
                  Clear
                </button>
              </div>
              <div className={styles.historyList}>
                {exportHistory.length === 0 ? (
                  <p className={styles.emptyMessage}>No export history</p>
                ) : (
                  exportHistory.slice(0, 10).map((item) => (
                    <div key={item.id} className={styles.historyItem}>
                      <div className={styles.historyInfo}>
                        <span className={styles.filename}>{item.filename}</span>
                        <span className={styles.timestamp}>
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.historyStatus}>
                        {item.result.success ? (
                          <span className={styles.success}>✓ Success</span>
                        ) : (
                          <span className={styles.error}>✗ Failed</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      case 'backups':
        return (
          <div className={styles.backupsPanel}>
            <div className={styles.backupsHeader}>
              <h4>Project Backups</h4>
              <button
                type="button"
                onClick={handleCreateBackup}
                className={styles.createBackupButton}
              >
                Create Backup
              </button>
            </div>
            <div className={styles.backupsList}>
              {backups.length === 0 ? (
                <p className={styles.emptyMessage}>No backups available</p>
              ) : (
                backups.map((backup) => (
                  <div key={backup.id} className={styles.backupItem}>
                    <div className={styles.backupInfo}>
                      <span className={styles.backupReason}>{backup.reason}</span>
                      <span className={styles.backupTimestamp}>
                        {new Date(backup.timestamp).toLocaleString()}
                      </span>
                      <span className={styles.backupSize}>
                        {(backup.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className={styles.backupActions}>
                      <button
                        type="button"
                        onClick={() => handleRestoreBackup(backup.id)}
                        className={styles.restoreButton}
                        disabled={!backup.restorable}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBackup(backup.id)}
                        className={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className={styles.templatesPanel}>
            <div className={styles.templatesHeader}>
              <h4>Project Templates</h4>
              <button
                type="button"
                onClick={loadTemplates}
                className={styles.refreshButton}
              >
                Refresh
              </button>
            </div>
            <div className={styles.templatesList}>
              {templates.length === 0 ? (
                <p className={styles.emptyMessage}>No templates available</p>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className={styles.templateItem}>
                    <div className={styles.templateInfo}>
                      <span className={styles.templateName}>{template.name}</span>
                      <span className={styles.templateDescription}>
                        {template.description}
                      </span>
                      <span className={styles.templateCategory}>
                        {template.category}
                      </span>
                    </div>
                    <div className={styles.templateActions}>
                      <button
                        type="button"
                        className={styles.useTemplateButton}
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className={`${styles.projectManager} ${className || ''}`}>
      {/* Notification */}
      {showNotification && (
        <div className={styles.notification}>
          {showNotification}
          <button
            type="button"
            onClick={() => setShowNotification(null)}
            className={styles.notificationClose}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <Icon name={folderIcon} className={styles.headerIcon} />
        <h2>Project Manager</h2>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'import' ? styles.active : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'export' ? styles.active : ''}`}
          onClick={() => setActiveTab('export')}
        >
          Export
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'backups' ? styles.active : ''}`}
          onClick={() => setActiveTab('backups')}
        >
          Backups
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'templates' ? styles.active : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {renderTabContent()}
      </div>
    </div>
  );
}
