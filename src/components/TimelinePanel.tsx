import React from "react";
import { MdHistory, MdRestore, MdVisibility, MdDelete, MdAdd, MdArrowForward, MdClose, MdDownload } from "react-icons/md";

import { DockPanel } from "./DockPanel";
import {
  listSnapshots, createSnapshot, deleteSnapshot, SnapshotStorageError,
  diffStyles, summarizeDiff, type Snapshot, type DiffEntry,
} from "../libs/snapshots";
import type { OnStyleChangedCallback, StyleSpecificationWithId } from "../libs/definitions";

type TimelinePanelProps = {
  mapStyle: StyleSpecificationWithId
  onStyleChanged: OnStyleChangedCallback
  onClose(): void
  onSelectCheckpoints?(checkpoints: [string, string] | null): void
};

type TimelinePanelState = {
  snapshots: Snapshot[]
  savingLabel: string | null
  /** Style to hand back when leaving a preview. Null when not previewing. */
  previewingFrom: StyleSpecificationWithId | null
  /** Checkpoint whose content is currently on the map — set by both
   * preview and restore, and re-verified on render against the live
   * style so an edit drops the marker rather than leaving it stale. */
  viewingId: string | null
  compareSelection: string[]
  error: string | null
};

function relativeTime(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export class TimelinePanel extends React.Component<TimelinePanelProps, TimelinePanelState> {
  state: TimelinePanelState = {
    snapshots: [],
    savingLabel: null,
    previewingFrom: null,
    viewingId: null,
    compareSelection: [],
    error: null,
  };

  componentDidMount() {
    this.loadSnapshots();
  }

  componentDidUpdate(prevProps: TimelinePanelProps) {
    if (prevProps.mapStyle.id !== this.props.mapStyle.id) {
      // Clear timeline state when switching to a new style
      this.setState({
        snapshots: [],
        viewingId: null,
        previewingFrom: null,
        compareSelection: [],
        error: null,
      });
      this.loadSnapshots();
    }
  }

  loadSnapshots = async () => {
    try {
      const snapshots = await listSnapshots(this.props.mapStyle.id);
      this.setState({ snapshots, error: null });
    } catch (error) {
      console.error("Failed to load snapshots:", error);
    }
  };

  refresh = async () => {
    await this.loadSnapshots();
  };

  startSaving = () => this.setState({ savingLabel: "" });

  importCheckpoint = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let style = data;
      let label = "";

      // Check if it's a checkpoint format (has id, label, style, createdAt)
      if (data.id && data.label && data.style && typeof data.createdAt === "number") {
        // It's already a checkpoint
        style = data.style;
        label = data.label;
      } else if (data.version && (data.layers || data.sources)) {
        // It's a regular map style - convert to checkpoint
        style = data;
        label = data.name || file.name.replace(/\.json$/, "").replace(/[-_]/g, " ");
      } else {
        throw new Error("File must be either a map style JSON or a checkpoint JSON");
      }

      // Ensure the style has the right ID
      style.id = this.props.mapStyle.id;

      // Create the checkpoint with the extracted label
      await createSnapshot(this.props.mapStyle.id, label || `Imported ${new Date().toLocaleTimeString()}`, style);
      this.setState({ error: null }, this.refresh);

      // Reset input so same file can be imported again
      event.target.value = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import checkpoint";
      this.setState({ error: message });
    }
  };

  confirmSaving = async () => {
    const label = this.state.savingLabel?.trim();
    try {
      await createSnapshot(this.props.mapStyle.id, label || "", this.props.mapStyle);
      this.setState({ savingLabel: null, error: null }, this.refresh);
    } catch (error) {
      if (error instanceof SnapshotStorageError) {
        if (error.kind === "quota") {
          this.setState({
            error: "Storage full. Delete old checkpoints to save new ones.",
            savingLabel: null,
          });
        } else {
          this.setState({
            error: error.message,
            savingLabel: null,
          });
        }
      } else {
        this.setState({
          error: "Failed to save checkpoint",
          savingLabel: null,
        });
      }
    }
  };

  preview = (snapshot: Snapshot) => {
    const from = this.state.previewingFrom ?? this.props.mapStyle;
    this.setState({ previewingFrom: from, viewingId: snapshot.id });
    this.props.onStyleChanged(snapshot.style, { save: false, addRevision: false });
  };

  returnToCurrent = () => {
    if (!this.state.previewingFrom) return;
    this.props.onStyleChanged(this.state.previewingFrom, { save: false, addRevision: false });
    this.setState({ previewingFrom: null, viewingId: null });
  };

  restore = (snapshot: Snapshot) => {
    this.props.onStyleChanged(snapshot.style);
    // Restoring ends the preview, but the map now *is* this checkpoint,
    // so it stays marked as the one being viewed.
    this.setState({ previewingFrom: null, viewingId: snapshot.id });
  };

  remove = async (snapshot: Snapshot) => {
    try {
      await deleteSnapshot(this.props.mapStyle.id, snapshot.id);
      this.setState(state => ({
        compareSelection: state.compareSelection.filter(id => id !== snapshot.id),
        viewingId: state.viewingId === snapshot.id ? null : state.viewingId,
        error: null,
      }), this.refresh);
    } catch (error) {
      this.setState({ error: "Failed to delete checkpoint" });
    }
  };

  exportCheckpoint = (snapshot: Snapshot) => {
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${snapshot.label.replace(/\s+/g, "-").toLowerCase()}-checkpoint.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  toggleCompare = (id: string) => {
    this.setState(state => {
      const has = state.compareSelection.includes(id);
      let next: string[];
      if (has) {
        next = state.compareSelection.filter(x => x !== id);
      } else {
        next = [...state.compareSelection, id].slice(-2);
      }

      // Call callback when 2 checkpoints are selected/deselected
      if (this.props.onSelectCheckpoints) {
        if (next.length === 2) {
          this.props.onSelectCheckpoints(next as [string, string]);
        } else {
          this.props.onSelectCheckpoints(null);
        }
      }

      return { compareSelection: next };
    });
  };

  render() {
    const { snapshots, compareSelection, previewingFrom } = this.state;
    const compareEntries = compareSelection.length === 2
      ? snapshots.filter(s => compareSelection.includes(s.id)).sort((a, b) => a.createdAt - b.createdAt)
      : null;
    const diffEntries: DiffEntry[] | null = compareEntries
      ? diffStyles(compareEntries[0].style, compareEntries[1].style)
      : null;

    // Only claim a checkpoint is on screen if the live style still matches
    // it — one semantic diff against the single candidate, so editing after
    // a restore clears the marker instead of leaving it lying.
    const candidate = snapshots.find(s => s.id === this.state.viewingId);
    const viewingId = candidate && diffStyles(candidate.style, this.props.mapStyle).length === 0
      ? candidate.id
      : null;
    const viewingLabel = viewingId ? candidate!.label : null;

    return <DockPanel title="Timeline" icon={<MdHistory />} onClose={this.props.onClose}>
      <p className="meridian-panel-subtitle">
        Checkpoints you name on purpose — separate from undo. Preview any of them on the live map, restore, or compare two side by side.
      </p>

      {this.state.error && (
        <div className="meridian-error-banner">
          <span>{this.state.error}</span>
          <button className="meridian-icon-btn" onClick={() => this.setState({ error: null })} title="Dismiss">
            <MdClose size={14} />
          </button>
        </div>
      )}

      {viewingId && (
        <div className="meridian-card meridian-card--viewing">
          <div className="meridian-card-row">
            <MdVisibility size={14} />
            <span className="meridian-card-title">
              {previewingFrom ? "Previewing" : "Showing"} “{viewingLabel}”
            </span>
            {previewingFrom && (
              <button className="meridian-btn meridian-btn--sm" onClick={this.returnToCurrent}>Return to current</button>
            )}
          </div>
        </div>
      )}

      <div className="meridian-section">
        <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          <button className="meridian-btn meridian-btn--accent meridian-btn--block" onClick={this.startSaving} style={{ flex: 1 }}>
            <MdAdd size={14} /> Save checkpoint
          </button>
          <label className="meridian-btn meridian-btn--accent" style={{ cursor: "pointer", flex: 1, marginBottom: 0 }}>
            📂 Import
            <input
              type="file"
              accept=".json"
              onChange={this.importCheckpoint}
              style={{ display: "none" }}
              aria-label="Import checkpoint file"
            />
          </label>
        </div>

        {this.state.savingLabel !== null && (
          <div className="meridian-prompt-input-row">
            <input
              autoFocus
              className="meridian-prompt-input"
              placeholder={`Checkpoint ${snapshots.length + 1}`}
              value={this.state.savingLabel}
              onChange={e => this.setState({ savingLabel: e.target.value })}
              onKeyDown={e => {
                if (e.key === "Enter") this.confirmSaving();
                if (e.key === "Escape") this.setState({ savingLabel: null });
              }}
            />
            <button className="meridian-btn meridian-btn--accent" onClick={this.confirmSaving}>Save</button>
            <button className="meridian-icon-btn" onClick={() => this.setState({ savingLabel: null })}><MdClose /></button>
          </div>
        )}
      </div>

      {snapshots.length === 0 && (
        <div className="meridian-empty">No checkpoints yet. Save one before a big change so you can always get back here.</div>
      )}

      {snapshots.length > 0 && (
        <div className="meridian-section">
          <div className="meridian-section-title">
            <span>History</span>
            {compareSelection.length > 0 && <span>{compareSelection.length}/2 selected to compare</span>}
          </div>
          <div className="meridian-timeline">
            {snapshots.map((snapshot, i) => {
              const prev = snapshots[i + 1];
              const summary = prev ? summarizeDiff(diffStyles(prev.style, snapshot.style)) : "Initial checkpoint";
              const isViewing = viewingId === snapshot.id;
              return <div className="meridian-timeline-entry" key={snapshot.id}>
                <span className={`meridian-timeline-dot${isViewing ? " meridian-timeline-dot--current" : ""}`} />
                <div
                  className={`meridian-card${isViewing ? " meridian-card--viewing" : ""}`}
                  aria-current={isViewing ? "true" : undefined}
                >
                  <div className="meridian-card-row">
                    <input
                      type="checkbox"
                      className="meridian-timeline-select"
                      checked={compareSelection.includes(snapshot.id)}
                      onChange={() => this.toggleCompare(snapshot.id)}
                      aria-label={`Select ${snapshot.label} to compare`}
                    />
                    <span className="meridian-card-title">{snapshot.label}</span>
                    {isViewing && <span className="meridian-viewing-badge">Viewing</span>}
                    <button className="meridian-icon-btn" title="Preview" onClick={() => this.preview(snapshot)}><MdVisibility size={14} /></button>
                    <button className="meridian-icon-btn" title="Restore" onClick={() => this.restore(snapshot)}><MdRestore size={14} /></button>
                    <button className="meridian-icon-btn" title="Export as JSON" onClick={() => this.exportCheckpoint(snapshot)}><MdDownload size={14} /></button>
                    <button className="meridian-icon-btn" title="Delete" onClick={() => this.remove(snapshot)}><MdDelete size={14} /></button>
                  </div>
                  <div className="meridian-card-meta">{relativeTime(snapshot.createdAt)} · {summary}</div>
                </div>
              </div>;
            })}
          </div>
        </div>
      )}

      {diffEntries && compareEntries && (
        <div className="meridian-section">
          <div className="meridian-section-title">
            {compareEntries[0].label} <MdArrowForward size={10} style={{ margin: "0 4px" }} /> {compareEntries[1].label}
          </div>
          {diffEntries.length === 0 && <div className="meridian-empty">Identical.</div>}
          {diffEntries.slice(0, 60).map((entry, i) => (
            <div className="meridian-diff-row" key={i}>
              <span className={`meridian-diff-badge meridian-diff-badge--${entry.kind}`}>{entry.kind}</span>
              {entry.colorBefore && entry.colorAfter && (
                <span className="meridian-swatch-pair">
                  <span className="meridian-swatch" style={{ background: entry.colorBefore }} />
                  <MdArrowForward className="meridian-swatch-arrow" />
                  <span className="meridian-swatch" style={{ background: entry.colorAfter }} />
                </span>
              )}
              <span className="meridian-diff-text">{entry.text}</span>
            </div>
          ))}
        </div>
      )}
    </DockPanel>;
  }
}
