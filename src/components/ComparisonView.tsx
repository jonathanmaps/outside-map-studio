import React from "react";
import { Map } from "maplibre-gl";
import type { StyleSpecificationWithId } from "../libs/definitions";
import type { ComparisonMode } from "./ComparisonToolbar";

type ComparisonViewProps = {
  checkpointIds: [string, string];
  snapshots: Array<{ id: string; style: StyleSpecificationWithId }>;
  mode: ComparisonMode;
  diffThreshold: number;
};

type ComparisonViewState = {
  checkpoint1Loaded: boolean;
  checkpoint2Loaded: boolean;
};

export class ComparisonView extends React.Component<ComparisonViewProps, ComparisonViewState> {
  state: ComparisonViewState = {
    checkpoint1Loaded: false,
    checkpoint2Loaded: false,
  };

  map1Ref = React.createRef<HTMLDivElement>();
  map2Ref = React.createRef<HTMLDivElement>();
  map1: Map | null = null;
  map2: Map | null = null;
  syncingZoom = false;
  syncingPan = false;

  componentDidMount() {
    this.initializeMaps();
  }

  componentDidUpdate(prevProps: ComparisonViewProps) {
    if (prevProps.checkpointIds !== this.props.checkpointIds) {
      this.initializeMaps();
    }
    if (prevProps.mode !== this.props.mode) {
      // Trigger resize when mode changes to account for layout shift
      setTimeout(() => {
        this.map1?.resize();
        this.map2?.resize();
      }, 0);
    }
  }

  componentWillUnmount() {
    this.destroyMaps();
  }

  getCheckpointStyles() {
    const [id1, id2] = this.props.checkpointIds;
    const s1 = this.props.snapshots.find(s => s.id === id1);
    const s2 = this.props.snapshots.find(s => s.id === id2);
    return [s1, s2];
  }

  destroyMaps() {
    if (this.map1) {
      this.map1.remove();
      this.map1 = null;
    }
    if (this.map2) {
      this.map2.remove();
      this.map2 = null;
    }
  }

  initializeMaps() {
    this.destroyMaps();

    const [snap1, snap2] = this.getCheckpointStyles();
    if (!snap1?.style || !snap2?.style || !this.map1Ref.current || !this.map2Ref.current) {
      return;
    }

    try {
      this.map1 = new Map({
        container: this.map1Ref.current,
        style: snap1.style,
        zoom: 12,
        center: { lat: 0, lng: 0 },
        pitch: 0,
        bearing: 0,
      });

      this.map2 = new Map({
        container: this.map2Ref.current,
        style: snap2.style,
        zoom: 12,
        center: { lat: 0, lng: 0 },
        pitch: 0,
        bearing: 0,
      });

      // Sync zoom and pan
      this.map1.on("zoom", () => {
        if (!this.syncingZoom && this.map2) {
          this.syncingZoom = true;
          this.map2.setZoom(this.map1!.getZoom());
          this.syncingZoom = false;
        }
      });

      this.map1.on("move", () => {
        if (!this.syncingPan && this.map2) {
          this.syncingPan = true;
          const center = this.map1!.getCenter();
          const bearing = this.map1!.getBearing();
          const pitch = this.map1!.getPitch();
          this.map2.setCenter(center);
          this.map2.setBearing(bearing);
          this.map2.setPitch(pitch);
          this.syncingPan = false;
        }
      });

      this.map2.on("zoom", () => {
        if (!this.syncingZoom && this.map1) {
          this.syncingZoom = true;
          this.map1.setZoom(this.map2!.getZoom());
          this.syncingZoom = false;
        }
      });

      this.map2.on("move", () => {
        if (!this.syncingPan && this.map1) {
          this.syncingPan = true;
          const center = this.map2!.getCenter();
          const bearing = this.map2!.getBearing();
          const pitch = this.map2!.getPitch();
          this.map1.setCenter(center);
          this.map1.setBearing(bearing);
          this.map1.setPitch(pitch);
          this.syncingPan = false;
        }
      });

      this.map1.on("load", () => this.setState({ checkpoint1Loaded: true }));
      this.map2.on("load", () => this.setState({ checkpoint2Loaded: true }));
    } catch (err) {
      console.error("Failed to initialize comparison maps:", err);
    }
  }

  render() {
    const { mode } = this.props;

    const [snap1, snap2] = this.getCheckpointStyles();
    if (!snap1 || !snap2) {
      return <div className="comparison-view comparison-view--error">
        <div className="comparison-view__message">Checkpoints not found</div>
      </div>;
    }

    switch (mode) {
      case "side-by-side":
        return this.renderSideBySide();
      case "3-panels":
        return this.render3Panels();
      case "visual":
        return this.renderVisualDiff(snap1, snap2);
      case "presence":
        return this.renderPresenceDiff(snap1, snap2);
    }
  }

  renderSideBySide() {
    return <div className="comparison-view comparison-view--side-by-side">
      <div className="comparison-view__pane">
        <div className="comparison-view__pane-label">Checkpoint 1</div>
        <div ref={this.map1Ref} className="comparison-view__map-container" />
      </div>
      <div className="comparison-view__divider" />
      <div className="comparison-view__pane">
        <div className="comparison-view__pane-label">Checkpoint 2</div>
        <div ref={this.map2Ref} className="comparison-view__map-container" />
      </div>
    </div>;
  }

  render3Panels() {
    return <div className="comparison-view comparison-view--3-panels">
      <div className="comparison-view__pane comparison-view__pane--compact">
        <div className="comparison-view__pane-label">Before</div>
        <div ref={this.map1Ref} className="comparison-view__map-container" />
      </div>
      <div className="comparison-view__divider comparison-view__divider--compact" />
      <div className="comparison-view__pane comparison-view__pane--compact">
        <div className="comparison-view__pane-label">After</div>
        <div ref={this.map2Ref} className="comparison-view__map-container" />
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
