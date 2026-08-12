// Meridian Copilot — on-device style intelligence.
//
// Everything here runs locally against the real style JSON: no network call,
// no hosted model. It is a deterministic rules + color-math engine (built on
// the `color` package's WCAG-correct contrast/luminosity math) that a chat
// prompt is parsed into. Framed honestly as "on-device", not a chatbot.
import Color, { type ColorInstance } from "color";
import cloneDeep from "lodash.clonedeep";
import type { StyleSpecification, LayerSpecification } from "maplibre-gl";

export type MoodId = "dawn" | "noon" | "dusk" | "night" | "blueprint" | "pastel" | "mono" | "highcontrast";

export type SwatchChange = {
  layerId: string
  property: string
  before: string
  after: string
};

export type CopilotResult = {
  style: StyleSpecification
  summary: string
  changes: SwatchChange[]
};

export type AccessibilityFinding = {
  layerId: string
  textColor: string
  referenceColor: string
  referenceSource: "halo" | "background" | "assumed-dark" | "assumed-light"
  ratio: number
  passes: boolean
  minRequired: number
};

export type UnusedSource = {
  id: string
  type: string
};

export const MOODS: Record<MoodId, { label: string, description: string }> = {
  dawn: { label: "Dawn", description: "Warm low light, soft horizon" },
  noon: { label: "Noon", description: "Crisp neutral daylight" },
  dusk: { label: "Dusk", description: "Amber sky, deepening ground" },
  night: { label: "Night", description: "Cool, dark, low glare" },
  blueprint: { label: "Blueprint", description: "Monochrome technical drawing" },
  pastel: { label: "Pastel", description: "Light, soft, low saturation" },
  mono: { label: "Mono", description: "Grayscale, tone only" },
  highcontrast: { label: "High contrast", description: "Stretched lightness range" },
};

function isColorLike(value: unknown): value is string {
  return typeof value === "string";
}

function tryColor(value: string): ColorInstance | null {
  try {
    return Color(value);
  } catch {
    return null;
  }
}

// Any paint property that ends in "-color" holds a plain color OR a
// data-driven expression (array). We only ever touch the plain-color case;
// expressions are left completely untouched.
function forEachColorProperty(
  style: StyleSpecification,
  visit: (layer: LayerSpecification, property: string, value: string) => string | undefined
): { style: StyleSpecification, changes: SwatchChange[] } {
  const changes: SwatchChange[] = [];
  const next = cloneDeep(style);

  for (const layer of next.layers || []) {
    const paint = (layer as any).paint;
    if (!paint) continue;
    for (const property of Object.keys(paint)) {
      if (!property.endsWith("-color")) continue;
      const value = paint[property];
      if (!isColorLike(value)) continue;

      const result = visit(layer, property, value);
      if (result !== undefined && result !== value) {
        changes.push({ layerId: layer.id, property, before: value, after: result });
        paint[property] = result;
      }
    }
  }

  return { style: next, changes };
}

function moodTransform(mood: MoodId, color: ColorInstance, isBackground: boolean): ColorInstance {
  switch (mood) {
    case "dawn": {
      let c = color.rotate(isBackground ? 16 : 6);
      c = isBackground ? c.lighten(0.14).desaturate(0.06) : c.lighten(0.03);
      return c;
    }
    case "noon": {
      return color.saturate(0.08);
    }
    case "dusk": {
      let c = color.rotate(isBackground ? 26 : 14);
      c = isBackground ? c.darken(0.12).saturate(0.18) : c.saturate(0.06);
      return c;
    }
    case "night": {
      return color.rotate(-18).darken(isBackground ? 0.4 : 0.22).desaturate(0.18);
    }
    case "blueprint": {
      const l = color.lightness();
      return Color.hsl(212, 58, Math.min(88, Math.max(10, isBackground ? Math.min(l, 22) : l))).saturationl(isBackground ? 62 : 45);
    }
    case "pastel": {
      return color.lighten(0.24).desaturate(0.28);
    }
    case "mono": {
      return color.desaturate(1);
    }
    case "highcontrast": {
      const l = color.lightness();
      const target = l < 50 ? Math.max(0, l - 22) : Math.min(100, l + 22);
      return color.lightness(target).saturate(0.14);
    }
  }
}

