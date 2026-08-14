import React from "react";
import { MdSmartphone, MdTablet, MdScreenRotation, MdClose, MdZoomOutMap } from "react-icons/md";

import { DEVICE_PRESETS, deviceSize, type DevicePreset, type Orientation } from "../libs/devices";

type DeviceFrameProps = {
  device: DevicePreset
  orientation: Orientation
  /** Scale the frame down when it doesn't fit the available space. */
  fitToViewport: boolean
  onSelectDevice(id: string | null): void
  onToggleOrientation(): void
  onToggleFit(): void
  onClose(): void
  children: React.ReactNode
};

type DeviceFrameState = {
  scale: number
};


/**
 * Frames the live map at a real device viewport so a style can be judged at
 * the size it will actually be used. The map keeps rendering normally — only
 * its container is constrained — so panning, inspect and editing all still
 * work inside the frame.
 */
export class DeviceFrame extends React.Component<DeviceFrameProps, DeviceFrameState> {
  state: DeviceFrameState = { scale: 1 };
  stageRef = React.createRef<HTMLDivElement>();
  frameRef = React.createRef<HTMLDivElement>();
  stageObserver?: ResizeObserver;

  componentDidMount() {
    this.measure();
    // The map watches its own container and resizes itself, so this only
    // needs to keep the fit-to-viewport scale up to date.
    if (typeof ResizeObserver !== "undefined" && this.stageRef.current) {
      this.stageObserver = new ResizeObserver(() => this.measure());
      this.stageObserver.observe(this.stageRef.current);
    }
  }

  componentDidUpdate(prevProps: DeviceFrameProps) {
    if (
      prevProps.device !== this.props.device ||
      prevProps.orientation !== this.props.orientation ||
      prevProps.fitToViewport !== this.props.fitToViewport
    ) {
      this.measure();
    }
  }

  componentWillUnmount() {
    this.stageObserver?.disconnect();
  }

  /** Work out how far the frame must shrink to fit the space we're given. */
  measure = () => {
    const stage = this.stageRef.current;
    if (!stage) return;

    const { width, height } = deviceSize(this.props.device, this.props.orientation);
    const padding = 48;
    const available = stage.getBoundingClientRect();
    const scale = this.props.fitToViewport
      ? Math.min(1, (available.width - padding) / width, (available.height - padding) / height)
      : 1;

    const rounded = Math.max(0.2, Math.round(scale * 100) / 100);
    if (rounded !== this.state.scale) this.setState({ scale: rounded });
  };

  render() {
    const { device, orientation } = this.props;
    const { width, height } = deviceSize(device, orientation);
    const { scale } = this.state;

    return <div className="maputnik-device-stage" ref={this.stageRef}>
      <div className="maputnik-device-bar">
        <select
          className="maputnik-device-select"
          data-wd-key="device:preset"
          aria-label="Device preset"
          value={device.id}
          onChange={e => this.props.onSelectDevice(e.target.value)}
        >
          {(["Phone", "Tablet"] as const).map(group => (
            <optgroup key={group} label={group}>
              {DEVICE_PRESETS.filter(d => d.group === group).map(d => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <span className="maputnik-device-dims">
          {width} × {height}
          <span className="maputnik-device-dims-sub"> @{device.pixelRatio}x = {Math.round(width * device.pixelRatio)}×{Math.round(height * device.pixelRatio)}px</span>
          {scale < 1 && <span className="maputnik-device-dims-sub"> · shown at {Math.round(scale * 100)}%</span>}
        </span>

        <button
          className="maputnik-device-btn"
          onClick={this.props.onToggleOrientation}
          title="Rotate device"
          aria-label="Rotate device"
        ><MdScreenRotation /></button>
        <button
          className={`maputnik-device-btn${this.props.fitToViewport ? " maputnik-device-btn--on" : ""}`}
          onClick={this.props.onToggleFit}
          title={this.props.fitToViewport ? "Showing scaled to fit — switch to actual size" : "Showing actual size — switch to scale to fit"}
          aria-label="Toggle scale to fit"
          aria-pressed={this.props.fitToViewport}
        ><MdZoomOutMap /></button>
        <button
          className="maputnik-device-btn"
          data-wd-key="device:exit"
          onClick={this.props.onClose}
          title="Exit device preview"
          aria-label="Exit device preview"
        ><MdClose /></button>
      </div>

      <div className="maputnik-device-scroll">
        <div
          className="maputnik-device-frame"
          ref={this.frameRef}
          data-wd-key="device:frame"
          style={{
            width,
            height,
            transform: scale < 1 ? `scale(${scale})` : undefined,
          }}
        >
          {this.props.children}
        </div>
      </div>
    </div>;
  }
}

export const DeviceIcon: React.FC<{group: DevicePreset["group"]}> = ({group}) =>
  group === "Tablet" ? <MdTablet /> : <MdSmartphone />;
