import {
  type ProjectData,
  type ImportOptions,
  type ConflictItem,
  type ConflictDifference,
  type ConflictResolution,
  ConflictType,
  ConflictResolutionStrategy,
  DifferenceType,
  ResolutionAction,
} from './types';

/**
 * Handles conflict detection and resolution during import operations
 */
export class ConflictResolver {
  public onConflictDetected?: (conflicts: ConflictItem[]) => void;

  /**
   * Detect conflicts between incoming and existing data
   */
  async detectConflicts(
    incomingData: Partial<ProjectData>,
    options: ImportOptions,
  ): Promise<ConflictItem[]> {
    const conflicts: ConflictItem[] = [];

    // Get existing data (this would come from the application state)
    const existingData = await this.getExistingData();

    if (!existingData) {
      // No existing data, no conflicts
      return conflicts;
    }

    // Check for metadata conflicts
    if (incomingData.metadata && existingData.metadata) {
      const metadataConflicts = this.detectMetadataConflicts(
        existingData.metadata,
        incomingData.metadata,
      );
      conflicts.push(...metadataConflicts);
    }

    // Check for document conflicts
    if (incomingData.document && existingData.document) {
      const documentConflicts = this.detectDocumentConflicts(
        existingData.document,
        incomingData.document,
      );
      conflicts.push(...documentConflicts);
    }

    // Check for theme conflicts
    if (incomingData.themes && existingData.themes) {
      const themeConflicts = this.detectThemeConflicts(
        existingData.themes,
        incomingData.themes,
      );
      conflicts.push(...themeConflicts);
    }

    // Check for preset conflicts
    if (incomingData.presets && existingData.presets) {
      const presetConflicts = this.detectPresetConflicts(
        existingData.presets,
        incomingData.presets,
      );
      conflicts.push(...presetConflicts);
    }

    // Notify about detected conflicts
    if (conflicts.length > 0 && this.onConflictDetected) {
      this.onConflictDetected(conflicts);
    }

    return conflicts;
  }

  /**
   * Resolve conflicts based on strategy
   */
  async resolveConflicts(
    conflicts: ConflictItem[],
    strategy: ConflictResolutionStrategy,
  ): Promise<Partial<ProjectData>> {
    const resolvedData: Partial<ProjectData> = {};

    for (const conflict of conflicts) {
      const resolution = await this.resolveConflict(conflict, strategy);
      conflict.resolution = resolution;
      conflict.resolved = true;

      // Apply resolution to resolved data
      this.applyResolution(resolvedData, conflict, resolution);
    }

    return resolvedData;
  }

  /**
   * Resolve individual conflict
   */
  private async resolveConflict(
    conflict: ConflictItem,
    strategy: ConflictResolutionStrategy,
  ): Promise<ConflictResolution> {
    switch (strategy) {
      case ConflictResolutionStrategy.OVERWRITE:
        return {
          strategy,
          action: ResolutionAction.USE_INCOMING,
          notes: 'Overwriting existing data with incoming data',
        };

      case ConflictResolutionStrategy.SKIP:
        return {
          strategy,
          action: ResolutionAction.KEEP_EXISTING,
          notes: 'Keeping existing data, skipping incoming data',
        };

      case ConflictResolutionStrategy.MERGE:
        return await this.attemptMerge(conflict);

      case ConflictResolutionStrategy.CREATE_NEW:
        return {
          strategy,
          action: ResolutionAction.CREATE_COPY,
          notes: 'Creating new item with modified ID',
        };

      case ConflictResolutionStrategy.INTERACTIVE:
        // In a real implementation, this would prompt the user
        // For now, default to merge
        return await this.attemptMerge(conflict);

      default:
        throw new Error(
          `Unsupported conflict resolution strategy: ${strategy}`,
        );
    }
  }

