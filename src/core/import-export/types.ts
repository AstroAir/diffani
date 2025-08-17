import { type RawDoc, type DocSnapshot } from '../doc/raw-doc';
import { type AnimationPreset } from '../presets/types';
import { type CodeTheme } from '../themes/types';
import { type ExportSettings } from '../export/types';

// ============================================================================
// Import/Export Format Types
// ============================================================================

export enum ImportExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
  ZIP = 'zip',
}

export enum DataType {
  PROJECT = 'project',
  DOCUMENT = 'document',
  SNAPSHOTS = 'snapshots',
  THEMES = 'themes',
  PRESETS = 'presets',
  SETTINGS = 'settings',
}

// ============================================================================
// Project Data Structure
// ============================================================================

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  category?: string;
  license?: string;

  // Technical metadata
  diffaniVersion: string;
  fileSize: number;
  snapshotCount: number;
  totalDuration: number;

  // Custom metadata
  customFields?: Record<string, unknown>;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  document: RawDoc;
  themes?: CodeTheme[];
  presets?: AnimationPreset[];
  exportSettings?: ExportSettings;

  // Version control info
  versionHistory?: ProjectVersion[];

  // Backup info
  backupInfo?: BackupInfo;
}

export interface ProjectVersion {
  id: string;
  version: string;
  timestamp: Date;
  author?: string;
  message?: string;
  changes: string[];
}

export interface BackupInfo {
  createdAt: Date;
  originalPath?: string;
  backupReason: BackupReason;
  restorable: boolean;
}

export enum BackupReason {
  BEFORE_IMPORT = 'before_import',
  MANUAL = 'manual',
  AUTO = 'auto',
  BEFORE_UPDATE = 'before_update',
}

// ============================================================================
// Import Types
// ============================================================================

export interface ImportOptions {
  format: ImportExportFormat;
  dataType: DataType;
  conflictResolution: ConflictResolutionStrategy;
  validateData: boolean;
  createBackup: boolean;
  preserveIds: boolean;

  // Import filters
  filters?: ImportFilters;

  // Custom options per format
  csvOptions?: CSVImportOptions;
  xmlOptions?: XMLImportOptions;
}

export interface ImportFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  snapshotIndices?: number[];
  includeThemes?: boolean;
  includePresets?: boolean;
  includeSettings?: boolean;

  // Content filters
  languageFilter?: string[];
  tagFilter?: string[];
  authorFilter?: string[];
}

export interface CSVImportOptions {
  delimiter: string;
  hasHeader: boolean;
  encoding: string;
  skipEmptyLines: boolean;

  // Column mapping
  columnMapping: {
    code: string;
    duration: string;
    transitionTime: string;
    id?: string;
  };
}

export interface XMLImportOptions {
  rootElement: string;
  namespaces?: Record<string, string>;
  validateSchema: boolean;
  schemaUrl?: string;
}

export enum ConflictResolutionStrategy {
  OVERWRITE = 'overwrite',
  MERGE = 'merge',
  SKIP = 'skip',
  INTERACTIVE = 'interactive',
  CREATE_NEW = 'create_new',
}

export interface ImportProgress {
  current: number;
  total: number;
  percentage: number;
  stage: ImportStage;
  message: string;
  estimatedTimeRemaining?: number;

  // Detailed progress
  stageProgress?: {
    [key in ImportStage]?: {
      completed: boolean;
      progress: number;
      message?: string;
    };
  };
}

export enum ImportStage {
  INITIALIZING = 'initializing',
  READING_FILE = 'reading_file',
  PARSING_DATA = 'parsing_data',
  VALIDATING = 'validating',
  DETECTING_CONFLICTS = 'detecting_conflicts',
  RESOLVING_CONFLICTS = 'resolving_conflicts',
  CREATING_BACKUP = 'creating_backup',
  IMPORTING = 'importing',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
}

export interface ImportResult {
  success: boolean;
  importedItems: ImportedItem[];
  skippedItems: SkippedItem[];
  errors: ImportError[];
  warnings: ImportWarning[];

  // Statistics
  stats: ImportStats;

  // Backup info
  backupCreated?: BackupInfo;

