import React from "react";
import type { StyleSpecificationWithId } from "../libs/definitions";
import type { ComparisonMode } from "./ComparisonToolbar";

type ComparisonViewProps = {
  checkpointIds: [string, string];
  snapshots: Array<{ id: string; style: StyleSpecificationWithId }>;
  mode: ComparisonMode;
  diffThreshold: number;
};

type ComparisonViewState = {
  activeIndex: number;
  checkpoint1Loaded: boolean;
  checkpoint2Loaded: boolean;
};

export class ComparisonView extends React.Component<ComparisonViewProps, ComparisonViewState> {
  state: ComparisonViewState = {
    activeIndex: 0,
    checkpoint1Loaded: false,
    checkpoint2Loaded: false,
  };

  componentDidMount() {
    this.validateCheckpoints();
  }

  componentDidUpdate(prevProps: ComparisonViewProps) {
    if (prevProps.checkpointIds !== this.props.checkpointIds) {
      this.validateCheckpoints();
    }
  }

  validateCheckpoints() {
    const [id1, id2] = this.props.checkpointIds;
    const s1 = this.props.snapshots.find(s => s.id === id1);
    const s2 = this.props.snapshots.find(s => s.id === id2);

    // Simple validation: mark as loaded if styles exist
    this.setState({
      checkpoint1Loaded: !!s1?.style,
      checkpoint2Loaded: !!s2?.style,
    });
  }

  getCheckpointStyles() {
    const [id1, id2] = this.props.checkpointIds;
    const s1 = this.props.snapshots.find(s => s.id === id1);
    const s2 = this.props.snapshots.find(s => s.id === id2);
    return [s1, s2];
  }

  render() {
    const { mode } = this.props;
    const { checkpoint1Loaded, checkpoint2Loaded } = this.state;

    if (!checkpoint1Loaded || !checkpoint2Loaded) {
      return <div className="comparison-view comparison-view--loading">
        <div className="comparison-view__message">Loading checkpoints...</div>
      </div>;
    }

    const [snap1, snap2] = this.getCheckpointStyles();
    if (!snap1 || !snap2) {
      return <div className="comparison-view comparison-view--error">
        <div className="comparison-view__message">Checkpoints not found</div>
      </div>;
    }

    switch (mode) {
      case "side-by-side":
        return this.renderSideBySide(snap1, snap2);
      case "3-panels":
        return this.render3Panels(snap1, snap2);
      case "visual":
        return this.renderVisualDiff(snap1, snap2);
      case "presence":
        return this.renderPresenceDiff(snap1, snap2);
    }
  }

  renderSideBySide(snap1: any, snap2: any) {
    return <div className="comparison-view comparison-view--side-by-side">
      <div className="comparison-view__pane">
        <div className="comparison-view__pane-label">Checkpoint 1</div>
        <div className="comparison-view__pane-content">
          <pre className="comparison-view__code">{JSON.stringify(snap1.style, null, 2).slice(0, 500)}...</pre>
        </div>
      </div>
      <div className="comparison-view__divider" />
      <div className="comparison-view__pane">
        <div className="comparison-view__pane-label">Checkpoint 2</div>
        <div className="comparison-view__pane-content">
          <pre className="comparison-view__code">{JSON.stringify(snap2.style, null, 2).slice(0, 500)}...</pre>
        </div>
      </div>
    </div>;
  }

  render3Panels(snap1: any, snap2: any) {
    return <div className="comparison-view comparison-view--3-panels">
      <div className="comparison-view__pane comparison-view__pane--compact">
        <div className="comparison-view__pane-label">Before</div>
        <div className="comparison-view__pane-content">
          <pre className="comparison-view__code">{JSON.stringify(snap1.style, null, 2).slice(0, 300)}...</pre>
        </div>
      </div>
      <div className="comparison-view__divider comparison-view__divider--compact" />
      <div className="comparison-view__pane comparison-view__pane--compact">
        <div className="comparison-view__pane-label">Diff</div>
        <div className="comparison-view__pane-content comparison-view__pane-content--diff">
          <div className="comparison-view__diff-status">Threshold: {this.props.diffThreshold}%</div>
        </div>
      </div>
      <div className="comparison-view__divider comparison-view__divider--compact" />
      <div className="comparison-view__pane comparison-view__pane--compact">
        <div className="comparison-view__pane-label">After</div>
        <div className="comparison-view__pane-content">
          <pre className="comparison-view__code">{JSON.stringify(snap2.style, null, 2).slice(0, 300)}...</pre>
        </div>
      </div>
    </div>;
  }

  renderVisualDiff(snap1: any, snap2: any) {
    return <div className="comparison-view comparison-view--visual">
      <div className="comparison-view__visual-overlay">
        <div className="comparison-view__message">Visual Diff (Threshold: {this.props.diffThreshold}%)</div>
        <div className="comparison-view__visual-grid">
          {/* Placeholder for visual diff heatmap */}
          <div className="comparison-view__visual-cell" style={{ opacity: 0.3 }}>Layer changes</div>
          <div className="comparison-view__visual-cell" style={{ opacity: 0.6 }}>Paint changes</div>
          <div className="comparison-view__visual-cell" style={{ opacity: 0.9 }}>Layout changes</div>
        </div>
      </div>
    </div>;
  }

  renderPresenceDiff(snap1: any, snap2: any) {
    const layers1 = snap1.style.layers?.map((l: any) => l.id) || [];
    const layers2 = snap2.style.layers?.map((l: any) => l.id) || [];
    const onlyIn1 = layers1.filter((id: string) => !layers2.includes(id));
    const onlyIn2 = layers2.filter((id: string) => !layers1.includes(id));

    return <div className="comparison-view comparison-view--presence">
      <div className="comparison-view__presence-content">
        <div className="comparison-view__presence-section">
          <h3>Only in Checkpoint 1</h3>
          <ul>
            {onlyIn1.map((id: string) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
        <div className="comparison-view__presence-section">
          <h3>Only in Checkpoint 2</h3>
          <ul>
            {onlyIn2.map((id: string) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>;
  }
}
