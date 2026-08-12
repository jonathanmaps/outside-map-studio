import {describe, expect, it} from "vitest";
import {formatMapCoordinates, parseMapCoordinates} from "./mapCoordinates";

describe("parseMapCoordinates", () => {
  it("parses zoom/latitude/longitude", () => {
    expect(parseMapCoordinates("11.5/40.6802/-113.7153")).toEqual({
      zoom: 11.5,
      lat: 40.6802,
      lng: -113.7153,
    });
  });

  it("parses a MapLibre URL hash", () => {
    expect(parseMapCoordinates("http://localhost:8899/maputnik/#9.55/37.7423/-119.2713")).toEqual({
      zoom: 9.55,
      lat: 37.7423,
      lng: -119.2713,
    });
  });

  it("parses latitude and longitude with the current zoom", () => {
    expect(parseMapCoordinates("40.6802, -113.7153", 8.25)).toEqual({
      zoom: 8.25,
      lat: 40.6802,
      lng: -113.7153,
    });
  });

  it("rejects invalid ranges and incomplete input", () => {
    expect(parseMapCoordinates("11/91/-113")).toBeNull();
    expect(parseMapCoordinates("40.6802")).toBeNull();
  });
});

describe("formatMapCoordinates", () => {
  it("formats a shareable map hash value", () => {
    expect(formatMapCoordinates({zoom: 11.5, lat: 40.6802, lng: -113.7153}))
      .toBe("11.5/40.6802/-113.7153");
  });
});