  // Time tracking
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface ImportedItem {
  type: DataType;
  id: string;
  name?: string;
  action: ImportAction;
  originalData?: unknown;
  importedData: unknown;
}

export interface SkippedItem {
  type: DataType;
  id: string;
  name?: string;
  reason: string;
  originalData: unknown;
}

export interface ImportError {
  type: ErrorType;
  message: string;
  details?: string;
  item?: {
    type: DataType;
    id: string;
    name?: string;
  };
  recoverable: boolean;
}

export interface ImportWarning {
  type: WarningType;
  message: string;
  details?: string;
  item?: {
    type: DataType;
    id: string;
    name?: string;
  };
}

export enum ImportAction {
  CREATED = 'created',
  UPDATED = 'updated',
  MERGED = 'merged',
  REPLACED = 'replaced',
}

export enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  PARSING_ERROR = 'parsing_error',
  FILE_ERROR = 'file_error',
  CONFLICT_ERROR = 'conflict_error',
  SYSTEM_ERROR = 'system_error',
}

export enum WarningType {
  DATA_LOSS = 'data_loss',
  COMPATIBILITY = 'compatibility',
  PERFORMANCE = 'performance',
  DEPRECATED = 'deprecated',
}

export interface ImportStats {
  totalItems: number;
  importedItems: number;
  skippedItems: number;
  errorCount: number;
  warningCount: number;

  // By type
  itemsByType: Record<DataType, number>;

  // Performance
  processingTime: number;
  averageItemTime: number;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportOptions {
  format: ImportExportFormat;
  dataType: DataType;
  includeMetadata: boolean;
  compression: boolean;

  // Export filters
  filters?: ExportFilters;

  // Field selection
  fieldSelection?: FieldSelection;

  // Format-specific options
  csvOptions?: CSVExportOptions;
  xmlOptions?: XMLExportOptions;
  jsonOptions?: JSONExportOptions;
}

export interface ExportFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  snapshotIndices?: number[];
  includeThemes?: boolean;
  includePresets?: boolean;
  includeSettings?: boolean;

  // Content filters
  languageFilter?: string[];
  tagFilter?: string[];
  authorFilter?: string[];
}

export interface FieldSelection {
  document?: DocumentFieldSelection;
  snapshots?: SnapshotFieldSelection;
  metadata?: MetadataFieldSelection;
}

export interface DocumentFieldSelection {
  language?: boolean;
  fontSize?: boolean;
  lineHeight?: boolean;
  width?: boolean;
  height?: boolean;
  theme?: boolean;
  padding?: boolean;
  snapshots?: boolean;
}

export interface SnapshotFieldSelection {
  id?: boolean;
  code?: boolean;
  duration?: boolean;
  transitionTime?: boolean;
  transitionConfig?: boolean;
}

export interface MetadataFieldSelection {
  name?: boolean;
  description?: boolean;
  author?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
  tags?: boolean;
  customFields?: boolean;
}

export interface CSVExportOptions {
  delimiter: string;
  includeHeader: boolean;
  encoding: string;
  quoteStrings: boolean;

  // Formatting
  dateFormat: string;
  numberFormat?: string;
}

export interface XMLExportOptions {
  rootElement: string;
  namespaces?: Record<string, string>;
  prettyPrint: boolean;
  includeSchema: boolean;
  schemaUrl?: string;
}

export interface JSONExportOptions {
  prettyPrint: boolean;
  includeComments: boolean;
  sortKeys: boolean;

  // Compression
  minify: boolean;
}

export interface ExportProgress {
  current: number;
  total: number;
  percentage: number;
  stage: ExportStage;
  message: string;
  estimatedTimeRemaining?: number;
}

export enum ExportStage {
  INITIALIZING = 'initializing',
  COLLECTING_DATA = 'collecting_data',
  FILTERING = 'filtering',
  FORMATTING = 'formatting',
  COMPRESSING = 'compressing',
  GENERATING_FILE = 'generating_file',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
}

export interface ExportResult {
  success: boolean;
  blob: Blob;
  filename: string;
  format: ImportExportFormat;
  size: number;

  // Statistics
  stats: ExportStats;

  // Time tracking
  startTime: Date;
  endTime: Date;
  duration: number;

  // Metadata
  exportedItems: ExportedItem[];
  warnings: ExportWarning[];
}

export interface ExportedItem {
  type: DataType;
  id: string;
  name?: string;
  size: number;
}

export interface ExportWarning {
  type: WarningType;
  message: string;
  details?: string;
}

export interface ExportStats {
  totalItems: number;
  exportedItems: number;
  totalSize: number;
  compressionRatio?: number;

