# Outside Map Studio

A modern, high-performance map style editor built on [MapLibre GL](https://maplibre.org/). Edit, compare, and manage map styles with live preview, version control via checkpoints, and workspace management—all in the browser.

**Live Demo:** https://outside.maps.app (coming soon)

---

## ✨ Key Features

### 🎨 **Visual Style Editor**
- Drag-and-drop layer management
- Real-time style preview with interactive map
- Color picker with live swatches
- Paint and layout property controls with validation
- Inspect mode to debug layer rendering

### 📸 **Checkpoint System (Timeline)**
- Save named snapshots of your style at key moments
- Preview any checkpoint without losing current work
- Side-by-side comparison of two checkpoints
- Semantic diff showing exactly what changed between versions
- Import/export checkpoints as JSON for sharing or backup

### 🗂️ **Workspace Management**
- Store unlimited styles in browser (IndexedDB, 50MB+ quota)
- Pin favorite styles for quick access
- Rename, duplicate, and delete styles
- See layer count and color swatches at a glance
- Auto-save metadata (when edited, creation date, etc.)

### 🔀 **Side-by-Side Comparison**
- Open two checkpoints simultaneously
- Synchronized pan and zoom
- Visual divider between maps
- Live coordinate and zoom level display
- Smooth performance during interaction

### 💡 **Developer-Friendly**
- Full keyboard shortcuts (O, S, J, D, C, T, W for main panels)
- Copy/paste map coordinates (zoom/lat/lng format)
- Code editor for direct JSON manipulation
- Global state inspection
- Support for data sources: raster, vector, GeoJSON, PMTiles

### 🌍 **Data Source Management**
- Add and configure raster tile sources
- Vector tile source configuration
- GeoJSON upload and editing
- PMTiles support for offline mapping
- Source layer inspection and debugging

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ (18+ recommended)
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/jonathanmaps/outside-map-studio.git
cd outside-map-studio

# Install dependencies
npm install

# Start the development server
npm start
```

The app will open at `http://localhost:8902/maputnik/` automatically.

### Build for Production

```bash
# Build optimized bundle
npm run build

# Build desktop app (requires Make)
npm run build-desktop

# Build for Linux
npm run build-linux
```

---

## 📖 Usage Guide

### Getting Started
1. **Open a style** – Use `O` or click "Open" to load an existing style JSON
2. **Add a source** – Click "Sources" to add raster/vector tiles, GeoJSON, or PMTiles
3. **Edit layers** – Click layers in the left panel to edit paint and layout properties
4. **Preview live** – Map on the right updates in real-time
5. **Save checkpoints** – Press `T` to open Timeline and save named snapshots

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `O` | Open style |
| `S` | Save / Export style |
| `J` | Code editor (JSON) |
| `D` | Data sources |
| `C` | Copilot (AI style intelligence) |
| `T` | Timeline (checkpoints & diffs) |
| `W` | Workspace (all saved styles) |
| `⌘K` / `Ctrl+K` | Command palette |

For full shortcut reference, see [KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md).

### Comparing Styles
1. Open Timeline (`T`)
2. Save two checkpoints (click "Save checkpoint")
3. Check both checkpoints to compare
4. Side-by-side view opens automatically
5. Pan/zoom to inspect differences
6. Use coordinate display to verify exact locations

### Checkpoint Workflow
```
Draft → Save Checkpoint 1 → Edit → Save Checkpoint 2 → Compare → Restore or Continue
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **UI Framework** | React 19 + TypeScript |
| **Map Library** | MapLibre GL 5.24 |
| **Storage** | IndexedDB (50MB+) |
| **State Management** | React local state + component lifecycle |
| **Styling** | SCSS + CSS variables (light/dark theme) |
| **Build Tool** | Vite 7 |
| **Code Editor** | CodeMirror 6 (JSON) |
| **Accessibility** | WCAG 2.1 (Levels A/AA) |
| **Testing** | Playwright E2E, Vitest unit |
| **Linting** | ESLint + Stylelint |
| **i18n** | i18next (multi-language support) |

---

## 📊 Storage & Performance

### Storage Architecture
- **IndexedDB**: Styles, checkpoints, workspace metadata (50MB+ quota)
- **localStorage**: User preferences, temporary state
- **Fallback**: Browser's cache for map tiles

### Performance Optimizations
- **Fast coordinate updates** in comparison mode without blocking map interaction
- **Async/await patterns** for storage operations (non-blocking)
- **Efficient diff algorithm** for semantic style comparison
- **Hot Module Replacement (HMR)** during development
- **Lazy loading** of language packs and resources

### Quota Monitoring
The app monitors storage usage and displays warnings before quota is exceeded. Export checkpoints regularly for backup.

---

## 🔄 Key Improvements Over Maputnik

| Feature | Outside | Maputnik |
|---------|---------|----------|
| **Storage Quota** | 50MB+ (IndexedDB) | 5-10MB (localStorage) |
| **Checkpoints** | Full with diffs | Basic timeline |
| **Comparison** | Side-by-side + sync | Limited |
| **Workspace** | Multi-style management | Single style |
| **Performance** | Optimized for large styles | Standard |
| **Theme** | Light/dark system colors | Light only |
| **Shortcuts** | Full keyboard support | Partial |

---

## 📁 Project Structure

```
outside-map-studio/
├── src/
│   ├── components/          # React components
│   │   ├── App.tsx          # Main app container
│   │   ├── AppToolbar.tsx   # Top navigation
│   │   ├── TimelinePanel.tsx # Checkpoints UI
│   │   ├── WorkspacePanel.tsx # Style management
│   │   ├── ComparisonViewProper.tsx # Side-by-side maps
│   │   └── ...
│   ├── libs/                # Business logic
│   │   ├── snapshots.ts     # Checkpoint storage
│   │   ├── workspace.ts     # Style management
│   │   ├── indexeddb.ts     # Storage wrapper
│   │   ├── mapCoordinates.ts # Coordinate utils
│   │   └── ...
│   ├── styles/              # SCSS styling
│   │   └── _meridian.scss   # Main design system
│   └── config/              # Static config
├── desktop/                 # Electron desktop app
├── KEYBOARD_SHORTCUTS.md    # Full shortcut reference
├── DETAILED_CHANGELOG.md    # Development changelog
└── package.json
```

---

## 🚦 Development

### Running Tests

```bash
# Unit tests with coverage
npm run test-unit

# E2E tests
npm run test-e2e

# Linting
npm run lint
npm run lint-css
```

### Code Style
- **TypeScript** strict mode enabled
- **ESLint** enforces React hooks, accessibility
- **Prettier** for consistent formatting
- **Stylelint** for SCSS best practices

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📋 Specifications

### Supported Map Styles
- **MapLibre GL JSON** (v8+)
- **Mapbox GL JSON** (compatible)
- **Open style formats** (GeoJSON-friendly)

### Tile Source Support
- **Raster tiles** (XYZ, TMS)
- **Vector tiles** (MVT)
- **GeoJSON** (local files or URLs)
- **PMTiles** (offline vector tiles)
- **WMS** (experimental)

### Browser Support
- **Chrome/Edge** 90+
- **Firefox** 88+
- **Safari** 14+
- **Mobile browsers** (iOS Safari, Chrome Mobile)

### Performance Targets
- **Style preview refresh** < 100ms
- **Map pan/zoom smoothness** 60 FPS
- **Checkpoint save** < 500ms
- **Style diff calculation** < 200ms

---

## 🎓 Learning Resources

- [MapLibre GL Documentation](https://maplibre.org/maplibre-gl-js/)
- [MapLibre Style Specification](https://maplibre.org/maplibre-style-spec/)
- [OpenStreetMap Wiki](https://wiki.openstreetmap.org/)
- [GeoJSON Specification](https://geojson.org/)

---

## 📄 License

MIT License – see [LICENSE](./LICENSE) file for details.

Built with ❤️ by [Jonathan Levy](https://github.com/jonathanmaps)

---

## 🙋 Support & Feedback

- **Issues?** Open an [issue on GitHub](https://github.com/jonathanmaps/outside-map-studio/issues)
- **Feature requests?** [Discussions](https://github.com/jonathanmaps/outside-map-studio/discussions)
- **Questions?** Check [KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md) and [DETAILED_CHANGELOG.md](./DETAILED_CHANGELOG.md)

---

**Version:** 3.1.0  
**Last Updated:** September 2, 2026  
**Status:** Active Development
