import React from "react";
import { MdMoreHoriz } from "react-icons/md";

type ToolbarOverflowProps = {
  label: string
  children: React.ReactNode
};

type ToolbarOverflowState = {
  open: boolean
};

/**
 * Holds the controls that are needed occasionally but shouldn't spend
 * permanent toolbar width. Keeping them here — rather than letting them fall
 * off the right edge at narrow widths — is what guarantees everything stays
 * reachable at any window size.
 */
export class ToolbarOverflow extends React.Component<ToolbarOverflowProps, ToolbarOverflowState> {
  state: ToolbarOverflowState = { open: false };
  rootRef = React.createRef<HTMLDivElement>();

  componentDidMount() {
    document.addEventListener("mousedown", this.onDocumentDown);
    document.addEventListener("keydown", this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener("mousedown", this.onDocumentDown);
    document.removeEventListener("keydown", this.onKeyDown);
  }

  onDocumentDown = (event: MouseEvent) => {
    if (!this.state.open) return;
    if (this.rootRef.current?.contains(event.target as Node)) return;
    this.setState({ open: false });
  };

  onKeyDown = (event: KeyboardEvent) => {
    if (this.state.open && event.key === "Escape") this.setState({ open: false });
  };

  render() {
    return <div className="maputnik-toolbar-overflow" ref={this.rootRef}>
      <button
        className={`maputnik-toolbar-action${this.state.open ? " maputnik-toolbar-action--active" : ""}`}
        data-wd-key="nav:overflow"
        title={this.props.label}
        aria-label={this.props.label}
        aria-haspopup="true"
        aria-expanded={this.state.open}
        onClick={() => this.setState(s => ({ open: !s.open }))}
      >
        <MdMoreHoriz />
      </button>
      {this.state.open && (
        <div
          className="maputnik-toolbar-overflow__menu"
          data-wd-key="nav:overflow-menu"
          role="menu"
          // Close after activating something inside, so the menu doesn't
          // linger over the map once it's done its job.
          onClick={() => this.setState({ open: false })}
        >
          {this.props.children}
        </div>
      )}
    </div>;
  }
}
