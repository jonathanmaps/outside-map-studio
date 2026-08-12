// Meridian Workspace — a real multi-file view over the same localStorage
// keys StyleStore already writes (maputnik:style:<id>), plus a small
// metadata index for last-modified/pinned that the plain style JSON doesn't
// carry. This only reflects the local-storage backend (the default when
// running `npm start`), not the desktop/API-backed store.
import type { StyleSpecificationWithId } from "./definitions";

const STORAGE_PREFIX = "maputnik";
const STYLE_PREFIX = "style";
const META_KEY = "maputnik:workspace_meta";

type Meta = { updatedAt?: number, pinned?: boolean };

function styleKey(id: string) {
  return [STORAGE_PREFIX, STYLE_PREFIX, id].join(":");
}

function loadMetaIndex(): Record<string, Meta> {
  try {
    return JSON.parse(window.localStorage.getItem(META_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveMetaIndex(index: Record<string, Meta>) {
  window.localStorage.setItem(META_KEY, JSON.stringify(index));
}

export function touchWorkspaceMeta(id: string) {
  const index = loadMetaIndex();
  index[id] = { ...index[id], updatedAt: Date.now() };
  saveMetaIndex(index);
}

export function toggleWorkspacePin(id: string) {
  const index = loadMetaIndex();
  index[id] = { ...index[id], pinned: !index[id]?.pinned };
  saveMetaIndex(index);
}

export type WorkspaceEntry = {
  id: string
  name: string
  updatedAt: number
  pinned: boolean
  layerCount: number
  swatches: string[]
  style: StyleSpecificationWithId
};

function extractSwatches(style: any): string[] {
  const swatches: string[] = [];
  const layers: any[] = style.layers || [];

  const bg = layers.find(l => l.type === "background")?.paint?.["background-color"];
  swatches.push(typeof bg === "string" ? bg : "#131419");

  const fill = layers.find(l => l.type === "fill" && typeof l.paint?.["fill-color"] === "string");
  const line = layers.find(l => l.type === "line" && typeof l.paint?.["line-color"] === "string");
  swatches.push(fill ? fill.paint["fill-color"] : "#1e2027");
  swatches.push(line ? line.paint["line-color"] : "#8b8d97");

  return swatches;
}

export function listWorkspace(): WorkspaceEntry[] {
  const metaIndex = loadMetaIndex();
  const entries: WorkspaceEntry[] = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    const parts = key.split(":");
    if (parts.length !== 3 || parts[0] !== STORAGE_PREFIX || parts[1] !== STYLE_PREFIX) continue;

    const id = parts[2];
    try {
      const style = JSON.parse(window.localStorage.getItem(key)!);
      const meta = metaIndex[id] || {};
      entries.push({
        id,
        name: style.name || "Untitled style",
        updatedAt: meta.updatedAt || 0,
        pinned: !!meta.pinned,
        layerCount: (style.layers || []).length,
        swatches: extractSwatches(style),
        style,
      });
    } catch {
      // Skip unparseable entries rather than let one bad key break the panel.
    }
  }

  return entries.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

export function renameWorkspaceEntry(id: string, name: string) {
  const raw = window.localStorage.getItem(styleKey(id));
  if (!raw) return;
  const style = JSON.parse(raw);
  style.name = name;
  window.localStorage.setItem(styleKey(id), JSON.stringify(style));
  touchWorkspaceMeta(id);
}

export function duplicateWorkspaceEntry(id: string): StyleSpecificationWithId | null {
  const raw = window.localStorage.getItem(styleKey(id));
  if (!raw) return null;
  const style = JSON.parse(raw);
  const newId = Math.random().toString(36).slice(2, 9);
  style.id = newId;
  style.name = `${style.name || "Untitled style"} copy`;
  window.localStorage.setItem(styleKey(newId), JSON.stringify(style));
  touchWorkspaceMeta(newId);
  return style;
}

export function deleteWorkspaceEntry(id: string) {
  window.localStorage.removeItem(styleKey(id));
  window.localStorage.removeItem(`maputnik:snapshots:${id}`);
  const index = loadMetaIndex();
  delete index[id];
  saveMetaIndex(index);
}
