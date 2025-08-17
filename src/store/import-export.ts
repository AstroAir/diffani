import { type StateCreator } from 'zustand';
import { ProjectImportExportManager } from '../core/import-export/project-manager';
import {
  type ProjectData,
  type ImportOptions,
  type ExportOptions,
  type ImportResult,
  type ExportResult,
  type ImportProgress,
  type ExportProgress,
  type ConflictItem,
  type BackupItem,
  type ImportHistoryItem,
  type ExportHistoryItem,
  type ProjectTemplate,
  ImportExportFormat,
  DataType,
  ConflictResolutionStrategy,
  DEFAULT_IMPORT_OPTIONS,
  DEFAULT_EXPORT_OPTIONS,
} from '../core/import-export/types';

// ============================================================================
// State Interface
// ============================================================================

export interface ImportExportSliceState {
  // Import state
  importInProgress: boolean;
  importProgress: ImportProgress | null;
  importHistory: ImportHistoryItem[];
  importPreferences: ImportPreferences;
  
  // Export state  
  exportInProgress: boolean;
  exportProgress: ExportProgress | null;
  exportHistory: ExportHistoryItem[];
  exportPreferences: ExportPreferences;
  
  // Conflict resolution
  pendingConflicts: ConflictItem[];
  conflictResolutionMode: 'auto' | 'interactive';
  
  // Backup state
  backups: BackupItem[];
  autoBackupEnabled: boolean;
  lastBackupTime: Date | null;
  
  // Templates
  templates: ProjectTemplate[];
  
  // Manager instance
  importExportManager: ProjectImportExportManager | null;
}

export interface ImportPreferences {
  defaultFormat: ImportExportFormat;
  defaultConflictResolution: ConflictResolutionStrategy;
  validateData: boolean;
  createBackup: boolean;
  preserveIds: boolean;
  showPreview: boolean;
}

