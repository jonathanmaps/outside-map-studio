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
  diffPercentage: number;
  error: string | null;
};

export class ComparisonViewProper extends React.Component<ComparisonViewProps, ComparisonViewState> {
  state: ComparisonViewState = {
    diffPercentage: 0,
    error: null,
  };

  leftMapRef = React.createRef<HTMLDivElement>();
  rightMapRef = React.createRef<HTMLDivElement>();
  diffCanvasRef = React.createRef<HTMLCanvasElement>();

  leftMap: Map | null = null;
  rightMap: Map | null = null;
  diffContext: CanvasRenderingContext2D | null = null;

  syncing = false;
  leftMapReady = false;
  rightMapReady = false;
  diffFrameId = 0;

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
    cancelAnimationFrame(this.diffFrameId);
    if (this.leftMap) {
      this.leftMap.remove();
      this.leftMap = null;
    }
    if (this.rightMap) {
      this.rightMap.remove();
      this.rightMap = null;
    }
    this.leftMapReady = false;
    this.rightMapReady = false;
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

    // Initialize diff canvas for 3-panels mode
    if (this.props.mode === "3-panels" && this.diffCanvasRef.current) {
      this.diffContext = this.diffCanvasRef.current.getContext("2d");
    }

    try {
      this.leftMap = new Map({
        container: this.leftMapRef.current,
        style: snap1.style,
        ...mapState,
        interactive: true,
        preserveDrawingBuffer: this.props.mode === "3-panels",
      });

      this.rightMap = new Map({
        container: this.rightMapRef.current,
        style: snap2.style,
        ...mapState,
        interactive: this.props.mode === "side-by-side",
        preserveDrawingBuffer: this.props.mode === "3-panels",
      });

      this.leftMap.on("load", () => {
        this.leftMapReady = true;
        this.scheduleDiff();
      });

      this.rightMap.on("load", () => {
        this.rightMapReady = true;
        this.scheduleDiff();
      });

      // Sync maps in side-by-side mode
      if (this.props.mode === "side-by-side") {
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
      }
    } catch (error) {
      console.error("Failed to initialize comparison maps:", error);
      this.setState({ error: String(error) });
    }
  };

  scheduleDiff = () => {
    if (this.props.mode !== "3-panels") return;
    cancelAnimationFrame(this.diffFrameId);
    this.diffFrameId = requestAnimationFrame(this.renderDiff);
  };

  getWebGLContext = (map: Map) => {
    const canvas = map.getCanvas();
    return canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  };

  readMapPixels = (map: Map) => {
    const gl = this.getWebGLContext(map);
    if (!gl) throw new Error("WebGL context not available");

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const raw = new Uint8Array(width * height * 4);
    gl.finish();
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, raw);

    const flipped = new Uint8ClampedArray(raw.length);
    const rowLength = width * 4;
    for (let y = 0; y < height; y += 1) {
      const sourceStart = (height - 1 - y) * rowLength;
      flipped.set(raw.subarray(sourceStart, sourceStart + rowLength), y * rowLength);
    }

    return { width, height, data: flipped };
  };

  renderDiff = () => {
    if (this.props.mode !== "3-panels" || !this.leftMap || !this.rightMap || !this.leftMapReady || !this.rightMapReady || !this.diffContext) {
      return;
    }

    try {
      const left = this.readMapPixels(this.leftMap);
      const right = this.readMapPixels(this.rightMap);

      const width = Math.min(left.width, right.width);
      const height = Math.min(left.height, right.height);

      this.diffCanvasRef.current!.width = width;
      this.diffCanvasRef.current!.height = height;

      const output = this.diffContext.createImageData(width, height);
      const threshold = 12;

      let changedPixels = 0;

      for (let i = 0; i < output.data.length; i += 4) {
        const lr = left.data[i];
        const lg = left.data[i + 1];
        const lb = left.data[i + 2];
        const rr = right.data[i];
        const rg = right.data[i + 1];
        const rb = right.data[i + 2];

        const delta = Math.max(Math.abs(rr - lr), Math.abs(rg - lg), Math.abs(rb - lb));

        if (delta < threshold) {
          output.data[i] = 20;
          output.data[i + 1] = 20;
          output.data[i + 2] = 20;
          output.data[i + 3] = 255;
          continue;
        }

        changedPixels += 1;
        output.data[i] = 255;
        output.data[i + 1] = 255;
        output.data[i + 2] = 100;
        output.data[i + 3] = 255;
      }

      this.diffContext.putImageData(output, 0, 0);

      const percentage = (changedPixels / (width * height)) * 100;
      this.setState({ diffPercentage: percentage, error: null });
    } catch (error) {
      console.error("Failed to render diff:", error);
      this.setState({ error: String(error) });
    }
  };

  render() {
    const { error } = this.state;
    const [snap1, snap2] = this.getCheckpointStyles();
    const is3Panels = this.props.mode === "3-panels";

    if (error) {
      return <div className="comparison-view comparison-view--error">
        <div className="comparison-view__message">Error: {error}</div>
      </div>;
    }

    return <div className={`comparison-view ${is3Panels ? "comparison-view--three-panel-maps" : "comparison-view--two-panel-maps"}`}>
      <div className="comparison-view__map-pane">
        <div className="comparison-view__pane-label">{snap1?.label || "Checkpoint 1"}</div>
        <div ref={this.leftMapRef} className="comparison-view__map-container" />
      </div>
      {is3Panels && (
        <div className="comparison-view__map-pane">
          <div className="comparison-view__pane-label">Visual Diff ({this.state.diffPercentage.toFixed(2)}%)</div>
          <canvas ref={this.diffCanvasRef} className="comparison-view__diff-canvas" />
        </div>
      )}
      <div className="comparison-view__map-pane">
        <div className="comparison-view__pane-label">{snap2?.label || "Checkpoint 2"}</div>
        <div ref={this.rightMapRef} className="comparison-view__map-container" />
      </div>
    </div>;
  }
}
