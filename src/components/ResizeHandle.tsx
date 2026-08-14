import React from "react";

type ResizeHandleProps = {
  /** Current width of the panel to the leading side of this handle. */
  width: number
  min: number
  max: number
  /** Width restored on double-click. */
  defaultWidth: number
  label: string
  /** CSS `zoom` on the panel, if any. Pointer movement is in screen pixels
   * but `width` is pre-zoom, so the delta has to be divided by this or the
   * panel drifts away from the cursor. */
  scale?: number
  onResize(width: number): void
};

/**
 * Full-height drag handle sitting between two panels.
 *
 * The panels were already resizable via CSS `resize: horizontal`, but that
 * puts a small grabber in one corner only — easy to miss, and it can't be
 * driven from the keyboard. This is a real separator: drag anywhere along
 * the edge, double-click to restore the default, or focus it and use the
 * arrow keys.
 */
export class ResizeHandle extends React.Component<ResizeHandleProps> {
  ref = React.createRef<HTMLDivElement>();
  /** Pointer x and panel width captured at drag start. */
  origin: {x: number, width: number} | null = null;

  clamp = (width: number) => Math.round(Math.min(this.props.max, Math.max(this.props.min, width)));

  onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Ignore secondary buttons so a right-click doesn't start a drag.
    if (event.button !== 0) return;
    this.origin = {x: event.clientX, width: this.props.width};
    this.ref.current?.setPointerCapture(event.pointerId);
    // Stops the drag from selecting text across the whole app.
    event.preventDefault();
  };

  onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!this.origin) return;
    const direction = document.body.dir === "rtl" ? -1 : 1;
    const travelled = (event.clientX - this.origin.x) * direction / (this.props.scale ?? 1);
    this.props.onResize(this.clamp(this.origin.width + travelled));
  };

  onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    this.origin = null;
    this.ref.current?.releasePointerCapture(event.pointerId);
  };

  onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 64 : 16;
    let next: number | null = null;
    if (event.key === "ArrowLeft") next = this.props.width - step;
    else if (event.key === "ArrowRight") next = this.props.width + step;
    else if (event.key === "Home") next = this.props.min;
    else if (event.key === "End") next = this.props.max;
    else if (event.key === "Enter") next = this.props.defaultWidth;
    if (next === null) return;
    event.preventDefault();
    this.props.onResize(this.clamp(next));
  };

  render() {
    return <div
      ref={this.ref}
      className="maputnik-resize-handle"
      data-wd-key="layout:resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={this.props.label}
      aria-valuenow={this.props.width}
      aria-valuemin={this.props.min}
      aria-valuemax={this.props.max}
      tabIndex={0}
      title={`${this.props.label} — drag, or double-click to reset`}
      onPointerDown={this.onPointerDown}
      onPointerMove={this.onPointerMove}
      onPointerUp={this.onPointerUp}
      onPointerCancel={this.onPointerUp}
      onDoubleClick={() => this.props.onResize(this.props.defaultWidth)}
      onKeyDown={this.onKeyDown}
    >
      <span className="maputnik-resize-handle__grip" aria-hidden="true" />
    </div>;
  }
}