export interface ExportPreferences {
  defaultFormat: ImportExportFormat;
  includeMetadata: boolean;
  compression: boolean;
  prettyPrint: boolean;
  includeThemes: boolean;
  includePresets: boolean;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface ImportExportSliceAction {
  // Import actions
  importProject: (file: File, options?: Partial<ImportOptions>) => Promise<ImportResult>;
  importBatch: (files: File[], options?: Partial<ImportOptions>) => Promise<ImportResult[]>;
  previewImport: (file: File, options?: Partial<ImportOptions>) => Promise<any>;
  cancelImport: () => void;
  
  // Export actions
  exportProject: (options?: Partial<ExportOptions>) => Promise<ExportResult>;
  exportBatch: (projects: ProjectData[], options?: Partial<ExportOptions>) => Promise<ExportResult[]>;
  cancelExport: () => void;
  
  // Conflict resolution actions
  resolveConflict: (conflictId: string, resolution: any) => void;
  resolveAllConflicts: (strategy: ConflictResolutionStrategy) => void;
  clearConflicts: () => void;
  
  // Backup actions
  createBackup: (reason?: string) => Promise<BackupItem>;
  restoreFromBackup: (backupId: string) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;
  listBackups: () => Promise<BackupItem[]>;
  setAutoBackupEnabled: (enabled: boolean) => void;
  
  // Template actions
  createFromTemplate: (templateId: string, customData?: Partial<ProjectData>) => Promise<void>;
  saveAsTemplate: (templateInfo: any) => Promise<ProjectTemplate>;
  deleteTemplate: (templateId: string) => void;
  loadTemplates: () => Promise<void>;
  
  // Preference actions
  updateImportPreferences: (preferences: Partial<ImportPreferences>) => void;
  updateExportPreferences: (preferences: Partial<ExportPreferences>) => void;
  
  // History actions
  clearImportHistory: () => void;
  clearExportHistory: () => void;
  
  // Manager actions
  initializeManager: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialImportPreferences: ImportPreferences = {
  defaultFormat: ImportExportFormat.JSON,
  defaultConflictResolution: ConflictResolutionStrategy.INTERACTIVE,
  validateData: true,
  createBackup: true,
  preserveIds: false,
  showPreview: true,
};

const initialExportPreferences: ExportPreferences = {
  defaultFormat: ImportExportFormat.JSON,
  includeMetadata: true,
  compression: true,
  prettyPrint: true,
  includeThemes: true,
  includePresets: true,
};

const initialState: ImportExportSliceState = {
  // Import state
  importInProgress: false,
  importProgress: null,
  importHistory: [],
  importPreferences: initialImportPreferences,
  
  // Export state
  exportInProgress: false,
  exportProgress: null,
  exportHistory: [],
  exportPreferences: initialExportPreferences,
  
  // Conflict resolution
  pendingConflicts: [],
  conflictResolutionMode: 'interactive',
  
  // Backup state
  backups: [],
  autoBackupEnabled: true,
  lastBackupTime: null,
  
  // Templates
  templates: [],
  
  // Manager instance
  importExportManager: null,
};

// ============================================================================
// Store Slice Creator
// ============================================================================

export const createImportExportSlice: StateCreator<
  ImportExportSliceState & ImportExportSliceAction,
  [],
  [],
  ImportExportSliceState & ImportExportSliceAction
> = (set, get) => ({
  ...initialState,

  // ============================================================================
  // Import Actions
  // ============================================================================

  async importProject(file: File, options?: Partial<ImportOptions>): Promise<ImportResult> {
    const state = get();
    const manager = state.importExportManager;
    
    if (!manager) {
      throw new Error('Import/Export manager not initialized');
    }

    if (state.importInProgress) {
      throw new Error('Import already in progress');
    }

    set({ importInProgress: true, importProgress: null });

    try {
      const finalOptions = {
        ...DEFAULT_IMPORT_OPTIONS,
        ...state.importPreferences,
        ...options,
      };

      const result = await manager.importProject(file, finalOptions);
      
      // Update history
      const history = [...state.importHistory];
      history.unshift({
        id: `import-${Date.now()}`,
        timestamp: new Date(),
        filename: file.name,
        format: finalOptions.format!,
        dataType: finalOptions.dataType!,
        result,
        options: finalOptions as ImportOptions,
      });

      set({
        importInProgress: false,
        importProgress: null,
        importHistory: history.slice(0, 100), // Keep last 100 items
      });

      return result;
    } catch (error) {
      set({ importInProgress: false, importProgress: null });
      throw error;
    }
  },

  async importBatch(files: File[], options?: Partial<ImportOptions>): Promise<ImportResult[]> {
    const state = get();
    const manager = state.importExportManager;
    
    if (!manager) {
      throw new Error('Import/Export manager not initialized');
    }

    if (state.importInProgress) {
      throw new Error('Import already in progress');
    }

    set({ importInProgress: true, importProgress: null });

    try {
      const finalOptions = {
        ...DEFAULT_IMPORT_OPTIONS,
        ...state.importPreferences,
        ...options,
      };

      const results = await manager.importBatch(files, finalOptions);
      
      set({ importInProgress: false, importProgress: null });
      return results;
    } catch (error) {
      set({ importInProgress: false, importProgress: null });
      throw error;
    }
  },

  async previewImport(file: File, options?: Partial<ImportOptions>) {
    const state = get();
    const manager = state.importExportManager;
    
    if (!manager) {
      throw new Error('Import/Export manager not initialized');
    }

    const finalOptions = {
      ...DEFAULT_IMPORT_OPTIONS,
      ...state.importPreferences,
      ...options,
    };

    return await manager.previewImport(file, finalOptions);
  },

  cancelImport() {
    const state = get();
    const manager = state.importExportManager;
    
    if (manager) {
      manager.cancelImport();
    }
    
    set({ importInProgress: false, importProgress: null });
  },

  // ============================================================================
  // Export Actions
  // ============================================================================

  async exportProject(options?: Partial<ExportOptions>): Promise<ExportResult> {
    const state = get();
    const manager = state.importExportManager;
    
    if (!manager) {
      throw new Error('Import/Export manager not initialized');
    }

    if (state.exportInProgress) {
      throw new Error('Export already in progress');
    }

    set({ exportInProgress: true, exportProgress: null });

    try {
      // Get current project data (this would come from the main app state)
      const projectData = await this.getCurrentProjectData();
      
      const finalOptions = {
        ...DEFAULT_EXPORT_OPTIONS,
        ...state.exportPreferences,
        ...options,
      };

      const result = await manager.exportProject(projectData, finalOptions);
      
      // Update history
      const history = [...state.exportHistory];
      history.unshift({
        id: `export-${Date.now()}`,
        timestamp: new Date(),
        filename: result.filename,
        format: finalOptions.format!,
        dataType: finalOptions.dataType!,
        result,
        options: finalOptions as ExportOptions,
      });

      set({
        exportInProgress: false,
        exportProgress: null,
        exportHistory: history.slice(0, 100), // Keep last 100 items
      });

      return result;
    } catch (error) {
      set({ exportInProgress: false, exportProgress: null });
      throw error;
    }
  },

  async exportBatch(projects: ProjectData[], options?: Partial<ExportOptions>): Promise<ExportResult[]> {
    const state = get();
    const manager = state.importExportManager;
    
    if (!manager) {
      throw new Error('Import/Export manager not initialized');
    }

    if (state.exportInProgress) {
      throw new Error('Export already in progress');
    }

    set({ exportInProgress: true, exportProgress: null });

    try {
      const finalOptions = {
        ...DEFAULT_EXPORT_OPTIONS,
        ...state.exportPreferences,
        ...options,
      };

      const results = await manager.exportBatch(projects, finalOptions);
      
      set({ exportInProgress: false, exportProgress: null });
      return results;
    } catch (error) {
      set({ exportInProgress: false, exportProgress: null });
      throw error;
    }
  },

  cancelExport() {
    const state = get();
    const manager = state.importExportManager;
    
    if (manager) {
      manager.cancelExport();
    }
    
    set({ exportInProgress: false, exportProgress: null });
  },

  // ============================================================================
  // Conflict Resolution Actions
  // ============================================================================

  resolveConflict(conflictId: string, resolution: any) {
    const state = get();
    const conflicts = state.pendingConflicts.map(conflict => 
      conflict.id === conflictId 
        ? { ...conflict, resolution, resolved: true }
        : conflict
    );
    
    set({ pendingConflicts: conflicts });
  },

  resolveAllConflicts(strategy: ConflictResolutionStrategy) {
    const state = get();
    const conflicts = state.pendingConflicts.map(conflict => ({
      ...conflict,
      resolution: { strategy, action: 'use_incoming' as any },
      resolved: true,
    }));
    
    set({ pendingConflicts: conflicts });
  },

  clearConflicts() {
    set({ pendingConflicts: [] });
  },

  // ============================================================================
  // Backup Actions
  // ============================================================================

  async createBackup(reason = 'manual'): Promise<BackupItem> {
    const state = get();
    const manager = state.importExportManager;
    
    if (!manager) {
      throw new Error('Import/Export manager not initialized');
    }

    const projectData = await this.getCurrentProjectData();
    const backup = await manager.createBackup(projectData, reason);
    
    const backups = [backup, ...state.backups];
    set({ 
      backups: backups.slice(0, 50), // Keep last 50 backups
      lastBackupTime: new Date(),
    });
    
    return backup;
  },

  async restoreFromBackup(backupId: string): Promise<void> {
    const state = get();
    const manager = state.importExportManager;
    
    if (!manager) {
      throw new Error('Import/Export manager not initialized');
    }

    const restoredData = await manager.restoreFromBackup(backupId);
    
    // Apply restored data to application state
    await this.applyRestoredData(restoredData);
  },

  async deleteBackup(backupId: string): Promise<void> {
    const state = get();
    const manager = state.importExportManager;
    
    if (!manager) {
      throw new Error('Import/Export manager not initialized');
    }

    await manager.deleteBackup(backupId);
    
    const backups = state.backups.filter(backup => backup.id !== backupId);
    set({ backups });
  },

  async listBackups(): Promise<BackupItem[]> {
    const state = get();
    const manager = state.importExportManager;
    
    if (!manager) {
      throw new Error('Import/Export manager not initialized');
    }

    const backups = await manager.listBackups();
    set({ backups });
    return backups;
  },

  setAutoBackupEnabled(enabled: boolean) {
    set({ autoBackupEnabled: enabled });
  },

  // ============================================================================
  // Template Actions
  // ============================================================================

  async createFromTemplate(templateId: string, customData?: Partial<ProjectData>): Promise<void> {
    const state = get();
    const manager = state.importExportManager;
    
    if (!manager) {
      throw new Error('Import/Export manager not initialized');
    }

    const template = state.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const projectData = await manager.createFromTemplate(template, customData);
    
    // Apply project data to application state
    await this.applyProjectData(projectData);
  },

  async saveAsTemplate(templateInfo: any): Promise<ProjectTemplate> {
    const state = get();
    const manager = state.importExportManager;
    
    if (!manager) {
      throw new Error('Import/Export manager not initialized');
    }

    const projectData = await this.getCurrentProjectData();
    const template = await manager.saveAsTemplate(projectData, templateInfo);
    
    const templates = [...state.templates, template];
    set({ templates });
    
    return template;
  },

  deleteTemplate(templateId: string) {
    const state = get();
    const templates = state.templates.filter(t => t.id !== templateId);
    set({ templates });
  },

  async loadTemplates(): Promise<void> {
    // Load templates from storage
    try {
      const stored = localStorage.getItem('diffani-templates');
      const templates = stored ? JSON.parse(stored) : [];
      set({ templates });
    } catch (error) {
      console.warn('Failed to load templates:', error);
    }
  },

  // ============================================================================
  // Preference Actions
  // ============================================================================

  updateImportPreferences(preferences: Partial<ImportPreferences>) {
    const state = get();
    const updated = { ...state.importPreferences, ...preferences };
    set({ importPreferences: updated });
    
    // Save to localStorage
    localStorage.setItem('diffani-import-preferences', JSON.stringify(updated));
  },

  updateExportPreferences(preferences: Partial<ExportPreferences>) {
    const state = get();
    const updated = { ...state.exportPreferences, ...preferences };
    set({ exportPreferences: updated });
    
    // Save to localStorage
    localStorage.setItem('diffani-export-preferences', JSON.stringify(updated));
  },

  // ============================================================================
  // History Actions
  // ============================================================================

  clearImportHistory() {
    set({ importHistory: [] });
    localStorage.removeItem('diffani-import-history');
  },

  clearExportHistory() {
    set({ exportHistory: [] });
    localStorage.removeItem('diffani-export-history');
  },

  // ============================================================================
  // Manager Actions
  // ============================================================================

  initializeManager() {
    const manager = new ProjectImportExportManager();
    
    // Set up event handlers
    manager.onImportProgress = (progress) => {
      set({ importProgress: progress });
    };
    
    manager.onExportProgress = (progress) => {
      set({ exportProgress: progress });
    };
    
    manager.onConflictDetected = (conflicts) => {
      set({ pendingConflicts: conflicts });
    };
    
    manager.onBackupCreated = (backup) => {
      const state = get();
      const backups = [backup, ...state.backups];
      set({ 
        backups: backups.slice(0, 50),
        lastBackupTime: new Date(),
      });
    };
    
    set({ importExportManager: manager });
    
    // Load preferences and history
    this.loadPreferencesAndHistory();
  },

  // ============================================================================
  // Helper Methods
  // ============================================================================

  async getCurrentProjectData(): Promise<ProjectData> {
    // This would get the current project data from the main app state
    // For now, return a placeholder
    throw new Error('getCurrentProjectData not implemented - needs integration with main app state');
  },

  async applyRestoredData(data: ProjectData): Promise<void> {
    // This would apply restored data to the main app state
    // For now, just log
    console.log('Applying restored data:', data);
  },

  async applyProjectData(data: ProjectData): Promise<void> {
    // This would apply project data to the main app state
    // For now, just log
    console.log('Applying project data:', data);
  },

  loadPreferencesAndHistory() {
    try {
      // Load import preferences
      const importPrefs = localStorage.getItem('diffani-import-preferences');
      if (importPrefs) {
        const parsed = JSON.parse(importPrefs);
        set({ importPreferences: { ...initialImportPreferences, ...parsed } });
      }

      // Load export preferences
      const exportPrefs = localStorage.getItem('diffani-export-preferences');
      if (exportPrefs) {
        const parsed = JSON.parse(exportPrefs);
        set({ exportPreferences: { ...initialExportPreferences, ...parsed } });
      }

      // Load history
      const importHistory = localStorage.getItem('diffani-import-history');
      if (importHistory) {
        set({ importHistory: JSON.parse(importHistory) });
      }

      const exportHistory = localStorage.getItem('diffani-export-history');
      if (exportHistory) {
        set({ exportHistory: JSON.parse(exportHistory) });
      }
    } catch (error) {
      console.warn('Failed to load preferences and history:', error);
    }
  },
});
