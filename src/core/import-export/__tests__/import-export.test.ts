import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectImportExportManager } from '../project-manager';
import { DocumentImporter } from '../document-importer';
import { DocumentExporter } from '../document-exporter';
import { DataValidator } from '../data-validator';
import { ConflictResolver } from '../conflict-resolver';
import { BackupManager } from '../backup-manager';
import {
  ImportExportFormat,
  DataType,
  ConflictResolutionStrategy,
  type ProjectData,
  type ImportOptions,
  type ExportOptions,
} from '../types';

// Mock dependencies
vi.mock('../document-importer');
vi.mock('../document-exporter');
vi.mock('../data-validator');
vi.mock('../conflict-resolver');
vi.mock('../backup-manager');

describe('ProjectImportExportManager', () => {
  let manager: ProjectImportExportManager;
  let mockImporter: vi.Mocked<DocumentImporter>;
  let mockExporter: vi.Mocked<DocumentExporter>;
  let mockValidator: vi.Mocked<DataValidator>;
  let mockResolver: vi.Mocked<ConflictResolver>;
  let mockBackupManager: vi.Mocked<BackupManager>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create manager instance
    manager = new ProjectImportExportManager();

    // Get mock instances
    mockImporter = vi.mocked(DocumentImporter).mock.instances[0] as any;
    mockExporter = vi.mocked(DocumentExporter).mock.instances[0] as any;
    mockValidator = vi.mocked(DataValidator).mock.instances[0] as any;
    mockResolver = vi.mocked(ConflictResolver).mock.instances[0] as any;
    mockBackupManager = vi.mocked(BackupManager).mock.instances[0] as any;
  });

  describe('Import Operations', () => {
    it('should import a project successfully', async () => {
      // Arrange
      const file = new File(['{"test": "data"}'], 'test.json', {
        type: 'application/json',
      });
      const options: ImportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        conflictResolution: ConflictResolutionStrategy.OVERWRITE,
        validateData: true,
        createBackup: true,
        preserveIds: false,
      };

      const mockResult = {
        success: true,
        importedItems: [
          {
            type: DataType.PROJECT,
            id: 'test-id',
            name: 'Test Project',
            action: 'created' as any,
            importedData: { test: 'data' },
          },
        ],
        skippedItems: [],
        errors: [],
        warnings: [],
        stats: {
          totalItems: 1,
          importedItems: 1,
          skippedItems: 0,
          errorCount: 0,
          warningCount: 0,
          itemsByType: {
            [DataType.PROJECT]: 1,
            [DataType.DOCUMENT]: 0,
            [DataType.SNAPSHOTS]: 0,
            [DataType.THEMES]: 0,
            [DataType.PRESETS]: 0,
            [DataType.SETTINGS]: 0,
          },
          processingTime: 100,
          averageItemTime: 100,
        },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
      };

      mockImporter.import.mockResolvedValue(mockResult);
      mockBackupManager.createBackup.mockResolvedValue({
        id: 'backup-id',
        timestamp: new Date(),
        reason: 'before_import' as any,
        data: {} as any,
        size: 1000,
        compressed: true,
        restorable: true,
      });

      // Act
      const result = await manager.importProject(file, options);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockBackupManager.createBackup).toHaveBeenCalledWith(
        'before_import',
      );
      expect(mockImporter.import).toHaveBeenCalledWith(
        file,
        options,
        expect.any(AbortSignal),
      );
    });

    it('should handle import errors gracefully', async () => {
      // Arrange
      const file = new File(['invalid'], 'test.json', {
        type: 'application/json',
      });
      const options: ImportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        conflictResolution: ConflictResolutionStrategy.OVERWRITE,
        validateData: true,
        createBackup: false,
        preserveIds: false,
      };

      mockImporter.import.mockRejectedValue(new Error('Import failed'));

      // Act & Assert
      await expect(manager.importProject(file, options)).rejects.toThrow(
        'Import failed: Import failed',
      );
    });

    it('should import multiple files in batch', async () => {
      // Arrange
      const files = [
        new File(['{"test1": "data"}'], 'test1.json', {
          type: 'application/json',
        }),
        new File(['{"test2": "data"}'], 'test2.json', {
          type: 'application/json',
        }),
      ];

      const mockResult = {
        success: true,
        importedItems: [],
        skippedItems: [],
        errors: [],
        warnings: [],
        stats: {
          totalItems: 1,
          importedItems: 1,
          skippedItems: 0,
          errorCount: 0,
          warningCount: 0,
          itemsByType: {} as any,
          processingTime: 100,
          averageItemTime: 100,
        },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
      };

      mockImporter.import.mockResolvedValue(mockResult);

      // Act
      const results = await manager.importBatch(files);

      // Assert
      expect(results).toHaveLength(2);
      expect(mockImporter.import).toHaveBeenCalledTimes(2);
    });

    it('should preview import without actually importing', async () => {
      // Arrange
      const file = new File(['{"test": "data"}'], 'test.json', {
        type: 'application/json',
      });
      const options: ImportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        conflictResolution: ConflictResolutionStrategy.OVERWRITE,
        validateData: true,
        createBackup: false,
        preserveIds: false,
      };

      const mockPreview = {
        valid: true,
        conflicts: [],
        preview: { test: 'data' },
        errors: [],
        warnings: [],
      };

      mockImporter.parseFile.mockResolvedValue({ test: 'data' });
      mockValidator.validate.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      });
      mockResolver.detectConflicts.mockResolvedValue([]);

      // Act
      const result = await manager.previewImport(file, options);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.conflicts).toEqual([]);
      expect(mockImporter.parseFile).toHaveBeenCalledWith(
        file,
        ImportExportFormat.JSON,
      );
      expect(mockValidator.validate).toHaveBeenCalled();
      expect(mockResolver.detectConflicts).toHaveBeenCalled();
    });
  });

  describe('Export Operations', () => {
    it('should export a project successfully', async () => {
      // Arrange
      const projectData: ProjectData = {
        metadata: {
          id: 'test-id',
          name: 'Test Project',
          version: '1.0.0',
          author: 'Test Author',
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: ['test'],
          diffaniVersion: '1.0.0',
          fileSize: 1000,
          snapshotCount: 5,
          totalDuration: 5000,
        },
        document: {
          language: 'javascript',
          snapshots: [
            {
              id: 'snap-1',
              code: 'console.log("hello");',
              duration: 1000,
              transitionTime: 500,
            },
          ],
          fontSize: 14,
          lineHeight: 20,
          width: 800,
          height: 600,
          theme: 'default',
          padding: { top: 10, left: 10, bottom: 10 },
        },
      };

      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
      };

      const mockResult = {
        success: true,
        blob: new Blob(['{"test": "data"}'], { type: 'application/json' }),
        filename: 'export.json',
        format: ImportExportFormat.JSON,
        size: 1000,
        stats: {
          totalItems: 1,
          exportedItems: 1,
          totalSize: 1000,
          itemsByType: {} as any,
          processingTime: 100,
          averageItemTime: 100,
        },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
        exportedItems: [],
        warnings: [],
      };

      mockExporter.export.mockResolvedValue(mockResult);

      // Act
      const result = await manager.exportProject(projectData, options);

      // Assert
      expect(result).toEqual(mockResult);
      // The implementation merges options with defaults, so we expect the merged options
      expect(mockExporter.export).toHaveBeenCalledWith(
        projectData,
        expect.objectContaining({
          format: 'json',
          includeMetadata: true,
          compression: false,
          dataType: 'project',
        }),
        expect.any(AbortSignal),
      );
    });

    it('should handle export errors gracefully', async () => {
      // Arrange
      const projectData: ProjectData = {
        metadata: {
          id: 'test-id',
          name: 'Test Project',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          diffaniVersion: '1.0.0',
          fileSize: 1000,
          snapshotCount: 0,
          totalDuration: 0,
        },
        document: {
          language: 'javascript',
          snapshots: [],
          fontSize: 14,
          lineHeight: 20,
          width: 800,
          height: 600,
          theme: 'default',
          padding: { top: 10, left: 10, bottom: 10 },
        },
      };

      mockExporter.export.mockRejectedValue(new Error('Export failed'));

      // Act & Assert
      await expect(manager.exportProject(projectData)).rejects.toThrow(
        'Export failed: Export failed',
      );
    });
  });

  describe('Backup Operations', () => {
    it('should create a backup successfully', async () => {
      // Arrange
      const projectData: ProjectData = {
        metadata: {
          id: 'test-id',
          name: 'Test Project',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          diffaniVersion: '1.0.0',
          fileSize: 1000,
          snapshotCount: 0,
          totalDuration: 0,
        },
        document: {
          language: 'javascript',
          snapshots: [],
          fontSize: 14,
          lineHeight: 20,
          width: 800,
          height: 600,
          theme: 'default',
          padding: { top: 10, left: 10, bottom: 10 },
        },
      };

      const mockBackup = {
        id: 'backup-id',
        timestamp: new Date(),
        reason: 'manual' as any,
        data: projectData,
        size: 1000,
        compressed: true,
        restorable: true,
      };

      mockBackupManager.createBackup.mockResolvedValue(mockBackup);

      // Act
      const result = await manager.createBackup(projectData, 'manual');

      // Assert
      expect(result).toEqual(mockBackup);
      expect(mockBackupManager.createBackup).toHaveBeenCalledWith(
        'manual',
        projectData,
      );
    });

    it('should restore from backup successfully', async () => {
      // Arrange
      const backupId = 'backup-id';
      const restoredData: ProjectData = {
        metadata: {
          id: 'test-id',
          name: 'Test Project',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          diffaniVersion: '1.0.0',
          fileSize: 1000,
          snapshotCount: 0,
          totalDuration: 0,
        },
        document: {
          language: 'javascript',
          snapshots: [],
          fontSize: 14,
          lineHeight: 20,
          width: 800,
          height: 600,
          theme: 'default',
          padding: { top: 10, left: 10, bottom: 10 },
        },
      };

      mockBackupManager.restore.mockResolvedValue(restoredData);

      // Act
      const result = await manager.restoreFromBackup(backupId);

      // Assert
      expect(result).toEqual(restoredData);
      expect(mockBackupManager.restore).toHaveBeenCalledWith(backupId);
    });

    it('should list backups successfully', async () => {
      // Arrange
      const mockBackups = [
        {
          id: 'backup-1',
          timestamp: new Date(),
          reason: 'manual' as any,
          data: {} as any,
          size: 1000,
          compressed: true,
          restorable: true,
        },
        {
          id: 'backup-2',
          timestamp: new Date(),
          reason: 'auto' as any,
          data: {} as any,
          size: 2000,
          compressed: true,
          restorable: true,
        },
      ];

      mockBackupManager.listBackups.mockResolvedValue(mockBackups);

      // Act
      const result = await manager.listBackups();

      // Assert
      expect(result).toEqual(mockBackups);
      expect(mockBackupManager.listBackups).toHaveBeenCalled();
    });
  });

  describe('Operation Management', () => {
    it('should cancel import operations', () => {
      // Act
      manager.cancelImport();

      // Assert - should not throw
      expect(true).toBe(true);
    });

    it('should cancel export operations', () => {
      // Act
      manager.cancelExport();

      // Assert - should not throw
      expect(true).toBe(true);
    });

    it('should track active operations', () => {
      // Act
      const operations = manager.getActiveOperations();

      // Assert
      expect(operations).toEqual({
        imports: [],
        exports: [],
      });
    });
  });
});
