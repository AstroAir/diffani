import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createImportExportSlice } from '../import-export';
import {
  ImportExportFormat,
  DataType,
  ConflictResolutionStrategy,
  type ImportResult,
  type ExportResult,
  type ProjectData,
} from '../../core/import-export/types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Create a mock manager instance that will be reused
const mockManagerInstance = {
  importProject: vi.fn(),
  importBatch: vi.fn(),
  previewImport: vi.fn(),
  exportProject: vi.fn(),
  exportBatch: vi.fn(),
  createBackup: vi.fn(),
  restoreFromBackup: vi.fn(),
  deleteBackup: vi.fn(),
  listBackups: vi.fn(),
  createFromTemplate: vi.fn(),
  saveAsTemplate: vi.fn(),
  cancelImport: vi.fn(),
  cancelExport: vi.fn(),
  onImportProgress: vi.fn(),
  onExportProgress: vi.fn(),
  onConflictDetected: vi.fn(),
  onBackupCreated: vi.fn(),
};

// Mock ProjectImportExportManager
vi.mock('../../core/import-export/project-manager', () => ({
  ProjectImportExportManager: vi
    .fn()
    .mockImplementation(() => mockManagerInstance),
}));

describe('ImportExportSlice', () => {
  let store: any;
  let mockManager: any;
  let storeState: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a proper store state object
    storeState = {};

    // Create proper set and get functions
    const set = (partial: any) => {
      if (typeof partial === 'function') {
        storeState = { ...storeState, ...partial(storeState) };
      } else {
        storeState = { ...storeState, ...partial };
      }
      // Update store reference
      Object.assign(store, storeState);
    };

    const get = () => storeState;

    // Create store with the slice
    const slice = createImportExportSlice(set, get, () => {});

    // Override the methods that are not implemented in the slice
    slice.getCurrentProjectData = vi.fn().mockResolvedValue({
      metadata: { id: 'test-project', name: 'Test Project' },
      document: { snapshots: [] },
    });
    slice.applyRestoredData = vi.fn().mockResolvedValue(undefined);
    slice.applyProjectData = vi.fn().mockResolvedValue(undefined);

    // Initialize store state
    storeState = { ...slice };

    store = {
      ...slice,
      // Mock other store methods
      getState: () => storeState,
    };

    // Initialize manager
    store.initializeManager();

    // Ensure the store uses our mock manager instance
    storeState.importExportManager = mockManagerInstance;
    store.importExportManager = mockManagerInstance;

    mockManager = mockManagerInstance; // Use the shared mock instance
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      expect(store.importInProgress).toBe(false);
      expect(store.exportInProgress).toBe(false);
      expect(store.importProgress).toBeNull();
      expect(store.exportProgress).toBeNull();
      expect(store.importHistory).toEqual([]);
      expect(store.exportHistory).toEqual([]);
      expect(store.pendingConflicts).toEqual([]);
      expect(store.backups).toEqual([]);
      expect(store.templates).toEqual([]);
      expect(store.autoBackupEnabled).toBe(true);
      expect(store.lastBackupTime).toBeNull();
    });

    it('should initialize manager with event handlers', () => {
      expect(store.importExportManager).toBeDefined();
      expect(mockManager.onImportProgress).toBeDefined();
      expect(mockManager.onExportProgress).toBeDefined();
      expect(mockManager.onConflictDetected).toBeDefined();
      expect(mockManager.onBackupCreated).toBeDefined();
    });

    it('should load preferences and history on initialization', () => {
      const mockImportPrefs = {
        defaultFormat: ImportExportFormat.XML,
        validateData: false,
      };
      const mockExportPrefs = {
        defaultFormat: ImportExportFormat.CSV,
        compression: false,
      };
      const mockImportHistory = [{ id: 'test-import' }];
      const mockExportHistory = [{ id: 'test-export' }];

      localStorageMock.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'diffani-import-preferences':
            return JSON.stringify(mockImportPrefs);
          case 'diffani-export-preferences':
            return JSON.stringify(mockExportPrefs);
          case 'diffani-import-history':
            return JSON.stringify(mockImportHistory);
          case 'diffani-export-history':
            return JSON.stringify(mockExportHistory);
          default:
            return null;
        }
      });

      // Re-initialize to test loading
      store.loadPreferencesAndHistory();

      expect(store.importPreferences.defaultFormat).toBe(
        ImportExportFormat.XML,
      );
      expect(store.importPreferences.validateData).toBe(false);
      expect(store.exportPreferences.defaultFormat).toBe(
        ImportExportFormat.CSV,
      );
      expect(store.exportPreferences.compression).toBe(false);
      expect(store.importHistory).toEqual(mockImportHistory);
      expect(store.exportHistory).toEqual(mockExportHistory);
    });
  });

  describe('Import Operations', () => {
    it('should import project successfully', async () => {
      const file = new File(['{}'], 'test.json', { type: 'application/json' });
      const mockResult: ImportResult = {
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
          itemsByType: {} as any,
          processingTime: 100,
          averageItemTime: 100,
        },
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
      };

      mockManager.importProject.mockResolvedValue(mockResult);

      const result = await store.importProject(file);

      expect(result).toEqual(mockResult);
      expect(store.importInProgress).toBe(false);
      expect(store.importHistory.length).toBe(1);
      expect(store.importHistory[0].filename).toBe('test.json');
      expect(store.importHistory[0].result).toEqual(mockResult);
    });

    it('should handle import errors', async () => {
      const file = new File(['{}'], 'test.json', { type: 'application/json' });
      const error = new Error('Import failed');

      mockManager.importProject.mockRejectedValue(error);

      await expect(store.importProject(file)).rejects.toThrow('Import failed');
      expect(store.importInProgress).toBe(false);
    });

    it('should prevent concurrent imports', async () => {
      // Set import in progress in the store state
      storeState.importInProgress = true;
      store.importInProgress = true;

      const file = new File(['{}'], 'test.json', { type: 'application/json' });

      await expect(store.importProject(file)).rejects.toThrow(
        'Import already in progress',
      );
    });

    it('should import batch of files', async () => {
      const files = [
        new File(['{}'], 'test1.json', { type: 'application/json' }),
        new File(['{}'], 'test2.json', { type: 'application/json' }),
      ];

      const mockResults = [
        {
          success: true,
          importedItems: [],
          skippedItems: [],
          errors: [],
          warnings: [],
        },
        {
          success: true,
          importedItems: [],
          skippedItems: [],
          errors: [],
          warnings: [],
        },
      ] as ImportResult[];

      mockManager.importBatch.mockResolvedValue(mockResults);

      const results = await store.importBatch(files);

      expect(results).toEqual(mockResults);
      expect(mockManager.importBatch).toHaveBeenCalledWith(
        files,
        expect.any(Object),
      );
    });

    it('should preview import', async () => {
      const file = new File(['{}'], 'test.json', { type: 'application/json' });
      const mockPreview = {
        valid: true,
        conflicts: [],
        preview: { test: 'data' },
        errors: [],
        warnings: [],
      };

      mockManager.previewImport.mockResolvedValue(mockPreview);

      const result = await store.previewImport(file);

      expect(result).toEqual(mockPreview);
      expect(mockManager.previewImport).toHaveBeenCalledWith(
        file,
        expect.any(Object),
      );
    });

    it('should cancel import', () => {
      store.importInProgress = true;
      store.importProgress = {
        current: 50,
        total: 100,
        percentage: 50,
        stage: 'importing' as any,
        message: 'Importing...',
      };

      store.cancelImport();

      expect(mockManager.cancelImport).toHaveBeenCalled();
      expect(store.importInProgress).toBe(false);
      expect(store.importProgress).toBeNull();
    });
  });

  describe('Export Operations', () => {
    it('should export project successfully', async () => {
      const mockResult: ExportResult = {
        success: true,
        blob: new Blob(['test']),
        filename: 'export.json',
        format: ImportExportFormat.JSON,
        size: 4,
        stats: {
          totalItems: 1,
          exportedItems: 1,
          totalSize: 4,
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

      mockManager.exportProject.mockResolvedValue(mockResult);

      // Mock getCurrentProjectData
      vi.spyOn(store, 'getCurrentProjectData').mockResolvedValue({
        metadata: { id: 'test', name: 'Test' },
        document: { language: 'javascript', snapshots: [] },
      });

      const result = await store.exportProject();

      expect(result).toEqual(mockResult);
      expect(store.exportInProgress).toBe(false);
      expect(store.exportHistory.length).toBe(1);
      expect(store.exportHistory[0].filename).toBe('export.json');
    });

    it('should handle export errors', async () => {
      const error = new Error('Export failed');
      mockManager.exportProject.mockRejectedValue(error);

      // The getCurrentProjectData mock is already set up in beforeEach
      // Just ensure it returns valid data for this test (it already does)

      await expect(store.exportProject()).rejects.toThrow('Export failed');
      expect(store.exportInProgress).toBe(false);
    });

    it('should prevent concurrent exports', async () => {
      // Set export in progress in the store state
      storeState.exportInProgress = true;
      store.exportInProgress = true;

      await expect(store.exportProject()).rejects.toThrow(
        'Export already in progress',
      );
    });

    it('should export batch of projects', async () => {
      const projects = [
        { metadata: { id: 'p1' }, document: { language: 'js', snapshots: [] } },
        { metadata: { id: 'p2' }, document: { language: 'ts', snapshots: [] } },
      ] as ProjectData[];

      const mockResults = [
        { success: true, blob: new Blob(), filename: 'p1.json' },
        { success: true, blob: new Blob(), filename: 'p2.json' },
      ] as ExportResult[];

      mockManager.exportBatch.mockResolvedValue(mockResults);

      const results = await store.exportBatch(projects);

      expect(results).toEqual(mockResults);
      expect(mockManager.exportBatch).toHaveBeenCalledWith(
        projects,
        expect.any(Object),
      );
    });

    it('should cancel export', () => {
      store.exportInProgress = true;
      store.exportProgress = {
        current: 50,
        total: 100,
        percentage: 50,
        stage: 'exporting' as any,
        message: 'Exporting...',
      };

      store.cancelExport();

      expect(mockManager.cancelExport).toHaveBeenCalled();
      expect(store.exportInProgress).toBe(false);
      expect(store.exportProgress).toBeNull();
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve individual conflict', () => {
      const conflicts = [
        {
          id: 'conflict-1',
          type: 'project' as any,
          conflictType: 'id_collision' as any,
          existingItem: {},
          incomingItem: {},
          differences: [],
          resolved: false,
        },
      ];

      // Set conflicts in the store state
      storeState.pendingConflicts = conflicts;
      store.pendingConflicts = conflicts;

      const resolution = {
        strategy: ConflictResolutionStrategy.OVERWRITE,
        action: 'use_incoming' as any,
      };
      store.resolveConflict('conflict-1', resolution);

      expect(store.pendingConflicts[0].resolved).toBe(true);
      expect(store.pendingConflicts[0].resolution).toEqual(resolution);
    });

    it('should resolve all conflicts', () => {
      const conflicts = [
        { id: 'c1', resolved: false },
        { id: 'c2', resolved: false },
      ] as any[];

      store.pendingConflicts = conflicts;

      store.resolveAllConflicts(ConflictResolutionStrategy.OVERWRITE);

      expect(store.pendingConflicts.every((c: any) => c.resolved)).toBe(true);
    });

    it('should clear conflicts', () => {
      store.pendingConflicts = [{ id: 'test' }] as any[];

      store.clearConflicts();

      expect(store.pendingConflicts).toEqual([]);
    });
  });

  describe('Backup Operations', () => {
    it('should create backup', async () => {
      const mockBackup = {
        id: 'backup-123',
        timestamp: new Date(),
        reason: 'manual' as any,
        data: {},
        size: 1000,
        compressed: true,
        restorable: true,
      };

      mockManager.createBackup.mockResolvedValue(mockBackup);
      vi.spyOn(store, 'getCurrentProjectData').mockResolvedValue({});

      const result = await store.createBackup('manual');

      expect(result).toEqual(mockBackup);
      expect(store.backups).toContain(mockBackup);
      expect(store.lastBackupTime).toBeInstanceOf(Date);
    });

    it('should restore from backup', async () => {
      const mockData = { metadata: { id: 'restored' }, document: {} };
      mockManager.restoreFromBackup.mockResolvedValue(mockData);
      vi.spyOn(store, 'applyRestoredData').mockResolvedValue(undefined);

      await store.restoreFromBackup('backup-123');

      expect(mockManager.restoreFromBackup).toHaveBeenCalledWith('backup-123');
      expect(store.applyRestoredData).toHaveBeenCalledWith(mockData);
    });

    it('should delete backup', async () => {
      const backups = [{ id: 'backup-1' }, { id: 'backup-2' }] as any[];

      // Set backups in the store state
      storeState.backups = backups;
      store.backups = backups;
      mockManager.deleteBackup.mockResolvedValue(undefined);

      await store.deleteBackup('backup-1');

      expect(mockManager.deleteBackup).toHaveBeenCalledWith('backup-1');
      expect(store.backups).toHaveLength(1);
      expect(store.backups[0].id).toBe('backup-2');
    });

    it('should list backups', async () => {
      const mockBackups = [{ id: 'backup-1' }, { id: 'backup-2' }] as any[];
      mockManager.listBackups.mockResolvedValue(mockBackups);

      const result = await store.listBackups();

      expect(result).toEqual(mockBackups);
      expect(store.backups).toEqual(mockBackups);
    });

    it('should set auto backup enabled', () => {
      store.setAutoBackupEnabled(false);
      expect(store.autoBackupEnabled).toBe(false);

      store.setAutoBackupEnabled(true);
      expect(store.autoBackupEnabled).toBe(true);
    });
  });

  describe('Template Operations', () => {
    it('should create from template', async () => {
      const templateId = 'template-123';
      const customData = { metadata: { name: 'Custom Project' } };
      const mockProjectData = { metadata: { id: 'new-project' }, document: {} };

      const template = { id: templateId, name: 'Test Template' } as any;
      // Set templates in the store state
      storeState.templates = [template];
      store.templates = [template];

      mockManager.createFromTemplate.mockResolvedValue(mockProjectData);
      vi.spyOn(store, 'applyProjectData').mockResolvedValue(undefined);

      await store.createFromTemplate(templateId, customData);

      expect(mockManager.createFromTemplate).toHaveBeenCalledWith(
        template,
        customData,
      );
      expect(store.applyProjectData).toHaveBeenCalledWith(mockProjectData);
    });

    it('should handle template not found', async () => {
      store.templates = [];

      await expect(store.createFromTemplate('nonexistent')).rejects.toThrow(
        'Template not found: nonexistent',
      );
    });

    it('should save as template', async () => {
      const templateInfo = {
        name: 'New Template',
        description: 'Test template',
      };
      const mockTemplate = { id: 'template-123', ...templateInfo } as any;

      mockManager.saveAsTemplate.mockResolvedValue(mockTemplate);
      vi.spyOn(store, 'getCurrentProjectData').mockResolvedValue({});

      const result = await store.saveAsTemplate(templateInfo);

      expect(result).toEqual(mockTemplate);
      expect(store.templates).toContain(mockTemplate);
    });

    it('should delete template', () => {
      const templates = [{ id: 'template-1' }, { id: 'template-2' }] as any[];

      // Set templates in the store state
      storeState.templates = templates;
      store.templates = templates;

      store.deleteTemplate('template-1');

      expect(store.templates).toHaveLength(1);
      expect(store.templates[0].id).toBe('template-2');
    });

    it('should load templates', async () => {
      const mockTemplates = [{ id: 'template-1' }, { id: 'template-2' }];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTemplates));

      await store.loadTemplates();

      expect(store.templates).toEqual(mockTemplates);
    });
  });

  describe('Preferences Management', () => {
    it('should update import preferences', () => {
      const newPrefs = {
        defaultFormat: ImportExportFormat.XML,
        validateData: false,
      };

      store.updateImportPreferences(newPrefs);

      expect(store.importPreferences.defaultFormat).toBe(
        ImportExportFormat.XML,
      );
      expect(store.importPreferences.validateData).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'diffani-import-preferences',
        expect.stringContaining('xml'),
      );
    });

    it('should update export preferences', () => {
      const newPrefs = {
        defaultFormat: ImportExportFormat.CSV,
        compression: false,
      };

      store.updateExportPreferences(newPrefs);

      expect(store.exportPreferences.defaultFormat).toBe(
        ImportExportFormat.CSV,
      );
      expect(store.exportPreferences.compression).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'diffani-export-preferences',
        expect.stringContaining('csv'),
      );
    });
  });

  describe('History Management', () => {
    it('should clear import history', () => {
      store.importHistory = [{ id: 'test' }] as any[];

      store.clearImportHistory();

      expect(store.importHistory).toEqual([]);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'diffani-import-history',
      );
    });

    it('should clear export history', () => {
      store.exportHistory = [{ id: 'test' }] as any[];

      store.clearExportHistory();

      expect(store.exportHistory).toEqual([]);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'diffani-export-history',
      );
    });

    it('should limit history size', async () => {
      // Create more than 100 history items
      const manyItems = Array.from({ length: 105 }, (_, i) => ({
        id: `item-${i}`,
      }));
      // Set history in the store state
      storeState.importHistory = manyItems;
      store.importHistory = manyItems;

      const file = new File(['{}'], 'test.json');
      const mockResult = {
        success: true,
        importedItems: [],
        skippedItems: [],
        errors: [],
        warnings: [],
      } as ImportResult;
      mockManager.importProject.mockResolvedValue(mockResult);

      await store.importProject(file);

      // Should keep only last 100 items
      expect(store.importHistory.length).toBe(100);
    });
  });

  describe('Event Handlers', () => {
    it('should handle import progress events', () => {
      const progress = {
        current: 50,
        total: 100,
        percentage: 50,
        stage: 'importing' as any,
        message: 'Importing data...',
      };

      mockManager.onImportProgress(progress);

      expect(store.importProgress).toEqual(progress);
    });

    it('should handle export progress events', () => {
      const progress = {
        current: 75,
        total: 100,
        percentage: 75,
        stage: 'exporting' as any,
        message: 'Exporting data...',
      };

      mockManager.onExportProgress(progress);

      expect(store.exportProgress).toEqual(progress);
    });

    it('should handle conflict detected events', () => {
      const conflicts = [
        {
          id: 'conflict-1',
          type: 'project' as any,
          conflictType: 'id_collision' as any,
        },
      ] as any[];

      mockManager.onConflictDetected(conflicts);

      expect(store.pendingConflicts).toEqual(conflicts);
    });

    it('should handle backup created events', () => {
      const backup = {
        id: 'backup-123',
        timestamp: new Date(),
        reason: 'auto' as any,
      } as any;

      mockManager.onBackupCreated(backup);

      expect(store.backups).toContain(backup);
      expect(store.lastBackupTime).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle manager not initialized', async () => {
      // Set manager to null in the store state
      storeState.importExportManager = null;
      store.importExportManager = null;

      const file = new File(['{}'], 'test.json');

      await expect(store.importProject(file)).rejects.toThrow(
        'Import/Export manager not initialized',
      );
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw
      expect(() => store.loadPreferencesAndHistory()).not.toThrow();
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      // Should not throw and should use defaults
      expect(() => store.loadPreferencesAndHistory()).not.toThrow();
    });
  });
});
