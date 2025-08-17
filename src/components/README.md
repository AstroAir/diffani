# Components Directory

This directory contains all React components for the Diffani application, organized by functionality.

## Directory Structure

```
src/components/
├── dashboard/          # Dashboard layout and panel components
├── editing/           # Animation editing and timeline components
├── panels/            # UI panels for different features
└── ui/               # Reusable UI components
```

## Dashboard Components

### DashboardLayout
Main layout component that manages the overall application structure with resizable panels.

### DashboardPanel
Reusable panel component with consistent styling and behavior.

## Editing Components

### EnhancedDragDropSnapshot (New!)
**Location**: `editing/EnhancedDragDropSnapshot.tsx`

Advanced drag-and-drop component for snapshot management with:
- Visual feedback during drag operations
- Multi-selection support with keyboard modifiers
- Snap-to-grid functionality for precise positioning
- Context menus for quick actions
- Full accessibility support with ARIA labels
- Keyboard navigation support

**Key Features**:
- Enhanced visual indicators
- Drop zones with visual feedback
- Batch operations on selected snapshots
- Real-time duration editing
- Progress indicators for each snapshot

### EnhancedTimeline (New!)
**Location**: `editing/EnhancedTimeline.tsx`

Professional timeline component for animation control with:
- Visual keyframe editing with drag-and-drop
- Timeline scrubbing with real-time preview
- Track management (add/remove animation tracks)
- Zoom controls for detailed editing
- Playback controls with frame-accurate positioning
- Timeline markers and regions

**Key Features**:
- Ruler with time markers
- Playhead with drag support
- Track-based organization
- Real-time preview integration
- Keyboard shortcuts for common operations

### KeyframeEditor (New!)
**Location**: `editing/KeyframeEditor.tsx`

Specialized editor for animation keyframes with:
- Property-specific control interfaces
- Visual curve representation
- Support for multiple property types
- Direct value editing with validation
- Easing function selection

**Supported Property Types**:
- Number (with range sliders)
- Color (with color picker)
- Position (X/Y coordinates)
- Scale (X/Y scaling factors)
- Rotation (degree values)
- Opacity (0-1 range)
- Boolean (checkbox)
- Text (string input)

### DragDropSnapshot (Legacy)
Original drag-and-drop component, maintained for compatibility.

## Panel Components

### AnimationPropertyPanel (New!)
**Location**: `panels/AnimationPropertyPanel.tsx`

Dedicated panel for managing animation properties with:
- Real-time property value editing
- Property creation wizard
- Property type selection
- Keyframe statistics and information
- Property presets and templates

**Features**:
- Live value updates with immediate feedback
- Property validation and constraints
- Batch property operations
- Property import/export capabilities

### VisualEffectsPanel (New!)
**Location**: `panels/VisualEffectsPanel.tsx`

Panel for configuring visual effects and transitions with:
- Pre-configured effect presets
- Custom effect configuration
- Real-time effect preview
- Advanced easing options
- Effect parameter fine-tuning

**Available Presets**:
- Smooth Fade
- Dynamic Slide
- Bouncy Scale
- Elegant Crossfade
- Dramatic Zoom

### SnapshotsPanel (Enhanced)
Updated to use the EnhancedDragDropSnapshot component with improved functionality.

### PropertiesPanel (Enhanced)
Extended with new sections for Animation and Effects panels.

### CodeEditorPanel
Code editor with syntax highlighting and diff visualization.

### PreviewPanel
Real-time animation preview with playback controls.

### ToolsPanel
Collection of animation tools and utilities.

## UI Components

### ErrorBoundary
React error boundary for graceful error handling.

### LoadingSpinner
Reusable loading indicator component.

### Toast
Toast notification system for user feedback.

### KeyboardShortcutsHelp
Help panel showing available keyboard shortcuts.

## Component Architecture

### Design Principles

1. **Single Responsibility**: Each component has a focused purpose
2. **Composition**: Components are designed to work together
3. **Accessibility**: All components support keyboard navigation and screen readers
4. **Performance**: Optimized rendering with React best practices
5. **Type Safety**: Full TypeScript support with proper interfaces

### State Management

Components integrate with the global Zustand store for:
- Animation state management
- Timeline synchronization
- Property value tracking
- User preferences

### Styling

All components use CSS Modules with SCSS for:
- Scoped styling to prevent conflicts
- Consistent design system
- Responsive design support
- Theme support (light/dark modes)

### Event Handling

Components follow consistent patterns for:
- User interactions (click, drag, keyboard)
- State updates through callbacks
- Error handling and validation
- Accessibility events

## Usage Examples

### Enhanced Drag-and-Drop

```tsx
import EnhancedDragDropSnapshot from './editing/EnhancedDragDropSnapshot';

<EnhancedDragDropSnapshot
  snapshots={snapshots}
  currentSnapshotIndex={currentIndex}
  selectedSnapshots={selectedSet}
  onSnapshotReorder={handleReorder}
  onSnapshotSelect={handleSelect}
  snapToGrid={true}
  enableMultiSelect={true}
  showDropZones={true}
/>
```

### Timeline Integration

```tsx
import EnhancedTimeline from './editing/EnhancedTimeline';

<EnhancedTimeline
  height={400}
  onTimeChange={handleTimeChange}
  onPlaybackStateChange={handlePlaybackChange}
  showKeyframeEditor={true}
  enableRealTimePreview={true}
/>
```

### Animation Properties

```tsx
import AnimationPropertyPanel from './panels/AnimationPropertyPanel';

<AnimationPropertyPanel
  selectedProperty={currentProperty}
  onPropertyUpdate={handlePropertyUpdate}
  onPropertyCreate={handlePropertyCreate}
  onPropertyDelete={handlePropertyDelete}
/>
```

## Testing

All components include:
- Unit tests with React Testing Library
- Accessibility tests with jest-axe
- Visual regression tests with Storybook
- Integration tests for complex interactions

## Performance Considerations

### Optimization Strategies

1. **React.memo**: Prevent unnecessary re-renders
2. **useCallback**: Memoize event handlers
3. **useMemo**: Cache expensive calculations
4. **Lazy Loading**: Load components only when needed
5. **Virtual Scrolling**: Handle large lists efficiently

### Memory Management

- Proper cleanup of event listeners
- Disposal of animation frames
- Cleanup of DOM references
- Garbage collection optimization

## Accessibility

All components support:
- Keyboard navigation
- Screen reader compatibility
- High contrast themes
- Focus management
- ARIA labels and descriptions

## Future Enhancements

### Planned Components

1. **ParticleEffectsPanel**: Advanced particle system controls
2. **ShaderEditor**: Custom WebGL shader editing
3. **AnimationTemplates**: Pre-built animation sequences
4. **CollaborationPanel**: Real-time collaboration features
5. **PerformanceMonitor**: Advanced performance monitoring

### Component Improvements

1. **Virtual Scrolling**: For large timeline data
2. **WebGL Acceleration**: Hardware-accelerated rendering
3. **Touch Support**: Enhanced mobile interactions
4. **Voice Control**: Accessibility through voice commands
5. **AI Assistance**: Smart animation suggestions

## Contributing

When adding new components:

1. Follow the established directory structure
2. Include comprehensive TypeScript interfaces
3. Add unit tests and accessibility tests
4. Document component props and usage
5. Follow the existing styling patterns
6. Ensure responsive design support

For detailed component APIs, see the individual component files and their TypeScript interfaces.
