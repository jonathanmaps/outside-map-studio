# Outside · Map Studio

A branded fork of Maputnik — a MapLibre GL style editor — set up as an
internal tool for Outside map designers.

## Running it

From this folder:

```bash
npm install
npm start
```

Then open **http://localhost:8900/maputnik/**

`npm install` is only needed the first time (or after unzipping, since
`node_modules` isn't included in the archive). It takes a couple of minutes.

## What's in here beyond stock Maputnik

**Branding** — Outside wordmark and palette. Neutral greys carry the
interface; Outside yellow is used only for action and selection, so it reads
as the brand rather than as decoration. Body text is the brand cream.

**Command palette** — `⌘K` (or `/`) to jump to any panel, action, or layer.

**Copilot** — on-device style intelligence. Deterministic colour maths and
real WCAG contrast checks, running entirely in the browser with no network
calls. Mood presets (dusk, night, blueprint…), a label-contrast audit with
one-click fixes, unused-source cleanup, and palette generation.

**Timeline** — named checkpoints, separate from undo. Preview any of them on
the live map, restore, or diff two against each other. The one currently on
screen is marked.

**Workspace** — every style saved in this browser in one place: switch,
duplicate, pin, rename, delete.

**Device preview** — frame the live map at real phone and tablet viewports
(iPhone SE/15/15 Pro Max, Pixel 8, iPad mini/Air/Pro 13). Rotate, and toggle
between scale-to-fit and actual size. Editing keeps working inside the frame.

**Coordinate jump** — the box in the toolbar. Paste `zoom/lat/lng` (or a
whole Maputnik/MapLibre URL) and press Enter. The copy button grabs the
current position.

## Keyboard shortcuts

Press `?` for the full list. These work anywhere except while typing.

| | |
|---|---|
| `⌘K` or `/` | Command palette |
| `i` | Toggle inspect |
| `c` `t` `w` | Copilot · Timeline · Workspace |
| `j` | Code (JSON) editor |
| `[` `]` | Previous / next layer |
| `v` `x` | Toggle visibility · isolate layer |
| `f` | Find layers |
| `o` `e` `d` `s` `g` | Open · Save · Sources · Settings · Global state |

## Notes

- Styles are saved in browser local storage, per origin. Running on a
  different port means a different set of saved styles.
- Port is set in `vite.config.ts` if you need to change it.
- Git history is included, so `git log` shows how each piece was built and
  `git diff` works against any earlier point.
