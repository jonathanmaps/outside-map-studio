import React from "react";
import { MdClose } from "react-icons/md";

export type ComparisonMode = "side-by-side";

type ComparisonToolbarProps = {
  onClose(): void;
};

export class ComparisonToolbar extends React.Component<ComparisonToolbarProps> {
  render() {
    return <div className="comparison-toolbar">
      <div className="comparison-toolbar__left">
        <span className="comparison-toolbar__label">Side-by-side comparison</span>
      </div>

      <div className="comparison-toolbar__right">
        <button
          className="comparison-toolbar__close"
          onClick={this.props.onClose}
          title="Close comparison"
          aria-label="Close comparison"
        >
          <MdClose />
        </button>
      </div>
    </div>;
  }
}
