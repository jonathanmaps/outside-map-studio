// Meridian Workspace — a real multi-file view over IndexedDB storage
// (50MB+ quota vs localStorage 5-10MB), plus metadata index for
// last-modified/pinned that the plain style JSON doesn't carry.
import type { StyleSpecificationWithId } from "./definitions";
import { getItem, setItem, removeItem, getAllKeys, STORES } from "./indexeddb";

const LEGACY_STORAGE_PREFIX = "maputnik";
const LEGACY_STYLE_PREFIX = "style";
const META_KEY = "workspace_meta";

type Meta = { updatedAt?: number, pinned?: boolean };

function styleKey(id: string) {
  return `${LEGACY_STORAGE_PREFIX}:${LEGACY_STYLE_PREFIX}:${id}`;
}

async function loadMetaIndex(): Promise<Record<string, Meta>> {
  try {
    const raw = await getItem(STORES.WORKSPACE_META, META_KEY);
    return raw ?? {};
  } catch {
    return {};
  }
}

async function saveMetaIndex(index: Record<string, Meta>): Promise<void> {
  try {
    await setItem(STORES.WORKSPACE_META, META_KEY, index);
  } catch (error) {
    console.error("Failed to save workspace metadata:", error);
  }
}

export async function touchWorkspaceMeta(id: string): Promise<void> {
  const index = await loadMetaIndex();
  index[id] = { ...index[id], updatedAt: Date.now() };
  await saveMetaIndex(index);
}

export async function toggleWorkspacePin(id: string): Promise<void> {
  const index = await loadMetaIndex();
  index[id] = { ...index[id], pinned: !index[id]?.pinned };
  await saveMetaIndex(index);
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

export async function listWorkspace(): Promise<WorkspaceEntry[]> {
  const metaIndex = await loadMetaIndex();
  const entries: WorkspaceEntry[] = [];

  const keys = await getAllKeys(STORES.WORKSPACE_STYLES);
  for (const key of keys) {
    if (typeof key !== "string") continue;
    const parts = key.split(":");
    if (parts.length !== 3 || parts[0] !== LEGACY_STORAGE_PREFIX || parts[1] !== LEGACY_STYLE_PREFIX) continue;

    const id = parts[2];
    try {
      let style = await getItem(STORES.WORKSPACE_STYLES, key) as any;
      if (!style) continue;

      // Parse if stored as string
      if (typeof style === "string") {
        style = JSON.parse(style);
      }

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
    } catch (error) {
      console.warn(`Failed to parse workspace entry ${key}:`, error);
      // Skip unparseable entries rather than let one bad key break the panel.
    }
  }

  return entries.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

export async function renameWorkspaceEntry(id: string, name: string): Promise<void> {
  const key = styleKey(id);
  const style = await getItem(STORES.WORKSPACE_STYLES, key);
  if (!style) return;
  style.name = name;
  await setItem(STORES.WORKSPACE_STYLES, key, style);
  await touchWorkspaceMeta(id);
}

export async function duplicateWorkspaceEntry(id: string): Promise<StyleSpecificationWithId | null> {
  const key = styleKey(id);
  const style = await getItem(STORES.WORKSPACE_STYLES, key);
  if (!style) return null;
  const newId = Math.random().toString(36).slice(2, 9);
  style.id = newId;
  style.name = `${style.name || "Untitled style"} copy`;
  const newKey = styleKey(newId);
  await setItem(STORES.WORKSPACE_STYLES, newKey, style);
  await touchWorkspaceMeta(newId);
  return style;
}

export async function deleteWorkspaceEntry(id: string): Promise<void> {
  const key = styleKey(id);
  await removeItem(STORES.WORKSPACE_STYLES, key);
  const index = await loadMetaIndex();
  delete index[id];
  await saveMetaIndex(index);
}
