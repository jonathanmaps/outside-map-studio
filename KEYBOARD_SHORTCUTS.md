# Outside Map Studio — Keyboard Shortcuts Reference

## Global Shortcuts

### Navigation & Panels
| Key | Action | Description |
|-----|--------|-------------|
| **⌘K** or **Ctrl+K** | Command Palette | Open fuzzy search to jump to any feature, panel, or layer |
| **/** | Command Palette | Open fuzzy search (alternative) |
| **?** | Shortcuts Help | Show this keyboard shortcuts reference |

---

## Modal Dialogs

### Quick Access
| Key | Action | Dialog |
|-----|--------|--------|
| **O** | Open | Import or open a style file |
| **S** | Save / Export | Download current style as JSON |
| **D** | Data Sources | Manage map sources (tiles, vectors, images) |
| **J** | JSON Editor | Open full-screen code editor |
| **G** | Global State | Edit MapLibre GL global state variables |
| **!** | Debug | Development tools and debug info |

---

## Dock Panels (Right Side)

### Feature Toggles
| Key | Action | Panel |
|-----|--------|-------|
| **C** | Copilot | Toggle AI design assistant (mood presets, palettes, accessibility) |
| **T** | Timeline | Toggle checkpoint snapshots and version history |
| **W** | Workspace | Toggle project/style management panel |

---

## Map Interaction

### Map Focus & Inspection
| Key | Action | Description |
|-----|--------|-------------|
| **I** | Inspect Toggle | Switch between normal map mode and inspect mode |
| **M** | Focus Map | Focus the map canvas for interaction |

---

## Undo/Redo

### Change History
| Key | Action | Platform |
|-----|--------|----------|
| **⌘Z** | Undo | macOS |
| **Ctrl+Z** | Undo | Windows/Linux |
| **⌘Shift+Z** | Redo | macOS |
| **Ctrl+Y** | Redo | Windows/Linux |

---

## Command Palette (⌘K)

When the Command Palette is open, you can search for and execute any action:

### Meridian Features
- **Open Copilot** - AI design assistant
- **Open Timeline** - Version snapshots
- **Open Workspace** - Project management
- **Open Code Editor** - JSON editing
- **Shortcuts** - View this reference

### Dialogs
- **Open** - Import styles
- **Export** - Download style
- **Sources** - Manage data sources
- **Settings** - App settings
- **Global State** - Edit state variables
- **Debug** - Dev tools

### Layer Actions
- Jump to any layer by name (type layer name in palette)
- Layer visibility toggle
- Layer selection

---

## Context Menus

### Right-Click Actions
| Element | Actions |
|---------|---------|
| **Layer** | Visibility, Lock, Duplicate, Delete, Edit properties |
| **Source** | Edit, Delete |
| **Map Area** | Drag and drop JSON files to load styles |

---

## Drag & Drop

### File Operations
| Action | Behavior |
|--------|----------|
| **Drag JSON onto map** | Load map style from file |
| **Drag layer in list** | Reorder layers |
| **Drag panel divider** | Resize panels |

---

## Search & Input

### Within Components
| Context | Shortcut | Action |
|---------|----------|--------|
| **Layer Search** | Type | Fuzzy search layers by name/type |
| **Checkpoint Import** | ⏎ (Enter) | Confirm file import |
| **Coordinate Jump** | ⏎ (Enter) | Navigate to coordinates |
| **Any Input** | Esc | Cancel/Close |

---

## Checkpoint Timeline

### Checkpoint Actions
| Action | Method |
|--------|--------|
| **Preview** | Click 👁️ icon |
| **Restore** | Click ↩️ icon |
| **Export** | Click ⬇️ icon |
| **Delete** | Click 🗑️ icon |
| **Compare** | Select 2 checkpoints with ☑️ |

---

## Special Keys

### Modifiers by Platform
| Action | macOS | Windows/Linux |
|--------|-------|--------------|
| **Command** | ⌘ (Cmd) | Ctrl |
| **Option** | ⌥ (Alt) | Alt |
| **Shift** | ⇧ (Shift) | Shift |

---

## Tips & Tricks

### Power User Workflow
1. **Open Command Palette** (⌘K)
2. **Search for layer** by typing name
3. **Jump to layer** by selecting result
4. **Edit properties** in the layer panel
5. **Save checkpoint** (T for Timeline, then click "Save")
6. **Compare versions** (T, select 2 checkpoints)

### Quick Design Workflow
1. **Open Copilot** (C)
2. **Choose mood** (Dawn/Noon/Dusk/etc)
3. **Apply palette** 
4. **Check accessibility** (audit)
5. **Export** (E)

### Multi-Project Workflow
1. **Open Workspace** (W)
2. **Switch between projects** (click in list)
3. **Pin favorites** (star icon)
4. **Compare versions** (T, open Timeline)

---

## Accessibility

### Screen Reader Support
- All shortcuts have ARIA labels
- Keyboard navigation fully supported
- Focus indicators visible
- High contrast mode available

### Keyboard-Only Navigation
- Entire app usable without mouse
- Tab through interactive elements
- Enter/Space to activate buttons
- Arrow keys for selection/scrolling

---

## Troubleshooting

### Shortcuts Not Working?
1. Make sure you're not typing in an input field
2. Check if the shortcut is for a modal (must not be in text editor)
3. Try clicking on the map first (gives map focus)
4. Press **M** to ensure map has focus

### Can't See Shortcuts?
- Press **?** to open shortcuts dialog
- Use Command Palette (⌘K) to search for actions
- Look for tooltips on toolbar buttons (hover)

---

## Customization

Currently, keyboard shortcuts are **not customizable** (planned feature).

For now, all shortcuts are hardcoded. You can:
- Use the **Command Palette (⌘K)** to search for most actions
- Use mouse for alternative workflows
- Open issues on GitHub if you need specific shortcuts

---

**Last Updated:** 2026-09-01  
**Version:** 3.1.0  
**Questions?** Press **?** or use Command Palette (**⌘K**)
