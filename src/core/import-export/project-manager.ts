import { type RawDoc } from '../doc/raw-doc';
import { DocumentImporter } from './document-importer';
import { DocumentExporter } from './document-exporter';
import { DataValidator } from './data-validator';
import { ConflictResolver } from './conflict-resolver';
import { BackupManager } from './backup-manager';
import {
  type ProjectData,
  type ProjectMetadata,
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
} from './types';

/**
 * Main orchestrator class for project import/export operations
 * Coordinates between different components and manages the overall workflow
 */
export class ProjectImportExportManager {
  private documentImporter: DocumentImporter;
  private documentExporter: DocumentExporter;
  private dataValidator: DataValidator;
  private conflictResolver: ConflictResolver;
  private backupManager: BackupManager;

  // Operation tracking
  private activeImports = new Map<string, AbortController>();
  private activeExports = new Map<string, AbortController>();

  // History tracking
  private importHistory: ImportHistoryItem[] = [];
  private exportHistory: ExportHistoryItem[] = [];

  // Event handlers
  public onImportProgress?: (progress: ImportProgress) => void;
  public onExportProgress?: (progress: ExportProgress) => void;
  public onConflictDetected?: (conflicts: ConflictItem[]) => void;
  public onBackupCreated?: (backup: BackupItem) => void;

  constructor() {
    this.documentImporter = new DocumentImporter();
    this.documentExporter = new DocumentExporter();
    this.dataValidator = new DataValidator();
    this.conflictResolver = new ConflictResolver();
    this.backupManager = new BackupManager();

    this.setupEventHandlers();
    this.loadHistory();
  }

  // ============================================================================
  // Import Operations
  // ============================================================================

  /**
   * Import a project from file
   */
  async importProject(
    file: File,
    options: Partial<ImportOptions> = {},
  ): Promise<ImportResult> {
    const finalOptions = { ...DEFAULT_IMPORT_OPTIONS, ...options };
    const operationId = this.generateOperationId();
    const abortController = new AbortController();
    
    this.activeImports.set(operationId, abortController);

    try {
      // Create backup if requested
      if (finalOptions.createBackup) {
        await this.backupManager.createBackup('before_import');
      }

      // Start import process
      const result = await this.documentImporter.import(
        file,
        finalOptions as ImportOptions,
        abortController.signal,
      );

      // Add to history
      this.addImportToHistory(file.name, finalOptions as ImportOptions, result);

      return result;
    } catch (error) {
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.activeImports.delete(operationId);
    }
  }

