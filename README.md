# Outside Map Studio

A fast, browser-based map style editor built on **Maputnik + MapLibre GL** for designing, testing, comparing, and managing production map styles.

Outside Map Studio extends Maputnik with **workspaces, checkpoints, side-by-side comparison, coordinate navigation, device preview, and local AI style intelligence**.

## Highlights

**Edit** — Visually edit MapLibre/Mapbox styles with live preview, layer controls, sources, filters, colors, and direct JSON editing.

**Compare** — Compare two checkpoints side by side with synchronized pan/zoom and exact coordinate matching.

**Timeline** — Save named checkpoints, preview earlier versions, inspect diffs, restore, import, or export.

**Workspace** — Keep multiple styles organized in-browser. Switch, pin, rename, duplicate, and delete projects.

**Copilot** — Local, on-device style intelligence for exploring and improving a map style. Includes mood/palette tools, accessibility checks, contrast fixes, and style cleanup without network calls.

**Device Preview** — Test the live map in common phone and tablet viewports while continuing to edit.

**Coordinate Jump** — Paste `zoom/lat/lng` or a compatible map URL to jump directly to a location.

## Quick Start

```bash
git clone https://github.com/jonathanmaps/outside-map-studio.git
cd outside-map-studio
npm install
npm start
```

Open **http://localhost:8900/maputnik/**.

Requires Node.js 16+; Node 18+ recommended.

## Core Workflow

**Open → Edit → Checkpoint → Iterate → Compare → Export**

Timeline checkpoints let you preserve meaningful design states without creating separate style files. Compare view then lets you evaluate versions at the same location and zoom.

## Essential Shortcuts

| Key | Action |
| --- | --- |
| `⌘K / Ctrl+K` or `/` | Command palette |
| `O` | Open style |
| `E` | Export style |
| `D` | Data sources |
| `S` | Settings |
| `J` | JSON editor |
| `C` | Copilot |
| `T` | Timeline |
| `W` | Workspace |
| `F` | Find layers |
| `[` / `]` | Previous / next layer |
| `V` / `X` | Toggle visibility / isolate layer |
| `?` | Shortcut help |

See [`KEYBOARD_SHORTCUTS.md`](KEYBOARD_SHORTCUTS.md) for the full reference.

## Development

```bash
npm start          # Development server
npm run build      # Production build
npm run test       # Playwright E2E tests
npm run test-unit  # Vitest unit tests
npm run lint       # ESLint
npm run lint-css   # Stylelint
```

Built with **React, TypeScript, MapLibre GL, Vite, CodeMirror, SCSS, and IndexedDB**.

## Docs

- [`START-HERE.md`](START-HERE.md) — Quick orientation
- [`KEYBOARD_SHORTCUTS.md`](KEYBOARD_SHORTCUTS.md) — Shortcut reference
- [`CHANGELOG.md`](CHANGELOG.md) — Release history
- [`DETAILED_CHANGELOG.md`](DETAILED_CHANGELOG.md) — Outside-specific evolution

## Maputnik

Outside Map Studio is based on **Maputnik**, the open-source visual map style editor originally created by Lukas Martinelli and developed by the MapLibre community.

It retains Maputnik's core style-editing experience while adding workflow tools for iterative map design, comparison, project organization, local style intelligence, and interface/performance improvements.

Also built on **MapLibre GL**, **OpenStreetMap**, and the broader open-source geospatial community.

## License

MIT — see [`LICENSE`](LICENSE).
