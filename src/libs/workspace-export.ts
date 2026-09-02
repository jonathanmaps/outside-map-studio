import { saveAs } from "file-saver";
import { getAllKeys, getItem, setItem, STORES } from "./indexeddb";
import type { StyleSpecificationWithId } from "./definitions";

export interface WorkspaceExport {
  version: 1;
  exportedAt: string;
  styleCount: number;
  styles: Array<{
    id: string;
    name: string;
    style: StyleSpecificationWithId;
  }>;
}

export async function exportWorkspace(): Promise<void> {
  try {
    const keys = await getAllKeys(STORES.WORKSPACE_STYLES);
    const styles: WorkspaceExport["styles"] = [];

    for (const key of keys) {
      if (typeof key === "string" && key.startsWith("maputnik:style:")) {
        try {
          const value = await getItem(STORES.WORKSPACE_STYLES, key);
          const style = typeof value === "string" ? JSON.parse(value) : value;
          const id = key.split(":")[2];
          styles.push({
            id,
            name: style.name || `Style ${id}`,
            style,
          });
        } catch (err) {
          console.warn(`Failed to parse style ${key}:`, err);
        }
      }
    }

    const exportData: WorkspaceExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      styleCount: styles.length,
      styles,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const timestamp = new Date().toISOString().split("T")[0];
    saveAs(blob, `workspace-backup-${timestamp}.json`);
  } catch (error) {
    console.error("Failed to export workspace:", error);
    throw new Error("Failed to export workspace");
  }
}

export async function importWorkspace(
  file: File
): Promise<{ imported: number; failed: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const exportData: WorkspaceExport = JSON.parse(content);

        if (exportData.version !== 1) {
          throw new Error(`Unsupported workspace export version: ${exportData.version}`);
        }

        let imported = 0;
        let failed = 0;

        for (const styleEntry of exportData.styles) {
          try {
            const key = `maputnik:style:${styleEntry.id}`;
            await setItem(STORES.WORKSPACE_STYLES, key, JSON.stringify(styleEntry.style));
            imported++;
          } catch (error) {
            console.error(`Failed to import style ${styleEntry.id}:`, error);
            failed++;
          }
        }

        resolve({ imported, failed });
      } catch (error) {
        console.error("Failed to parse workspace export:", error);
        reject(new Error("Invalid workspace export file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}
