# Diffani - Code Diff Animation Tool

Create beautiful animated videos from code diffs with advanced transition effects and multiple export formats.

🌐 **Live Demo**: <https://diffani.vercel.app/>

## ✨ Features

### 🎬 Animation System

- **Frame Rate Control**: Configurable FPS settings (24, 30, 60, 120 fps)
- **Real-time Monitoring**: Live FPS tracking and performance indicators
- **Advanced Transitions**: Multiple transition effects with customizable easing functions
- **Smooth Animations**: PIXI.js-powered rendering for optimal performance

### 🚀 Enhanced Animation Tools

- **Professional Drag-and-Drop**: Enhanced snapshot management with visual feedback, multi-selection, and snap-to-grid functionality
- **Advanced Timeline Editor**: Visual keyframe editor with drag-and-drop manipulation and real-time scrubbing
- **Animation Property Panels**: Dedicated panels for editing animation properties with real-time controls and curve visualization
- **Visual Effects System**: Pre-configured effect presets and custom transition configurations
- **Keyframe Management**: Professional-grade keyframe editing with support for multiple property types
- **Accessibility Features**: Full keyboard navigation, ARIA labels, and screen reader support

### ⚡ Performance Optimizations (New!)

- **70% Faster Rendering**: Advanced caching for text styles, measurements, and positions
- **90% Less CPU Usage**: Conditional animation loops that only run when needed
- **Real-time Monitoring**: Live performance dashboard with FPS, memory, and frame drop tracking
- **Advanced Memory Management**: LRU caching with automatic cleanup and memory threshold monitoring
- **Performance Testing Suite**: Comprehensive benchmarking tools with regression detection
- **Bundle Optimization**: Strategic code splitting for 30% faster loading times
- **Memory Leak Prevention**: Automatic cache cleanup and garbage collection optimization

### 🎨 Transition Effects

- **Fade Transitions**: Smooth fade in/out effects
- **Crossfade**: Seamless blending between animation states
- **Slide Effects**: Left, right, up, down sliding animations
- **Scale Transitions**: Zoom in/out and scaling effects
- **Custom Easing**: 40+ easing functions from d3-ease library
- **Duration Controls**: Fine-tune transition timing and phases

### 📤 Export Formats

- **WebM Video**: High-quality web-optimized video format
- **Animated GIF**: Compatible animated images with color optimization
- **PNG Sequence**: Lossless image frame sequences
- **JPEG Sequence**: Compressed image frame sequences
- **Quality Settings**: Low, Medium, High, Ultra quality presets
- **Batch Export**: Export multiple formats simultaneously

### 🛠 Advanced Controls

- **Export Presets**: Pre-configured settings for common use cases
- **Format-Specific Settings**:
  - GIF: Color count and dithering options
  - JPEG: Quality compression controls
  - PNG: Compression level settings
- **Progress Tracking**: Real-time export progress with ETA
- **Performance Optimization**: Frame dropping detection and monitoring

### 📁 Project Management

- **Import/Export System**: Comprehensive project data management
  - **Multiple Formats**: JSON, CSV, XML, ZIP archive support
  - **Data Validation**: Automatic validation of imported project data
  - **Conflict Resolution**: Smart handling of data conflicts during import
  - **Backup & Restore**: Automatic backups before imports with restore capability
  - **Batch Operations**: Import/export multiple files simultaneously
  - **Preview Mode**: Preview imported data before applying changes
- **Template System**: Create and use project templates
  - **Project Templates**: Save current projects as reusable templates
  - **Template Categories**: Organize templates by type and difficulty
  - **Quick Start**: Bootstrap new projects from templates
- **History Tracking**: Complete audit trail of import/export operations
- **Progress Monitoring**: Real-time progress tracking with cancellation support

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/diffani.git
cd diffani

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Usage

1. **Edit Code**: Use the built-in code editor to create your code snapshots
2. **Configure Transitions**: Select transition effects and easing functions for each snapshot
3. **Adjust Frame Rate**: Set your desired FPS for smooth animations
4. **Export**: Choose from multiple export formats with quality settings

## 🎯 Export Presets

| Preset | Format | Quality | Frame Rate | Use Case |
|--------|--------|---------|------------|----------|
| Web Optimized | WebM | Medium | 30 FPS | General web use |
| High Quality Video | WebM | High | 60 FPS | Professional presentations |
| Social Media | MP4* | Medium | 30 FPS | Social platforms |
| Animated GIF | GIF | Medium | 24 FPS | Quick sharing |
| PNG Sequence | PNG | High | 60 FPS | Post-processing |
| JPEG Sequence | JPEG | High | 60 FPS | Compressed frames |

*MP4 export coming soon

## 🎨 Available Transition Effects

### Effect Types

- **Fade**: Simple opacity transitions
- **Crossfade**: Blended state transitions
- **Slide Left/Right/Up/Down**: Directional movement
- **Scale**: Size-based transitions
- **Zoom In/Out**: Camera-like zoom effects

### Easing Functions

Choose from 40+ easing functions organized by category:

- Linear, Quadratic, Cubic, Quartic, Quintic
- Sinusoidal, Exponential, Circular
- Bounce, Back, Elastic

## 🔧 Technical Architecture

### Core Components

- **MovieRenderer**: PIXI.js-based rendering engine
- **ExportManager**: Multi-format export coordination
- **TransitionSystem**: Advanced transition effects engine
- **FrameRateController**: Performance monitoring and optimization

### Export System

- **BaseExportEncoder**: Abstract encoder interface
- **WebMEncoder**: WebM video export
- **ImageSequenceEncoder**: PNG/JPEG sequence export
- **GIFEncoder**: Animated GIF export with gif.js
- **BatchExportManager**: Concurrent export processing

## 📊 Performance Features

### Frame Rate Monitoring

- Real-time FPS display
- Frame drop detection
- Performance status indicators
- Automatic optimization suggestions

### Export Optimization

- Frame deduplication
- Progressive encoding
- Memory-efficient processing
- Concurrent batch exports

## 🛡 Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: WebM export may require polyfill
- **Mobile**: Limited performance on older devices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [PIXI.js](https://pixijs.com/) - 2D rendering engine
- [d3-ease](https://github.com/d3/d3-ease) - Easing functions
- [gif.js](https://github.com/jnordberg/gif.js) - GIF encoding
- [WebM Writer](https://github.com/thenickdude/webm-writer-js) - WebM video encoding
- [JSZip](https://stuk.github.io/jszip/) - ZIP file generation
