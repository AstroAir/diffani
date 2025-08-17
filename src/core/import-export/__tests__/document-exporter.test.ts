import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentExporter } from '../document-exporter';
import {
  ImportExportFormat,
  DataType,
  type ProjectData,
  type ExportOptions,
} from '../types';

// Mock JSZip
vi.mock('jszip', () => ({
  default: vi.fn().mockImplementation(() => ({
    file: vi.fn(),
    generateAsync: vi
      .fn()
      .mockResolvedValue(
        new Blob(['zip content'], { type: 'application/zip' }),
      ),
  })),
}));

describe('DocumentExporter', () => {
  let exporter: DocumentExporter;
  let sampleProjectData: ProjectData;

  beforeEach(() => {
    exporter = new DocumentExporter();

    sampleProjectData = {
      metadata: {
        id: 'test-project',
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
        snapshotCount: 2,
        totalDuration: 3000,
      },
      document: {
        language: 'javascript',
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
            duration: 1000,
            transitionTime: 300,
          },
        ],
        fontSize: 14,
        lineHeight: 20,
        width: 800,
        height: 600,
        theme: 'vs-dark',
        padding: { top: 10, left: 10, bottom: 10 },
      },
      themes: [
        {
          id: 'custom-theme',
          name: 'Custom Theme',
          colors: { background: '#000000', foreground: '#ffffff' },
        },
      ],
      presets: [
        {
          id: 'custom-preset',
          name: 'Custom Preset',
          settings: { duration: 1000, transition: 'fade' },
        },
      ],
    };
  });

  describe('JSON Export', () => {
    it('should export project as JSON with pretty printing', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
        jsonOptions: {
          prettyPrint: true,
          includeComments: false,
          sortKeys: false,
          minify: false,
        },
      };

      const result = await exporter.export(sampleProjectData, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe(ImportExportFormat.JSON);
      expect(result.filename).toMatch(/diffani-export-.*\.json/);

      // Verify the blob contains valid JSON
      const text = await result.blob.text();
      const parsed = JSON.parse(text);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.document).toBeDefined();
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.exportFormat).toBe('diffani-project-v1');
    });

    it('should export with sorted keys when requested', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
        jsonOptions: {
          prettyPrint: true,
          sortKeys: true,
          includeComments: false,
          minify: false,
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();

      // Check that keys are sorted (document should come before metadata alphabetically)
      const lines = text.split('\n');
      const documentIndex = lines.findIndex((line) =>
        line.includes('"document"'),
      );
      const metadataIndex = lines.findIndex((line) =>
        line.includes('"metadata"'),
      );

      expect(documentIndex).toBeLessThan(metadataIndex);
    });

    it('should export document only when specified', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.DOCUMENT,
        includeMetadata: false,
        compression: false,
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();
      const parsed = JSON.parse(text);

      expect(parsed.document).toBeDefined();
      expect(parsed.metadata).toBeUndefined();
    });
  });

  describe('CSV Export', () => {
    it('should export snapshots as CSV with header', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.CSV,
        dataType: DataType.SNAPSHOTS,
        includeMetadata: false,
        compression: false,
        csvOptions: {
          delimiter: ',',
          includeHeader: true,
          encoding: 'utf-8',
          quoteStrings: true,
          dateFormat: 'ISO',
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();
      const lines = text.split('\n');

      expect(lines[0]).toBe('"id","code","duration","transitionTime"');
      expect(lines[1]).toContain('snap-1');
      expect(lines[1]).toContain('console.log(""Hello, World!"");');
      expect(lines[2]).toContain('snap-2');
      expect(lines.length).toBe(4); // Header + 2 data rows (one multiline)
    });

    it('should export CSV without header when requested', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.CSV,
        dataType: DataType.SNAPSHOTS,
        includeMetadata: false,
        compression: false,
        csvOptions: {
          delimiter: ',',
          includeHeader: false,
          encoding: 'utf-8',
          quoteStrings: true,
          dateFormat: 'ISO',
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();
      const lines = text.split('\n').filter((line) => line.trim() !== '');

      expect(lines[0]).toContain('snap-1');
      expect(lines[0]).not.toContain('id,code,duration');
      expect(lines.length).toBe(3); // Only data rows (one multiline)
    });

    it('should use custom delimiter', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.CSV,
        dataType: DataType.SNAPSHOTS,
        includeMetadata: false,
        compression: false,
        csvOptions: {
          delimiter: ';',
          includeHeader: true,
          encoding: 'utf-8',
          quoteStrings: true,
          dateFormat: 'ISO',
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();

      expect(text).toContain('"id";"code";"duration";"transitionTime"');
      expect(text).toContain('"snap-1";');
    });

    it('should handle CSV export without snapshots', async () => {
      const dataWithoutSnapshots = {
        ...sampleProjectData,
        document: {
          ...sampleProjectData.document,
          snapshots: [],
        },
      };

      const options: ExportOptions = {
        format: ImportExportFormat.CSV,
        dataType: DataType.SNAPSHOTS,
        includeMetadata: false,
        compression: false,
      };

      await expect(
        exporter.export(dataWithoutSnapshots, options),
      ).rejects.toThrow('No snapshots to export as CSV');
    });

    it('should properly escape CSV values with quotes and commas', async () => {
      const dataWithSpecialChars = {
        ...sampleProjectData,
        document: {
          ...sampleProjectData.document,
          snapshots: [
            {
              id: 'snap-1',
              code: 'const obj = { "key": "value, with comma" };',
              duration: 1000,
              transitionTime: 500,
            },
          ],
        },
      };

      const options: ExportOptions = {
        format: ImportExportFormat.CSV,
        dataType: DataType.SNAPSHOTS,
        includeMetadata: false,
        compression: false,
        csvOptions: {
          delimiter: ',',
          includeHeader: true,
          encoding: 'utf-8',
          quoteStrings: true,
          dateFormat: 'ISO',
        },
      };

      const result = await exporter.export(dataWithSpecialChars, options);
      const text = await result.blob.text();

      expect(text).toContain(
        '"const obj = { ""key"": ""value, with comma"" };"',
      );
    });
  });

  describe('XML Export', () => {
    it('should export project as XML with pretty printing', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.XML,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
        xmlOptions: {
          rootElement: 'project',
          prettyPrint: true,
          includeSchema: false,
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();

      expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(text).toContain('<project>');
      expect(text).toContain('<metadata>');
      expect(text).toContain('<document>');
      expect(text).toContain('<snapshots>');
      expect(text).toContain('<snapshot>');
      expect(text).toContain('<![CDATA[console.log("Hello, World!");]]>');
      expect(text).toContain('</project>');
    });

    it('should use custom root element', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.XML,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
        xmlOptions: {
          rootElement: 'diffani-project',
          prettyPrint: true,
          includeSchema: false,
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();

      expect(text).toContain('<diffani-project>');
      expect(text).toContain('</diffani-project>');
    });

    it('should export without pretty printing', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.XML,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
        xmlOptions: {
          rootElement: 'project',
          prettyPrint: false,
          includeSchema: false,
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();

      // Should not contain newlines between elements
      expect(text).not.toMatch(/<\/\w+>\s*\n\s*<\w+>/);
    });

    it('should properly escape XML content', async () => {
      const dataWithSpecialChars = {
        ...sampleProjectData,
        metadata: {
          ...sampleProjectData.metadata,
          name: 'Test & Project <with> "quotes"',
        },
        document: {
          ...sampleProjectData.document,
          snapshots: [
            {
              id: 'snap-1',
              code: 'const html = "<div>Hello & goodbye</div>";',
              duration: 1000,
              transitionTime: 500,
            },
          ],
        },
      };

      const options: ExportOptions = {
        format: ImportExportFormat.XML,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
      };

      const result = await exporter.export(dataWithSpecialChars, options);
      const text = await result.blob.text();

      expect(text).toContain(
        'Test &amp; Project &lt;with&gt; &quot;quotes&quot;',
      );
      expect(text).toContain(
        '<![CDATA[const html = "<div>Hello & goodbye</div>";]]>',
      );
    });
  });

  describe('ZIP Export', () => {
    it('should create ZIP archive with multiple formats', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.ZIP,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: true,
      };

      const result = await exporter.export(sampleProjectData, options);

      expect(result.success).toBe(true);
      expect(result.format).toBe(ImportExportFormat.ZIP);
      expect(result.filename).toMatch(/diffani-export-.*\.zip/);
      expect(result.blob.type).toBe('application/zip');
    });

    it('should include metadata file in ZIP', async () => {
      const JSZip = await import('jszip');
      const mockZip = {
        file: vi.fn(),
        generateAsync: vi
          .fn()
          .mockResolvedValue(
            new Blob(['zip content'], { type: 'application/zip' }),
          ),
      };

      vi.mocked(JSZip.default).mockImplementation(() => mockZip as any);

      const options: ExportOptions = {
        format: ImportExportFormat.ZIP,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: true,
      };

      await exporter.export(sampleProjectData, options);

      expect(mockZip.file).toHaveBeenCalledWith(
        'project.json',
        expect.any(String),
      );
      expect(mockZip.file).toHaveBeenCalledWith(
        'project.xml',
        expect.any(String),
      );
      expect(mockZip.file).toHaveBeenCalledWith(
        'snapshots.csv',
        expect.any(String),
      );
      expect(mockZip.file).toHaveBeenCalledWith(
        'metadata.json',
        expect.any(String),
      );
    });
  });

  describe('Field Selection', () => {
    it('should exclude metadata when not requested', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        includeMetadata: false,
        compression: false,
        fieldSelection: {
          metadata: {
            name: false,
            author: false,
          },
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();
      const parsed = JSON.parse(text);

      expect(parsed.metadata).toBeUndefined();
    });

    it('should exclude specific document fields', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
        fieldSelection: {
          document: {
            theme: false,
            padding: false,
          },
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();
      const parsed = JSON.parse(text);

      expect(parsed.document.theme).toBeUndefined();
      expect(parsed.document.padding).toBeUndefined();
      expect(parsed.document.language).toBeDefined();
      expect(parsed.document.snapshots).toBeDefined();
    });

    it('should exclude specific snapshot fields', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
        fieldSelection: {
          snapshots: {
            transitionTime: false,
            transitionConfig: false,
          },
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();
      const parsed = JSON.parse(text);

      expect(parsed.document.snapshots[0].transitionTime).toBeUndefined();
      expect(parsed.document.snapshots[0].id).toBeDefined();
      expect(parsed.document.snapshots[0].code).toBeDefined();
      expect(parsed.document.snapshots[0].duration).toBeDefined();
    });
  });

  describe('Filtering', () => {
    it('should filter snapshots by indices', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
        filters: {
          snapshotIndices: [0], // Only first snapshot
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();
      const parsed = JSON.parse(text);

      expect(parsed.document.snapshots).toHaveLength(1);
      expect(parsed.document.snapshots[0].id).toBe('snap-1');
    });

    it('should filter by date range', async () => {
      const futureDate = new Date('2025-01-01');
      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
        filters: {
          dateRange: {
            start: futureDate,
            end: new Date('2025-12-31'),
          },
        },
      };

      const result = await exporter.export(sampleProjectData, options);
      const text = await result.blob.text();
      const parsed = JSON.parse(text);

      // Project should be excluded due to date filter
      expect(Object.keys(parsed)).toHaveLength(2); // Only exportedAt and exportFormat
    });
  });

  describe('Progress Tracking', () => {
    it('should emit progress events during export', async () => {
      const progressUpdates: any[] = [];
      exporter.onProgress = (progress) => {
        progressUpdates.push(progress);
      };

      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
      };

      await exporter.export(sampleProjectData, options);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('initializing');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe(
        'completed',
      );
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle export cancellation', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
      };

      const abortController = new AbortController();
      abortController.abort();

      await expect(
        exporter.export(sampleProjectData, options, abortController.signal),
      ).rejects.toThrow('Export operation was cancelled');
    });

    it('should handle unsupported export format', async () => {
      const options: ExportOptions = {
        format: 'unsupported' as ImportExportFormat,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
      };

      await expect(exporter.export(sampleProjectData, options)).rejects.toThrow(
        'Unsupported export format',
      );
    });
  });

  describe('Statistics Generation', () => {
    it('should generate accurate export statistics', async () => {
      const options: ExportOptions = {
        format: ImportExportFormat.JSON,
        dataType: DataType.PROJECT,
        includeMetadata: true,
        compression: false,
      };

      const result = await exporter.export(sampleProjectData, options);

      expect(result.stats.totalItems).toBeGreaterThan(0);
      expect(result.stats.exportedItems).toBe(result.stats.totalItems);
      expect(result.stats.totalSize).toBe(result.blob.size);
      expect(result.stats.processingTime).toBeGreaterThan(0);
      expect(result.stats.itemsByType[DataType.PROJECT]).toBe(1);
      expect(result.stats.itemsByType[DataType.DOCUMENT]).toBe(1);
      expect(result.stats.itemsByType[DataType.SNAPSHOTS]).toBe(2);
    });
  });
});
