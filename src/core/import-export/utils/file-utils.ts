import { ImportExportFormat } from '../types';

/**
 * Utility functions for file handling in import/export operations
 */

/**
 * Detect file format based on file extension and content
 */
export function detectFileFormat(file: File): ImportExportFormat {
  const extension = getFileExtension(file.name).toLowerCase();

  switch (extension) {
    case 'json':
      return ImportExportFormat.JSON;
    case 'csv':
      return ImportExportFormat.CSV;
    case 'xml':
      return ImportExportFormat.XML;
    case 'zip':
      return ImportExportFormat.ZIP;
    default:
      // Try to detect based on content type
      if (file.type === 'application/json') {
        return ImportExportFormat.JSON;
      } else if (file.type === 'text/csv') {
        return ImportExportFormat.CSV;
      } else if (file.type === 'application/xml' || file.type === 'text/xml') {
        return ImportExportFormat.XML;
      } else if (file.type === 'application/zip') {
        return ImportExportFormat.ZIP;
      }

      // Default to JSON if unable to detect
      return ImportExportFormat.JSON;
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');

  // Handle files starting with dots (like .gitignore)
  if (lastDotIndex <= 0) {
    return '';
  }

  return filename.slice(lastDotIndex + 1);
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Read file as array buffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Create and download a blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Generate filename with timestamp
 */
export function generateTimestampedFilename(
  baseName: string,
  extension: string,
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Remove milliseconds

  return `${baseName}-${timestamp}.${extension}`;
}

/**
 * Validate filename
 */
export function validateFilename(filename: string): boolean {
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(filename)) {
    return false;
  }

  // Check length
  if (filename.length === 0 || filename.length > 255) {
    return false;
  }

  // Check for reserved names (Windows)
  const reservedNames = [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
  ];

  const nameWithoutExtension = filename.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExtension)) {
    return false;
  }

  return true;
}

/**
 * Sanitize filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  // Replace invalid characters with underscores
  let sanitized = filename.replace(/[<>:"/\\|?*]/g, '_');

  // Trim whitespace and dots from ends
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');

  // Ensure it's not empty
  if (sanitized.length === 0) {
    sanitized = 'untitled';
  }

  // Truncate if too long
  if (sanitized.length > 255) {
    const extension = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.slice(0, sanitized.lastIndexOf('.'));
    const maxNameLength = 255 - extension.length - 1; // -1 for the dot
    sanitized = nameWithoutExt.slice(0, maxNameLength) + '.' + extension;
  }

  return sanitized;
}

/**
 * Check if file is supported for import
 */
export function isSupportedImportFile(file: File): boolean {
  const supportedExtensions = ['json', 'csv', 'xml', 'zip'];
  const supportedMimeTypes = [
    'application/json',
    'text/csv',
    'application/xml',
    'text/xml',
    'application/zip',
  ];

  const extension = getFileExtension(file.name).toLowerCase();

  return (
    supportedExtensions.includes(extension) ||
    supportedMimeTypes.includes(file.type)
  );
}

/**
 * Get MIME type for export format
 */
export function getMimeTypeForFormat(format: ImportExportFormat): string {
  switch (format) {
    case ImportExportFormat.JSON:
      return 'application/json';
    case ImportExportFormat.CSV:
      return 'text/csv';
    case ImportExportFormat.XML:
      return 'application/xml';
    case ImportExportFormat.ZIP:
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Create a temporary file URL for preview
 */
export function createFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke file preview URL
 */
export function revokeFilePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Check if browser supports File API
 */
export function supportsFileAPI(): boolean {
  return !!(window.File && window.FileReader && window.FileList && window.Blob);
}

/**
 * Check if browser supports drag and drop
 */
export function supportsDragAndDrop(): boolean {
  const div = document.createElement('div');
  return 'draggable' in div || ('ondragstart' in div && 'ondrop' in div);
}

/**
 * Compress text using simple compression
 */
export function compressText(text: string): string {
  // Simple compression by removing extra whitespace while preserving line breaks
  return text
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Estimate compression ratio
 */
export function estimateCompressionRatio(
  originalSize: number,
  compressedSize: number,
): number {
  if (originalSize === 0) return 0;
  return (originalSize - compressedSize) / originalSize;
}

/**
 * Create a progress callback that throttles updates
 */
export function createThrottledProgressCallback(
  callback: (progress: number) => void,
  throttleMs: number = 100,
): (progress: number) => void {
  let lastUpdate = 0;

  return (progress: number) => {
    const now = Date.now();
    if (now - lastUpdate >= throttleMs || progress === 100) {
      callback(progress);
      lastUpdate = now;
    }
  };
}

/**
 * Batch process items with progress tracking
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  onProgress?: (current: number, total: number) => void,
  batchSize: number = 10,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map((item, batchIndex) =>
      processor(item, i + batchIndex),
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
  }

  return results;
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
