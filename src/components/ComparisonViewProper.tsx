import React from "react";
import { Map } from "maplibre-gl";
import type { StyleSpecificationWithId } from "../libs/definitions";
import type { ComparisonMode } from "./ComparisonToolbar";

type ComparisonViewProps = {
  checkpointIds: [string, string];
  snapshots: Array<{ id: string; label: string; style: StyleSpecificationWithId }>;
  mode: ComparisonMode;
  diffThreshold: number;
  mapState?: { zoom: number; center: [number, number]; bearing: number; pitch: number };
};

type ComparisonViewState = {
  error: string | null;
};

export class ComparisonViewProper extends React.Component<ComparisonViewProps, ComparisonViewState> {
  state: ComparisonViewState = {
    error: null,
  };

  leftMapRef = React.createRef<HTMLDivElement>();
  rightMapRef = React.createRef<HTMLDivElement>();

  leftMap: Map | null = null;
  rightMap: Map | null = null;
  syncing = false;

  componentDidMount() {
    this.initializeMaps();
  }

  componentDidUpdate(prevProps: ComparisonViewProps) {
    if (prevProps.checkpointIds !== this.props.checkpointIds) {
      this.destroyMaps();
      this.initializeMaps();
    }
  }

  componentWillUnmount() {
    this.destroyMaps();
  }

  destroyMaps = () => {
    if (this.leftMap) {
      this.leftMap.remove();
      this.leftMap = null;
    }
    if (this.rightMap) {
      this.rightMap.remove();
      this.rightMap = null;
    }
  };

  getCheckpointStyles = () => {
    const [id1, id2] = this.props.checkpointIds;
    const s1 = this.props.snapshots.find(s => s.id === id1);
    const s2 = this.props.snapshots.find(s => s.id === id2);
    return [s1, s2];
  };

  initializeMaps = () => {
    const [snap1, snap2] = this.getCheckpointStyles();
    if (!snap1?.style || !snap2?.style || !this.leftMapRef.current || !this.rightMapRef.current) {
      this.setState({ error: "Failed to initialize maps" });
      return;
    }

    const mapState = this.props.mapState || {
      zoom: 12,
      center: [0, 0] as [number, number],
      bearing: 0,
      pitch: 0,
    };

    try {
      this.leftMap = new Map({
        container: this.leftMapRef.current,
        style: snap1.style,
        ...mapState,
        interactive: true,
      });

      this.rightMap = new Map({
        container: this.rightMapRef.current,
        style: snap2.style,
        ...mapState,
        interactive: true,
      });

      // Sync map movements
      this.leftMap.on("move", () => {
        if (!this.syncing && this.rightMap) {
          this.syncing = true;
          this.rightMap.jumpTo({
            center: this.leftMap!.getCenter(),
            zoom: this.leftMap!.getZoom(),
            bearing: this.leftMap!.getBearing(),
            pitch: this.leftMap!.getPitch(),
          });
          this.syncing = false;
        }
      });

      this.rightMap.on("move", () => {
        if (!this.syncing && this.leftMap) {
          this.syncing = true;
          this.leftMap.jumpTo({
            center: this.rightMap!.getCenter(),
            zoom: this.rightMap!.getZoom(),
            bearing: this.rightMap!.getBearing(),
            pitch: this.rightMap!.getPitch(),
          });
          this.syncing = false;
        }
      });
    } catch (error) {
      console.error("Failed to initialize comparison maps:", error);
      this.setState({ error: String(error) });
    }
  };

  render() {
    const { error } = this.state;
    const [snap1, snap2] = this.getCheckpointStyles();

    if (error) {
      return <div className="comparison-view comparison-view--error">
        <div className="comparison-view__message">Error: {error}</div>
      </div>;
    }

    return <div className="comparison-view comparison-view--two-panel-maps">
      <div className="comparison-view__map-pane">
        <div className="comparison-view__pane-label">{snap1?.label || "Checkpoint 1"}</div>
        <div ref={this.leftMapRef} className="comparison-view__map-container" />
      </div>
      <div className="comparison-view__divider" />
      <div className="comparison-view__map-pane">
        <div className="comparison-view__pane-label">{snap2?.label || "Checkpoint 2"}</div>
        <div ref={this.rightMapRef} className="comparison-view__map-container" />
      </div>
    </div>;
  }
}
