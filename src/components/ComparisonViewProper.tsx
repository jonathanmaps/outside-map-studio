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
  isReady: boolean;
  diffPercentage: number;
  error: string | null;
};

export class ComparisonViewProper extends React.Component<ComparisonViewProps, ComparisonViewState> {
  state: ComparisonViewState = {
    isReady: false,
    diffPercentage: 0,
    error: null,
  };

  currentMapRef = React.createRef<HTMLDivElement>();
  updateMapRef = React.createRef<HTMLDivElement>();
  diffCanvasRef = React.createRef<HTMLCanvasElement>();

  currentMap: Map | null = null;
  updateMap: Map | null = null;
  diffContext: CanvasRenderingContext2D | null = null;

  syncing = false;
  currentMapReady = false;
  updateMapReady = false;
  diffFrameId = 0;
  resizeFrameId = 0;

  componentDidMount() {
    this.initializeMaps();
  }

  componentDidUpdate(prevProps: ComparisonViewProps) {
    if (prevProps.checkpointIds !== this.props.checkpointIds) {
      this.destroyMaps();
      this.initializeMaps();
    }
    if (prevProps.diffThreshold !== this.props.diffThreshold) {
      this.scheduleDiff();
    }
  }

  componentWillUnmount() {
    this.destroyMaps();
  }

  destroyMaps = () => {
    cancelAnimationFrame(this.diffFrameId);
    cancelAnimationFrame(this.resizeFrameId);
    if (this.currentMap) {
      this.currentMap.remove();
      this.currentMap = null;
    }
    if (this.updateMap) {
      this.updateMap.remove();
      this.updateMap = null;
    }
    this.currentMapReady = false;
    this.updateMapReady = false;
  };

  getCheckpointStyles = () => {
    const [id1, id2] = this.props.checkpointIds;
    const s1 = this.props.snapshots.find(s => s.id === id1);
    const s2 = this.props.snapshots.find(s => s.id === id2);
    return [s1, s2];
  };

  initializeMaps = () => {
    const [snap1, snap2] = this.getCheckpointStyles();
    if (!snap1?.style || !snap2?.style || !this.currentMapRef.current || !this.updateMapRef.current) {
      this.setState({ error: "Failed to initialize maps" });
      return;
    }

    if (!this.diffCanvasRef.current) {
      this.setState({ error: "Diff canvas not found" });
      return;
    }

    this.diffContext = this.diffCanvasRef.current.getContext("2d");

    try {
      this.currentMap = new Map({
        container: this.currentMapRef.current,
        style: snap1.style,
        zoom: 12,
        center: [0, 0],
        pitch: 0,
        bearing: 0,
        preserveDrawingBuffer: true,
      });

      this.updateMap = new Map({
        container: this.updateMapRef.current,
        style: snap2.style,
        zoom: 12,
        center: [0, 0],
        pitch: 0,
        bearing: 0,
        preserveDrawingBuffer: true,
      });

      this.currentMap.on("load", () => {
        this.currentMapReady = true;
        this.scheduleDiff();
      });

      this.updateMap.on("load", () => {
        this.updateMapReady = true;
        this.scheduleDiff();
      });

      // Sync maps with jumpTo
      this.currentMap.on("move", () => {
        if (!this.syncing && this.updateMap) {
          this.syncing = true;
          const camera = {
            center: this.currentMap!.getCenter(),
            zoom: this.currentMap!.getZoom(),
            bearing: this.currentMap!.getBearing(),
            pitch: this.currentMap!.getPitch(),
          };
          this.updateMap.jumpTo(camera);
          this.syncing = false;
          this.scheduleDiff();
        }
      });

      this.updateMap.on("move", () => {
        if (!this.syncing && this.currentMap) {
          this.syncing = true;
          const camera = {
            center: this.updateMap!.getCenter(),
            zoom: this.updateMap!.getZoom(),
            bearing: this.updateMap!.getBearing(),
            pitch: this.updateMap!.getPitch(),
          };
          this.currentMap.jumpTo(camera);
          this.syncing = false;
          this.scheduleDiff();
        }
      });

      this.currentMap.on("resize", () => this.scheduleMapResize());
      this.updateMap.on("resize", () => this.scheduleMapResize());
    } catch (error) {
      console.error("Failed to initialize comparison maps:", error);
      this.setState({ error: String(error) });
    }
  };

