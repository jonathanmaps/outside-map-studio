import React from "react";
import { Map } from "maplibre-gl";
import type { StyleSpecificationWithId } from "../libs/definitions";
import type { ComparisonMode } from "./ComparisonToolbar";
import { listSnapshots } from "../libs/snapshots";

type ComparisonViewProps = {
  checkpointIds: [string, string];
  styleId: string;
  mode: ComparisonMode;
  diffThreshold: number;
  mapState?: { zoom: number; center: [number, number]; bearing: number; pitch: number };
  onLocationChange?: (zoom: number, lng: number, lat: number) => void;
};

type ComparisonViewState = {
  error: string | null;
  snapshots: Array<{ id: string; label: string; style: StyleSpecificationWithId }>;
  zoom: number;
  lat: number;
  lng: number;
};

export class ComparisonViewProper extends React.Component<ComparisonViewProps, ComparisonViewState> {
  state: ComparisonViewState = {
    error: null,
    snapshots: [],
    zoom: 0,
    lat: 0,
    lng: 0,
  };

  leftMapRef = React.createRef<HTMLDivElement>();
  rightMapRef = React.createRef<HTMLDivElement>();

  leftMap: Map | null = null;
  rightMap: Map | null = null;
  syncing = false;

  async componentDidMount() {
    await this.loadSnapshots();
    this.initializeMaps();
  }

  async componentDidUpdate(prevProps: ComparisonViewProps) {
    if (prevProps.checkpointIds !== this.props.checkpointIds || prevProps.styleId !== this.props.styleId) {
      this.destroyMaps();
      await this.loadSnapshots();
      this.initializeMaps();
    }
  }

  loadSnapshots = async () => {
    try {
      const snapshots = await listSnapshots(this.props.styleId);
      return new Promise<void>(resolve => {
        this.setState({ snapshots, error: null }, resolve);
      });
    } catch (error) {
      console.error("Failed to load snapshots:", error);
      return new Promise<void>(resolve => {
        this.setState({ error: "Failed to load checkpoints", snapshots: [] }, resolve);
      });
    }
  };

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

  jumpToLocation = (zoom: number, lng: number, lat: number) => {
    if (!this.leftMap || !this.rightMap) return;

    // Jump both maps to the location
    this.syncing = true;
    this.leftMap.jumpTo({
      zoom,
      center: [lng, lat],
    });
    this.rightMap.jumpTo({
      zoom,
      center: [lng, lat],
    });
    this.syncing = false;

    // Notify parent of location change
    this.props.onLocationChange?.(zoom, lng, lat);
  };

  getCheckpointStyles = () => {
    const [id1, id2] = this.props.checkpointIds;
    const s1 = this.state.snapshots.find(s => s.id === id1);
    const s2 = this.state.snapshots.find(s => s.id === id2);
    return [s1, s2];
  };

  initializeMaps = () => {
    const [snap1, snap2] = this.getCheckpointStyles();
    if (!snap1?.style || !snap2?.style || !this.leftMapRef.current || !this.rightMapRef.current) {
      this.setState({ error: "Failed to load checkpoint styles" });
      return;
    }

    // Validate styles have minimum required properties
    if (!snap1.style.version || !snap2.style.version) {
      this.setState({ error: "Checkpoint styles are incomplete or invalid" });
      return;
    }

    const mapState = this.props.mapState || {
      zoom: 12,
      center: [0, 0] as [number, number],
      bearing: 0,
      pitch: 0,
    };

    try {
      // Ensure styles have the necessary properties for MapLibre GL
      const style1 = snap1.style as any;
      const style2 = snap2.style as any;

      // Apply defaults only if missing
      if (!style1.version) style1.version = 8;
      if (!style1.sources) style1.sources = {};
      if (!style1.layers) style1.layers = [];

      if (!style2.version) style2.version = 8;
      if (!style2.sources) style2.sources = {};
      if (!style2.layers) style2.layers = [];

      this.leftMap = new Map({
        container: this.leftMapRef.current,
        style: style1,
        ...mapState,
        interactive: true,
      });

      this.rightMap = new Map({
        container: this.rightMapRef.current,
        style: style2,
        ...mapState,
        interactive: true,
      });

      // Sync map movements and update display coordinates (local state only - no parent updates)
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
        // Update local state only - no parent callback
        const center = this.leftMap!.getCenter();
        this.setState({
          zoom: this.leftMap!.getZoom(),
          lng: center.lng,
          lat: center.lat,
        });
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
        // Update local state only - no parent callback
        const center = this.rightMap!.getCenter();
        this.setState({
          zoom: this.rightMap!.getZoom(),
          lng: center.lng,
          lat: center.lat,
        });
      });
    } catch (error) {
      console.error("Failed to initialize comparison maps:", error);
      this.setState({ error: String(error) });
    }
  };

  render() {
    const { error, zoom, lat, lng } = this.state;
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
      {/* Coordinates overlay - updates from local state only */}
      <div style={{
        position: "absolute",
        bottom: "12px",
        left: "12px",
        padding: "8px 12px",
        backgroundColor: "rgba(19, 20, 25, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "4px",
        color: "#ffd100",
        fontSize: "11px",
        fontFamily: "monospace",
        lineHeight: "1.4",
        pointerEvents: "none",
      }}>
        Z: {zoom.toFixed(2)}<br />
        Lat: {lat.toFixed(4)}<br />
        Lng: {lng.toFixed(4)}
      </div>
    </div>;
  }
}
