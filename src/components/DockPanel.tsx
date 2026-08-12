import React from "react";
import classnames from "classnames";
import { MdClose } from "react-icons/md";

export type DockPanelType = "ai" | "timeline" | "workspace" | null;

type DockPanelProps = {
  title: string
  icon: React.ReactNode
  onClose(): void
  variant?: "ai" | "default"
  children?: React.ReactNode
};

export class DockPanel extends React.Component<DockPanelProps> {
  render() {
    return <div className="meridian-dock" role="dialog" aria-label={this.props.title}>
      <div className={classnames("meridian-panel-header", {
        "meridian-panel-header--ai": this.props.variant === "ai"
      })}>
        <h2>
          <span className="meridian-panel-icon">{this.props.icon}</span>
          {this.props.title}
        </h2>
        <button className="meridian-panel-close" onClick={this.props.onClose} aria-label="Close">
          <MdClose />
        </button>
      </div>
      <div className="meridian-panel-body">
        {this.props.children}
      </div>
    </div>;
  }
}
