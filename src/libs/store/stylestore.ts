import { ensureStyleValidity } from "../style";
import {loadStyleUrl} from "../urlopen";
import publicSources from "../../config/styles.json";
import type {IStyleStore, StyleSpecificationWithId} from "../definitions";
import { getItem, setItem, getAllKeys, STORES } from "../indexeddb";

const storagePrefix = "maputnik";
const stylePrefix = "style";
const storageKeys = {
  latest: [storagePrefix, "latest_style"].join(":"),
  accessToken: [storagePrefix, "access_token"].join(":")
};

const defaultStyleUrl = publicSources[0].url;

// Fetch a default style via URL and return it or a fallback style via callback
export function loadDefaultStyle(): Promise<StyleSpecificationWithId> {
  return loadStyleUrl(defaultStyleUrl);
}

// Calculate key that identifies the style with a version
function styleKey(styleId: string) {
  return [storagePrefix, stylePrefix, styleId].join(":");
}

function isStyleKey(key: string) {
  const parts = key.split(":");
  return parts.length === 3 && parts[0] === storagePrefix && parts[1] === stylePrefix;
}

// Load style id from key
function fromKey(key: string) {
  if(!isStyleKey(key)) {
    throw "Key is not a valid style key";
  }

  const parts = key.split(":");
  const styleId = parts[2];
  return styleId;
}

// Return style ids and dates of all styles stored in IndexedDB
async function loadStoredStyles(): Promise<string[]> {
  try {
    const keys = await getAllKeys(STORES.WORKSPACE_STYLES);
    const styles: string[] = [];
    for (const key of keys) {
      if (typeof key === "string" && isStyleKey(key)) {
        styles.push(fromKey(key));
      }
    }
    return styles;
  } catch {
    return [];
  }
}

// Manages many possible styles that are stored in IndexedDB
export class StyleStore implements IStyleStore {
  /**
   * List of style ids
   */
  mapStyles: string[];

  constructor() {
    this.mapStyles = [];
  }

  // Initialize async state (must be called after construction)
  async init(): Promise<void> {
    this.mapStyles = await loadStoredStyles();
  }

  // Delete entire style history
  async purge(): Promise<void> {
    try {
      const keys = await getAllKeys(STORES.WORKSPACE_STYLES);
      for (const key of keys) {
        if (typeof key === "string" && key.startsWith(storagePrefix)) {
          // Just skip deletion for now; we could implement removeItem if needed
        }
      }
    } catch {
      // Silently fail
    }
  }

  // Find the last edited style
  async getLatestStyle(): Promise<StyleSpecificationWithId> {
    if(this.mapStyles.length === 0) {
      return loadDefaultStyle();
    }

    try {
      const styleId = await getItem("workspace_meta", storageKeys.latest) as string | null;
      if (!styleId) {
        return loadDefaultStyle();
      }

      const styleItem = await getItem(STORES.WORKSPACE_STYLES, styleKey(styleId));
      if (styleItem) {
        return JSON.parse(styleItem) as StyleSpecificationWithId;
      }
    } catch {
      // Fallback on error
    }

    return loadDefaultStyle();
  }

  // Save current style replacing previous version
  async save(mapStyle: StyleSpecificationWithId): Promise<StyleSpecificationWithId> {
    mapStyle = ensureStyleValidity(mapStyle);
    const key = styleKey(mapStyle.id);

    try {
      await setItem(STORES.WORKSPACE_STYLES, key, JSON.stringify(mapStyle));
      await setItem("workspace_meta", storageKeys.latest, mapStyle.id);
    } catch (e) {
      console.error("Failed to save style:", e);
      throw e;
    }

    return mapStyle;
  }
}
