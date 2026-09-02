/// <reference types="vite/client" />
import { type IStyleStore, type OnStyleChangedCallback } from "../definitions";
import { getStyleUrlFromAddressbarAndRemoveItIfNeeded, loadStyleUrl } from "../urlopen";
import { ApiStyleStore } from "./apistore";
import { StyleStore } from "./stylestore";

export async function createStyleStore(onStyleChanged: OnStyleChangedCallback): Promise<IStyleStore> {
  const styleUrl = getStyleUrlFromAddressbarAndRemoveItIfNeeded();
  const useStyleUrl = styleUrl && window.confirm("Load style from URL: " + styleUrl + " and discard current changes?");
  let styleStore: IStyleStore;
  if (import.meta.env.MODE === "desktop" && !useStyleUrl) {
    const apiStyleStore = new ApiStyleStore({
      onLocalStyleChange: mapStyle => onStyleChanged(mapStyle, {save: false}),
    });
    try {
      await apiStyleStore.init();
      styleStore = apiStyleStore;
    } catch {
      styleStore = new StyleStore();
      if ('init' in styleStore) {
        await (styleStore as any).init();
      }
    }
  } else {
    styleStore = new StyleStore();
    if ('init' in styleStore) {
      await (styleStore as any).init();
    }
  }
  const styleToLoad = useStyleUrl ? await loadStyleUrl(styleUrl) : await styleStore.getLatestStyle();
  onStyleChanged(styleToLoad, {initialLoad: true, save: false});
  return styleStore;
}

export type { IStyleStore };