  /**
   * Attempt to merge conflicting data
   */
  private async attemptMerge(
    conflict: ConflictItem,
  ): Promise<ConflictResolution> {
    try {
      const mergedData = this.mergeData(
        conflict.existingItem,
        conflict.incomingItem,
      );

      return {
        strategy: ConflictResolutionStrategy.MERGE,
        action: ResolutionAction.MERGE_DATA,
        mergedData,
        notes: 'Successfully merged conflicting data',
      };
    } catch (error) {
      // Merge failed, fall back to keeping existing
      return {
        strategy: ConflictResolutionStrategy.MERGE,
        action: ResolutionAction.KEEP_EXISTING,
        notes: `Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Merge two data objects
   */
  private mergeData(existing: unknown, incoming: unknown): unknown {
    if (this.isObject(existing) && this.isObject(incoming)) {
      const merged = { ...existing };

      for (const [key, value] of Object.entries(incoming)) {
        if (key in existing) {
          // Recursive merge for nested objects
          if (this.isObject(existing[key]) && this.isObject(value)) {
            merged[key] = this.mergeData(existing[key], value);
          } else if (Array.isArray(existing[key]) && Array.isArray(value)) {
            // Merge arrays (combine unique items)
            merged[key] = this.mergeArrays(existing[key], value);
          } else {
            // Use incoming value for primitive conflicts
            merged[key] = value;
          }
        } else {
          // New key, add it
          merged[key] = value;
        }
      }

      return merged;
    }

    // Check for incompatible types (object vs primitive)
    const existingIsObject = this.isObject(existing);
    const incomingIsObject = this.isObject(incoming);

    if (existingIsObject !== incomingIsObject) {
      // One is object, one is primitive - cannot merge
      throw new Error(
        `Cannot merge incompatible types: ${typeof existing} and ${typeof incoming}`,
      );
    }

    // For primitives of the same type, prefer incoming data
    return incoming;
  }

  /**
   * Merge two arrays, keeping unique items
   */
  private mergeArrays(existing: unknown[], incoming: unknown[]): unknown[] {
    const merged = [...existing];

    for (const item of incoming) {
      // Simple uniqueness check - in practice, this might need to be more sophisticated
      if (
        !merged.some(
          (existingItem) =>
            JSON.stringify(existingItem) === JSON.stringify(item),
        )
      ) {
        merged.push(item);
      }
    }

    return merged;
  }

  /**
   * Apply conflict resolution to resolved data
   */
  private applyResolution(
    resolvedData: Partial<ProjectData>,
    conflict: ConflictItem,
    resolution: ConflictResolution,
  ): void {
    const { action, mergedData } = resolution;

    switch (action) {
      case ResolutionAction.USE_INCOMING:
        this.setResolvedValue(
          resolvedData,
          conflict.type,
          conflict.incomingItem,
        );
        break;

      case ResolutionAction.KEEP_EXISTING:
        this.setResolvedValue(
          resolvedData,
          conflict.type,
          conflict.existingItem,
        );
        break;

      case ResolutionAction.MERGE_DATA:
        if (mergedData) {
          this.setResolvedValue(resolvedData, conflict.type, mergedData);
        } else {
          this.setResolvedValue(
            resolvedData,
            conflict.type,
            conflict.existingItem,
          );
        }
        break;

      case ResolutionAction.CREATE_COPY:
        const modifiedItem = this.createModifiedCopy(
          conflict.incomingItem,
          conflict.id,
        );
        this.setResolvedValue(resolvedData, conflict.type, modifiedItem);
        break;

      case ResolutionAction.SKIP_ITEM:
        // Don't add anything to resolved data
        break;
    }
  }

  /**
   * Set resolved value in the appropriate location
   */
  private setResolvedValue(
    resolvedData: Partial<ProjectData>,
    type: any,
    value: unknown,
  ): void {
    switch (type) {
      case 'project':
        resolvedData.metadata = value as any;
        break;
      case 'document':
        resolvedData.document = value as any;
        break;
      case 'themes':
        if (!resolvedData.themes) resolvedData.themes = [];
        resolvedData.themes.push(value as any);
        break;
      case 'presets':
        if (!resolvedData.presets) resolvedData.presets = [];
        resolvedData.presets.push(value as any);
        break;
    }
  }

  /**
   * Create a modified copy of an item (e.g., with new ID)
   */
  private createModifiedCopy(item: unknown, originalId: string): unknown {
    if (this.isObject(item)) {
      const copy = { ...item };
      if ('id' in copy) {
        copy.id = `${originalId}-imported-${Date.now()}`;
      }
      if ('name' in copy && typeof copy.name === 'string') {
        copy.name = `${copy.name} (Imported)`;
      }
      return copy;
    }
    return item;
  }

  /**
   * Detect metadata conflicts
   */
  private detectMetadataConflicts(
    existing: any,
    incoming: any,
  ): ConflictItem[] {
    const conflicts: ConflictItem[] = [];

    if (existing.id === incoming.id) {
      const differences = this.findDifferences(existing, incoming);
      if (differences.length > 0) {
        conflicts.push({
          id: existing.id,
          type: 'project' as any,
          conflictType: ConflictType.ID_COLLISION,
          existingItem: existing,
          incomingItem: incoming,
          differences,
          resolved: false,
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect document conflicts
   */
  private detectDocumentConflicts(
    existing: any,
    incoming: any,
  ): ConflictItem[] {
    const conflicts: ConflictItem[] = [];

    // Check for significant differences in document structure
    const differences = this.findDifferences(existing, incoming, ['snapshots']);
    if (differences.length > 0) {
      conflicts.push({
        id: 'document',
        type: 'document' as any,
        conflictType: ConflictType.DATA_MISMATCH,
        existingItem: existing,
        incomingItem: incoming,
        differences,
        resolved: false,
      });
    }

    // Check snapshot conflicts
    if (existing.snapshots && incoming.snapshots) {
      const snapshotConflicts = this.detectSnapshotConflicts(
        existing.snapshots,
        incoming.snapshots,
      );
      conflicts.push(...snapshotConflicts);
    }

    return conflicts;
  }

  /**
   * Detect snapshot conflicts
   */
  private detectSnapshotConflicts(
    existingSnapshots: any[],
    incomingSnapshots: any[],
  ): ConflictItem[] {
    const conflicts: ConflictItem[] = [];
    const existingIds = new Set(existingSnapshots.map((s) => s.id));

    for (const incomingSnapshot of incomingSnapshots) {
      if (existingIds.has(incomingSnapshot.id)) {
        const existingSnapshot = existingSnapshots.find(
          (s) => s.id === incomingSnapshot.id,
        );
        if (existingSnapshot) {
          const differences = this.findDifferences(
            existingSnapshot,
            incomingSnapshot,
          );
          if (differences.length > 0) {
            conflicts.push({
              id: incomingSnapshot.id,
              type: 'snapshots' as any,
              conflictType: ConflictType.ID_COLLISION,
              existingItem: existingSnapshot,
              incomingItem: incomingSnapshot,
              differences,
              resolved: false,
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect theme conflicts
   */
  private detectThemeConflicts(
    existingThemes: any[],
    incomingThemes: any[],
  ): ConflictItem[] {
    const conflicts: ConflictItem[] = [];
    const existingIds = new Set(existingThemes.map((t) => t.id));

    for (const incomingTheme of incomingThemes) {
      if (existingIds.has(incomingTheme.id)) {
        const existingTheme = existingThemes.find(
          (t) => t.id === incomingTheme.id,
        );
        if (existingTheme) {
          const differences = this.findDifferences(
            existingTheme,
            incomingTheme,
          );
          if (differences.length > 0) {
            conflicts.push({
              id: incomingTheme.id,
              type: 'themes' as any,
              conflictType: ConflictType.ID_COLLISION,
              existingItem: existingTheme,
              incomingItem: incomingTheme,
              differences,
              resolved: false,
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect preset conflicts
   */
  private detectPresetConflicts(
    existingPresets: any[],
    incomingPresets: any[],
  ): ConflictItem[] {
    const conflicts: ConflictItem[] = [];
    const existingIds = new Set(existingPresets.map((p) => p.id));

    for (const incomingPreset of incomingPresets) {
      if (existingIds.has(incomingPreset.id)) {
        const existingPreset = existingPresets.find(
          (p) => p.id === incomingPreset.id,
        );
        if (existingPreset) {
          const differences = this.findDifferences(
            existingPreset,
            incomingPreset,
          );
          if (differences.length > 0) {
            conflicts.push({
              id: incomingPreset.id,
              type: 'presets' as any,
              conflictType: ConflictType.ID_COLLISION,
              existingItem: existingPreset,
              incomingItem: incomingPreset,
              differences,
              resolved: false,
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Find differences between two objects
   */
  private findDifferences(
    existing: any,
    incoming: any,
    excludeFields: string[] = [],
  ): ConflictDifference[] {
    const differences: ConflictDifference[] = [];

    // Check all fields in both objects
    const allFields = new Set([
      ...Object.keys(existing || {}),
      ...Object.keys(incoming || {}),
    ]);

    for (const field of allFields) {
      if (excludeFields.includes(field)) continue;

      const existingValue = existing?.[field];
      const incomingValue = incoming?.[field];

      if (existingValue !== incomingValue) {
        let type: DifferenceType;

        if (existingValue === undefined) {
          type = DifferenceType.ADDITION;
        } else if (incomingValue === undefined) {
          type = DifferenceType.DELETION;
        } else if (typeof existingValue !== typeof incomingValue) {
          type = DifferenceType.TYPE_CHANGE;
        } else {
          type = DifferenceType.VALUE_CHANGE;
        }

        differences.push({
          field,
          existingValue,
          incomingValue,
          type,
        });
      }
    }

    return differences;
  }

  /**
   * Get existing data from application state
   * This would be implemented to fetch current project data
   */
  private async getExistingData(): Promise<Partial<ProjectData> | null> {
    // TODO: Implement integration with application state
    // For now, return null (no existing data)
    return null;
  }

  /**
   * Type guard for objects
   */
  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
