import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BackupManager } from '../backup-manager';
import { BackupReason, type ProjectData, type BackupItem } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('BackupManager', () => {
  let backupManager: BackupManager;
  let sampleProjectData: ProjectData;

  beforeEach(() => {
    vi.clearAllMocks();
    backupManager = new BackupManager();
    
    sampleProjectData = {
      metadata: {
        id: 'test-project',
        name: 'Test Project',
        version: '1.0.0',
        author: 'Test Author',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        tags: ['test'],
        diffaniVersion: '1.0.0',
        fileSize: 1000,
        snapshotCount: 2,
        totalDuration: 3000,
      },
      document: {
        language: 'javascript',
        snapshots: [
          {
            id: 'snap-1',
            code: 'console.log("test");',
            duration: 1500,
            transitionTime: 500,
          },
          {
            id: 'snap-2',
            code: 'const x = 1;',
            duration: 1500,
            transitionTime: 500,
          },
        ],
        fontSize: 14,
        lineHeight: 20,
        width: 800,
        height: 600,
        theme: 'vs-dark',
        padding: { top: 10, left: 10, bottom: 10 },
      },
    };

    // Mock getCurrentProjectData to return our sample data
    vi.spyOn(backupManager as any, 'getCurrentProjectData').mockResolvedValue(sampleProjectData);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Backup Creation', () => {
    it('should create a manual backup successfully', async () => {
      const mockBackups: BackupItem[] = [];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      const backup = await backupManager.createBackup(BackupReason.MANUAL, sampleProjectData);

      expect(backup.id).toBeDefined();
      expect(backup.reason).toBe(BackupReason.MANUAL);
      expect(backup.timestamp).toBeInstanceOf(Date);
      expect(backup.data).toBeDefined();
      expect(backup.size).toBeGreaterThan(0);
      expect(backup.compressed).toBe(true);
      expect(backup.restorable).toBe(true);
      expect(backup.notes).toContain('Manual backup');

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should create an automatic backup', async () => {
      const mockBackups: BackupItem[] = [];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      const backup = await backupManager.createBackup(BackupReason.AUTO);

      expect(backup.reason).toBe(BackupReason.AUTO);
      expect(backup.notes).toContain('Automatic periodic backup');
    });

    it('should create a backup before import', async () => {
      const mockBackups: BackupItem[] = [];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      const backup = await backupManager.createBackup(BackupReason.BEFORE_IMPORT);

      expect(backup.reason).toBe(BackupReason.BEFORE_IMPORT);
      expect(backup.notes).toContain('before import operation');
    });

    it('should emit backup created event', async () => {
      const mockBackups: BackupItem[] = [];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      const onBackupCreated = vi.fn();
      backupManager.onBackupCreated = onBackupCreated;

      const backup = await backupManager.createBackup(BackupReason.MANUAL, sampleProjectData);

      expect(onBackupCreated).toHaveBeenCalledWith(backup);
    });

    it('should handle backup creation failure', async () => {
      // Mock getCurrentProjectData to return null
      vi.spyOn(backupManager as any, 'getCurrentProjectData').mockResolvedValue(null);

      await expect(backupManager.createBackup(BackupReason.MANUAL)).rejects.toThrow(
        'No project data to backup',
      );
    });

    it('should handle localStorage errors during backup creation', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      await expect(
        backupManager.createBackup(BackupReason.MANUAL, sampleProjectData),
      ).rejects.toThrow('Backup creation failed');
    });
  });

  describe('Backup Restoration', () => {
    it('should restore from backup successfully', async () => {
      const mockBackup: BackupItem = {
        id: 'backup-123',
        timestamp: new Date(),
        reason: BackupReason.MANUAL,
        data: sampleProjectData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'Test backup',
      };

      const mockBackups = [mockBackup];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      const restoredData = await backupManager.restore('backup-123');

      expect(restoredData).toEqual(sampleProjectData);
    });

    it('should handle backup not found', async () => {
      const mockBackups: BackupItem[] = [];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      await expect(backupManager.restore('nonexistent-backup')).rejects.toThrow(
        'Backup not found: nonexistent-backup',
      );
    });

    it('should handle non-restorable backup', async () => {
      const mockBackup: BackupItem = {
        id: 'backup-123',
        timestamp: new Date(),
        reason: BackupReason.MANUAL,
        data: sampleProjectData,
        size: 1000,
        compressed: true,
        restorable: false, // Not restorable
        notes: 'Corrupted backup',
      };

      const mockBackups = [mockBackup];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      await expect(backupManager.restore('backup-123')).rejects.toThrow(
        'Backup is not restorable: backup-123',
      );
    });

    it('should decompress backup data during restoration', async () => {
      const compressedData = { ...sampleProjectData };
      delete compressedData.versionHistory;
      delete compressedData.backupInfo;

      const mockBackup: BackupItem = {
        id: 'backup-123',
        timestamp: new Date(),
        reason: BackupReason.MANUAL,
        data: compressedData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'Compressed backup',
      };

      const mockBackups = [mockBackup];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      const restoredData = await backupManager.restore('backup-123');

      expect(restoredData).toEqual(compressedData);
    });
  });

  describe('Backup Listing', () => {
    it('should list backups sorted by timestamp', async () => {
      const oldBackup: BackupItem = {
        id: 'backup-old',
        timestamp: new Date('2024-01-01'),
        reason: BackupReason.AUTO,
        data: sampleProjectData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'Old backup',
      };

      const newBackup: BackupItem = {
        id: 'backup-new',
        timestamp: new Date('2024-01-02'),
        reason: BackupReason.MANUAL,
        data: sampleProjectData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'New backup',
      };

      const mockBackups = [oldBackup, newBackup];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      const backups = await backupManager.listBackups();

      expect(backups).toHaveLength(2);
      expect(backups[0].id).toBe('backup-new'); // Newest first
      expect(backups[1].id).toBe('backup-old');
    });

    it('should handle empty backup list', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const backups = await backupManager.listBackups();

      expect(backups).toEqual([]);
    });

    it('should handle corrupted backup storage', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const backups = await backupManager.listBackups();

      expect(backups).toEqual([]);
    });

    it('should convert timestamp strings to Date objects', async () => {
      const mockBackupData = [
        {
          id: 'backup-123',
          timestamp: '2024-01-01T00:00:00.000Z', // String timestamp
          reason: BackupReason.MANUAL,
          data: sampleProjectData,
          size: 1000,
          compressed: true,
          restorable: true,
          notes: 'Test backup',
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackupData));

      const backups = await backupManager.listBackups();

      expect(backups[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Backup Deletion', () => {
    it('should delete specific backup', async () => {
      const mockBackups: BackupItem[] = [
        {
          id: 'backup-1',
          timestamp: new Date(),
          reason: BackupReason.MANUAL,
          data: sampleProjectData,
          size: 1000,
          compressed: true,
          restorable: true,
          notes: 'Backup 1',
        },
        {
          id: 'backup-2',
          timestamp: new Date(),
          reason: BackupReason.AUTO,
          data: sampleProjectData,
          size: 1000,
          compressed: true,
          restorable: true,
          notes: 'Backup 2',
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      await backupManager.deleteBackup('backup-1');

      const savedBackups = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedBackups).toHaveLength(1);
      expect(savedBackups[0].id).toBe('backup-2');
    });

    it('should handle deletion of non-existent backup', async () => {
      const mockBackups: BackupItem[] = [];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      await expect(backupManager.deleteBackup('nonexistent')).rejects.toThrow(
        'Backup not found: nonexistent',
      );
    });

    it('should delete all backups', async () => {
      const mockBackups: BackupItem[] = [
        {
          id: 'backup-1',
          timestamp: new Date(),
          reason: BackupReason.MANUAL,
          data: sampleProjectData,
          size: 1000,
          compressed: true,
          restorable: true,
          notes: 'Backup 1',
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      await backupManager.deleteAllBackups();

      const savedBackups = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedBackups).toEqual([]);
    });
  });

  describe('Backup Statistics', () => {
    it('should generate backup statistics', async () => {
      const mockBackups: BackupItem[] = [
        {
          id: 'backup-1',
          timestamp: new Date('2024-01-01'),
          reason: BackupReason.MANUAL,
          data: sampleProjectData,
          size: 1000,
          compressed: true,
          restorable: true,
          notes: 'Manual backup',
        },
        {
          id: 'backup-2',
          timestamp: new Date('2024-01-02'),
          reason: BackupReason.AUTO,
          data: sampleProjectData,
          size: 2000,
          compressed: true,
          restorable: true,
          notes: 'Auto backup',
        },
        {
          id: 'backup-3',
          timestamp: new Date('2024-01-03'),
          reason: BackupReason.BEFORE_IMPORT,
          data: sampleProjectData,
          size: 1500,
          compressed: true,
          restorable: true,
          notes: 'Before import backup',
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      const stats = await backupManager.getBackupStats();

      expect(stats.totalBackups).toBe(3);
      expect(stats.totalSize).toBe(4500);
      expect(stats.oldestBackup).toEqual(new Date('2024-01-01'));
      expect(stats.newestBackup).toEqual(new Date('2024-01-03'));
      expect(stats.backupsByReason[BackupReason.MANUAL]).toBe(1);
      expect(stats.backupsByReason[BackupReason.AUTO]).toBe(1);
      expect(stats.backupsByReason[BackupReason.BEFORE_IMPORT]).toBe(1);
      expect(stats.backupsByReason[BackupReason.BEFORE_UPDATE]).toBe(0);
    });

    it('should handle empty backup statistics', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      const stats = await backupManager.getBackupStats();

      expect(stats.totalBackups).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestBackup).toBeUndefined();
      expect(stats.newestBackup).toBeUndefined();
      expect(stats.backupsByReason[BackupReason.MANUAL]).toBe(0);
    });
  });

  describe('Auto Backup Logic', () => {
    it('should determine auto backup is needed when no backups exist', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      const shouldCreate = await backupManager.shouldCreateAutoBackup();

      expect(shouldCreate).toBe(true);
    });

    it('should determine auto backup is needed when last backup is old', async () => {
      const oldBackup: BackupItem = {
        id: 'backup-old',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        reason: BackupReason.AUTO,
        data: sampleProjectData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'Old auto backup',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([oldBackup]));

      const shouldCreate = await backupManager.shouldCreateAutoBackup();

      expect(shouldCreate).toBe(true);
    });

    it('should determine auto backup is not needed when recent backup exists', async () => {
      const recentBackup: BackupItem = {
        id: 'backup-recent',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        reason: BackupReason.AUTO,
        data: sampleProjectData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'Recent auto backup',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([recentBackup]));

      const shouldCreate = await backupManager.shouldCreateAutoBackup();

      expect(shouldCreate).toBe(false);
    });

    it('should create auto backup if needed', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      const backup = await backupManager.createAutoBackupIfNeeded();

      expect(backup).toBeDefined();
      expect(backup?.reason).toBe(BackupReason.AUTO);
    });

    it('should not create auto backup if not needed', async () => {
      const recentBackup: BackupItem = {
        id: 'backup-recent',
        timestamp: new Date(),
        reason: BackupReason.AUTO,
        data: sampleProjectData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'Recent backup',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([recentBackup]));

      const backup = await backupManager.createAutoBackupIfNeeded();

      expect(backup).toBeNull();
    });
  });

  describe('Backup Cleanup', () => {
    it('should clean up old backups exceeding maximum count', async () => {
      // Create more backups than the maximum allowed
      const mockBackups: BackupItem[] = Array.from({ length: 55 }, (_, i) => ({
        id: `backup-${i}`,
        timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
        reason: BackupReason.AUTO,
        data: sampleProjectData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: `Auto backup ${i}`,
      }));

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockBackups));

      await backupManager.createBackup(BackupReason.MANUAL, sampleProjectData);

      // Should have cleaned up to maximum count (50)
      const savedBackups = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedBackups.length).toBeLessThanOrEqual(50);
    });

    it('should clean up old backups exceeding retention period', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago (exceeds retention)

      const oldBackup: BackupItem = {
        id: 'backup-old',
        timestamp: oldDate,
        reason: BackupReason.AUTO,
        data: sampleProjectData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'Old backup',
      };

      const recentBackup: BackupItem = {
        id: 'backup-recent',
        timestamp: new Date(),
        reason: BackupReason.AUTO,
        data: sampleProjectData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'Recent backup',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([oldBackup, recentBackup]));

      await backupManager.createBackup(BackupReason.MANUAL, sampleProjectData);

      const savedBackups = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedBackups.some((b: BackupItem) => b.id === 'backup-old')).toBe(false);
      expect(savedBackups.some((b: BackupItem) => b.id === 'backup-recent')).toBe(true);
    });

    it('should preserve manual backups regardless of age', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

      const oldManualBackup: BackupItem = {
        id: 'backup-old-manual',
        timestamp: oldDate,
        reason: BackupReason.MANUAL, // Manual backup should be preserved
        data: sampleProjectData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'Old manual backup',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([oldManualBackup]));

      await backupManager.createBackup(BackupReason.AUTO, sampleProjectData);

      const savedBackups = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedBackups.some((b: BackupItem) => b.id === 'backup-old-manual')).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should validate restored data', async () => {
      const invalidData = {
        // Missing required fields
        metadata: null,
        document: null,
      } as any;

      const mockBackup: BackupItem = {
        id: 'backup-invalid',
        timestamp: new Date(),
        reason: BackupReason.MANUAL,
        data: invalidData,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'Invalid backup',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockBackup]));

      await expect(backupManager.restore('backup-invalid')).rejects.toThrow(
        'Restored data missing metadata',
      );
    });

    it('should validate restored data has snapshots', async () => {
      const dataWithoutSnapshots = {
        ...sampleProjectData,
        document: {
          ...sampleProjectData.document,
          snapshots: [],
        },
      };

      const mockBackup: BackupItem = {
        id: 'backup-no-snapshots',
        timestamp: new Date(),
        reason: BackupReason.MANUAL,
        data: dataWithoutSnapshots,
        size: 1000,
        compressed: true,
        restorable: true,
        notes: 'Backup without snapshots',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockBackup]));

      await expect(backupManager.restore('backup-no-snapshots')).rejects.toThrow(
        'Restored data missing snapshots',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const backups = await backupManager.listBackups();
      expect(backups).toEqual([]);
    });

    it('should handle backup creation with storage errors', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      await expect(
        backupManager.createBackup(BackupReason.MANUAL, sampleProjectData),
      ).rejects.toThrow('Backup creation failed');
    });

    it('should handle backup deletion with storage errors', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        {
          id: 'backup-1',
          timestamp: new Date(),
          reason: BackupReason.MANUAL,
          data: sampleProjectData,
          size: 1000,
          compressed: true,
          restorable: true,
          notes: 'Test backup',
        },
      ]));

      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(backupManager.deleteBackup('backup-1')).rejects.toThrow(
        'Failed to delete backup',
      );
    });
  });
});
