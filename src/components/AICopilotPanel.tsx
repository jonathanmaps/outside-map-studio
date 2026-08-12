import React from "react";
import { MdAutoAwesome, MdCheckCircle, MdError, MdBuild, MdDelete, MdUndo, MdArrowForward } from "react-icons/md";
import type { StyleSpecification } from "maplibre-gl";

import { DockPanel } from "./DockPanel";
import {
  MOODS, type MoodId,
  parseCommand,
  applyMood,
  auditAccessibility, autofixAccessibility, type AccessibilityFinding,
  findUnusedSources, removeSources, type UnusedSource,
  generatePalette, applyPalette, type PaletteRole,
  type SwatchChange,
} from "../libs/aiCopilot";
import type { OnStyleChangedCallback, StyleSpecificationWithId } from "../libs/definitions";

type LogEntry = {
  id: string
  text: string
  time: string
  changes: SwatchChange[]
};

type AICopilotPanelProps = {
  mapStyle: StyleSpecification
  onStyleChanged: OnStyleChangedCallback
  onUndo(): void
  onClose(): void
};

type AICopilotPanelState = {
  prompt: string
  log: LogEntry[]
  findings: AccessibilityFinding[] | null
  unused: UnusedSource[] | null
  paletteDraft: { roles: PaletteRole[], baseHex: string } | null
  hint: string | null
};