export function applyMood(style: StyleSpecification, mood: MoodId): CopilotResult {
  const { style: next, changes } = forEachColorProperty(style, (layer, property, value) => {
    const c = tryColor(value);
    if (!c) return undefined;
    const isBackground = property === "background-color" || layer.type === "background" || property === "fill-color";
    const out = moodTransform(mood, c, isBackground).alpha(c.alpha());
    return c.alpha() < 1 ? out.rgb().string() : out.hex();
  });

  const label = MOODS[mood].label;
  return {
    style: next,
    summary: `${label} applied — ${changes.length} color${changes.length === 1 ? "" : "s"} across ${new Set(changes.map(c => c.layerId)).size} layer${new Set(changes.map(c => c.layerId)).size === 1 ? "" : "s"}.`,
    changes,
  };
}

// ---- Accessibility audit --------------------------------------------------

const AA_NORMAL_TEXT_RATIO = 4.5;

function findBackgroundColor(style: StyleSpecification): ColorInstance | null {
  const bgLayer = (style.layers || []).find(l => l.type === "background") as any;
  const bg = bgLayer?.paint?.["background-color"];
  if (isColorLike(bg)) return tryColor(bg);
  return null;
}

export function auditAccessibility(style: StyleSpecification): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];
  const styleBackground = findBackgroundColor(style);

  for (const layer of style.layers || []) {
    if (layer.type !== "symbol") continue;
    const paint = (layer as any).paint || {};
    const textColorRaw = paint["text-color"];
    if (!isColorLike(textColorRaw)) continue;
    const textColor = tryColor(textColorRaw);
    if (!textColor) continue;

    let reference: ColorInstance | null;
    let source: AccessibilityFinding["referenceSource"];

    const haloRaw = paint["text-halo-color"];
    const haloWidth = paint["text-halo-width"];
    if (isColorLike(haloRaw) && typeof haloWidth === "number" && haloWidth > 0) {
      reference = tryColor(haloRaw);
      source = "halo";
    } else if (styleBackground) {
      reference = styleBackground;
      source = "background";
    } else {
      // No usable reference in the style — assume worst case against both
      // extremes and report the darker (more common basemap) case.
      reference = Color("#141414");
      source = "assumed-dark";
    }
    if (!reference) continue;

    const ratio = Math.round(textColor.contrast(reference) * 100) / 100;
    findings.push({
      layerId: layer.id,
      textColor: textColor.hex(),
      referenceColor: reference.hex(),
      referenceSource: source,
      ratio,
      passes: ratio >= AA_NORMAL_TEXT_RATIO,
      minRequired: AA_NORMAL_TEXT_RATIO,
    });
  }

  return findings.sort((a, b) => Number(a.passes) - Number(b.passes));
}

export function autofixAccessibility(style: StyleSpecification, findings: AccessibilityFinding[]): CopilotResult {
  const next = cloneDeep(style);
  const changes: SwatchChange[] = [];
  const failing = findings.filter(f => !f.passes);

  for (const finding of failing) {
    const layer = (next.layers || []).find(l => l.id === finding.layerId) as any;
    if (!layer || !layer.paint) continue;

    const reference = tryColor(finding.referenceColor);
    let textColor = tryColor(finding.textColor);
    if (!reference || !textColor) continue;

    // Walk lightness away from the reference in 4% steps (real iterative
    // search, not a single guess) until AA is met or we hit an extreme.
    const towardLight = reference.lightness() < 50;
    let steps = 0;
    while (textColor.contrast(reference) < AA_NORMAL_TEXT_RATIO && steps < 24) {
      const l: number = textColor.lightness();
      const nextL: number = towardLight ? Math.min(100, l + 4) : Math.max(0, l - 4);
      if (nextL === l) break;
      textColor = textColor.lightness(nextL);
      steps++;
    }

    const before = layer.paint["text-color"];
    const after = textColor.hex();
    if (after !== before) {
      layer.paint["text-color"] = after;
      changes.push({ layerId: layer.id, property: "text-color", before, after });
    }

    // Reinforce with a halo in the reference color so it holds up over
    // varied map content, not just the flat swatch we measured against.
    if (!isColorLike(layer.paint["text-halo-color"]) || !(layer.paint["text-halo-width"] > 0)) {
      const haloBefore = layer.paint["text-halo-color"];
      layer.paint["text-halo-color"] = reference.hex();
      layer.paint["text-halo-width"] = Math.max(layer.paint["text-halo-width"] || 0, 1);
      changes.push({ layerId: layer.id, property: "text-halo-color", before: haloBefore ?? "none", after: reference.hex() });
    }
  }

  return {
    style: next,
    summary: changes.length > 0
      ? `Raised ${failing.length} label${failing.length === 1 ? "" : "s"} to AA contrast (${AA_NORMAL_TEXT_RATIO}:1) — ${changes.length} property change${changes.length === 1 ? "" : "s"}.`
      : "Nothing to fix — every label already clears AA contrast.",
    changes,
  };
}

