import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictResolver } from '../conflict-resolver';
import {
  ConflictResolutionStrategy,
  ConflictType,
  DifferenceType,
  ResolutionAction,
  type ProjectData,
  type ImportOptions,
  type ConflictItem,
} from '../types';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;
  let mockExistingData: Partial<ProjectData>;
  let mockIncomingData: Partial<ProjectData>;

  beforeEach(() => {
    resolver = new ConflictResolver();
    
    mockExistingData = {
      metadata: {
        id: 'existing-project',
        name: 'Existing Project',
        version: '1.0.0',
        author: 'Original Author',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        tags: ['existing', 'original'],
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
            code: 'console.log("existing");',
            duration: 1500,
            transitionTime: 400,
          },
          {
            id: 'snap-2',
            code: 'const x = 1;',
            duration: 1500,
            transitionTime: 400,
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

    mockIncomingData = {
      metadata: {
        id: 'existing-project', // Same ID - will cause conflict
        name: 'Updated Project', // Different name
        version: '2.0.0', // Different version
        author: 'New Author', // Different author
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-02-01'), // Different update date
        tags: ['updated', 'new'], // Different tags
        diffaniVersion: '1.0.0',
        fileSize: 1200,
        snapshotCount: 3,
        totalDuration: 4000,
      },
      document: {
        language: 'typescript', // Different language
        snapshots: [
          {
            id: 'snap-1', // Same ID but different content
            code: 'console.log("updated");',
            duration: 2000,
            transitionTime: 500,
          },
          {
            id: 'snap-3', // New snapshot
            code: 'const y = 2;',
            duration: 1000,
            transitionTime: 300,
          },
        ],
        fontSize: 16, // Different font size
        lineHeight: 24, // Different line height
        width: 1000, // Different width
        height: 700, // Different height
        theme: 'github-dark', // Different theme
        padding: { top: 15, left: 15, bottom: 15 }, // Different padding
      },
    };

    // Mock getExistingData to return our mock data
    vi.spyOn(resolver as any, 'getExistingData').mockResolvedValue(mockExistingData);
  });

  describe('Conflict Detection', () => {
    it('should detect metadata conflicts', async () => {
      const options: ImportOptions = {
        format: 'json' as any,
        dataType: 'project' as any,
        conflictResolution: ConflictResolutionStrategy.INTERACTIVE,
        validateData: true,
        createBackup: true,
        preserveIds: false,
      };

      const conflicts = await resolver.detectConflicts(mockIncomingData, options);

      expect(conflicts.length).toBeGreaterThan(0);
      
      const metadataConflict = conflicts.find(c => c.type === 'project');
      expect(metadataConflict).toBeDefined();
      expect(metadataConflict?.conflictType).toBe(ConflictType.ID_COLLISION);
      expect(metadataConflict?.id).toBe('existing-project');
      expect(metadataConflict?.differences.length).toBeGreaterThan(0);
    });

    it('should detect document conflicts', async () => {
      const options: ImportOptions = {
        format: 'json' as any,
        dataType: 'project' as any,
        conflictResolution: ConflictResolutionStrategy.INTERACTIVE,
        validateData: true,
        createBackup: true,
        preserveIds: false,
      };

      const conflicts = await resolver.detectConflicts(mockIncomingData, options);

      const documentConflict = conflicts.find(c => c.type === 'document');
      expect(documentConflict).toBeDefined();
      expect(documentConflict?.conflictType).toBe(ConflictType.DATA_MISMATCH);
      expect(documentConflict?.differences.length).toBeGreaterThan(0);
    });

    it('should detect snapshot conflicts', async () => {
      const options: ImportOptions = {
        format: 'json' as any,
        dataType: 'project' as any,
        conflictResolution: ConflictResolutionStrategy.INTERACTIVE,
        validateData: true,
        createBackup: true,
        preserveIds: false,
      };

      const conflicts = await resolver.detectConflicts(mockIncomingData, options);

      const snapshotConflict = conflicts.find(c => c.type === 'snapshots' && c.id === 'snap-1');
      expect(snapshotConflict).toBeDefined();
      expect(snapshotConflict?.conflictType).toBe(ConflictType.ID_COLLISION);
      expect(snapshotConflict?.differences.length).toBeGreaterThan(0);
    });

    it('should not detect conflicts when no existing data', async () => {
      vi.spyOn(resolver as any, 'getExistingData').mockResolvedValue(null);

      const options: ImportOptions = {
        format: 'json' as any,
        dataType: 'project' as any,
        conflictResolution: ConflictResolutionStrategy.INTERACTIVE,
        validateData: true,
        createBackup: true,
        preserveIds: false,
      };

      const conflicts = await resolver.detectConflicts(mockIncomingData, options);

      expect(conflicts).toHaveLength(0);
    });

    it('should emit conflict detected event', async () => {
      const conflictHandler = vi.fn();
      resolver.onConflictDetected = conflictHandler;

      const options: ImportOptions = {
        format: 'json' as any,
        dataType: 'project' as any,
        conflictResolution: ConflictResolutionStrategy.INTERACTIVE,
        validateData: true,
        createBackup: true,
        preserveIds: false,
      };

      await resolver.detectConflicts(mockIncomingData, options);

      expect(conflictHandler).toHaveBeenCalled();
      expect(conflictHandler.mock.calls[0][0].length).toBeGreaterThan(0);
    });
  });

  describe('Conflict Resolution Strategies', () => {
    let sampleConflict: ConflictItem;

    beforeEach(() => {
      sampleConflict = {
        id: 'test-conflict',
        type: 'project' as any,
        conflictType: ConflictType.ID_COLLISION,
        existingItem: { name: 'Existing', version: '1.0.0' },
        incomingItem: { name: 'Incoming', version: '2.0.0' },
        differences: [
          {
            field: 'name',
            existingValue: 'Existing',
            incomingValue: 'Incoming',
            type: DifferenceType.VALUE_CHANGE,
          },
          {
            field: 'version',
            existingValue: '1.0.0',
            incomingValue: '2.0.0',
            type: DifferenceType.VALUE_CHANGE,
          },
        ],
        resolved: false,
      };
    });

    it('should resolve with OVERWRITE strategy', async () => {
      const conflicts = [sampleConflict];
      
      const result = await resolver.resolveConflicts(
        conflicts,
        ConflictResolutionStrategy.OVERWRITE,
      );

      expect(conflicts[0].resolved).toBe(true);
      expect(conflicts[0].resolution?.strategy).toBe(ConflictResolutionStrategy.OVERWRITE);
      expect(conflicts[0].resolution?.action).toBe(ResolutionAction.USE_INCOMING);
    });

    it('should resolve with SKIP strategy', async () => {
      const conflicts = [sampleConflict];
      
      const result = await resolver.resolveConflicts(
        conflicts,
        ConflictResolutionStrategy.SKIP,
      );

      expect(conflicts[0].resolved).toBe(true);
      expect(conflicts[0].resolution?.strategy).toBe(ConflictResolutionStrategy.SKIP);
      expect(conflicts[0].resolution?.action).toBe(ResolutionAction.KEEP_EXISTING);
    });

    it('should resolve with CREATE_NEW strategy', async () => {
      const conflicts = [sampleConflict];
      
      const result = await resolver.resolveConflicts(
        conflicts,
        ConflictResolutionStrategy.CREATE_NEW,
      );

      expect(conflicts[0].resolved).toBe(true);
      expect(conflicts[0].resolution?.strategy).toBe(ConflictResolutionStrategy.CREATE_NEW);
      expect(conflicts[0].resolution?.action).toBe(ResolutionAction.CREATE_COPY);
    });

    it('should attempt merge with MERGE strategy', async () => {
      const conflicts = [sampleConflict];
      
      const result = await resolver.resolveConflicts(
        conflicts,
        ConflictResolutionStrategy.MERGE,
      );

      expect(conflicts[0].resolved).toBe(true);
      expect(conflicts[0].resolution?.strategy).toBe(ConflictResolutionStrategy.MERGE);
      expect(conflicts[0].resolution?.action).toBe(ResolutionAction.MERGE_DATA);
      expect(conflicts[0].resolution?.mergedData).toBeDefined();
    });

    it('should fallback to KEEP_EXISTING when merge fails', async () => {
      // Create a conflict that will cause merge to fail
      const unmergableConflict = {
        ...sampleConflict,
        existingItem: 'not an object',
        incomingItem: { name: 'test' },
      };

      const conflicts = [unmergableConflict];
      
      const result = await resolver.resolveConflicts(
        conflicts,
        ConflictResolutionStrategy.MERGE,
      );

      expect(conflicts[0].resolved).toBe(true);
      expect(conflicts[0].resolution?.action).toBe(ResolutionAction.KEEP_EXISTING);
      expect(conflicts[0].resolution?.notes).toContain('Merge failed');
    });

    it('should default to merge for INTERACTIVE strategy', async () => {
      const conflicts = [sampleConflict];
      
      const result = await resolver.resolveConflicts(
        conflicts,
        ConflictResolutionStrategy.INTERACTIVE,
      );

      expect(conflicts[0].resolved).toBe(true);
      expect(conflicts[0].resolution?.action).toBe(ResolutionAction.MERGE_DATA);
    });
  });

  describe('Data Merging', () => {
    it('should merge objects recursively', () => {
      const existing = {
        name: 'Existing',
        settings: {
          theme: 'dark',
          fontSize: 14,
        },
        tags: ['old'],
      };

      const incoming = {
        name: 'Updated',
        settings: {
          fontSize: 16,
          lineHeight: 20,
        },
        tags: ['new'],
        description: 'Added field',
      };

      const merged = (resolver as any).mergeData(existing, incoming);

      expect(merged.name).toBe('Updated'); // Incoming value preferred
      expect(merged.settings.theme).toBe('dark'); // Existing value preserved
      expect(merged.settings.fontSize).toBe(16); // Incoming value preferred
      expect(merged.settings.lineHeight).toBe(20); // New field added
      expect(merged.description).toBe('Added field'); // New field added
    });

    it('should merge arrays by combining unique items', () => {
      const existing = ['item1', 'item2'];
      const incoming = ['item2', 'item3'];

      const merged = (resolver as any).mergeArrays(existing, incoming);

      expect(merged).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle primitive value conflicts by preferring incoming', () => {
      const existing = 'old value';
      const incoming = 'new value';

      const merged = (resolver as any).mergeData(existing, incoming);

      expect(merged).toBe('new value');
    });

    it('should handle null and undefined values', () => {
      const existing = { a: 1, b: null };
      const incoming = { b: 2, c: undefined };

      const merged = (resolver as any).mergeData(existing, incoming);

      expect(merged.a).toBe(1);
      expect(merged.b).toBe(2);
      expect(merged.c).toBeUndefined();
    });
  });

  describe('Difference Detection', () => {
    it('should detect value changes', () => {
      const existing = { name: 'Old', version: '1.0.0' };
      const incoming = { name: 'New', version: '2.0.0' };

      const differences = (resolver as any).findDifferences(existing, incoming);

      expect(differences).toHaveLength(2);
      expect(differences[0].field).toBe('name');
      expect(differences[0].type).toBe(DifferenceType.VALUE_CHANGE);
      expect(differences[1].field).toBe('version');
      expect(differences[1].type).toBe(DifferenceType.VALUE_CHANGE);
    });

    it('should detect additions', () => {
      const existing = { name: 'Test' };
      const incoming = { name: 'Test', description: 'Added field' };

      const differences = (resolver as any).findDifferences(existing, incoming);

      expect(differences).toHaveLength(1);
      expect(differences[0].field).toBe('description');
      expect(differences[0].type).toBe(DifferenceType.ADDITION);
      expect(differences[0].existingValue).toBeUndefined();
      expect(differences[0].incomingValue).toBe('Added field');
    });

    it('should detect deletions', () => {
      const existing = { name: 'Test', description: 'Will be removed' };
      const incoming = { name: 'Test' };

      const differences = (resolver as any).findDifferences(existing, incoming);

      expect(differences).toHaveLength(1);
      expect(differences[0].field).toBe('description');
      expect(differences[0].type).toBe(DifferenceType.DELETION);
      expect(differences[0].existingValue).toBe('Will be removed');
      expect(differences[0].incomingValue).toBeUndefined();
    });

    it('should detect type changes', () => {
      const existing = { value: 'string' };
      const incoming = { value: 123 };

      const differences = (resolver as any).findDifferences(existing, incoming);

      expect(differences).toHaveLength(1);
      expect(differences[0].field).toBe('value');
      expect(differences[0].type).toBe(DifferenceType.TYPE_CHANGE);
    });

    it('should exclude specified fields', () => {
      const existing = { name: 'Test', snapshots: [], excluded: 'value' };
      const incoming = { name: 'Updated', snapshots: [], excluded: 'different' };

      const differences = (resolver as any).findDifferences(
        existing,
        incoming,
        ['excluded', 'snapshots'],
      );

      expect(differences).toHaveLength(1);
      expect(differences[0].field).toBe('name');
    });
  });

  describe('Modified Copy Creation', () => {
    it('should create modified copy with new ID', () => {
      const original = {
        id: 'original-id',
        name: 'Original Name',
        data: 'some data',
      };

      const modified = (resolver as any).createModifiedCopy(original, 'original-id');

      expect(modified.id).not.toBe('original-id');
      expect(modified.id).toContain('original-id-imported-');
      expect(modified.name).toBe('Original Name (Imported)');
      expect(modified.data).toBe('some data');
    });

    it('should handle items without ID or name', () => {
      const original = { data: 'some data' };

      const modified = (resolver as any).createModifiedCopy(original, 'test-id');

      expect(modified.data).toBe('some data');
      // Should not crash when no id or name fields exist
    });

    it('should handle non-object items', () => {
      const original = 'string value';

      const modified = (resolver as any).createModifiedCopy(original, 'test-id');

      expect(modified).toBe('string value');
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported resolution strategy', async () => {
      const conflicts = [
        {
          id: 'test',
          type: 'project' as any,
          conflictType: ConflictType.ID_COLLISION,
          existingItem: {},
          incomingItem: {},
          differences: [],
          resolved: false,
        },
      ];

      await expect(
        resolver.resolveConflicts(conflicts, 'unsupported' as ConflictResolutionStrategy),
      ).rejects.toThrow('Unsupported conflict resolution strategy');
    });

    it('should handle circular references in merge', () => {
      const existing: any = { name: 'test' };
      existing.self = existing;

      const incoming = { name: 'updated', other: 'value' };

      // Should not throw error due to circular reference
      const merged = (resolver as any).mergeData(existing, incoming);
      expect(merged.name).toBe('updated');
      expect(merged.other).toBe('value');
    });
  });
});
