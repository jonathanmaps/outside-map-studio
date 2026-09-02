# Outside Map Studio — Start Here

Outside Map Studio is an Outside-branded fork of **Maputnik**, built as a faster workspace for designing and comparing MapLibre styles.

## Run It

```bash
npm install
npm start
```

Open **http://localhost:8900/maputnik/**.

`npm install` is only needed initially or after dependencies change.

## What's Added

- **Copilot** — local, on-device style intelligence with palette/mood tools, WCAG contrast checks, fixes, and cleanup.
- **Timeline** — named checkpoints with preview, restore, diff, import/export, and comparison.
- **Compare** — synchronized side-by-side maps for evaluating two checkpoints.
- **Workspace** — browser-based multi-style project management.
- **Device Preview** — phone/tablet frames with rotation and live editing.
- **Coordinate Jump** — paste `zoom/lat/lng` or a map URL; copy the current position.
- **Command Palette** — `⌘K / Ctrl+K` or `/` for fast access to actions and layers.
- **Layer tools** — search, step between layers, toggle visibility, and isolate.
- **Outside UI** — branded, resizable interface optimized for map design.

## Shortcuts

The essentials: `O` Open · `E` Export · `D` Sources · `S` Settings · `J` JSON · `C` Copilot · `T` Timeline · `W` Workspace · `F` Find · `[` `]` Layers · `V` Visibility · `X` Isolate.

Press **`?`** or see [`KEYBOARD_SHORTCUTS.md`](KEYBOARD_SHORTCUTS.md) for the full list.

## Storage

Styles, checkpoints, and workspace data are stored in the browser. Storage is tied to the site's origin, so changing the local port creates a separate browser storage context.

Git history is included for inspecting how the project evolved.
