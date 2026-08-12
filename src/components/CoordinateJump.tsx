import React, {useEffect, useState} from "react";
import {MdMyLocation} from "react-icons/md";
import {formatMapCoordinates, parseMapCoordinates, type MapCoordinates} from "../libs/mapCoordinates";

type CoordinateJumpProps = {
  coordinates: MapCoordinates
  onJump(coordinates: MapCoordinates): void
};

export const CoordinateJump: React.FC<CoordinateJumpProps> = ({coordinates, onJump}) => {
  const [value, setValue] = useState(formatMapCoordinates(coordinates));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (document.activeElement?.getAttribute("data-wd-key") !== "map:coordinate-jump-input") {
      setValue(formatMapCoordinates(coordinates));
    }
  }, [coordinates]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseMapCoordinates(value, coordinates.zoom);
    if (!parsed) {
      setError(true);
      return;
    }
    setError(false);
    setValue(formatMapCoordinates(parsed));
    onJump(parsed);
  };

  return <form className={`maputnik-coordinate-jump${error ? " maputnik-coordinate-jump--error" : ""}`} onSubmit={submit}>
    <MdMyLocation />
    <input
      data-wd-key="map:coordinate-jump-input"
      aria-label="Go to coordinates"
      value={value}
      onChange={event => {
        setValue(event.target.value);
        setError(false);
      }}
      placeholder="zoom/lat/lng"
      title="Enter zoom/latitude/longitude or latitude, longitude"
    />
    <button data-wd-key="map:coordinate-jump-submit" type="submit">Go</button>
    {error && <span role="alert">Use zoom/lat/lng or lat, lng</span>}
  </form>;
};
