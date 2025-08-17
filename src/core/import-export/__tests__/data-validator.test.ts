import { describe, it, expect, beforeEach } from 'vitest';
import { DataValidator } from '../data-validator';
import { DataType, type ProjectData, type ProjectMetadata } from '../types';
import { Language } from '../../code-languages/languages';

describe('DataValidator', () => {
  let validator: DataValidator;

  beforeEach(() => {
    validator = new DataValidator();
  });

  describe('Project Validation', () => {
    it('should validate a complete valid project', async () => {
      const validProject: ProjectData = {
        metadata: {
          id: 'test-project-123',
          name: 'Test Project',
          version: '1.0.0',
          author: 'Test Author',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          tags: ['test', 'demo'],
          category: 'tutorial',
          license: 'MIT',
          diffaniVersion: '1.0.0',
          fileSize: 1024,
          snapshotCount: 3,
          totalDuration: 5000,
        },
        document: {
          language: Language.JAVASCRIPT,
          snapshots: [
            {
              id: 'snap-1',
              code: 'console.log("Hello, World!");',
              duration: 2000,
              transitionTime: 500,
            },
            {
              id: 'snap-2',
              code: 'const message = "Hello, World!";\nconsole.log(message);',
              duration: 2000,
              transitionTime: 500,
            },
            {
              id: 'snap-3',
              code: 'function greet() {\n  console.log("Hello, World!");\n}\ngreet();',
              duration: 1000,
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

      const result = await validator.validate(validProject, DataType.PROJECT);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject project with missing required metadata', async () => {
      const invalidProject = {
        metadata: {
          // Missing required fields: id, name, version, createdAt, updatedAt
          author: 'Test Author',
        },
        document: {
          language: Language.JAVASCRIPT,
          snapshots: [],
          fontSize: 14,
          lineHeight: 20,
          width: 800,
          height: 600,
          theme: 'vs-dark',
          padding: { top: 10, left: 10, bottom: 10 },
        },
      };

      const result = await validator.validate(invalidProject, DataType.PROJECT);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.field === 'metadata.id')).toBe(true);
      expect(result.errors.some((e) => e.field === 'metadata.name')).toBe(true);
      expect(result.errors.some((e) => e.field === 'metadata.version')).toBe(
        true,
      );
    });

    it('should reject project with invalid data types', async () => {
      const invalidProject = {
        metadata: {
          id: 123, // Should be string
          name: 'Test Project',
          version: '1.0.0',
          createdAt: 'invalid-date', // Should be valid date
          updatedAt: new Date(),
          tags: 'not-an-array', // Should be array
          fileSize: -100, // Should be non-negative
        },
        document: {
          language: Language.JAVASCRIPT,
          snapshots: [],
          fontSize: 'invalid', // Should be number
          lineHeight: 20,
          width: 800,
          height: 600,
          theme: 'vs-dark',
          padding: { top: 10, left: 10, bottom: 10 },
        },
      };

      const result = await validator.validate(invalidProject, DataType.PROJECT);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'metadata.id')).toBe(true);
      expect(result.errors.some((e) => e.field === 'metadata.createdAt')).toBe(
        true,
      );
      expect(result.errors.some((e) => e.field === 'metadata.tags')).toBe(true);
      expect(result.errors.some((e) => e.field === 'document.fontSize')).toBe(
        true,
      );
    });

    it('should warn about unusual values', async () => {
      const projectWithWarnings: ProjectData = {
        metadata: {
          id: 'test-project',
          name: 'Test Project',
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: [],
          diffaniVersion: '1.0.0',
          fileSize: 200 * 1024 * 1024, // Very large file (200MB)
          snapshotCount: 15000, // Too many snapshots
          totalDuration: 0,
        },
        document: {
          language: Language.JAVASCRIPT,
          snapshots: [
            {
              id: 'snap-1',
              code: 'console.log("test");',
              duration: 1000,
              transitionTime: 500,
            },
          ],
          fontSize: 4, // Very small font
          lineHeight: 20,
          width: 100, // Very narrow
          height: 2000, // Very tall (unusual aspect ratio)
          theme: 'vs-dark',
          padding: { top: 10, left: 10, bottom: 10 },
        },
      };

      const result = await validator.validate(
        projectWithWarnings,
        DataType.PROJECT,
      );

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.field === 'metadata.fileSize')).toBe(
        true,
      );
      expect(
        result.warnings.some((w) => w.field === 'metadata.snapshotCount'),
      ).toBe(true);
      expect(result.warnings.some((w) => w.field === 'document.fontSize')).toBe(
        true,
      );
      expect(
        result.warnings.some((w) => w.field === 'document.dimensions'),
      ).toBe(true);
    });
  });

  describe('Document Validation', () => {
    it('should validate a complete document', async () => {
      const validDocument = {
        language: Language.TYPESCRIPT,
        snapshots: [
          {
            id: 'snap-1',
            code: 'interface User {\n  name: string;\n  age: number;\n}',
            duration: 2000,
            transitionTime: 500,
          },
        ],
        fontSize: 16,
        lineHeight: 24,
        width: 1200,
        height: 800,
        theme: 'github-dark',
        padding: { top: 20, left: 20, bottom: 20 },
      };

      const result = await validator.validate(validDocument, DataType.DOCUMENT);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject document with missing required fields', async () => {
      const invalidDocument = {
        // Missing language, snapshots, fontSize, etc.
        theme: 'vs-dark',
      };

      const result = await validator.validate(
        invalidDocument,
        DataType.DOCUMENT,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'document.language')).toBe(
        true,
      );
      expect(result.errors.some((e) => e.field === 'document.snapshots')).toBe(
        true,
      );
      expect(result.errors.some((e) => e.field === 'document.fontSize')).toBe(
        true,
      );
    });

    it('should warn about unknown language', async () => {
      const documentWithUnknownLanguage = {
        language: 'unknown-language',
        snapshots: [
          {
            id: 'snap-1',
            code: 'some code',
            duration: 1000,
            transitionTime: 500,
          },
        ],
        fontSize: 14,
        lineHeight: 20,
        width: 800,
        height: 600,
        theme: 'vs-dark',
        padding: { top: 10, left: 10, bottom: 10 },
      };

      const result = await validator.validate(
        documentWithUnknownLanguage,
        DataType.DOCUMENT,
      );

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.field === 'document.language')).toBe(
        true,
      );
    });
  });

  describe('Snapshots Validation', () => {
    it('should validate array of snapshots', async () => {
      const validSnapshots = [
        {
          id: 'snap-1',
          code: 'const x = 1;',
          duration: 1000,
          transitionTime: 300,
        },
        {
          id: 'snap-2',
          code: 'const y = 2;',
          duration: 1500,
          transitionTime: 400,
        },
      ];

      const result = await validator.validate(
        validSnapshots,
        DataType.SNAPSHOTS,
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty snapshots array', async () => {
      const emptySnapshots: any[] = [];

      const result = await validator.validate(
        emptySnapshots,
        DataType.SNAPSHOTS,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'snapshots')).toBe(true);
    });

    it('should reject snapshots with invalid data', async () => {
      const invalidSnapshots = [
        {
          // Missing id, code, duration, transitionTime
          someField: 'value',
        },
        {
          id: 'snap-2',
          code: 'valid code',
          duration: -100, // Invalid negative duration
          transitionTime: 2000, // Transition time > duration
        },
      ];

      const result = await validator.validate(
        invalidSnapshots,
        DataType.SNAPSHOTS,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect duplicate snapshot IDs', async () => {
      const snapshotsWithDuplicates = [
        {
          id: 'duplicate-id',
          code: 'first snapshot',
          duration: 1000,
          transitionTime: 300,
        },
        {
          id: 'duplicate-id', // Duplicate ID
          code: 'second snapshot',
          duration: 1000,
          transitionTime: 300,
        },
      ];

      const result = await validator.validate(
        snapshotsWithDuplicates,
        DataType.SNAPSHOTS,
      );

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('Duplicate snapshot ID')),
      ).toBe(true);
    });

    it('should warn about very long snapshots', async () => {
      const snapshotsWithLongDuration = [
        {
          id: 'long-snap',
          code: 'some code',
          duration: 120000, // 2 minutes - very long
          transitionTime: 500,
        },
      ];

      const result = await validator.validate(
        snapshotsWithLongDuration,
        DataType.SNAPSHOTS,
      );

      expect(result.valid).toBe(true);
      expect(
        result.warnings.some((w) => w.message.includes('Long duration')),
      ).toBe(true);
    });

    it('should warn about very long code blocks', async () => {
      const longCode = 'a'.repeat(15000); // Very long code
      const snapshotsWithLongCode = [
        {
          id: 'long-code-snap',
          code: longCode,
          duration: 1000,
          transitionTime: 500,
        },
      ];

      const result = await validator.validate(
        snapshotsWithLongCode,
        DataType.SNAPSHOTS,
      );

      expect(result.valid).toBe(true);
      expect(
        result.warnings.some((w) => w.message.includes('Large code block')),
      ).toBe(true);
    });

    it('should warn about empty code snapshots', async () => {
      const snapshotsWithEmptyCode = [
        {
          id: 'empty-snap',
          code: '   \n  \n  ', // Only whitespace
          duration: 1000,
          transitionTime: 500,
        },
      ];

      const result = await validator.validate(
        snapshotsWithEmptyCode,
        DataType.SNAPSHOTS,
      );

      expect(result.valid).toBe(true);
      expect(
        result.warnings.some((w) => w.message.includes('Empty code snapshot')),
      ).toBe(true);
    });

    it('should warn about very long total duration', async () => {
      const manySnapshots = Array.from({ length: 100 }, (_, i) => ({
        id: `snap-${i}`,
        code: `const x${i} = ${i};`,
        duration: 5000, // 5 seconds each = 500 seconds total
        transitionTime: 500,
      }));

      const result = await validator.validate(
        manySnapshots,
        DataType.SNAPSHOTS,
      );

      expect(result.valid).toBe(true);
      expect(
        result.warnings.some((w) =>
          w.message.includes('Very long total duration'),
        ),
      ).toBe(true);
    });

    it('should warn about very short total duration', async () => {
      const shortSnapshots = [
        {
          id: 'short-snap',
          code: 'x',
          duration: 100, // Very short
          transitionTime: 50,
        },
      ];

      const result = await validator.validate(
        shortSnapshots,
        DataType.SNAPSHOTS,
      );

      expect(result.valid).toBe(true);
      expect(
        result.warnings.some((w) =>
          w.message.includes('Very short total duration'),
        ),
      ).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input', async () => {
      const result = await validator.validate(null, DataType.PROJECT);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle undefined input', async () => {
      const result = await validator.validate(undefined, DataType.PROJECT);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle non-object input for project validation', async () => {
      const result = await validator.validate(
        'not an object',
        DataType.PROJECT,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'project')).toBe(true);
    });

    it('should handle non-array input for snapshots validation', async () => {
      const result = await validator.validate(
        'not an array',
        DataType.SNAPSHOTS,
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'snapshots')).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      // Create a circular reference that might cause JSON.stringify to fail
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      const result = await validator.validate(circularObject, DataType.PROJECT);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle unsupported data type', async () => {
      const result = await validator.validate({}, 'unsupported' as DataType);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'dataType')).toBe(true);
    });
  });
});
