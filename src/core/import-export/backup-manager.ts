import {
  type ProjectData,
  type BackupItem,
  type BackupInfo,
  BackupReason,
  MAX_BACKUP_COUNT,
  BACKUP_RETENTION_DAYS,
} from './types';

/**
 * Manages backup and restore operations for project data
 */
export class BackupManager {
  private readonly storageKey = 'diffani-backups';

  public onBackupCreated?: (backup: BackupItem) => void;

  /**
   * Create a backup of current project data
   */
  async createBackup(
    reason: BackupReason,
    projectData?: ProjectData,
  ): Promise<BackupItem> {
    try {
      // Get current project data if not provided
      const dataToBackup = projectData || (await this.getCurrentProjectData());

      if (!dataToBackup) {
        throw new Error('No project data to backup');
      }

      // Create backup item
      const backup: BackupItem = {
        id: this.generateBackupId(),
        timestamp: new Date(),
        reason,
        data: dataToBackup,
        size: this.calculateDataSize(dataToBackup),
        compressed: true, // We'll compress the data
        restorable: true,
        notes: this.getBackupReasonDescription(reason),
      };

      // Compress backup data
      backup.data = await this.compressData(dataToBackup);

      // Store backup
      await this.storeBackup(backup);

      // Clean up old backups
      await this.cleanupOldBackups();

      // Notify about backup creation
      if (this.onBackupCreated) {
        this.onBackupCreated(backup);
      }

      return backup;
    } catch (error) {
      throw new Error(
        `Backup creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Restore project data from backup
   */
  async restore(backupId: string): Promise<ProjectData> {
    try {
      const backup = await this.getBackup(backupId);

      if (!backup) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      if (!backup.restorable) {
        throw new Error(`Backup is not restorable: ${backupId}`);
      }

      // Decompress data if needed
      let restoredData = backup.data;
      if (backup.compressed) {
        restoredData = await this.decompressData(backup.data);
      } else {
        // Even if not compressed, ensure dates are properly converted
        restoredData = await this.decompressData(backup.data);
      }

      // Validate restored data
      await this.validateRestoredData(restoredData);

      return restoredData;
    } catch (error) {
      throw new Error(
        `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupItem[]> {
    try {
      const backups = await this.loadBackups();

      // Sort by timestamp (newest first)
      return backups.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );
    } catch (error) {
      console.warn('Failed to load backups:', error);
      return [];
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      const backups = await this.loadBackups();
      const filteredBackups = backups.filter(
        (backup) => backup.id !== backupId,
      );

      if (filteredBackups.length === backups.length) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      await this.saveBackups(filteredBackups);
    } catch (error) {
      throw new Error(
        `Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete all backups
   */
  async deleteAllBackups(): Promise<void> {
    try {
      await this.saveBackups([]);
    } catch (error) {
      throw new Error(
        `Failed to delete all backups: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    backupsByReason: Record<BackupReason, number>;
  }> {
    const backups = await this.listBackups();

    const stats = {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
      oldestBackup:
        backups.length > 0 ? backups[backups.length - 1].timestamp : undefined,
      newestBackup: backups.length > 0 ? backups[0].timestamp : undefined,
      backupsByReason: {
        [BackupReason.BEFORE_IMPORT]: 0,
        [BackupReason.MANUAL]: 0,
        [BackupReason.AUTO]: 0,
        [BackupReason.BEFORE_UPDATE]: 0,
      },
    };

    // Count backups by reason
    backups.forEach((backup) => {
      stats.backupsByReason[backup.reason]++;
    });

    return stats;
  }

  /**
   * Check if automatic backup is needed
   */
  async shouldCreateAutoBackup(): Promise<boolean> {
    const backups = await this.listBackups();
    const autoBackups = backups.filter((b) => b.reason === BackupReason.AUTO);

    if (autoBackups.length === 0) {
      return true; // No auto backups exist
    }

    // Check if last auto backup is older than 24 hours
    const lastAutoBackup = autoBackups[0];
    const hoursSinceLastBackup =
      (Date.now() - lastAutoBackup.timestamp.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastBackup >= 24;
  }

  /**
   * Create automatic backup if needed
   */
  async createAutoBackupIfNeeded(): Promise<BackupItem | null> {
    if (await this.shouldCreateAutoBackup()) {
      return await this.createBackup(BackupReason.AUTO);
    }
    return null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    return `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get description for backup reason
   */
  private getBackupReasonDescription(reason: BackupReason): string {
    switch (reason) {
      case BackupReason.BEFORE_IMPORT:
        return 'Automatic backup created before import operation';
      case BackupReason.MANUAL:
        return 'Manual backup created by user';
      case BackupReason.AUTO:
        return 'Automatic periodic backup';
      case BackupReason.BEFORE_UPDATE:
        return 'Automatic backup created before update';
      default:
        return 'Backup created';
    }
  }

  /**
   * Calculate data size in bytes
   */
  private calculateDataSize(data: ProjectData): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Compress project data
   */
  private async compressData(data: ProjectData): Promise<ProjectData> {
    // For now, we'll just return the data as-is
    // In a real implementation, you might use compression libraries
    // or remove unnecessary fields to reduce size
    return {
      ...data,
      // Remove some fields that can be regenerated
      versionHistory: undefined,
      backupInfo: undefined,
    };
  }

  /**
   * Decompress project data
   */
  private async decompressData(data: ProjectData): Promise<ProjectData> {
    // For now, just return the data as-is but ensure dates are properly converted
    // In a real implementation, this would reverse the compression
    const decompressed = { ...data };

    // Convert date strings back to Date objects if needed
    if (decompressed.metadata) {
      if (typeof decompressed.metadata.createdAt === 'string') {
        decompressed.metadata.createdAt = new Date(
          decompressed.metadata.createdAt,
        );
      }
      if (typeof decompressed.metadata.updatedAt === 'string') {
        decompressed.metadata.updatedAt = new Date(
          decompressed.metadata.updatedAt,
        );
      }
    }

    return decompressed;
  }

  /**
   * Get specific backup by ID
   */
  private async getBackup(backupId: string): Promise<BackupItem | null> {
    const backups = await this.loadBackups();
    return backups.find((backup) => backup.id === backupId) || null;
  }

  /**
   * Store a backup
   */
  private async storeBackup(backup: BackupItem): Promise<void> {
    let backups = await this.loadBackups();
    backups.unshift(backup); // Add to beginning (newest first)

    // Apply cleanup logic immediately
    backups = this.applyCleanupRules(backups);

    await this.saveBackups(backups);
  }

  /**
   * Load backups from storage
   */
  private async loadBackups(): Promise<BackupItem[]> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];

      const parsed = JSON.parse(stored);

      // Convert timestamp strings back to Date objects
      return parsed.map((backup: any) => ({
        ...backup,
        timestamp: new Date(backup.timestamp),
      }));
    } catch (error) {
      console.warn('Failed to load backups from storage:', error);
      return [];
    }
  }

  /**
   * Save backups to storage
   */
  private async saveBackups(backups: BackupItem[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(backups));
    } catch (error) {
      throw new Error(
        `Failed to save backups: ${error instanceof Error ? error.message : 'Storage error'}`,
      );
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.loadBackups();
    const filteredBackups = this.applyCleanupRules(backups);

    // Save cleaned up backups
    if (filteredBackups.length !== backups.length) {
      await this.saveBackups(filteredBackups);
    }
  }

  /**
   * Apply cleanup rules to backup list
   */
  private applyCleanupRules(backups: BackupItem[]): BackupItem[] {
    let filteredBackups = [...backups];

    // Remove backups exceeding maximum count
    if (filteredBackups.length > MAX_BACKUP_COUNT) {
      filteredBackups = filteredBackups.slice(0, MAX_BACKUP_COUNT);
    }

    // Remove backups older than retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);

    filteredBackups = filteredBackups.filter((backup) => {
      // Always keep manual backups regardless of age
      if (backup.reason === BackupReason.MANUAL) {
        return true;
      }

      return backup.timestamp >= cutoffDate;
    });

    return filteredBackups;
  }

  /**
   * Get current project data from application state
   */
  private async getCurrentProjectData(): Promise<ProjectData | null> {
    // TODO: Implement integration with application state
    // This would get the current project data from Zustand store

    // For now, return null to indicate no current data
    return null;
  }

  /**
   * Validate restored data
   */
  private async validateRestoredData(data: ProjectData): Promise<void> {
    if (!data) {
      throw new Error('Restored data is empty');
    }

    if (!data.metadata) {
      throw new Error('Restored data missing metadata');
    }

    if (!data.document) {
      throw new Error('Restored data missing document');
    }

    if (!data.document.snapshots || data.document.snapshots.length === 0) {
      throw new Error('Restored data missing snapshots');
    }

    // Additional validation could be added here
  }
}