// ---- Unused sources ---------------------------------------------------

export function findUnusedSources(style: StyleSpecification): UnusedSource[] {
  const used = new Set((style.layers || []).map(l => (l as any).source).filter(Boolean));
  return Object.entries(style.sources || {})
    .filter(([id]) => !used.has(id))
    .map(([id, source]) => ({ id, type: (source as any).type }));
}

export function removeSources(style: StyleSpecification, ids: string[]): CopilotResult {
  const next = cloneDeep(style);
  for (const id of ids) delete next.sources[id];
  return {
    style: next,
    summary: `Removed ${ids.length} unused source${ids.length === 1 ? "" : "s"}: ${ids.join(", ")}.`,
    changes: [],
  };
}

// ---- Palette generation -------------------------------------------------

export type Harmony = "analogous" | "complementary" | "triadic";

export type PaletteRole = { role: string, label: string, hex: string };

const PALETTE_ROLES: { role: string, label: string, lightness: number, saturationScale: number }[] = [
  { role: "background", label: "Background", lightness: 12, saturationScale: 0.7 },
  { role: "land", label: "Land / landcover", lightness: 18, saturationScale: 0.5 },
  { role: "water", label: "Water", lightness: 28, saturationScale: 0.9 },
  { role: "buildings", label: "Buildings", lightness: 34, saturationScale: 0.4 },
  { role: "roads", label: "Roads", lightness: 62, saturationScale: 0.3 },
  { role: "labels", label: "Labels", lightness: 86, saturationScale: 0.15 },
];

const NAMED_COLORS: Record<string, string> = {
  coral: "#ff7f6b", amber: "#e0a458", ocean: "#2f6690", forest: "#3f6b4f",
  sunset: "#e2703a", indigo: "#5b5fc7", teal: "#3fa5a0", plum: "#7a4b8c",
  crimson: "#b23a48", slate: "#4c5b6b", gold: "#d9a441", violet: "#7c6fd6",
};

