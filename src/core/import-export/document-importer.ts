import JSZip from 'jszip';
import { DataValidator } from './data-validator';
import { ConflictResolver } from './conflict-resolver';
import {
  type ProjectData,
  type ImportOptions,
  type ImportResult,
  type ImportProgress,
  type ImportedItem,
  type SkippedItem,
  type ImportError,
  type ImportWarning,
  type ImportStats,
  ImportExportFormat,
  DataType,
  ImportStage,
  ImportAction,
  ErrorType,
  WarningType,
  ConflictResolutionStrategy,
  DEFAULT_IMPORT_OPTIONS,
} from './types';

/**
 * Document importer handles importing project data from various formats
 */
export class DocumentImporter {
  private dataValidator: DataValidator;
  private conflictResolver: ConflictResolver;
  
  public onProgress?: (progress: ImportProgress) => void;

  constructor() {
    this.dataValidator = new DataValidator();
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * Import project data from file
   */
  async import(
    file: File,
    options: ImportOptions,
    signal?: AbortSignal,
  ): Promise<ImportResult> {
    const startTime = new Date();
    const finalOptions = { ...DEFAULT_IMPORT_OPTIONS, ...options };
    
    const result: ImportResult = {
      success: false,
      importedItems: [],
      skippedItems: [],
      errors: [],
      warnings: [],
      stats: {
        totalItems: 0,
        importedItems: 0,
        skippedItems: 0,
        errorCount: 0,
        warningCount: 0,
        itemsByType: {
          [DataType.PROJECT]: 0,
          [DataType.DOCUMENT]: 0,
          [DataType.SNAPSHOTS]: 0,
          [DataType.THEMES]: 0,
          [DataType.PRESETS]: 0,
          [DataType.SETTINGS]: 0,
        },
        processingTime: 0,
        averageItemTime: 0,
      },
      startTime,
      endTime: new Date(),
      duration: 0,
    };

    try {
      // Initialize
      this.updateProgress(0, 100, ImportStage.INITIALIZING, 'Starting import...');
      this.checkAborted(signal);

      // Read file
      this.updateProgress(10, 100, ImportStage.READING_FILE, 'Reading file...');
      const fileContent = await this.readFile(file);
      this.checkAborted(signal);

      // Parse data
      this.updateProgress(20, 100, ImportStage.PARSING_DATA, 'Parsing data...');
      const parsedData = await this.parseFile(file, finalOptions.format);
      this.checkAborted(signal);

      // Validate data
      this.updateProgress(40, 100, ImportStage.VALIDATING, 'Validating data...');
      const validationResult = await this.dataValidator.validate(parsedData, finalOptions.dataType);
      
      if (!validationResult.valid && finalOptions.validateData) {
        result.errors.push(...validationResult.errors.map(err => ({
          type: ErrorType.VALIDATION_ERROR,
          message: err.message,
          details: err.field,
          recoverable: false,
        })));
        
        if (result.errors.length > 0) {
          result.endTime = new Date();
          result.duration = result.endTime.getTime() - startTime.getTime();
          return result;
        }
      }

      result.warnings.push(...validationResult.warnings.map(warn => ({
        type: WarningType.COMPATIBILITY,
        message: warn.message,
        details: warn.field,
      })));

      this.checkAborted(signal);

      // Detect conflicts
      this.updateProgress(60, 100, ImportStage.DETECTING_CONFLICTS, 'Detecting conflicts...');
      const conflicts = await this.conflictResolver.detectConflicts(parsedData, finalOptions);
      this.checkAborted(signal);

      // Resolve conflicts
      if (conflicts.length > 0) {
        this.updateProgress(70, 100, ImportStage.RESOLVING_CONFLICTS, 'Resolving conflicts...');
        const resolvedData = await this.conflictResolver.resolveConflicts(
          conflicts,
          finalOptions.conflictResolution,
        );
        this.checkAborted(signal);
      }

      // Import data
      this.updateProgress(90, 100, ImportStage.IMPORTING, 'Importing data...');
      await this.importData(parsedData, finalOptions, result);
      this.checkAborted(signal);

      // Finalize
      this.updateProgress(100, 100, ImportStage.COMPLETED, 'Import completed');
      result.success = true;

    } catch (error) {
      result.errors.push({
        type: ErrorType.SYSTEM_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false,
      });
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - startTime.getTime();
    result.stats.processingTime = result.duration;
    result.stats.errorCount = result.errors.length;
    result.stats.warningCount = result.warnings.length;
    
    if (result.stats.totalItems > 0) {
      result.stats.averageItemTime = result.duration / result.stats.totalItems;
    }

    return result;
  }

  /**
   * Parse file content based on format
   */
  async parseFile(file: File, format: ImportExportFormat): Promise<Partial<ProjectData>> {
    const content = await this.readFile(file);

    switch (format) {
      case ImportExportFormat.JSON:
        return this.parseJSON(content);
      case ImportExportFormat.CSV:
        return this.parseCSV(content);
      case ImportExportFormat.XML:
        return this.parseXML(content);
      case ImportExportFormat.ZIP:
        return this.parseZIP(file);
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  /**
   * Read file content as text
   */
  private async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse JSON content
   */
  private parseJSON(content: string): Partial<ProjectData> {
    try {
      const data = JSON.parse(content);
      
      // Handle different JSON structures
      if (data.exportFormat === 'diffani-project-v1') {
        // Standard project export format
        return {
          metadata: data.metadata,
          document: data.document,
          themes: data.themes,
          presets: data.presets,
          exportSettings: data.exportSettings,
          versionHistory: data.versionHistory,
        };
      } else if (data.language && data.snapshots) {
        // Direct RawDoc format
        return {
          document: data,
        };
      } else if (Array.isArray(data)) {
        // Array of snapshots
        return {
          document: {
            language: 'javascript', // Default language
            snapshots: data,
            fontSize: 14,
            lineHeight: 20,
            width: 800,
            height: 600,
            theme: 'default',
            padding: { top: 10, left: 10, bottom: 10 },
          } as any,
        };
      }
      
      return data;
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }

  /**
   * Parse CSV content (snapshots only)
   */
  private parseCSV(content: string): Partial<ProjectData> {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('Empty CSV file');
    }

    // Detect if first line is header
    const firstLine = lines[0];
    const hasHeader = firstLine.toLowerCase().includes('id') || 
                     firstLine.toLowerCase().includes('code') ||
                     firstLine.toLowerCase().includes('duration');

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const snapshots = dataLines.map((line, index) => {
      const cells = this.parseCSVLine(line);
      
      if (cells.length < 3) {
        throw new Error(`Invalid CSV format at line ${index + (hasHeader ? 2 : 1)}: insufficient columns`);
      }

      return {
        id: cells[0] || `snapshot-${index}`,
        code: cells[1] || '',
        duration: parseInt(cells[2]) || 1000,
        transitionTime: parseInt(cells[3]) || 500,
      };
    });

    return {
      document: {
        language: 'javascript', // Default language
        snapshots,
        fontSize: 14,
        lineHeight: 20,
        width: 800,
        height: 600,
        theme: 'default',
        padding: { top: 10, left: 10, bottom: 10 },
      } as any,
    };
  }

  /**
   * Parse XML content
   */
  private parseXML(content: string): Partial<ProjectData> {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'application/xml');
      
      if (doc.documentElement.nodeName === 'parsererror') {
        throw new Error('Invalid XML format');
      }

      const result: Partial<ProjectData> = {};

      // Parse metadata
      const metadataElement = doc.querySelector('metadata');
      if (metadataElement) {
        result.metadata = this.parseXMLElement(metadataElement) as any;
      }

      // Parse document
      const documentElement = doc.querySelector('document');
      if (documentElement) {
        const documentData = this.parseXMLElement(documentElement);
        
        // Parse snapshots separately
        const snapshotsElement = documentElement.querySelector('snapshots');
        if (snapshotsElement) {
          const snapshotElements = snapshotsElement.querySelectorAll('snapshot');
          documentData.snapshots = Array.from(snapshotElements).map(el => 
            this.parseXMLElement(el)
          );
        }
        
        result.document = documentData as any;
      }

      return result;
    } catch (error) {
      throw new Error(`XML parsing failed: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }

  /**
   * Parse ZIP archive
   */
  private async parseZIP(file: File): Promise<Partial<ProjectData>> {
    try {
      const zip = await JSZip.loadAsync(file);
      
      // Look for project.json first
      const projectFile = zip.file('project.json');
      if (projectFile) {
        const content = await projectFile.async('text');
        return this.parseJSON(content);
      }

      // Look for other supported files
      const jsonFiles = Object.keys(zip.files).filter(name => name.endsWith('.json'));
      if (jsonFiles.length > 0) {
        const content = await zip.file(jsonFiles[0])!.async('text');
        return this.parseJSON(content);
      }

      throw new Error('No supported files found in ZIP archive');
    } catch (error) {
      throw new Error(`ZIP parsing failed: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current);
    
    return result;
  }

  /**
   * Parse XML element to object
   */
  private parseXMLElement(element: Element): any {
    const result: any = {};
    
    // Parse attributes
    for (const attr of Array.from(element.attributes)) {
      result[attr.name] = attr.value;
    }
    
    // Parse child elements
    for (const child of Array.from(element.children)) {
      const tagName = child.tagName;
      const textContent = child.textContent?.trim();
      
      if (child.children.length > 0) {
        // Has child elements
        if (result[tagName]) {
          // Multiple elements with same name - convert to array
          if (!Array.isArray(result[tagName])) {
            result[tagName] = [result[tagName]];
          }
          result[tagName].push(this.parseXMLElement(child));
        } else {
          result[tagName] = this.parseXMLElement(child);
        }
      } else if (textContent) {
        // Text content only
        result[tagName] = this.parseXMLValue(textContent);
      }
    }
    
    return result;
  }

  /**
   * Parse XML text value to appropriate type
   */
  private parseXMLValue(value: string): any {
    // Try to parse as number
    if (/^\d+$/.test(value)) {
      return parseInt(value);
    }
    
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    
    // Try to parse as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Try to parse as JSON
    if ((value.startsWith('{') && value.endsWith('}')) || 
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch {
        // Fall through to string
      }
    }
    
    return value;
  }

  /**
   * Import parsed data into the application
   */
  private async importData(
    data: Partial<ProjectData>,
    options: ImportOptions,
    result: ImportResult,
  ): Promise<void> {
    // This would integrate with the application's state management
    // For now, we'll just track what would be imported
    
    if (data.metadata) {
      result.importedItems.push({
        type: DataType.PROJECT,
        id: data.metadata.id,
        name: data.metadata.name,
        action: ImportAction.CREATED,
        importedData: data.metadata,
      });
      result.stats.itemsByType[DataType.PROJECT]++;
      result.stats.totalItems++;
      result.stats.importedItems++;
    }

    if (data.document) {
      result.importedItems.push({
        type: DataType.DOCUMENT,
        id: 'document',
        name: 'Document',
        action: ImportAction.CREATED,
        importedData: data.document,
      });
      result.stats.itemsByType[DataType.DOCUMENT]++;
      result.stats.totalItems++;
      result.stats.importedItems++;

      if (data.document.snapshots) {
        result.stats.itemsByType[DataType.SNAPSHOTS] = data.document.snapshots.length;
        result.stats.totalItems += data.document.snapshots.length;
        result.stats.importedItems += data.document.snapshots.length;
      }
    }

    if (data.themes) {
      result.stats.itemsByType[DataType.THEMES] = data.themes.length;
      result.stats.totalItems += data.themes.length;
      result.stats.importedItems += data.themes.length;
    }

    if (data.presets) {
      result.stats.itemsByType[DataType.PRESETS] = data.presets.length;
      result.stats.totalItems += data.presets.length;
      result.stats.importedItems += data.presets.length;
    }

    if (data.exportSettings) {
      result.stats.itemsByType[DataType.SETTINGS]++;
      result.stats.totalItems++;
      result.stats.importedItems++;
    }
  }

  /**
   * Update import progress
   */
  private updateProgress(
    current: number,
    total: number,
    stage: ImportStage,
    message: string,
  ): void {
    if (this.onProgress) {
      this.onProgress({
        current,
        total,
        percentage: (current / total) * 100,
        stage,
        message,
      });
    }
  }

  /**
   * Check if operation was aborted
   */
  private checkAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new Error('Import operation was cancelled');
    }
  }
}
