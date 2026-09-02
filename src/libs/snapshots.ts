// Meridian Timeline — named checkpoints, separate from the in-memory undo
// stack, persisted per-style in IndexedDB (50MB+ quota) so they survive a reload.
import { diff } from "@maplibre/maplibre-gl-style-spec";
import type { StyleSpecification } from "maplibre-gl";
import type { StyleSpecificationWithId } from "./definitions";
import { getItem, setItem, removeItem, getSnapshotKeysForStyle, STORES } from "./indexeddb";

export type Snapshot = {
  id: string
  label: string
  createdAt: number
  style: StyleSpecificationWithId
};

export class SnapshotStorageError extends Error {
  constructor(message: string, public readonly kind: "quota" | "io" | "unknown" = "unknown") {
    super(message);
    this.name = "SnapshotStorageError";
  }
}

function storageKey(styleId: string, snapshotId?: string): string {
  return snapshotId ? `${styleId}:${snapshotId}` : styleId;
}

export async function listSnapshots(styleId: string): Promise<Snapshot[]> {
  try {
    const keys = await getSnapshotKeysForStyle(styleId);
    const snapshots: Snapshot[] = [];

    for (const snapshotId of keys) {
      const snapshot = await getItem(STORES.SNAPSHOTS, storageKey(styleId, snapshotId));
      if (snapshot) snapshots.push(snapshot);
    }

    return snapshots.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Failed to list snapshots:", error);
    return [];
  }
}

export async function createSnapshot(styleId: string, label: string, style: StyleSpecificationWithId): Promise<Snapshot> {
  const snapshot: Snapshot = {
    id: Math.random().toString(36).slice(2, 9),
    label: label || `Checkpoint ${(await listSnapshots(styleId)).length + 1}`,
    createdAt: Date.now(),
    style,
  };

  try {
    await setItem(STORES.SNAPSHOTS, storageKey(styleId, snapshot.id), snapshot);
    return snapshot;
  } catch (error) {
    if (error instanceof Error && error.name === "QuotaExceededError") {
      throw new SnapshotStorageError(
        "Storage quota exceeded. Delete old checkpoints or export your workspace to free space.",
        "quota"
      );
    }
    throw new SnapshotStorageError(`Failed to save checkpoint: ${error}`, "io");
  }
}

export async function deleteSnapshot(styleId: string, snapshotId: string): Promise<void> {
  try {
    await removeItem(STORES.SNAPSHOTS, storageKey(styleId, snapshotId));
  } catch (error) {
    console.error("Failed to delete snapshot:", error);
  }
}

export async function renameSnapshot(styleId: string, snapshotId: string, label: string): Promise<void> {
  try {
    const snapshot = await getItem(STORES.SNAPSHOTS, storageKey(styleId, snapshotId));
    if (snapshot) {
      await setItem(STORES.SNAPSHOTS, storageKey(styleId, snapshotId), { ...snapshot, label });
    }
  } catch (error) {
    console.error("Failed to rename snapshot:", error);
  }
}

// ---- Diffing --------------------------------------------------------------

export type DiffEntry = {
  kind: "add" | "remove" | "change"
  text: string
  colorBefore?: string
  colorAfter?: string
};

function formatValue(value: unknown): string {
  if (typeof value === "string") return value.length > 40 ? value.slice(0, 40) + "…" : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "none";
  const json = JSON.stringify(value);
  return json.length > 40 ? json.slice(0, 40) + "…" : json;
}

function describeCommand(cmd: { command: string, args: any[] }, beforeStyle: StyleSpecification): DiffEntry {
  const { command, args } = cmd;

  if (command === "addLayer") {
    return { kind: "add", text: `Added layer "${args[0]?.id}" (${args[0]?.type})` };
  }
  if (command === "removeLayer") {
    return { kind: "remove", text: `Removed layer "${args[0]}"` };
  }
  if (command === "addSource") {
    return { kind: "add", text: `Added source "${args[0]}" (${args[1]?.type})` };
  }
  if (command === "removeSource") {
    return { kind: "remove", text: `Removed source "${args[0]}"` };
  }
  if (command === "setPaintProperty" || command === "setLayoutProperty") {
    const [layerId, prop, value] = args;
    const entry: DiffEntry = { kind: "change", text: `${layerId} · ${prop} → ${formatValue(value)}` };
    if (typeof prop === "string" && prop.endsWith("-color") && typeof value === "string") {
      entry.colorAfter = value;
      const beforeLayer = (beforeStyle.layers || []).find(l => l.id === layerId) as any;
      const beforeVal = beforeLayer?.paint?.[prop] ?? beforeLayer?.layout?.[prop];
      if (typeof beforeVal === "string") entry.colorBefore = beforeVal;
    }
    return entry;
  }
  if (command === "setFilter") {
    return { kind: "change", text: `${args[0]} · filter changed` };
  }
  if (command === "setLayerZoomRange") {
    return { kind: "change", text: `${args[0]} · zoom range → ${args[1]}–${args[2]}` };
  }
  if (command === "setStyleProperty" || command === "setSprite" || command === "setGlyphs" || command === "setName") {
    return { kind: "change", text: `${command.replace("set", "")} → ${formatValue(args[0])}` };
  }
  return {
    kind: "change",
    text: `${command} ${args.filter(a => typeof a === "string" || typeof a === "number").join(" ")}`.trim(),
  };
}

export function diffStyles(a: StyleSpecification, b: StyleSpecification): DiffEntry[] {
  const commands = diff(a, b);
  return commands.map(cmd => describeCommand(cmd as any, a));
}

export function summarizeDiff(entries: DiffEntry[]): string {
  if (entries.length === 0) return "No changes";
  const add = entries.filter(e => e.kind === "add").length;
  const remove = entries.filter(e => e.kind === "remove").length;
  const change = entries.filter(e => e.kind === "change").length;
  const parts: string[] = [];
  if (add) parts.push(`+${add}`);
  if (remove) parts.push(`−${remove}`);
  if (change) parts.push(`${change} changed`);
  return parts.join(" · ");
}
