import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  detectFileFormat,
  getFileExtension,
  validateFileSize,
  formatFileSize,
  readFileAsText,
  readFileAsArrayBuffer,
  downloadBlob,
  generateTimestampedFilename,
  validateFilename,
  sanitizeFilename,
  isSupportedImportFile,
  getMimeTypeForFormat,
  createFilePreviewUrl,
  revokeFilePreviewUrl,
  supportsFileAPI,
  supportsDragAndDrop,
  compressText,
  estimateCompressionRatio,
  createThrottledProgressCallback,
  batchProcess,
  retryWithBackoff,
} from '../utils/file-utils';
import { ImportExportFormat } from '../types';

// Mock URL methods
const mockCreateObjectURL = vi.fn(() => 'mock-url');
const mockRevokeObjectURL = vi.fn();
Object.defineProperty(window.URL, 'createObjectURL', {
  value: mockCreateObjectURL,
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
});

// Mock document methods
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();

Object.defineProperty(document, 'createElement', { value: mockCreateElement });
Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild });
Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild });

describe('File Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock element
    const mockElement = {
      href: '',
      download: '',
      style: { display: '' },
      click: mockClick,
    };
    mockCreateElement.mockReturnValue(mockElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectFileFormat', () => {
    it('should detect JSON format by extension', () => {
      const file = new File(['{}'], 'test.json', { type: 'text/plain' });
      expect(detectFileFormat(file)).toBe(ImportExportFormat.JSON);
    });

    it('should detect CSV format by extension', () => {
      const file = new File(['a,b,c'], 'test.csv', { type: 'text/plain' });
      expect(detectFileFormat(file)).toBe(ImportExportFormat.CSV);
    });

    it('should detect XML format by extension', () => {
      const file = new File(['<xml></xml>'], 'test.xml', {
        type: 'text/plain',
      });
      expect(detectFileFormat(file)).toBe(ImportExportFormat.XML);
    });

    it('should detect ZIP format by extension', () => {
      const file = new File(['zip content'], 'test.zip', {
        type: 'text/plain',
      });
      expect(detectFileFormat(file)).toBe(ImportExportFormat.ZIP);
    });

    it('should detect format by MIME type when extension is unknown', () => {
      const file = new File(['{}'], 'test.unknown', {
        type: 'application/json',
      });
      expect(detectFileFormat(file)).toBe(ImportExportFormat.JSON);
    });

    it('should default to JSON for unknown formats', () => {
      const file = new File(['content'], 'test.unknown', {
        type: 'text/plain',
      });
      expect(detectFileFormat(file)).toBe(ImportExportFormat.JSON);
    });

    it('should handle files without extensions', () => {
      const file = new File(['{}'], 'test', { type: 'application/json' });
      expect(detectFileFormat(file)).toBe(ImportExportFormat.JSON);
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('test.json')).toBe('json');
      expect(getFileExtension('path/to/file.csv')).toBe('csv');
      expect(getFileExtension('file.name.xml')).toBe('xml');
    });

    it('should handle files without extensions', () => {
      expect(getFileExtension('test')).toBe('');
      expect(getFileExtension('path/to/file')).toBe('');
    });

    it('should handle empty strings', () => {
      expect(getFileExtension('')).toBe('');
    });

    it('should handle files starting with dots', () => {
      expect(getFileExtension('.gitignore')).toBe('');
      expect(getFileExtension('.env.json')).toBe('json');
    });
  });

  describe('validateFileSize', () => {
    it('should validate file size within limit', () => {
      const file = new File(['small content'], 'test.txt');
      expect(validateFileSize(file, 1024)).toBe(true);
    });

    it('should reject file size exceeding limit', () => {
      const file = new File(['x'.repeat(2000)], 'test.txt');
      expect(validateFileSize(file, 1024)).toBe(false);
    });

    it('should handle exact size limit', () => {
      const content = 'x'.repeat(1024);
      const file = new File([content], 'test.txt');
      expect(validateFileSize(file, 1024)).toBe(true);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(512)).toBe('512.0 B');
      expect(formatFileSize(1023)).toBe('1023.0 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
    });

    it('should handle zero bytes', () => {
      expect(formatFileSize(0)).toBe('0.0 B');
    });
  });

  describe('readFileAsText', () => {
    it('should read file as text', async () => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      // Mock FileReader
      const mockFileReader = {
        readAsText: vi.fn(),
        result: 'test content',
        onload: null as any,
        onerror: null as any,
      };

      vi.spyOn(window, 'FileReader').mockImplementation(
        () => mockFileReader as any,
      );

      const promise = readFileAsText(file);

      // Simulate successful read
      mockFileReader.onload();

      const result = await promise;
      expect(result).toBe('test content');
      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file);
    });

    it('should handle file read errors', async () => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });

      const mockFileReader = {
        readAsText: vi.fn(),
        result: null,
        onload: null as any,
        onerror: null as any,
      };

      vi.spyOn(window, 'FileReader').mockImplementation(
        () => mockFileReader as any,
      );

      const promise = readFileAsText(file);

      // Simulate error
      mockFileReader.onerror();

      await expect(promise).rejects.toThrow('Failed to read file');
    });
  });

  describe('readFileAsArrayBuffer', () => {
    it('should read file as array buffer', async () => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      const mockBuffer = new ArrayBuffer(8);

      const mockFileReader = {
        readAsArrayBuffer: vi.fn(),
        result: mockBuffer,
        onload: null as any,
        onerror: null as any,
      };

      vi.spyOn(window, 'FileReader').mockImplementation(
        () => mockFileReader as any,
      );

      const promise = readFileAsArrayBuffer(file);

      // Simulate successful read
      mockFileReader.onload();

      const result = await promise;
      expect(result).toBe(mockBuffer);
      expect(mockFileReader.readAsArrayBuffer).toHaveBeenCalledWith(file);
    });
  });

  describe('downloadBlob', () => {
    it('should create download link and trigger download', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test.txt';

      downloadBlob(blob, filename);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });

    it('should clean up object URL after download', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test.txt';

      downloadBlob(blob, filename);

      // Check that cleanup is scheduled
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
  });

  describe('generateTimestampedFilename', () => {
    it('should generate filename with timestamp', () => {
      const baseName = 'export';
      const extension = 'json';

      const filename = generateTimestampedFilename(baseName, extension);

      expect(filename).toMatch(
        /^export-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/,
      );
    });

    it('should handle different base names and extensions', () => {
      const filename = generateTimestampedFilename('backup', 'zip');
      expect(filename).toMatch(
        /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.zip$/,
      );
    });
  });

  describe('validateFilename', () => {
    it('should validate valid filenames', () => {
      expect(validateFilename('test.txt')).toBe(true);
      expect(validateFilename('my-file_123.json')).toBe(true);
      expect(validateFilename('folder.name.ext')).toBe(true);
    });

    it('should reject filenames with invalid characters', () => {
      expect(validateFilename('test<file>.txt')).toBe(false);
      expect(validateFilename('test:file.txt')).toBe(false);
      expect(validateFilename('test"file".txt')).toBe(false);
      expect(validateFilename('test/file.txt')).toBe(false);
      expect(validateFilename('test\\file.txt')).toBe(false);
      expect(validateFilename('test|file.txt')).toBe(false);
      expect(validateFilename('test?file.txt')).toBe(false);
      expect(validateFilename('test*file.txt')).toBe(false);
    });

    it('should reject empty or too long filenames', () => {
      expect(validateFilename('')).toBe(false);
      expect(validateFilename('x'.repeat(256))).toBe(false);
    });

    it('should reject reserved Windows names', () => {
      expect(validateFilename('CON.txt')).toBe(false);
      expect(validateFilename('PRN.json')).toBe(false);
      expect(validateFilename('AUX.xml')).toBe(false);
      expect(validateFilename('NUL.csv')).toBe(false);
      expect(validateFilename('COM1.txt')).toBe(false);
      expect(validateFilename('LPT1.txt')).toBe(false);
    });

    it('should allow valid names that contain reserved words', () => {
      expect(validateFilename('CONSOLE.txt')).toBe(true);
      expect(validateFilename('myPRN.txt')).toBe(true);
    });
  });

  describe('sanitizeFilename', () => {
    it('should replace invalid characters with underscores', () => {
      expect(sanitizeFilename('test<file>.txt')).toBe('test_file_.txt');
      expect(sanitizeFilename('test:file|name.txt')).toBe('test_file_name.txt');
    });

    it('should trim whitespace and dots', () => {
      expect(sanitizeFilename('  test.txt  ')).toBe('test.txt');
      expect(sanitizeFilename('...test.txt...')).toBe('test.txt');
    });

    it('should handle empty results', () => {
      expect(sanitizeFilename('')).toBe('untitled');
      expect(sanitizeFilename('   ')).toBe('untitled');
      expect(sanitizeFilename('...')).toBe('untitled');
    });

    it('should truncate long filenames', () => {
      const longName = 'x'.repeat(300) + '.txt';
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith('.txt')).toBe(true);
    });
  });

  describe('isSupportedImportFile', () => {
    it('should support JSON files', () => {
      const file = new File(['{}'], 'test.json', { type: 'application/json' });
      expect(isSupportedImportFile(file)).toBe(true);
    });

    it('should support CSV files', () => {
      const file = new File(['a,b,c'], 'test.csv', { type: 'text/csv' });
      expect(isSupportedImportFile(file)).toBe(true);
    });

    it('should support XML files', () => {
      const file = new File(['<xml></xml>'], 'test.xml', {
        type: 'application/xml',
      });
      expect(isSupportedImportFile(file)).toBe(true);
    });

    it('should support ZIP files', () => {
      const file = new File(['zip'], 'test.zip', { type: 'application/zip' });
      expect(isSupportedImportFile(file)).toBe(true);
    });

    it('should reject unsupported files', () => {
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });
      expect(isSupportedImportFile(file)).toBe(false);
    });

    it('should support files by MIME type even with wrong extension', () => {
      const file = new File(['{}'], 'test.txt', { type: 'application/json' });
      expect(isSupportedImportFile(file)).toBe(true);
    });
  });

  describe('getMimeTypeForFormat', () => {
    it('should return correct MIME types', () => {
      expect(getMimeTypeForFormat(ImportExportFormat.JSON)).toBe(
        'application/json',
      );
      expect(getMimeTypeForFormat(ImportExportFormat.CSV)).toBe('text/csv');
      expect(getMimeTypeForFormat(ImportExportFormat.XML)).toBe(
        'application/xml',
      );
      expect(getMimeTypeForFormat(ImportExportFormat.ZIP)).toBe(
        'application/zip',
      );
    });

    it('should return default MIME type for unknown format', () => {
      expect(getMimeTypeForFormat('unknown' as ImportExportFormat)).toBe(
        'application/octet-stream',
      );
    });
  });

  describe('createFilePreviewUrl and revokeFilePreviewUrl', () => {
    it('should create and revoke preview URLs', () => {
      const file = new File(['content'], 'test.txt');

      const url = createFilePreviewUrl(file);
      expect(url).toBe('mock-url');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(file);

      revokeFilePreviewUrl(url);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(url);
    });
  });

  describe('supportsFileAPI', () => {
    it('should detect File API support', () => {
      // Mock File API objects
      (global as any).File = function () {};
      (global as any).FileReader = function () {};
      (global as any).FileList = function () {};
      (global as any).Blob = function () {};

      expect(supportsFileAPI()).toBe(true);
    });

    it('should detect lack of File API support', () => {
      const originalFile = (global as any).File;
      delete (global as any).File;

      expect(supportsFileAPI()).toBe(false);

      // Restore
      (global as any).File = originalFile;
    });
  });

  describe('supportsDragAndDrop', () => {
    it('should detect drag and drop support', () => {
      // Mock createElement to return element with draggable
      const mockDiv = { draggable: true };
      vi.spyOn(document, 'createElement').mockReturnValue(mockDiv as any);

      expect(supportsDragAndDrop()).toBe(true);
    });

    it('should detect drag and drop support via event handlers', () => {
      const mockDiv = { ondragstart: null, ondrop: null };
      vi.spyOn(document, 'createElement').mockReturnValue(mockDiv as any);

      expect(supportsDragAndDrop()).toBe(true);
    });

    it('should detect lack of drag and drop support', () => {
      const mockDiv = {};
      vi.spyOn(document, 'createElement').mockReturnValue(mockDiv as any);

      expect(supportsDragAndDrop()).toBe(false);
    });
  });

  describe('compressText', () => {
    it('should compress text by removing extra whitespace', () => {
      const text = '  hello    world  \n\n  test  \n  ';
      const compressed = compressText(text);
      expect(compressed).toBe('hello world\ntest');
    });

    it('should handle empty text', () => {
      expect(compressText('')).toBe('');
      expect(compressText('   \n  \n  ')).toBe('');
    });

    it('should preserve single spaces and newlines', () => {
      const text = 'hello world\ntest line';
      const compressed = compressText(text);
      expect(compressed).toBe('hello world\ntest line');
    });
  });

  describe('estimateCompressionRatio', () => {
    it('should calculate compression ratio', () => {
      expect(estimateCompressionRatio(1000, 500)).toBe(0.5);
      expect(estimateCompressionRatio(1000, 750)).toBe(0.25);
      expect(estimateCompressionRatio(1000, 1000)).toBe(0);
    });

    it('should handle zero original size', () => {
      expect(estimateCompressionRatio(0, 0)).toBe(0);
      expect(estimateCompressionRatio(0, 100)).toBe(0);
    });

    it('should handle negative compression (expansion)', () => {
      expect(estimateCompressionRatio(1000, 1200)).toBe(-0.2);
    });
  });

  describe('createThrottledProgressCallback', () => {
    it('should throttle progress updates', async () => {
      const callback = vi.fn();
      const throttled = createThrottledProgressCallback(callback, 50);

      // Call multiple times quickly
      throttled(10);
      throttled(20);
      throttled(30);

      // Should only call once initially
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(10);

      // Wait for throttle period
      await new Promise((resolve) => setTimeout(resolve, 60));
      throttled(40);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(40);
    });

    it('should always call for 100% progress', () => {
      const callback = vi.fn();
      const throttled = createThrottledProgressCallback(callback, 1000);

      throttled(50);
      throttled(100); // Should call immediately

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith(100);
    });
  });

  describe('batchProcess', () => {
    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const processor = vi
        .fn()
        .mockImplementation((item: number) => Promise.resolve(item * 2));
      const onProgress = vi.fn();

      const results = await batchProcess(items, processor, onProgress, 3);

      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
      expect(processor).toHaveBeenCalledTimes(10);
      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle empty array', async () => {
      const processor = vi.fn();
      const results = await batchProcess([], processor);

      expect(results).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });

    it('should handle processing errors', async () => {
      const items = [1, 2, 3];
      const processor = vi.fn().mockImplementation((item: number) => {
        if (item === 2) throw new Error('Processing error');
        return Promise.resolve(item * 2);
      });

      await expect(batchProcess(items, processor)).rejects.toThrow(
        'Processing error',
      );
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first try', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(retryWithBackoff(operation, 2, 10)).rejects.toThrow(
        'Always fails',
      );
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryWithBackoff(operation, 1, 100);
      const endTime = Date.now();

      // Should have waited at least the base delay
      expect(endTime - startTime).toBeGreaterThan(90);
    });
  });
});
