# Outside Map Studio — Evolution from Maputnik

**Baseline:** Maputnik 3.1.0  
**Outside Map Studio:** 3.1.0

This document summarizes the major additions and architectural changes made on top of Maputnik. For release-by-release upstream history, see [`CHANGELOG.md`](CHANGELOG.md).

## Major Additions

### Design Studio UI
- Reworked Maputnik into an Outside-branded design environment.
- Added docked feature panels, resizable editing areas, toolbar overflow handling, and general visual polish.
- Improved usability for large, production map styles.

### Copilot
- Added local, on-device style intelligence with no required network calls.
- Includes deterministic color/palette tools, mood presets, WCAG contrast auditing and fixes, unused-source cleanup, and style-aware exploration.
- Integrated into the dock and command palette.

### Timeline & Checkpoints
- Added named checkpoints separate from undo/redo.
- Preview, restore, delete, import, and export checkpoints.
- Added semantic style diffs for understanding changes between versions.

### Compare
- Added side-by-side checkpoint comparison.
- Maps stay synchronized while panning and zooming.
- Added coordinate/zoom display and interaction optimizations for smooth comparison.

### Workspace
- Added multi-style project management in the browser.
- Switch, pin, rename, duplicate, and delete saved styles.
- Migrated larger persistent data to IndexedDB.

### Navigation & Layer Workflow
- Added coordinate jump/copy and support for pasted map URLs.
- Added command palette (`⌘K / Ctrl+K` or `/`).
- Added layer search, previous/next layer navigation, visibility toggle, and layer isolation.
- Preserved manually entered map URL hashes on load.

### Device Preview
- Added common phone and tablet viewport frames.
- Supports rotation plus scale-to-fit/actual-size viewing while editing remains live.

## Architecture & Performance

- **React + TypeScript** UI.
- **MapLibre GL** rendering.
- **Vite** development/build pipeline.
- **CodeMirror 6** JSON editing.
- **IndexedDB** for styles, checkpoints, and workspace data; localStorage remains for lightweight preferences/state.
- Async storage operations and optimized compare-coordinate updates reduce UI blocking.
- Playwright E2E and Vitest unit testing.

## Compatibility

Outside Map Studio continues to work with MapLibre/Mapbox-style JSON and common sources including vector, raster, GeoJSON, and PMTiles.

Existing Maputnik editing concepts remain intact; Outside-specific features layer additional project, comparison, and design workflows on top.

## Key Outside-Specific Files

- `src/components/AICopilotPanel.tsx` — Copilot UI
- `src/libs/aiCopilot.ts` — local style intelligence
- `src/components/TimelinePanel.tsx` — checkpoints
- `src/components/WorkspacePanel.tsx` — project management
- `src/components/ComparisonViewProper.tsx` — comparison
- `src/components/CoordinateJump.tsx` — coordinate navigation
- `src/libs/indexeddb.ts` — persistent storage

## Current Focus

Continue refining production-map workflows, comparison performance, style intelligence, and overall design-tool usability while preserving compatibility with the Maputnik/MapLibre ecosystem.
