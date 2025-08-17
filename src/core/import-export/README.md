# Import/Export System

This directory contains the comprehensive import/export functionality for the diffani application, enabling users to import and export project data in multiple formats with advanced features like conflict resolution, data validation, and backup management.

## Architecture Overview

The import/export system is built with a modular architecture consisting of several key components:

### Core Components

- **ProjectImportExportManager**: Main orchestrator class that coordinates all import/export operations
- **DocumentImporter**: Handles importing project data from various file formats
- **DocumentExporter**: Handles exporting project data to various file formats
- **DataValidator**: Validates imported data for structure, content, and business rules
- **ConflictResolver**: Detects and resolves conflicts during import operations
- **BackupManager**: Manages backup creation, restoration, and cleanup

### Supported Formats

- **JSON**: Complete project data with metadata (primary format)
- **CSV**: Snapshot data in tabular format for analysis
- **XML**: Structured export for integration with other tools
- **ZIP**: Archive format containing multiple formats and assets

### Data Types

- **PROJECT**: Complete project including metadata, document, themes, presets
- **DOCUMENT**: Document structure with snapshots and settings
- **SNAPSHOTS**: Individual code snapshots only
- **THEMES**: Theme definitions
- **PRESETS**: Animation presets
- **SETTINGS**: Export and application settings

## Features

### Import Features

- **Multi-format Support**: Import from JSON, CSV, XML, and ZIP files
- **Data Validation**: Comprehensive validation of imported data structure and content
- **Conflict Resolution**: Multiple strategies for handling data conflicts
  - Interactive: User chooses resolution for each conflict
  - Overwrite: Replace existing data with imported data
  - Merge: Attempt to merge conflicting data
  - Skip: Keep existing data, skip imported data
  - Create New: Create new items with modified IDs
- **Import Preview**: Preview imported data before actual import
- **Batch Import**: Import multiple files at once
- **Progress Tracking**: Real-time progress updates with cancellation support
- **Error Handling**: Detailed error reporting and recovery options
- **Backup Creation**: Automatic backup before import operations

### Export Features

- **Multi-format Export**: Export to JSON, CSV, XML, and ZIP formats
- **Field Selection**: Choose which fields to include in export
- **Data Filtering**: Filter by date range, snapshot indices, content type
- **Compression**: Optional compression for smaller file sizes
- **Batch Export**: Export multiple projects simultaneously
- **Progress Tracking**: Real-time progress updates with cancellation
- **Export Templates**: Save and reuse export configurations

### Backup & Restore

- **Automatic Backups**: Created before import operations and updates
- **Manual Backups**: User-initiated backups with custom notes
- **Backup Rotation**: Automatic cleanup of old backups
- **Restore Functionality**: Restore from any available backup
- **Backup Validation**: Ensure backup integrity before restore

### Template System

- **Project Templates**: Create reusable project templates
- **Template Categories**: Organize templates by type and difficulty
- **Custom Templates**: Save current projects as templates
- **Template Marketplace**: Share and discover templates (future feature)

## Usage Examples

### Basic Import

```typescript
import { ProjectImportExportManager } from './project-manager';

const manager = new ProjectImportExportManager();

// Import a JSON file
const file = new File([jsonData], 'project.json', { type: 'application/json' });
const result = await manager.importProject(file, {
  format: ImportExportFormat.JSON,
  dataType: DataType.PROJECT,
  conflictResolution: ConflictResolutionStrategy.INTERACTIVE,
  validateData: true,
  createBackup: true,
});

if (result.success) {
  console.log(`Imported ${result.importedItems.length} items`);
} else {
  console.error('Import failed:', result.errors);
}
```

### Basic Export

```typescript
// Export current project as JSON
const result = await manager.exportProject(projectData, {
  format: ImportExportFormat.JSON,
  dataType: DataType.PROJECT,
  includeMetadata: true,
  compression: true,
});

if (result.success) {
  // Download the exported file
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  a.click();
}
```