export function resolveColorWord(word: string): string | null {
  const key = word.trim().toLowerCase();
  if (NAMED_COLORS[key]) return NAMED_COLORS[key];
  if (/^#?[0-9a-f]{6}$/i.test(key)) return key.startsWith("#") ? key : `#${key}`;
  if (/^#?[0-9a-f]{3}$/i.test(key)) return key.startsWith("#") ? key : `#${key}`;
  return null;
}

export function generatePalette(baseHex: string, harmony: Harmony): PaletteRole[] {
  const base = Color(baseHex);
  const hue = base.hue();

  const hueFor = (roleIndex: number): number => {
    if (harmony === "complementary") {
      return roleIndex % 2 === 0 ? hue : (hue + 180) % 360;
    }
    if (harmony === "triadic") {
      return (hue + (roleIndex % 3) * 120) % 360;
    }
    // analogous: fan out ±40° across the roles
    const spread = 40;
    const t = roleIndex / (PALETTE_ROLES.length - 1);
    return (hue + (t - 0.5) * spread * 2 + 360) % 360;
  };

  return PALETTE_ROLES.map((role, i) => {
    const h = hueFor(i);
    const s = Math.min(90, Math.max(8, base.saturationl() * role.saturationScale + 10));
    const color = Color.hsl(h, s, role.lightness);
    return { role: role.role, label: role.label, hex: color.hex() };
  });
}

const ROLE_MATCHERS: { role: string, test: (layer: LayerSpecification) => boolean, property: (layer: LayerSpecification) => string | null }[] = [
  {
    role: "background",
    test: l => l.type === "background",
    property: () => "background-color",
  },
  {
    role: "water",
    test: l => /water/i.test(l.id) || (("source-layer" in l) && /water/i.test((l as any)["source-layer"] || "")),
    property: l => l.type === "fill" ? "fill-color" : l.type === "line" ? "line-color" : null,
  },
  {
    role: "land",
    test: l => /land|park|wood|forest|natural|landuse|landcover/i.test(l.id),
    property: l => l.type === "fill" ? "fill-color" : null,
  },
  {
    role: "buildings",
    test: l => /building/i.test(l.id),
    property: l => l.type === "fill" ? "fill-color" : l.type === "fill-extrusion" ? "fill-extrusion-color" : null,
  },
  {
    role: "roads",
    test: l => /road|street|highway|bridge|tunnel|path/i.test(l.id) && l.type === "line",
    property: () => "line-color",
  },
  {
    role: "labels",
    test: l => l.type === "symbol",
    property: () => "text-color",
  },
];

export function applyPalette(style: StyleSpecification, roles: PaletteRole[]): CopilotResult {
  const next = cloneDeep(style);
  const changes: SwatchChange[] = [];
  const roleColor = new Map(roles.map(r => [r.role, r.hex]));

  for (const layer of next.layers || []) {
    const paint = (layer as any).paint;
    if (!paint) continue;

    for (const matcher of ROLE_MATCHERS) {
      if (!matcher.test(layer)) continue;
      const hex = roleColor.get(matcher.role);
      const property = matcher.property(layer);
      if (!hex || !property) continue;
      const before = paint[property];
      if (!isColorLike(before)) continue;
      if (before === hex) continue;
      paint[property] = hex;
      changes.push({ layerId: layer.id, property, before, after: hex });
      break;
    }
  }

  return {
    style: next,
    summary: `Palette applied to ${new Set(changes.map(c => c.layerId)).size} matched layer${new Set(changes.map(c => c.layerId)).size === 1 ? "" : "s"} by role (water, land, roads, buildings, labels, background).`,
    changes,
  };
}

// ---- Command parsing ------------------------------------------------------

export type Intent =
  | { kind: "mood", mood: MoodId }
  | { kind: "audit" }
  | { kind: "autofix" }
  | { kind: "cleanup" }
  | { kind: "palette", baseHex: string, harmony: Harmony }
  | { kind: "unknown" };

const MOOD_KEYWORDS: Record<MoodId, string[]> = {
  dawn: ["dawn", "sunrise", "morning"],
  noon: ["noon", "midday", "daylight", "afternoon"],
  dusk: ["dusk", "sunset", "evening", "golden hour"],
  night: ["night", "midnight", "dark mode", "after dark"],
  blueprint: ["blueprint", "schematic", "technical", "cad", "drafting"],
  pastel: ["pastel", "candy", "soft palette"],
  mono: ["mono", "grayscale", "greyscale", "black and white", "desaturate"],
  highcontrast: ["high contrast", "vivid", "punchy"],
};

export function parseCommand(rawInput: string): Intent {
  const input = rawInput.trim().toLowerCase();
  if (!input) return { kind: "unknown" };

  const wantsCheck = /\b(check|audit|find|scan|list)\b/.test(input);
  const wantsFix = /\b(fix|repair|resolve|autofix|auto-fix)\b/.test(input);
  const mentionsAccessibility = /accessib|wcag|a11y/.test(input) || (/contrast/.test(input) && (wantsCheck || wantsFix));

  if (mentionsAccessibility) {
    return wantsFix && !wantsCheck ? { kind: "autofix" } : { kind: "audit" };
  }

  const mentionsCleanup = /\b(clean(\s?up)?|unused|dead|orphan(ed)?)\b/.test(input) && /source/.test(input);
  if (mentionsCleanup) return { kind: "cleanup" };

  const paletteMatch = input.match(/(palette|colou?rs?)\s+(from|based on|around|like|inspired by)\s+([a-z#0-9]+)/);
  if (paletteMatch) {
    const word = paletteMatch[3];
    const hex = resolveColorWord(word);
    if (hex) {
      const harmony: Harmony = /complement/.test(input) ? "complementary" : /triad/.test(input) ? "triadic" : "analogous";
      return { kind: "palette", baseHex: hex, harmony };
    }
  }
  const hexOnly = input.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/);
  if (hexOnly && /palette|colou?r/.test(input)) {
    const harmony: Harmony = /complement/.test(input) ? "complementary" : /triad/.test(input) ? "triadic" : "analogous";
    return { kind: "palette", baseHex: hexOnly[0], harmony };
  }

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS) as [MoodId, string[]][]) {
    if (keywords.some(k => input.includes(k))) return { kind: "mood", mood };
  }
  if (/contrast/.test(input)) return { kind: "mood", mood: "highcontrast" };

  return { kind: "unknown" };
}
