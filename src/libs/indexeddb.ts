// IndexedDB wrapper for persistent storage with quota management
// Replaces localStorage for snapshots and workspace metadata (5-10MB limit → 50MB+ limit)

const DB_NAME = "outside-map-studio";
const DB_VERSION = 1;
const SNAPSHOTS_STORE = "snapshots";
const WORKSPACE_META_STORE = "workspace_meta";
const WORKSPACE_STYLES_STORE = "workspace_styles";

let db: IDBDatabase | null = null;

export async function initializeDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };

    req.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result;

      // Snapshots store: key is styleId:snapshotId
      if (!database.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        database.createObjectStore(SNAPSHOTS_STORE);
      }

      // Workspace metadata store
      if (!database.objectStoreNames.contains(WORKSPACE_META_STORE)) {
        database.createObjectStore(WORKSPACE_META_STORE);
      }

      // Workspace styles store
      if (!database.objectStoreNames.contains(WORKSPACE_STYLES_STORE)) {
        database.createObjectStore(WORKSPACE_STYLES_STORE);
      }
    };
  });
}

export async function getItem(storeName: string, key: string): Promise<any | null> {
  const database = await initializeDB();
  return new Promise((resolve, reject) => {
    const req = database.transaction(storeName).objectStore(storeName).get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result ?? null);
  });
}

export async function setItem(storeName: string, key: string, value: any): Promise<void> {
  const database = await initializeDB();
  return new Promise((resolve, reject) => {
    const req = database.transaction(storeName, "readwrite").objectStore(storeName).put(value, key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

export async function removeItem(storeName: string, key: string): Promise<void> {
  const database = await initializeDB();
  return new Promise((resolve, reject) => {
    const req = database.transaction(storeName, "readwrite").objectStore(storeName).delete(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

export async function getAllKeys(storeName: string): Promise<IDBValidKey[]> {
  const database = await initializeDB();
  return new Promise((resolve, reject) => {
    const req = database.transaction(storeName).objectStore(storeName).getAllKeys();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve((req.result as IDBValidKey[]) ?? []);
  });
}

export async function getAllItems(storeName: string): Promise<any[]> {
  const database = await initializeDB();
  return new Promise((resolve, reject) => {
    const req = database.transaction(storeName).objectStore(storeName).getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve((req.result as any[]) ?? []);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const database = await initializeDB();
  return new Promise((resolve, reject) => {
    const req = database.transaction(storeName, "readwrite").objectStore(storeName).clear();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

// Estimate storage usage and available quota
export async function getStorageEstimate(): Promise<{ usage: number; quota: number; percentUsed: number }> {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0, percentUsed: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 50 * 1024 * 1024; // 50MB default
  const percentUsed = Math.round((usage / quota) * 100);

  return { usage, quota, percentUsed };
}

// Get list of all snapshot keys for a style
export async function getSnapshotKeysForStyle(styleId: string): Promise<string[]> {
  const allKeys = await getAllKeys(SNAPSHOTS_STORE);
  return allKeys
    .filter(key => typeof key === "string" && key.startsWith(`${styleId}:`))
    .map(key => (key as string).split(":")[1]);
}

// Clear all snapshots for a style
export async function clearSnapshotsForStyle(styleId: string): Promise<void> {
  const keys = await getSnapshotKeysForStyle(styleId);
  const database = await initializeDB();
  const tx = database.transaction(SNAPSHOTS_STORE, "readwrite");

  for (const snapshotId of keys) {
    tx.objectStore(SNAPSHOTS_STORE).delete(`${styleId}:${snapshotId}`);
  }

  return new Promise((resolve, reject) => {
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
  });
}

// Public store names for use in other modules
export const STORES = {
  SNAPSHOTS: SNAPSHOTS_STORE,
  WORKSPACE_META: WORKSPACE_META_STORE,
  WORKSPACE_STYLES: WORKSPACE_STYLES_STORE,
};
