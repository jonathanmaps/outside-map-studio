import React from "react";
import { MdClose } from "react-icons/md";

export type ComparisonMode = "side-by-side" | "3-panels" | "visual" | "presence";

type ComparisonToolbarProps = {
  mode: ComparisonMode;
  onModeChange(mode: ComparisonMode): void;
  diffThreshold: number;
  onDiffThresholdChange(threshold: number): void;
  onClose(): void;
};

export class ComparisonToolbar extends React.Component<ComparisonToolbarProps> {
  render() {
    const modes: { value: ComparisonMode; label: string }[] = [
      { value: "side-by-side", label: "Side by side" },
      { value: "3-panels", label: "3 panels" },
      { value: "visual", label: "Visual" },
      { value: "presence", label: "Presence" },
    ];

    return <div className="comparison-toolbar">
      <div className="comparison-toolbar__left">
        <span className="comparison-toolbar__label">Compare:</span>
        {modes.map(m => (
          <button
            key={m.value}
            className={`comparison-toolbar__mode${this.props.mode === m.value ? " comparison-toolbar__mode--active" : ""}`}
            onClick={() => this.props.onModeChange(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="comparison-toolbar__right">
        <div className="comparison-toolbar__slider-group">
          <label className="comparison-toolbar__slider-label">Diff threshold</label>
          <input
            type="range"
            className="comparison-toolbar__slider"
            min="0"
            max="100"
            value={this.props.diffThreshold}
            onChange={(e) => this.props.onDiffThresholdChange(Number(e.target.value))}
          />
          <span className="comparison-toolbar__slider-value">{this.props.diffThreshold}</span>
        </div>

        <button
          className="comparison-toolbar__close"
          onClick={this.props.onClose}
          title="Close comparison"
          aria-label="Close comparison"
        >
          <MdClose />
        </button>
      </div>
    </div>;
  }
}