  scheduleDiff = () => {
    cancelAnimationFrame(this.diffFrameId);
    this.diffFrameId = requestAnimationFrame(this.renderDiff);
  };

  scheduleMapResize = () => {
    cancelAnimationFrame(this.resizeFrameId);
    this.resizeFrameId = requestAnimationFrame(() => {
      this.currentMap?.resize();
      this.updateMap?.resize();
      this.scheduleDiff();
    });
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

    // Flip vertically (WebGL has inverted Y axis)
    const flipped = new Uint8ClampedArray(raw.length);
    const rowLength = width * 4;
    for (let y = 0; y < height; y += 1) {
      const sourceStart = (height - 1 - y) * rowLength;
      flipped.set(raw.subarray(sourceStart, sourceStart + rowLength), y * rowLength);
    }

    return { width, height, data: flipped };
  };

  renderDiff = () => {
    if (!this.currentMap || !this.updateMap || !this.currentMapReady || !this.updateMapReady || !this.diffContext) {
      return;
    }

    try {
      const current = this.readMapPixels(this.currentMap);
      const update = this.readMapPixels(this.updateMap);

      const width = Math.min(current.width, update.width);
      const height = Math.min(current.height, update.height);

      this.diffCanvasRef.current!.width = width;
      this.diffCanvasRef.current!.height = height;

      const output = this.diffContext.createImageData(width, height);
      const threshold = this.props.diffThreshold;
      const mode = this.props.mode;

      let changedPixels = 0;

      for (let i = 0; i < output.data.length; i += 4) {
        const cr = current.data[i];
        const cg = current.data[i + 1];
        const cb = current.data[i + 2];
        const ur = update.data[i];
        const ug = update.data[i + 1];
        const ub = update.data[i + 2];

        const delta = Math.max(Math.abs(ur - cr), Math.abs(ug - cg), Math.abs(ub - cb));

        if (delta <= threshold) {
          // Below threshold - show as grayscale
          const gray = Math.round(((ur + ug + ub + cr + cg + cb) / 6) * 0.28);
          output.data[i] = gray;
          output.data[i + 1] = gray;
          output.data[i + 2] = gray;
          output.data[i + 3] = 255;
          continue;
        }

        changedPixels += 1;

        if (mode === "visual") {
          // Visual diff: white intensity based on change magnitude
          const intensity = Math.min(255, 35 + delta * 3.2);
          output.data[i] = intensity;
          output.data[i + 1] = intensity;
          output.data[i + 2] = intensity;
        } else {
          // Presence diff: blue for current, pink for update
          const intensity = Math.min(255, 90 + delta * 2.2);
          output.data[i] = 217;
          output.data[i + 1] = Math.round(intensity * 0.16);
          output.data[i + 2] = 255;
        }
        output.data[i + 3] = 255;
      }

      this.diffContext.putImageData(output, 0, 0);

      const percentage = (changedPixels / (width * height)) * 100;
      this.setState({ isReady: true, diffPercentage: percentage, error: null });
    } catch (error) {
      console.error("Failed to render diff:", error);
      this.setState({ error: String(error) });
    }
  };

  render() {
    const { error } = this.state;

    if (error) {
      return <div className="comparison-view comparison-view--error">
        <div className="comparison-view__message">Error: {error}</div>
      </div>;
    }

    return <div className="comparison-view comparison-view--three-panel-maps">
      <div className="comparison-view__map-pane">
        <div className="comparison-view__pane-label">Checkpoint 1</div>
        <div ref={this.currentMapRef} className="comparison-view__map-container" />
      </div>
      <div className="comparison-view__map-pane">
        <div className="comparison-view__pane-label">Diff ({this.state.diffPercentage.toFixed(2)}%)</div>
        <canvas ref={this.diffCanvasRef} className="comparison-view__diff-canvas" />
      </div>
      <div className="comparison-view__map-pane">
        <div className="comparison-view__pane-label">Checkpoint 2</div>
        <div ref={this.updateMapRef} className="comparison-view__map-container" />
      </div>
    </div>;
  }
}