const EXAMPLES = [
  "make it feel like dusk",
  "check label contrast",
  "clean up unused sources",
  "palette from teal",
];

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export class AICopilotPanel extends React.Component<AICopilotPanelProps, AICopilotPanelState> {
  state: AICopilotPanelState = {
    prompt: "",
    log: [],
    findings: null,
    unused: null,
    paletteDraft: null,
    hint: null,
  };

  pushLog = (text: string, changes: SwatchChange[]) => {
    const entry: LogEntry = { id: Math.random().toString(36).slice(2), text, time: timeNow(), changes };
    this.setState(state => ({ log: [entry, ...state.log].slice(0, 12) }));
  };

  runMood = (mood: MoodId) => {
    const result = applyMood(this.props.mapStyle, mood);
    this.props.onStyleChanged(result.style as StyleSpecificationWithId);
    this.pushLog(result.summary, result.changes);
  };

  runAudit = () => {
    const findings = auditAccessibility(this.props.mapStyle);
    this.setState({ findings });
    const failing = findings.filter(f => !f.passes).length;
    this.pushLog(
      findings.length === 0
        ? "No symbol layers with a plain text color to audit."
        : `Audit complete — ${failing}/${findings.length} label layer${findings.length === 1 ? "" : "s"} below AA contrast (4.5:1).`,
      []
    );
  };

  runAutofix = () => {
    const findings = this.state.findings ?? auditAccessibility(this.props.mapStyle);
    const result = autofixAccessibility(this.props.mapStyle, findings);
    this.props.onStyleChanged(result.style as StyleSpecificationWithId);
    this.pushLog(result.summary, result.changes);
    this.setState({ findings: auditAccessibility(result.style) });
  };

  runCleanupScan = () => {
    const unused = findUnusedSources(this.props.mapStyle);
    this.setState({ unused });
    this.pushLog(
      unused.length === 0
        ? "No unused sources found — every source is referenced by at least one layer."
        : `Found ${unused.length} unused source${unused.length === 1 ? "" : "s"}: ${unused.map(u => u.id).join(", ")}.`,
      []
    );
  };

  removeUnused = (ids: string[]) => {
    const result = removeSources(this.props.mapStyle, ids);
    this.props.onStyleChanged(result.style as StyleSpecificationWithId);
    this.pushLog(result.summary, []);
    this.setState({ unused: findUnusedSources(result.style) });
  };

  draftPalette = (baseHex: string, harmony: "analogous" | "complementary" | "triadic") => {
    this.setState({ paletteDraft: { roles: generatePalette(baseHex, harmony), baseHex } });
  };

  applyPaletteDraft = () => {
    if (!this.state.paletteDraft) return;
    const result = applyPalette(this.props.mapStyle, this.state.paletteDraft.roles);
    this.props.onStyleChanged(result.style as StyleSpecificationWithId);
    this.pushLog(result.summary, result.changes);
    this.setState({ paletteDraft: null });
  };

  runPrompt = (promptOverride?: string) => {
    const prompt = promptOverride ?? this.state.prompt;
    if (!prompt.trim()) return;
    const intent = parseCommand(prompt);

    switch (intent.kind) {
      case "mood":
        this.runMood(intent.mood);
        break;
      case "audit":
        this.runAudit();
        break;
      case "autofix":
        this.runAutofix();
        break;
      case "cleanup":
        this.runCleanupScan();
        break;
      case "palette":
        this.draftPalette(intent.baseHex, intent.harmony);
        break;
      case "unknown":
        this.setState({
          hint: "Didn't recognize that one. Try a mood (dusk, night, blueprint…), \"check label contrast\", \"clean up unused sources\", or \"palette from <color>\"."
        });
        return;
    }
    this.setState({ prompt: "", hint: null });
  };

  render() {
    const { findings, unused, paletteDraft, log } = this.state;
    const failingCount = findings ? findings.filter(f => !f.passes).length : 0;

    return <DockPanel title="Copilot" icon={<MdAutoAwesome />} onClose={this.props.onClose} variant="ai">
      <p className="meridian-panel-subtitle">
        On-device style intelligence — deterministic color math and real WCAG contrast checks, running entirely in this tab. No network calls.
      </p>

      <div className="meridian-prompt">
        <div className="meridian-prompt-input-row">
          <input
            className="meridian-prompt-input"
            placeholder='Try "make it feel like dusk"'
            value={this.state.prompt}
            onChange={e => this.setState({ prompt: e.target.value })}
            onKeyDown={e => { if (e.key === "Enter") this.runPrompt(); }}
          />
          <button className="meridian-btn meridian-btn--ai" onClick={() => this.runPrompt()}>Run</button>
        </div>
        <div className="meridian-chip-row">
          {EXAMPLES.map(ex => (
            <button key={ex} className="meridian-chip" onClick={() => this.runPrompt(ex)}>{ex}</button>
          ))}
        </div>
        {this.state.hint && <p className="meridian-card-body">{this.state.hint}</p>}
      </div>

      <div className="meridian-section">
        <div className="meridian-section-title">Mood</div>
        <div className="meridian-chip-row">
          {(Object.entries(MOODS) as [MoodId, typeof MOODS[MoodId]][]).map(([id, mood]) => (
            <button key={id} className="meridian-chip" title={mood.description} onClick={() => this.runMood(id)}>
              {mood.label}
            </button>
          ))}
        </div>
      </div>

      <div className="meridian-section">
        <div className="meridian-section-title">
          <span>Accessibility audit</span>
          {failingCount > 0 && <button className="meridian-btn meridian-btn--sm meridian-btn--accent" onClick={this.runAutofix}>
            <MdBuild size={12} /> Fix {failingCount}
          </button>}
        </div>
        {!findings && <button className="meridian-btn meridian-btn--block" onClick={this.runAudit}>Check label contrast</button>}
        {findings && findings.length === 0 && <div className="meridian-empty">No symbol layers with a plain text color found.</div>}
        {findings && findings.map(f => (
          <div className="meridian-card" key={f.layerId}>
            <div className="meridian-card-row">
              {f.passes ? <MdCheckCircle color="#6fcf97" /> : <MdError color="#e0766e" />}
              <span className="meridian-card-title">{f.layerId}</span>
              <span className="meridian-swatch-pair">
                <span className="meridian-swatch" style={{ background: f.textColor }} />
                <MdArrowForward className="meridian-swatch-arrow" />
                <span className="meridian-swatch" style={{ background: f.referenceColor }} />
              </span>
            </div>
            <div className="meridian-card-meta">{f.ratio}:1 · needs {f.minRequired}:1 · vs {f.referenceSource}</div>
          </div>
        ))}
      </div>

      <div className="meridian-section">
        <div className="meridian-section-title">
          <span>Unused sources</span>
          {unused && unused.length > 0 && <button className="meridian-btn meridian-btn--sm meridian-btn--danger" onClick={() => this.removeUnused(unused.map(u => u.id))}>
            <MdDelete size={12} /> Remove all
          </button>}
        </div>
        {!unused && <button className="meridian-btn meridian-btn--block" onClick={this.runCleanupScan}>Scan for unused sources</button>}
        {unused && unused.length === 0 && <div className="meridian-empty">Every source is referenced by a layer.</div>}
        {unused && unused.map(u => (
          <div className="meridian-card meridian-card-row" key={u.id}>
            <span className="meridian-card-title">{u.id}</span>
            <span className="meridian-card-meta">{u.type}</span>
            <button className="meridian-icon-btn" onClick={() => this.removeUnused([u.id])}><MdDelete size={14} /></button>
          </div>
        ))}
      </div>

      {paletteDraft && (
        <div className="meridian-section">
          <div className="meridian-section-title">Palette draft — {paletteDraft.baseHex}</div>
          {paletteDraft.roles.map(r => (
            <div className="meridian-card-row" key={r.role} style={{ marginBottom: 6 }}>
              <span className="meridian-swatch" style={{ background: r.hex }} />
              <span className="meridian-card-meta" style={{ flex: 1 }}>{r.label}</span>
              <span className="meridian-card-meta">{r.hex}</span>
            </div>
          ))}
          <div className="meridian-chip-row" style={{ marginTop: 8 }}>
            <button className="meridian-btn meridian-btn--ai" onClick={this.applyPaletteDraft}>Apply palette</button>
            <button className="meridian-btn meridian-btn--ghost" onClick={() => this.setState({ paletteDraft: null })}>Discard</button>
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div className="meridian-section">
          <div className="meridian-section-title">
            <span>Activity</span>
            <button className="meridian-btn meridian-btn--sm meridian-btn--ghost" onClick={this.props.onUndo}>
              <MdUndo size={12} /> Undo last
            </button>
          </div>
          {log.map(entry => (
            <div className="meridian-log-entry" key={entry.id}>
              <span className="meridian-log-dot" />
              <span className="meridian-log-text">{entry.text}</span>
              <span className="meridian-log-time">{entry.time}</span>
            </div>
          ))}
        </div>
      )}
    </DockPanel>;
  }
}