  // By type
  itemsByType: Record<DataType, number>;

  // Performance
  processingTime: number;
  averageItemTime: number;
}

// ============================================================================
// Conflict Resolution Types
// ============================================================================

export interface ConflictItem {
  id: string;
  type: DataType;
  conflictType: ConflictType;
  existingItem: unknown;
  incomingItem: unknown;

  // Conflict details
  differences: ConflictDifference[];

  // Resolution
  resolution?: ConflictResolution;
  resolved: boolean;
}

export enum ConflictType {
  ID_COLLISION = 'id_collision',
  NAME_COLLISION = 'name_collision',
  DATA_MISMATCH = 'data_mismatch',
  VERSION_CONFLICT = 'version_conflict',
  DEPENDENCY_CONFLICT = 'dependency_conflict',
}

export interface ConflictDifference {
  field: string;
  existingValue: unknown;
  incomingValue: unknown;
  type: DifferenceType;
}

export enum DifferenceType {
  VALUE_CHANGE = 'value_change',
  TYPE_CHANGE = 'type_change',
  ADDITION = 'addition',
  DELETION = 'deletion',
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  action: ResolutionAction;
  mergedData?: unknown;
  notes?: string;
}

export enum ResolutionAction {
  KEEP_EXISTING = 'keep_existing',
  USE_INCOMING = 'use_incoming',
  MERGE_DATA = 'merge_data',
  CREATE_COPY = 'create_copy',
  SKIP_ITEM = 'skip_item',
}

// ============================================================================
// Template Types
// ============================================================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  author: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;

  // Template data
  templateData: Partial<ProjectData>;

  // Template metadata
  tags: string[];
  difficulty: TemplateDifficulty;
  estimatedTime: number; // in minutes

  // Usage stats
  usageCount: number;
  rating: number;
  ratingCount: number;

  // Template settings
  customizable: boolean;
  requiredFields: string[];
  optionalFields: string[];
}

export enum TemplateCategory {
  TUTORIAL = 'tutorial',
  PRESENTATION = 'presentation',
  DEMO = 'demo',
  EDUCATIONAL = 'educational',
  BUSINESS = 'business',
  ENTERTAINMENT = 'entertainment',
  CUSTOM = 'custom',
}

export enum TemplateDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

// ============================================================================
// History and Backup Types
// ============================================================================

export interface ImportHistoryItem {
  id: string;
  timestamp: Date;
  filename: string;
  format: ImportExportFormat;
  dataType: DataType;
  result: ImportResult;
  options: ImportOptions;
}

export interface ExportHistoryItem {
  id: string;
  timestamp: Date;
  filename: string;
  format: ImportExportFormat;
  dataType: DataType;
  result: ExportResult;
  options: ExportOptions;
}

export interface BackupItem {
  id: string;
  timestamp: Date;
  reason: BackupReason;
  data: ProjectData;
  size: number;
  compressed: boolean;
  restorable: boolean;

  // Metadata
  originalFilename?: string;
  notes?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  expectedType?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: unknown;
  suggestion?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const SUPPORTED_IMPORT_FORMATS = [
  ImportExportFormat.JSON,
  ImportExportFormat.CSV,
  ImportExportFormat.XML,
  ImportExportFormat.ZIP,
] as const;

export const SUPPORTED_EXPORT_FORMATS = [
  ImportExportFormat.JSON,
  ImportExportFormat.CSV,
  ImportExportFormat.XML,
  ImportExportFormat.ZIP,
] as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_SNAPSHOTS = 10000;
export const MAX_BACKUP_COUNT = 50;
export const BACKUP_RETENTION_DAYS = 30;

export const DEFAULT_IMPORT_OPTIONS: Partial<ImportOptions> = {
  conflictResolution: ConflictResolutionStrategy.INTERACTIVE,
  validateData: true,
  createBackup: true,
  preserveIds: false,
};

export const DEFAULT_EXPORT_OPTIONS: Partial<ExportOptions> = {
  includeMetadata: true,
  compression: true,
  csvOptions: {
    delimiter: ',',
    includeHeader: true,
    encoding: 'utf-8',
    quoteStrings: true,
    dateFormat: 'ISO',
  },
  xmlOptions: {
    rootElement: 'project',
    prettyPrint: true,
    includeSchema: false,
  },
  jsonOptions: {
    prettyPrint: true,
    includeComments: false,
    sortKeys: false,
    minify: false,
  },
};
