/**
 * Device presets for previewing a style at real handset/tablet sizes.
 *
 * Sizes are CSS pixels (the logical viewport a web map actually gets), not
 * physical pixels. `pixelRatio` is carried separately so the preview can
 * report the effective raster resolution — it matters for deciding whether
 * labels and line widths hold up on a retina screen.
 */
export type DevicePreset = {
  id: string
  label: string
  group: "Phone" | "Tablet"
  width: number
  height: number
  pixelRatio: number
};

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: "iphone-se", label: "iPhone SE", group: "Phone", width: 375, height: 667, pixelRatio: 2 },
  { id: "iphone-15", label: "iPhone 15", group: "Phone", width: 393, height: 852, pixelRatio: 3 },
  { id: "iphone-15-pro-max", label: "iPhone 15 Pro Max", group: "Phone", width: 430, height: 932, pixelRatio: 3 },
  { id: "pixel-8", label: "Pixel 8", group: "Phone", width: 412, height: 915, pixelRatio: 2.6 },
  { id: "ipad-mini", label: "iPad mini", group: "Tablet", width: 744, height: 1133, pixelRatio: 2 },
  { id: "ipad-air", label: "iPad Air 11\"", group: "Tablet", width: 820, height: 1180, pixelRatio: 2 },
  { id: "ipad-pro-13", label: "iPad Pro 13\"", group: "Tablet", width: 1032, height: 1376, pixelRatio: 2 },
];

export type Orientation = "portrait" | "landscape";

export function findDevice(id: string | null): DevicePreset | null {
  if (!id) return null;
  return DEVICE_PRESETS.find(d => d.id === id) ?? null;
}

/** Width/height for the preset in the given orientation. */
export function deviceSize(device: DevicePreset, orientation: Orientation) {
  return orientation === "portrait"
    ? { width: device.width, height: device.height }
    : { width: device.height, height: device.width };
}
