import React from "react";
import { MdHistory, MdRestore, MdVisibility, MdDelete, MdAdd, MdArrowForward, MdClose } from "react-icons/md";

import { DockPanel } from "./DockPanel";
import {
  listSnapshots, createSnapshot, deleteSnapshot,
  diffStyles, summarizeDiff, type Snapshot, type DiffEntry,
} from "../libs/snapshots";
import type { OnStyleChangedCallback, StyleSpecificationWithId } from "../libs/definitions";

type TimelinePanelProps = {
  mapStyle: StyleSpecificationWithId
  onStyleChanged: OnStyleChangedCallback
  onClose(): void
};

type TimelinePanelState = {
  snapshots: Snapshot[]
  savingLabel: string | null
  previewingFrom: StyleSpecificationWithId | null
  previewingId: string | null
  compareSelection: string[]
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
    snapshots: listSnapshots(this.props.mapStyle.id),
    savingLabel: null,
    previewingFrom: null,
    previewingId: null,
    compareSelection: [],
  };

  refresh = () => {
    this.setState({ snapshots: listSnapshots(this.props.mapStyle.id) });
  };

  startSaving = () => this.setState({ savingLabel: "" });

  confirmSaving = () => {
    const label = this.state.savingLabel?.trim();
    createSnapshot(this.props.mapStyle.id, label || "", this.props.mapStyle);
    this.setState({ savingLabel: null }, this.refresh);
  };

  preview = (snapshot: Snapshot) => {
    const from = this.state.previewingFrom ?? this.props.mapStyle;
    this.setState({ previewingFrom: from, previewingId: snapshot.id });
    this.props.onStyleChanged(snapshot.style, { save: false, addRevision: false });
  };

  returnToCurrent = () => {
    if (!this.state.previewingFrom) return;
    this.props.onStyleChanged(this.state.previewingFrom, { save: false, addRevision: false });
    this.setState({ previewingFrom: null, previewingId: null });
  };

  restore = (snapshot: Snapshot) => {
    this.props.onStyleChanged(snapshot.style);
    this.setState({ previewingFrom: null, previewingId: null });
  };

  remove = (snapshot: Snapshot) => {
    deleteSnapshot(this.props.mapStyle.id, snapshot.id);
    this.setState({ compareSelection: this.state.compareSelection.filter(id => id !== snapshot.id) }, this.refresh);
  };

  toggleCompare = (id: string) => {
    this.setState(state => {
      const has = state.compareSelection.includes(id);
      if (has) return { compareSelection: state.compareSelection.filter(x => x !== id) };
      const next = [...state.compareSelection, id].slice(-2);
      return { compareSelection: next };
    });
  };

  render() {
    const { snapshots, previewingId, compareSelection } = this.state;
    const compareEntries = compareSelection.length === 2
      ? snapshots.filter(s => compareSelection.includes(s.id)).sort((a, b) => a.createdAt - b.createdAt)
      : null;
    const diffEntries: DiffEntry[] | null = compareEntries
      ? diffStyles(compareEntries[0].style, compareEntries[1].style)
      : null;

    return <DockPanel title="Timeline" icon={<MdHistory />} onClose={this.props.onClose}>
      <p className="meridian-panel-subtitle">
        Checkpoints you name on purpose — separate from undo. Preview any of them on the live map, restore, or compare two side by side.
      </p>

      {previewingId && (
        <div className="meridian-card" style={{ borderColor: "rgba(217,154,91,0.4)" }}>
          <div className="meridian-card-row">
            <span className="meridian-card-title">Previewing a checkpoint</span>
            <button className="meridian-btn meridian-btn--sm" onClick={this.returnToCurrent}>Return to current</button>
          </div>
        </div>
      )}

      <div className="meridian-section">
        {this.state.savingLabel === null ? (
          <button className="meridian-btn meridian-btn--accent meridian-btn--block" onClick={this.startSaving}>
            <MdAdd size={14} /> Save checkpoint
          </button>
        ) : (
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
              return <div className="meridian-timeline-entry" key={snapshot.id}>
                <span className={`meridian-timeline-dot${previewingId === snapshot.id ? " meridian-timeline-dot--current" : ""}`} />
                <div className="meridian-card">
                  <div className="meridian-card-row">
                    <input
                      type="checkbox"
                      className="meridian-timeline-select"
                      checked={compareSelection.includes(snapshot.id)}
                      onChange={() => this.toggleCompare(snapshot.id)}
                      aria-label={`Select ${snapshot.label} to compare`}
                    />
                    <span className="meridian-card-title">{snapshot.label}</span>
                    <button className="meridian-icon-btn" title="Preview" onClick={() => this.preview(snapshot)}><MdVisibility size={14} /></button>
                    <button className="meridian-icon-btn" title="Restore" onClick={() => this.restore(snapshot)}><MdRestore size={14} /></button>
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
