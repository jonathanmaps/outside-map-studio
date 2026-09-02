import React from "react";
import { MdLocationOn } from "react-icons/md";
import { groupLocationsByCategory, type TestLocation } from "../libs/testLocations";

type LocationPickerProps = {
  onSelectLocation(location: TestLocation): void;
};

type LocationPickerState = {
  open: boolean;
};

export class LocationPicker extends React.Component<LocationPickerProps, LocationPickerState> {
  state: LocationPickerState = { open: false };
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

  handleSelectLocation = (location: TestLocation) => {
    this.props.onSelectLocation(location);
    this.setState({ open: false });
  };

  render() {
    const grouped = groupLocationsByCategory();
    const categories = Array.from(grouped.keys());

    return <div className="location-picker" ref={this.rootRef}>
      <button
        className={`maputnik-toolbar-action${this.state.open ? " maputnik-toolbar-action--active" : ""}`}
        data-wd-key="nav:locations"
        title="Test locations"
        aria-label="Test locations"
        aria-haspopup="true"
        aria-expanded={this.state.open}
        onClick={() => this.setState(s => ({ open: !s.open }))}
      >
        <MdLocationOn />
      </button>
      {this.state.open && (
        <div
          className="location-picker__menu"
          data-wd-key="nav:locations-menu"
          role="menu"
        >
          {categories.map(category => (
            <div key={category} className="location-picker__category">
              <div className="location-picker__category-label">{category}</div>
              {grouped.get(category)!.map(location => (
                <button
                  key={location.id}
                  className="location-picker__item"
                  role="menuitem"
                  onClick={() => this.handleSelectLocation(location)}
                >
                  {location.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>;
  }
}
