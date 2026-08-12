import React from "react";
import classnames from "classnames";
import { MdFolderOpen, MdPushPin, MdContentCopy, MdDelete, MdEdit, MdCheck, MdClose } from "react-icons/md";

import { DockPanel } from "./DockPanel";
import {
  listWorkspace, toggleWorkspacePin, renameWorkspaceEntry,
  duplicateWorkspaceEntry, deleteWorkspaceEntry, type WorkspaceEntry,
} from "../libs/workspace";
import type { StyleSpecificationWithId } from "../libs/definitions";

type WorkspacePanelProps = {
  currentStyleId: string
  onOpenStyle(style: StyleSpecificationWithId): void
  onClose(): void
};

type WorkspacePanelState = {
  entries: WorkspaceEntry[]
  renamingId: string | null
  renameValue: string
};

function relativeTime(ts: number): string {
  if (!ts) return "not yet saved here";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export class WorkspacePanel extends React.Component<WorkspacePanelProps, WorkspacePanelState> {
  state: WorkspacePanelState = {
    entries: listWorkspace(),
    renamingId: null,
    renameValue: "",
  };

  refresh = () => this.setState({ entries: listWorkspace() });

  togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleWorkspacePin(id);
    this.refresh();
  };

  startRename = (e: React.MouseEvent, entry: WorkspaceEntry) => {
    e.stopPropagation();
    this.setState({ renamingId: entry.id, renameValue: entry.name });
  };

  confirmRename = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (this.state.renamingId) {
      renameWorkspaceEntry(this.state.renamingId, this.state.renameValue.trim() || "Untitled style");
    }
    this.setState({ renamingId: null }, this.refresh);
  };

  duplicate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const copy = duplicateWorkspaceEntry(id);
    this.refresh();
    if (copy) this.props.onOpenStyle(copy);
  };

  remove = (e: React.MouseEvent, entry: WorkspaceEntry) => {
    e.stopPropagation();
    if (entry.id === this.props.currentStyleId) {
      window.alert("This is the style you're currently editing — switch to another one first.");
      return;
    }
    if (!window.confirm(`Delete "${entry.name}" from this browser? This can't be undone.`)) return;
    deleteWorkspaceEntry(entry.id);
    this.refresh();
  };

  render() {
    const { entries, renamingId } = this.state;

    return <DockPanel title="Workspace" icon={<MdFolderOpen />} onClose={this.props.onClose}>
      <p className="meridian-panel-subtitle">
        Every style saved in this browser, in one place — switch, duplicate, pin, or clear them out without the import/export dance.
      </p>

      {entries.length === 0 && <div className="meridian-empty">Nothing saved yet.</div>}

      {entries.map(entry => {
        const isActive = entry.id === this.props.currentStyleId;
        const isRenaming = renamingId === entry.id;

        return <div
          key={entry.id}
          className={classnames("meridian-workspace-item", { "meridian-workspace-item--active": isActive })}
          onClick={() => {
            if (isActive || isRenaming) return;
            this.props.onOpenStyle(entry.style);
            setTimeout(this.refresh, 0);
          }}
        >
          <span className="meridian-workspace-swatches">
            {entry.swatches.map((c, i) => <span key={i} style={{ background: c }} />)}
          </span>

          <span className="meridian-workspace-info">
            {isRenaming ? (
              <input
                autoFocus
                className="meridian-prompt-input"
                style={{ padding: "3px 6px" }}
                value={this.state.renameValue}
                onClick={e => e.stopPropagation()}
                onChange={e => this.setState({ renameValue: e.target.value })}
                onKeyDown={e => {
                  if (e.key === "Enter") this.confirmRename(e);
                  if (e.key === "Escape") this.setState({ renamingId: null });
                }}
              />
            ) : (
              <>
                <div className="meridian-workspace-name">{entry.name}{isActive ? " · current" : ""}</div>
                <div className="meridian-workspace-meta">{entry.layerCount} layers · {relativeTime(entry.updatedAt)}</div>
              </>
            )}
          </span>

          {isRenaming ? (
            <span className="meridian-workspace-actions" style={{ opacity: 1 }}>
              <button className="meridian-icon-btn" onClick={this.confirmRename}><MdCheck size={14} /></button>
              <button className="meridian-icon-btn" onClick={e => { e.stopPropagation(); this.setState({ renamingId: null }); }}><MdClose size={14} /></button>
            </span>
          ) : (
            <span className="meridian-workspace-actions">
              <button
                className={classnames("meridian-icon-btn", "meridian-pin", { "meridian-pin--active": entry.pinned })}
                title={entry.pinned ? "Unpin" : "Pin"}
                onClick={e => this.togglePin(e, entry.id)}
              ><MdPushPin size={14} /></button>
              <button className="meridian-icon-btn" title="Rename" onClick={e => this.startRename(e, entry)}><MdEdit size={14} /></button>
              <button className="meridian-icon-btn" title="Duplicate" onClick={e => this.duplicate(e, entry.id)}><MdContentCopy size={14} /></button>
              <button className="meridian-icon-btn" title="Delete" onClick={e => this.remove(e, entry)}><MdDelete size={14} /></button>
            </span>
          )}
        </div>;
      })}
    </DockPanel>;
  }
}
