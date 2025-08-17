import { type RawDoc, type DocSnapshot } from '../doc/raw-doc';
import { Language } from '../code-languages/languages';
import {
  type ProjectData,
  type ProjectMetadata,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  DataType,
  MAX_FILE_SIZE,
  MAX_SNAPSHOTS,
} from './types';

/**
 * Comprehensive data validation for imported content
 * Validates structure, content, and business rules
 */
export class DataValidator {
  /**
   * Validate imported data based on type
   */
  async validate(data: unknown, dataType: DataType): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      switch (dataType) {
        case DataType.PROJECT:
          this.validateProject(data, errors, warnings);
          break;
        case DataType.DOCUMENT:
          this.validateDocument(data, errors, warnings);
          break;
        case DataType.SNAPSHOTS:
          this.validateSnapshots(data, errors, warnings);
          break;
        case DataType.THEMES:
          this.validateThemes(data, errors, warnings);
          break;
        case DataType.PRESETS:
          this.validatePresets(data, errors, warnings);
          break;
        case DataType.SETTINGS:
          this.validateSettings(data, errors, warnings);
          break;
        default:
          errors.push({
            field: 'dataType',
            message: `Unsupported data type: ${dataType}`,
          });
      }
    } catch (error) {
      errors.push({
        field: 'general',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate complete project data
   */
  private validateProject(data: unknown, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!this.isObject(data)) {
      errors.push({
        field: 'project',
        message: 'Project data must be an object',
        value: data,
        expectedType: 'object',
      });
      return;
    }

    const project = data as Partial<ProjectData>;

    // Validate metadata
    if (!project.metadata) {
      errors.push({
        field: 'metadata',
        message: 'Project metadata is required',
      });
    } else {
      this.validateMetadata(project.metadata, errors, warnings);
    }

    // Validate document
    if (!project.document) {
      errors.push({
        field: 'document',
        message: 'Project document is required',
      });
    } else {
      this.validateDocument(project.document, errors, warnings);
    }

    // Validate optional fields
    if (project.themes) {
      this.validateThemes(project.themes, errors, warnings);
    }

    if (project.presets) {
      this.validatePresets(project.presets, errors, warnings);
    }

    if (project.exportSettings) {
      this.validateSettings(project.exportSettings, errors, warnings);
    }

    // Validate version history if present
    if (project.versionHistory) {
      this.validateVersionHistory(project.versionHistory, errors, warnings);
    }
  }

  /**
   * Validate project metadata
   */
  private validateMetadata(metadata: unknown, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!this.isObject(metadata)) {
      errors.push({
        field: 'metadata',
        message: 'Metadata must be an object',
        value: metadata,
        expectedType: 'object',
      });
      return;
    }

    const meta = metadata as Partial<ProjectMetadata>;

    // Required fields
    const requiredFields = ['id', 'name', 'version', 'createdAt', 'updatedAt'];
    for (const field of requiredFields) {
      if (!meta[field as keyof ProjectMetadata]) {
        errors.push({
          field: `metadata.${field}`,
          message: `${field} is required`,
        });
      }
    }

    // Validate specific fields
    if (meta.id && typeof meta.id !== 'string') {
      errors.push({
        field: 'metadata.id',
        message: 'ID must be a string',
        value: meta.id,
        expectedType: 'string',
      });
    }

    if (meta.name && typeof meta.name !== 'string') {
      errors.push({
        field: 'metadata.name',
        message: 'Name must be a string',
        value: meta.name,
        expectedType: 'string',
      });
    }

    if (meta.version && typeof meta.version !== 'string') {
      errors.push({
        field: 'metadata.version',
        message: 'Version must be a string',
        value: meta.version,
        expectedType: 'string',
      });
    }

    // Validate dates
    if (meta.createdAt) {
      const createdAt = new Date(meta.createdAt);
      if (isNaN(createdAt.getTime())) {
        errors.push({
          field: 'metadata.createdAt',
          message: 'createdAt must be a valid date',
          value: meta.createdAt,
        });
      }
    }

    if (meta.updatedAt) {
      const updatedAt = new Date(meta.updatedAt);
      if (isNaN(updatedAt.getTime())) {
        errors.push({
          field: 'metadata.updatedAt',
          message: 'updatedAt must be a valid date',
          value: meta.updatedAt,
        });
      }
    }

    // Validate arrays
    if (meta.tags && !Array.isArray(meta.tags)) {
      errors.push({
        field: 'metadata.tags',
        message: 'Tags must be an array',
        value: meta.tags,
        expectedType: 'array',
      });
    } else if (meta.tags) {
      meta.tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push({
            field: `metadata.tags[${index}]`,
            message: 'Tag must be a string',
            value: tag,
            expectedType: 'string',
          });
        }
      });
    }

    // Validate numeric fields
    if (meta.fileSize !== undefined && (typeof meta.fileSize !== 'number' || meta.fileSize < 0)) {
      errors.push({
        field: 'metadata.fileSize',
        message: 'File size must be a non-negative number',
        value: meta.fileSize,
        expectedType: 'number',
      });
    }

    if (meta.snapshotCount !== undefined && (typeof meta.snapshotCount !== 'number' || meta.snapshotCount < 0)) {
      errors.push({
        field: 'metadata.snapshotCount',
        message: 'Snapshot count must be a non-negative number',
        value: meta.snapshotCount,
        expectedType: 'number',
      });
    }

    if (meta.totalDuration !== undefined && (typeof meta.totalDuration !== 'number' || meta.totalDuration < 0)) {
      errors.push({
        field: 'metadata.totalDuration',
        message: 'Total duration must be a non-negative number',
        value: meta.totalDuration,
        expectedType: 'number',
      });
    }

    // Business rule validations
    if (meta.fileSize && meta.fileSize > MAX_FILE_SIZE) {
      warnings.push({
        field: 'metadata.fileSize',
        message: `File size (${meta.fileSize}) exceeds recommended maximum (${MAX_FILE_SIZE})`,
        value: meta.fileSize,
        suggestion: 'Consider reducing file size or splitting into multiple files',
      });
    }

    if (meta.snapshotCount && meta.snapshotCount > MAX_SNAPSHOTS) {
      warnings.push({
        field: 'metadata.snapshotCount',
        message: `Snapshot count (${meta.snapshotCount}) exceeds recommended maximum (${MAX_SNAPSHOTS})`,
        value: meta.snapshotCount,
        suggestion: 'Consider reducing the number of snapshots for better performance',
      });
    }
  }

  /**
   * Validate document structure
   */
  private validateDocument(data: unknown, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!this.isObject(data)) {
      errors.push({
        field: 'document',
        message: 'Document must be an object',
        value: data,
        expectedType: 'object',
      });
      return;
    }

    const doc = data as Partial<RawDoc>;

    // Required fields
    const requiredFields = ['language', 'snapshots', 'fontSize', 'lineHeight', 'width', 'height', 'theme', 'padding'];
    for (const field of requiredFields) {
      if (doc[field as keyof RawDoc] === undefined) {
        errors.push({
          field: `document.${field}`,
          message: `${field} is required`,
        });
      }
    }

    // Validate language
    if (doc.language !== undefined) {
      if (typeof doc.language !== 'string') {
        errors.push({
          field: 'document.language',
          message: 'Language must be a string',
          value: doc.language,
          expectedType: 'string',
        });
      } else if (!Object.values(Language).includes(doc.language as Language)) {
        warnings.push({
          field: 'document.language',
          message: `Unknown language: ${doc.language}`,
          value: doc.language,
          suggestion: `Supported languages: ${Object.values(Language).join(', ')}`,
        });
      }
    }

    // Validate numeric fields
    const numericFields = ['fontSize', 'lineHeight', 'width', 'height'];
    for (const field of numericFields) {
      const value = doc[field as keyof RawDoc];
      if (value !== undefined && (typeof value !== 'number' || value <= 0)) {
        errors.push({
          field: `document.${field}`,
          message: `${field} must be a positive number`,
          value,
          expectedType: 'number',
        });
      }
    }

    // Validate theme
    if (doc.theme !== undefined && typeof doc.theme !== 'string') {
      errors.push({
        field: 'document.theme',
        message: 'Theme must be a string',
        value: doc.theme,
        expectedType: 'string',
      });
    }

    // Validate padding
    if (doc.padding) {
      this.validatePadding(doc.padding, errors, warnings);
    }

    // Validate snapshots
    if (doc.snapshots) {
      this.validateSnapshots(doc.snapshots, errors, warnings);
    }

    // Business rule validations
    if (doc.width && doc.height) {
      const aspectRatio = doc.width / doc.height;
      if (aspectRatio < 0.5 || aspectRatio > 3) {
        warnings.push({
          field: 'document.dimensions',
          message: `Unusual aspect ratio: ${aspectRatio.toFixed(2)}`,
          suggestion: 'Consider using standard video dimensions (16:9, 4:3, etc.)',
        });
      }
    }

    if (doc.fontSize && (doc.fontSize < 8 || doc.fontSize > 72)) {
      warnings.push({
        field: 'document.fontSize',
        message: `Font size ${doc.fontSize} may not be optimal for video`,
        value: doc.fontSize,
        suggestion: 'Recommended font size range: 12-48px',
      });
    }
  }

  /**
   * Validate snapshots array
   */
  private validateSnapshots(data: unknown, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!Array.isArray(data)) {
      errors.push({
        field: 'snapshots',
        message: 'Snapshots must be an array',
        value: data,
        expectedType: 'array',
      });
      return;
    }

    const snapshots = data as unknown[];

    if (snapshots.length === 0) {
      errors.push({
        field: 'snapshots',
        message: 'At least one snapshot is required',
      });
      return;
    }

    if (snapshots.length > MAX_SNAPSHOTS) {
      warnings.push({
        field: 'snapshots',
        message: `Too many snapshots (${snapshots.length}), may impact performance`,
        value: snapshots.length,
        suggestion: `Consider reducing to under ${MAX_SNAPSHOTS} snapshots`,
      });
    }

    snapshots.forEach((snapshot, index) => {
      this.validateSnapshot(snapshot, index, errors, warnings);
    });

    // Validate snapshot sequence
    this.validateSnapshotSequence(snapshots as DocSnapshot[], errors, warnings);
  }

  /**
   * Validate individual snapshot
   */
  private validateSnapshot(data: unknown, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!this.isObject(data)) {
      errors.push({
        field: `snapshots[${index}]`,
        message: 'Snapshot must be an object',
        value: data,
        expectedType: 'object',
      });
      return;
    }

    const snapshot = data as Partial<DocSnapshot>;

    // Required fields
    const requiredFields = ['id', 'code', 'duration', 'transitionTime'];
    for (const field of requiredFields) {
      if (snapshot[field as keyof DocSnapshot] === undefined) {
        errors.push({
          field: `snapshots[${index}].${field}`,
          message: `${field} is required`,
        });
      }
    }

    // Validate ID
    if (snapshot.id !== undefined && typeof snapshot.id !== 'string') {
      errors.push({
        field: `snapshots[${index}].id`,
        message: 'ID must be a string',
        value: snapshot.id,
        expectedType: 'string',
      });
    }

    // Validate code
    if (snapshot.code !== undefined && typeof snapshot.code !== 'string') {
      errors.push({
        field: `snapshots[${index}].code`,
        message: 'Code must be a string',
        value: snapshot.code,
        expectedType: 'string',
      });
    }

    // Validate timing
    if (snapshot.duration !== undefined) {
      if (typeof snapshot.duration !== 'number' || snapshot.duration <= 0) {
        errors.push({
          field: `snapshots[${index}].duration`,
          message: 'Duration must be a positive number',
          value: snapshot.duration,
          expectedType: 'number',
        });
      } else if (snapshot.duration > 60000) { // 1 minute
        warnings.push({
          field: `snapshots[${index}].duration`,
          message: `Long duration (${snapshot.duration}ms) for snapshot`,
          value: snapshot.duration,
          suggestion: 'Consider breaking long snapshots into smaller ones',
        });
      }
    }

    if (snapshot.transitionTime !== undefined) {
      if (typeof snapshot.transitionTime !== 'number' || snapshot.transitionTime < 0) {
        errors.push({
          field: `snapshots[${index}].transitionTime`,
          message: 'Transition time must be a non-negative number',
          value: snapshot.transitionTime,
          expectedType: 'number',
        });
      }
    }

    // Business rule: transition time should not exceed duration
    if (snapshot.duration && snapshot.transitionTime && snapshot.transitionTime > snapshot.duration) {
      errors.push({
        field: `snapshots[${index}].transitionTime`,
        message: 'Transition time cannot exceed duration',
        value: snapshot.transitionTime,
      });
    }

    // Validate code content
    if (snapshot.code) {
      this.validateCodeContent(snapshot.code, index, errors, warnings);
    }
  }

  /**
   * Validate snapshot sequence for consistency
   */
  private validateSnapshotSequence(snapshots: DocSnapshot[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    const ids = new Set<string>();
    let totalDuration = 0;

    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i];

      // Check for duplicate IDs
      if (snapshot.id) {
        if (ids.has(snapshot.id)) {
          errors.push({
            field: `snapshots[${i}].id`,
            message: `Duplicate snapshot ID: ${snapshot.id}`,
            value: snapshot.id,
          });
        } else {
          ids.add(snapshot.id);
        }
      }

      // Accumulate duration
      if (snapshot.duration) {
        totalDuration += snapshot.duration;
      }
    }

    // Warn about very long or very short total duration
    if (totalDuration > 300000) { // 5 minutes
      warnings.push({
        field: 'snapshots',
        message: `Very long total duration: ${totalDuration}ms`,
        value: totalDuration,
        suggestion: 'Consider breaking into multiple projects',
      });
    } else if (totalDuration < 1000) { // 1 second
      warnings.push({
        field: 'snapshots',
        message: `Very short total duration: ${totalDuration}ms`,
        value: totalDuration,
        suggestion: 'Consider increasing snapshot durations',
      });
    }
  }

  /**
   * Validate code content
   */
  private validateCodeContent(code: string, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Check for extremely long lines
    const lines = code.split('\n');
    const maxLineLength = 200;
    
    lines.forEach((line, lineIndex) => {
      if (line.length > maxLineLength) {
        warnings.push({
          field: `snapshots[${index}].code`,
          message: `Long line (${line.length} chars) at line ${lineIndex + 1}`,
          suggestion: 'Consider breaking long lines for better readability',
        });
      }
    });

    // Check for very large code blocks
    if (code.length > 10000) {
      warnings.push({
        field: `snapshots[${index}].code`,
        message: `Large code block (${code.length} chars)`,
        value: code.length,
        suggestion: 'Consider splitting large code blocks',
      });
    }

    // Check for empty code
    if (code.trim().length === 0) {
      warnings.push({
        field: `snapshots[${index}].code`,
        message: 'Empty code snapshot',
        suggestion: 'Consider removing empty snapshots or adding placeholder content',
      });
    }
  }

  /**
   * Validate padding object
   */
  private validatePadding(padding: unknown, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!this.isObject(padding)) {
      errors.push({
        field: 'document.padding',
        message: 'Padding must be an object',
        value: padding,
        expectedType: 'object',
      });
      return;
    }

    const pad = padding as any;
    const requiredFields = ['top', 'left', 'bottom'];
    
    for (const field of requiredFields) {
      if (pad[field] === undefined) {
        errors.push({
          field: `document.padding.${field}`,
          message: `${field} padding is required`,
        });
      } else if (typeof pad[field] !== 'number' || pad[field] < 0) {
        errors.push({
          field: `document.padding.${field}`,
          message: `${field} padding must be a non-negative number`,
          value: pad[field],
          expectedType: 'number',
        });
      }
    }
  }

  /**
   * Validate themes (placeholder - implement based on theme structure)
   */
  private validateThemes(data: unknown, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!Array.isArray(data)) {
      errors.push({
        field: 'themes',
        message: 'Themes must be an array',
        value: data,
        expectedType: 'array',
      });
      return;
    }

    // TODO: Implement theme validation based on CodeTheme interface
    warnings.push({
      field: 'themes',
      message: 'Theme validation not fully implemented',
      suggestion: 'Manual review recommended',
    });
  }

  /**
   * Validate presets (placeholder - implement based on preset structure)
   */
  private validatePresets(data: unknown, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!Array.isArray(data)) {
      errors.push({
        field: 'presets',
        message: 'Presets must be an array',
        value: data,
        expectedType: 'array',
      });
      return;
    }

    // TODO: Implement preset validation based on AnimationPreset interface
    warnings.push({
      field: 'presets',
      message: 'Preset validation not fully implemented',
      suggestion: 'Manual review recommended',
    });
  }

  /**
   * Validate settings (placeholder - implement based on settings structure)
   */
  private validateSettings(data: unknown, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!this.isObject(data)) {
      errors.push({
        field: 'settings',
        message: 'Settings must be an object',
        value: data,
        expectedType: 'object',
      });
      return;
    }

    // TODO: Implement settings validation based on ExportSettings interface
    warnings.push({
      field: 'settings',
      message: 'Settings validation not fully implemented',
      suggestion: 'Manual review recommended',
    });
  }

  /**
   * Validate version history
   */
  private validateVersionHistory(data: unknown, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!Array.isArray(data)) {
      errors.push({
        field: 'versionHistory',
        message: 'Version history must be an array',
        value: data,
        expectedType: 'array',
      });
      return;
    }

    // TODO: Implement version history validation
    warnings.push({
      field: 'versionHistory',
      message: 'Version history validation not fully implemented',
      suggestion: 'Manual review recommended',
    });
  }

  /**
   * Type guard for objects
   */
  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