  /**
   * Import multiple files in batch
   */
  async importBatch(
    files: File[],
    options: Partial<ImportOptions> = {},
  ): Promise<ImportResult[]> {
    const results: ImportResult[] = [];
    const finalOptions = { ...DEFAULT_IMPORT_OPTIONS, ...options };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const result = await this.importProject(file, finalOptions);
        results.push(result);
        
        // Update batch progress
        if (this.onImportProgress) {
          this.onImportProgress({
            current: i + 1,
            total: files.length,
            percentage: ((i + 1) / files.length) * 100,
            stage: 'importing' as any,
            message: `Imported ${i + 1} of ${files.length} files`,
          });
        }
      } catch (error) {
        // Create error result for failed import
        results.push({
          success: false,
          importedItems: [],
          skippedItems: [],
          errors: [{
            type: 'system_error' as any,
            message: error instanceof Error ? error.message : 'Unknown error',
            recoverable: false,
          }],
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
        });
      }
    }

    return results;
  }

  /**
   * Preview import without actually importing
   */
  async previewImport(
    file: File,
    options: Partial<ImportOptions> = {},
  ): Promise<{
    valid: boolean;
    conflicts: ConflictItem[];
    preview: Partial<ProjectData>;
    errors: any[];
    warnings: any[];
  }> {
    const finalOptions = { ...DEFAULT_IMPORT_OPTIONS, ...options };
    
    try {
      // Parse and validate the file
      const parsedData = await this.documentImporter.parseFile(file, finalOptions.format!);
      const validationResult = await this.dataValidator.validate(parsedData, finalOptions.dataType!);
      
      // Detect conflicts
      const conflicts = await this.conflictResolver.detectConflicts(parsedData, finalOptions);
      
      return {
        valid: validationResult.valid,
        conflicts,
        preview: parsedData,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      };
    } catch (error) {
      return {
        valid: false,
        conflicts: [],
        preview: {},
        errors: [{
          field: 'file',
          message: error instanceof Error ? error.message : 'Unknown error',
        }],
        warnings: [],
      };
    }
  }

  // ============================================================================
  // Export Operations
  // ============================================================================

  /**
   * Export current project
   */
  async exportProject(
    projectData: ProjectData,
    options: Partial<ExportOptions> = {},
  ): Promise<ExportResult> {
    const finalOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };
    const operationId = this.generateOperationId();
    const abortController = new AbortController();
    
    this.activeExports.set(operationId, abortController);

    try {
      const result = await this.documentExporter.export(
        projectData,
        finalOptions as ExportOptions,
        abortController.signal,
      );

      // Add to history
      this.addExportToHistory(result.filename, finalOptions as ExportOptions, result);

      return result;
    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.activeExports.delete(operationId);
    }
  }

  /**
   * Export multiple projects in batch
   */
  async exportBatch(
    projects: ProjectData[],
    options: Partial<ExportOptions> = {},
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    const finalOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      
      try {
        const result = await this.exportProject(project, finalOptions);
        results.push(result);
        
        // Update batch progress
        if (this.onExportProgress) {
          this.onExportProgress({
            current: i + 1,
            total: projects.length,
            percentage: ((i + 1) / projects.length) * 100,
            stage: 'generating_file' as any,
            message: `Exported ${i + 1} of ${projects.length} projects`,
          });
        }
      } catch (error) {
        // Create error result for failed export
        results.push({
          success: false,
          blob: new Blob(),
          filename: `error-${i}.txt`,
          format: finalOptions.format!,
          size: 0,
          stats: {
            totalItems: 0,
            exportedItems: 0,
            totalSize: 0,
            itemsByType: {} as any,
            processingTime: 0,
            averageItemTime: 0,
          },
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          exportedItems: [],
          warnings: [{
            type: 'system_error' as any,
            message: error instanceof Error ? error.message : 'Unknown error',
          }],
        });
      }
    }

    return results;
  }

  // ============================================================================
  // Template Operations
  // ============================================================================

  /**
   * Create project from template
   */
  async createFromTemplate(
    template: ProjectTemplate,
    customData?: Partial<ProjectData>,
  ): Promise<ProjectData> {
    const baseData = template.templateData;
    const mergedData = this.mergeProjectData(baseData, customData);
    
    // Generate new metadata
    const metadata: ProjectMetadata = {
      id: this.generateId(),
      name: customData?.metadata?.name || `${template.name} Project`,
      description: customData?.metadata?.description || template.description,
      version: '1.0.0',
      author: customData?.metadata?.author,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [...(template.tags || []), ...(customData?.metadata?.tags || [])],
      category: customData?.metadata?.category,
      license: customData?.metadata?.license,
      diffaniVersion: '1.0.0', // Should be dynamic
      fileSize: 0, // Will be calculated
      snapshotCount: mergedData.document?.snapshots?.length || 0,
      totalDuration: 0, // Will be calculated
    };

    return {
      metadata,
      document: mergedData.document!,
      themes: mergedData.themes,
      presets: mergedData.presets,
      exportSettings: mergedData.exportSettings,
    };
  }

  /**
   * Save project as template
   */
  async saveAsTemplate(
    projectData: ProjectData,
    templateInfo: {
      name: string;
      description: string;
      category: any;
      tags: string[];
      difficulty: any;
      estimatedTime: number;
    },
  ): Promise<ProjectTemplate> {
    const template: ProjectTemplate = {
      id: this.generateId(),
      name: templateInfo.name,
      description: templateInfo.description,
      category: templateInfo.category,
      author: projectData.metadata.author || 'Unknown',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      templateData: projectData,
      tags: templateInfo.tags,
      difficulty: templateInfo.difficulty,
      estimatedTime: templateInfo.estimatedTime,
      usageCount: 0,
      rating: 0,
      ratingCount: 0,
      customizable: true,
      requiredFields: ['metadata.name', 'document'],
      optionalFields: ['themes', 'presets', 'exportSettings'],
    };

    // Save template (implementation depends on storage strategy)
    await this.saveTemplate(template);
    
    return template;
  }

  // ============================================================================
  // Backup and Restore Operations
  // ============================================================================

  /**
   * Create manual backup
   */
  async createBackup(
    projectData: ProjectData,
    reason: string = 'manual',
  ): Promise<BackupItem> {
    return await this.backupManager.createBackup(reason as any, projectData);
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<ProjectData> {
    return await this.backupManager.restore(backupId);
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupItem[]> {
    return await this.backupManager.listBackups();
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    await this.backupManager.deleteBackup(backupId);
  }

  // ============================================================================
  // Operation Management
  // ============================================================================

  /**
   * Cancel import operation
   */
  cancelImport(operationId?: string): void {
    if (operationId) {
      const controller = this.activeImports.get(operationId);
      if (controller) {
        controller.abort();
        this.activeImports.delete(operationId);
      }
    } else {
      // Cancel all active imports
      for (const [id, controller] of this.activeImports) {
        controller.abort();
        this.activeImports.delete(id);
      }
    }
  }

  /**
   * Cancel export operation
   */
  cancelExport(operationId?: string): void {
    if (operationId) {
      const controller = this.activeExports.get(operationId);
      if (controller) {
        controller.abort();
        this.activeExports.delete(operationId);
      }
    } else {
      // Cancel all active exports
      for (const [id, controller] of this.activeExports) {
        controller.abort();
        this.activeExports.delete(id);
      }
    }
  }

  /**
   * Get active operations
   */
  getActiveOperations(): {
    imports: string[];
    exports: string[];
  } {
    return {
      imports: Array.from(this.activeImports.keys()),
      exports: Array.from(this.activeExports.keys()),
    };
  }

  // ============================================================================
  // History Management
  // ============================================================================

  /**
   * Get import history
   */
  getImportHistory(): ImportHistoryItem[] {
    return [...this.importHistory];
  }

  /**
   * Get export history
   */
  getExportHistory(): ExportHistoryItem[] {
    return [...this.exportHistory];
  }

  /**
   * Clear history
   */
  clearHistory(type?: 'import' | 'export'): void {
    if (!type || type === 'import') {
      this.importHistory = [];
    }
    if (!type || type === 'export') {
      this.exportHistory = [];
    }
    this.saveHistory();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupEventHandlers(): void {
    // Setup event forwarding from sub-components
    this.documentImporter.onProgress = (progress) => {
      this.onImportProgress?.(progress);
    };

    this.documentExporter.onProgress = (progress) => {
      this.onExportProgress?.(progress);
    };

    this.conflictResolver.onConflictDetected = (conflicts) => {
      this.onConflictDetected?.(conflicts);
    };

    this.backupManager.onBackupCreated = (backup) => {
      this.onBackupCreated?.(backup);
    };
  }

  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addImportToHistory(
    filename: string,
    options: ImportOptions,
    result: ImportResult,
  ): void {
    const historyItem: ImportHistoryItem = {
      id: this.generateId(),
      timestamp: new Date(),
      filename,
      format: options.format,
      dataType: options.dataType,
      result,
      options,
    };

    this.importHistory.unshift(historyItem);
    
    // Keep only last 100 items
    if (this.importHistory.length > 100) {
      this.importHistory = this.importHistory.slice(0, 100);
    }

    this.saveHistory();
  }

  private addExportToHistory(
    filename: string,
    options: ExportOptions,
    result: ExportResult,
  ): void {
    const historyItem: ExportHistoryItem = {
      id: this.generateId(),
      timestamp: new Date(),
      filename,
      format: options.format,
      dataType: options.dataType,
      result,
      options,
    };

    this.exportHistory.unshift(historyItem);
    
    // Keep only last 100 items
    if (this.exportHistory.length > 100) {
      this.exportHistory = this.exportHistory.slice(0, 100);
    }

    this.saveHistory();
  }

  private mergeProjectData(
    base: Partial<ProjectData>,
    custom?: Partial<ProjectData>,
  ): Partial<ProjectData> {
    if (!custom) return base;

    return {
      ...base,
      ...custom,
      metadata: {
        ...base.metadata,
        ...custom.metadata,
      } as ProjectMetadata,
      document: custom.document || base.document!,
      themes: [...(base.themes || []), ...(custom.themes || [])],
      presets: [...(base.presets || []), ...(custom.presets || [])],
      exportSettings: custom.exportSettings || base.exportSettings,
    };
  }

  private async saveTemplate(template: ProjectTemplate): Promise<void> {
    // Implementation depends on storage strategy
    // For now, save to localStorage
    const templates = this.getStoredTemplates();
    templates.push(template);
    localStorage.setItem('diffani-templates', JSON.stringify(templates));
  }

  private getStoredTemplates(): ProjectTemplate[] {
    try {
      const stored = localStorage.getItem('diffani-templates');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private loadHistory(): void {
    try {
      const importHistory = localStorage.getItem('diffani-import-history');
      if (importHistory) {
        this.importHistory = JSON.parse(importHistory);
      }

      const exportHistory = localStorage.getItem('diffani-export-history');
      if (exportHistory) {
        this.exportHistory = JSON.parse(exportHistory);
      }
    } catch (error) {
      console.warn('Failed to load import/export history:', error);
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem('diffani-import-history', JSON.stringify(this.importHistory));
      localStorage.setItem('diffani-export-history', JSON.stringify(this.exportHistory));
    } catch (error) {
      console.warn('Failed to save import/export history:', error);
    }
  }
}
