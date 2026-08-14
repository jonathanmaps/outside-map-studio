/**
 * Outside brand values needed outside the stylesheets.
 *
 * CodeMirror is themed in JavaScript, so it can't read the SCSS variables.
 * Keeping the few values it needs here — rather than as loose hex literals
 * at the call site — means there's one obvious place to change when the
 * palette moves. Mirrors `$color-accent*` in `src/styles/_vars.scss`.
 */
export const BRAND = {
  /** Outside yellow. Action and selection only. */
  accent: "#ffd100",
  accentStrong: "#ffda33",
  /** Selection echoes and other secondary highlights. */
  accentSoft: "rgba(255, 209, 0, 0.28)",
  /** Active-line wash — present but never competing with the code. */
  accentFaint: "rgba(255, 209, 0, 0.08)",
  cream: "#faf3e8",
  ink: "#000000",
} as const;