### Advanced Import with Preview

```typescript
// Preview import before executing
const preview = await manager.previewImport(file, {
  format: ImportExportFormat.JSON,
  dataType: DataType.PROJECT,
});

if (preview.valid) {
  if (preview.conflicts.length > 0) {
    console.log(`Found ${preview.conflicts.length} conflicts`);
    // Handle conflicts...
  }
  
  // Proceed with import
  const result = await manager.importProject(file, options);
}
```

### Backup Management

```typescript
// Create manual backup
const backup = await manager.createBackup(projectData, 'manual');

// List available backups
const backups = await manager.listBackups();

// Restore from backup
const restoredData = await manager.restoreFromBackup(backup.id);
```

## State Management Integration

The import/export system integrates with Zustand state management through the `ImportExportSlice`:

```typescript
// Access import/export functionality through the store
const {
  importProject,
  exportProject,
  importHistory,
  exportHistory,
  backups,
} = useStore();

// Import a file
const result = await importProject(file, options);

// Export current project
const result = await exportProject(options);
```

## UI Components

### ImportPanel

A comprehensive UI component for file import operations:

- Drag-and-drop file selection
- Format detection and validation
- Advanced options configuration
- Import preview functionality
- Progress tracking
- Error handling and display

### Enhanced ExportPanel

Extended export panel with document export capabilities:

- Export type selection (video/document)
- Format-specific options
- Field selection interface
- Progress tracking
- Export history

### ProjectManager

Main UI component that combines all import/export functionality:

- Tabbed interface for different operations
- Import and export panels
- History tracking and management
- Backup management interface
- Template management (future)

## Configuration

### Default Import Options

```typescript
const DEFAULT_IMPORT_OPTIONS = {
  conflictResolution: ConflictResolutionStrategy.INTERACTIVE,
  validateData: true,
  createBackup: true,
  preserveIds: false,
};
```

### Default Export Options

```typescript
const DEFAULT_EXPORT_OPTIONS = {
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
```

## Error Handling

The system provides comprehensive error handling with different error types:

- **VALIDATION_ERROR**: Data structure or content validation failures
- **PARSING_ERROR**: File format parsing errors
- **FILE_ERROR**: File system or access errors
- **CONFLICT_ERROR**: Data conflict resolution failures
- **SYSTEM_ERROR**: General system or network errors

Each error includes:
- Error type classification
- Detailed error message
- Context information (file, field, etc.)
- Recovery suggestions
- Recoverable flag

## Performance Considerations

- **Streaming**: Large files are processed in chunks to avoid memory issues
- **Worker Threads**: Heavy processing operations use web workers when available
- **Progress Tracking**: Throttled progress updates to avoid UI blocking
- **Cancellation**: All operations support cancellation via AbortSignal
- **Compression**: Optional compression reduces file sizes and transfer times

## Security

- **Data Validation**: All imported data is validated before processing
- **File Type Validation**: Only supported file types are accepted
- **Size Limits**: Maximum file size limits prevent abuse
- **Sanitization**: User input is sanitized to prevent XSS attacks
- **Backup Encryption**: Sensitive backups can be encrypted (future feature)

## Testing

The system includes comprehensive tests covering:

- Unit tests for all core components
- Integration tests for complete workflows
- Error handling and edge cases
- Performance and memory usage
- UI component functionality

Run tests with:
```bash
npm test src/core/import-export
```

## Future Enhancements

- **Cloud Storage Integration**: Import/export from cloud services
- **Real-time Collaboration**: Multi-user import/export operations
- **Version Control**: Git-like versioning for projects
- **Plugin System**: Extensible format support
- **Advanced Analytics**: Import/export usage analytics
- **Template Marketplace**: Community template sharing
- **Automated Backups**: Scheduled backup creation
- **Data Encryption**: Secure backup and export options
