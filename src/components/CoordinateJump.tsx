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
    if (document.activeElement?.getAttribute("data-wd-key") !== "toolbar:coordinate-jump-input") {
      setValue(formatMapCoordinates(coordinates));
      setError(false);
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
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return <form
    className={`maputnik-coordinate-jump${error ? " maputnik-coordinate-jump--error" : ""}`}
    onSubmit={submit}
    title="Paste zoom/lat/lng (or lat, lng) and press Enter to jump — accepts full Maputnik/MapLibre URLs too"
  >
    <MdMyLocation aria-hidden="true" />
    <input
      data-wd-key="toolbar:coordinate-jump-input"
      aria-label="Go to coordinates (zoom/lat/lng)"
      value={value}
      onChange={event => {
        setValue(event.target.value);
        setError(false);
      }}
      onFocus={event => event.target.select()}
      onKeyDown={event => {
        if (event.key === "Escape") {
          setValue(formatMapCoordinates(coordinates));
          setError(false);
          (event.target as HTMLInputElement).blur();
        }
      }}
      spellCheck={false}
      placeholder="zoom/lat/lng"
    />
  </form>;
};
