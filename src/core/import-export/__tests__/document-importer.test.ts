import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentImporter } from '../document-importer';
import { DataValidator } from '../data-validator';
import { ConflictResolver } from '../conflict-resolver';
import { ImportExportFormat, DataType, type ImportOptions } from '../types';

// Mock dependencies
vi.mock('../data-validator');
vi.mock('../conflict-resolver');

// Mock JSZip
vi.mock('jszip', () => ({
  default: {
    loadAsync: vi.fn(),
  },
}));

describe('DocumentImporter', () => {
  let importer: DocumentImporter;
  let mockValidator: vi.Mocked<DataValidator>;
  let mockResolver: vi.Mocked<ConflictResolver>;

  beforeEach(() => {
    vi.clearAllMocks();
    importer = new DocumentImporter();
    mockValidator = vi.mocked(DataValidator).mock.instances[0] as any;
    mockResolver = vi.mocked(ConflictResolver).mock.instances[0] as any;
  });

  describe('JSON Import', () => {
    it('should parse valid JSON project data', async () => {
      const jsonData = {
        exportFormat: 'diffani-project-v1',
        metadata: {
          id: 'test-project',
          name: 'Test Project',
          version: '1.0.0',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          tags: ['test'],
          diffaniVersion: '1.0.0',
          fileSize: 1000,
          snapshotCount: 1,
          totalDuration: 1000,
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
          theme: 'vs-dark',
          padding: { top: 10, left: 10, bottom: 10 },
        },
      };

      const file = new File([JSON.stringify(jsonData)], 'test.json', {
        type: 'application/json',
      });

      const result = await importer.parseFile(file, ImportExportFormat.JSON);

      expect(result.metadata).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.metadata?.id).toBe('test-project');
      expect(result.document?.snapshots).toHaveLength(1);
    });

    it('should parse direct RawDoc format', async () => {
      const rawDocData = {
        language: 'typescript',
        snapshots: [
          {
            id: 'snap-1',
            code: 'interface User { name: string; }',
            duration: 2000,
            transitionTime: 600,
          },
        ],
        fontSize: 16,
        lineHeight: 24,
        width: 1000,
        height: 700,
        theme: 'github-dark',
        padding: { top: 15, left: 15, bottom: 15 },
      };

      const file = new File([JSON.stringify(rawDocData)], 'rawdoc.json', {
        type: 'application/json',
      });

      const result = await importer.parseFile(file, ImportExportFormat.JSON);

      expect(result.document).toBeDefined();
      expect(result.document?.language).toBe('typescript');
      expect(result.document?.snapshots).toHaveLength(1);
    });

    it('should parse array of snapshots', async () => {
      const snapshotsArray = [
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

      const file = new File([JSON.stringify(snapshotsArray)], 'snapshots.json', {
        type: 'application/json',
      });

      const result = await importer.parseFile(file, ImportExportFormat.JSON);

      expect(result.document).toBeDefined();
      expect(result.document?.snapshots).toHaveLength(2);
      expect(result.document?.language).toBe('javascript'); // Default language
    });

    it('should handle invalid JSON', async () => {
      const file = new File(['invalid json {'], 'invalid.json', {
        type: 'application/json',
      });

      await expect(importer.parseFile(file, ImportExportFormat.JSON)).rejects.toThrow(
        'Invalid JSON format',
      );
    });
  });

  describe('CSV Import', () => {
    it('should parse CSV with header', async () => {
      const csvData = `id,code,duration,transitionTime
snap-1,"console.log(""hello"");",1000,500
snap-2,"const x = 1;",1500,600`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const result = await importer.parseFile(file, ImportExportFormat.CSV);

      expect(result.document).toBeDefined();
      expect(result.document?.snapshots).toHaveLength(2);
      expect(result.document?.snapshots?.[0].id).toBe('snap-1');
      expect(result.document?.snapshots?.[0].code).toBe('console.log("hello");');
      expect(result.document?.snapshots?.[0].duration).toBe(1000);
    });

    it('should parse CSV without header', async () => {
      const csvData = `snap-1,"const y = 2;",2000,700
snap-2,"function test() {}",1800,550`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const result = await importer.parseFile(file, ImportExportFormat.CSV);

      expect(result.document).toBeDefined();
      expect(result.document?.snapshots).toHaveLength(2);
      expect(result.document?.snapshots?.[0].id).toBe('snap-1');
      expect(result.document?.snapshots?.[1].code).toBe('function test() {}');
    });

    it('should handle CSV with quoted values containing commas', async () => {
      const csvData = `id,code,duration,transitionTime
snap-1,"const obj = { a: 1, b: 2 };",1000,500`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const result = await importer.parseFile(file, ImportExportFormat.CSV);

      expect(result.document?.snapshots?.[0].code).toBe('const obj = { a: 1, b: 2 };');
    });

    it('should handle CSV with escaped quotes', async () => {
      const csvData = `id,code,duration,transitionTime
snap-1,"console.log(""Hello, World!"");",1000,500`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      const result = await importer.parseFile(file, ImportExportFormat.CSV);

      expect(result.document?.snapshots?.[0].code).toBe('console.log("Hello, World!");');
    });

    it('should handle empty CSV', async () => {
      const file = new File([''], 'empty.csv', { type: 'text/csv' });

      await expect(importer.parseFile(file, ImportExportFormat.CSV)).rejects.toThrow(
        'Empty CSV file',
      );
    });

    it('should handle CSV with insufficient columns', async () => {
      const csvData = `id,code
snap-1,"incomplete row"`;

      const file = new File([csvData], 'test.csv', { type: 'text/csv' });

      await expect(importer.parseFile(file, ImportExportFormat.CSV)).rejects.toThrow(
        'Invalid CSV format',
      );
    });
  });

  describe('XML Import', () => {
    it('should parse valid XML project data', async () => {
      const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <metadata>
    <id>test-project</id>
    <name>Test Project</name>
    <version>1.0.0</version>
  </metadata>
  <document>
    <language>javascript</language>
    <fontSize>14</fontSize>
    <lineHeight>20</lineHeight>
    <width>800</width>
    <height>600</height>
    <theme>vs-dark</theme>
    <snapshots>
      <snapshot>
        <id>snap-1</id>
        <code><![CDATA[console.log("hello");]]></code>
        <duration>1000</duration>
        <transitionTime>500</transitionTime>
      </snapshot>
    </snapshots>
  </document>
</project>`;

      const file = new File([xmlData], 'test.xml', { type: 'application/xml' });

      const result = await importer.parseFile(file, ImportExportFormat.XML);

      expect(result.metadata).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.metadata?.id).toBe('test-project');
      expect(result.document?.snapshots).toHaveLength(1);
      expect(result.document?.snapshots?.[0].code).toBe('console.log("hello");');
    });

    it('should handle invalid XML', async () => {
      const invalidXml = '<invalid><unclosed>';

      const file = new File([invalidXml], 'invalid.xml', { type: 'application/xml' });

      await expect(importer.parseFile(file, ImportExportFormat.XML)).rejects.toThrow(
        'XML parsing failed',
      );
    });

    it('should parse XML with different data types', async () => {
      const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <metadata>
    <id>test</id>
    <fileSize>1024</fileSize>
    <snapshotCount>5</snapshotCount>
    <active>true</active>
    <config>{"theme": "dark"}</config>
  </metadata>
</project>`;

      const file = new File([xmlData], 'test.xml', { type: 'application/xml' });

      const result = await importer.parseFile(file, ImportExportFormat.XML);

      expect(result.metadata?.id).toBe('test');
      expect(result.metadata?.fileSize).toBe(1024);
      expect(result.metadata?.snapshotCount).toBe(5);
      // Note: XML parsing converts values to appropriate types
    });
  });

  describe('ZIP Import', () => {
    it('should extract and parse project.json from ZIP', async () => {
      const projectData = {
        metadata: { id: 'zip-project', name: 'ZIP Project' },
        document: { language: 'javascript', snapshots: [] },
      };

      const mockZip = {
        file: vi.fn().mockReturnValue({
          async: vi.fn().mockResolvedValue(JSON.stringify(projectData)),
        }),
        files: { 'project.json': {} },
      };

      const JSZip = await import('jszip');
      vi.mocked(JSZip.default.loadAsync).mockResolvedValue(mockZip as any);

      const file = new File(['zip content'], 'test.zip', { type: 'application/zip' });

      const result = await importer.parseFile(file, ImportExportFormat.ZIP);

      expect(result.metadata?.id).toBe('zip-project');
      expect(JSZip.default.loadAsync).toHaveBeenCalledWith(file);
    });

    it('should handle ZIP without project.json', async () => {
      const mockZip = {
        file: vi.fn().mockReturnValue(null),
        files: { 'other.json': {} },
      };

      const JSZip = await import('jszip');
      vi.mocked(JSZip.default.loadAsync).mockResolvedValue(mockZip as any);

      const file = new File(['zip content'], 'test.zip', { type: 'application/zip' });

      // Should fall back to first JSON file
      mockZip.file = vi.fn().mockImplementation((filename) => {
        if (filename === 'other.json') {
          return {
            async: vi.fn().mockResolvedValue('{"test": "data"}'),
          };
        }
        return null;
      });

      const result = await importer.parseFile(file, ImportExportFormat.ZIP);

      expect(result).toEqual({ test: 'data' });
    });

    it('should handle ZIP with no supported files', async () => {
      const mockZip = {
        file: vi.fn().mockReturnValue(null),
        files: { 'readme.txt': {} },
      };

      const JSZip = await import('jszip');
      vi.mocked(JSZip.default.loadAsync).mockResolvedValue(mockZip as any);

      const file = new File(['zip content'], 'test.zip', { type: 'application/zip' });

      await expect(importer.parseFile(file, ImportExportFormat.ZIP)).rejects.toThrow(
        'No supported files found in ZIP archive',
      );
    });

    it('should handle invalid ZIP file', async () => {
      const JSZip = await import('jszip');
      vi.mocked(JSZip.default.loadAsync).mockRejectedValue(new Error('Invalid ZIP'));

      const file = new File(['invalid zip'], 'test.zip', { type: 'application/zip' });

      await expect(importer.parseFile(file, ImportExportFormat.ZIP)).rejects.toThrow(
        'ZIP parsing failed',
      );
    });
  });

  describe('Full Import Process', () => {
    it('should complete successful import with validation', async () => {
      const jsonData = {
        metadata: { id: 'test', name: 'Test' },
        document: { language: 'javascript', snapshots: [] },
      };

      const file = new File([JSON.stringify(jsonData)], 'test.json', {
        type: 'application/json',
      });

      const options: ImportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        conflictResolution: 'overwrite' as any,
        validateData: true,
        createBackup: false,
        preserveIds: false,
      };

      // Mock validation success
      mockValidator.validate.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      });

      // Mock no conflicts
      mockResolver.detectConflicts.mockResolvedValue([]);

      const result = await importer.import(file, options);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.importedItems.length).toBeGreaterThan(0);
      expect(mockValidator.validate).toHaveBeenCalled();
      expect(mockResolver.detectConflicts).toHaveBeenCalled();
    });

    it('should handle validation failures', async () => {
      const file = new File(['{"invalid": "data"}'], 'test.json', {
        type: 'application/json',
      });

      const options: ImportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        conflictResolution: 'overwrite' as any,
        validateData: true,
        createBackup: false,
        preserveIds: false,
      };

      // Mock validation failure
      mockValidator.validate.mockResolvedValue({
        valid: false,
        errors: [{ field: 'test', message: 'Validation failed' }],
        warnings: [],
      });

      const result = await importer.import(file, options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('validation_error');
    });

    it('should handle import cancellation', async () => {
      const file = new File(['{}'], 'test.json', { type: 'application/json' });
      const options: ImportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        conflictResolution: 'overwrite' as any,
        validateData: false,
        createBackup: false,
        preserveIds: false,
      };

      const abortController = new AbortController();
      abortController.abort();

      const result = await importer.import(file, options, abortController.signal);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('cancelled'))).toBe(true);
    });

    it('should track progress during import', async () => {
      const file = new File(['{"test": "data"}'], 'test.json', {
        type: 'application/json',
      });

      const options: ImportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        conflictResolution: 'overwrite' as any,
        validateData: false,
        createBackup: false,
        preserveIds: false,
      };

      const progressUpdates: any[] = [];
      importer.onProgress = (progress) => {
        progressUpdates.push(progress);
      };

      mockValidator.validate.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      });
      mockResolver.detectConflicts.mockResolvedValue([]);

      await importer.import(file, options);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('initializing');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('completed');
    });
  });

  describe('Unsupported Format', () => {
    it('should reject unsupported format', async () => {
      const file = new File(['data'], 'test.unknown', { type: 'application/unknown' });

      await expect(
        importer.parseFile(file, 'unknown' as ImportExportFormat),
      ).rejects.toThrow('Unsupported import format');
    });
  });
});
