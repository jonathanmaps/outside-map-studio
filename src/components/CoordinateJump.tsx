import React, {useEffect, useRef, useState} from "react";
import {MdMyLocation, MdContentCopy, MdCheck, MdErrorOutline} from "react-icons/md";
import {formatMapCoordinates, parseMapCoordinates, type MapCoordinates} from "../libs/mapCoordinates";

type CoordinateJumpProps = {
  coordinates: MapCoordinates
  onJump(coordinates: MapCoordinates): void
};

const COPY_LABEL = {
  idle: "Copy coordinates",
  done: "Copied",
  failed: "Couldn't copy — text selected, press ⌘C",
} as const;

export const CoordinateJump: React.FC<CoordinateJumpProps> = ({coordinates, onJump}) => {
  const [value, setValue] = useState(formatMapCoordinates(coordinates));
  const [error, setError] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement?.getAttribute("data-wd-key") !== "toolbar:coordinate-jump-input") {
      setValue(formatMapCoordinates(coordinates));
      setError(false);
    }
  }, [coordinates]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const copy = async () => {
    let ok: boolean;

    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      // The Clipboard API needs a secure context and a granted permission,
      // so fall back to a scratch selection + execCommand.
      const scratch = document.createElement("textarea");
      scratch.value = value;
      scratch.style.position = "fixed";
      scratch.style.opacity = "0";
      document.body.appendChild(scratch);
      scratch.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      } finally {
        document.body.removeChild(scratch);
      }
    }

    // Never claim success we didn't get — if the clipboard is blocked,
    // select the text so the user can copy it by hand instead.
    if (!ok) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }

    setCopyState(ok ? "done" : "failed");
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState("idle"), 1800);
  };

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
      ref={inputRef}
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
    <button
      type="button"
      className={`maputnik-coordinate-copy maputnik-coordinate-copy--${copyState}`}
      data-wd-key="toolbar:coordinate-copy"
      onClick={copy}
      title={COPY_LABEL[copyState]}
      aria-label={COPY_LABEL[copyState]}
    >
      {copyState === "done" ? <MdCheck /> : copyState === "failed" ? <MdErrorOutline /> : <MdContentCopy />}
    </button>
    <span className="maputnik-visually-hidden" role="status" aria-live="polite">
      {copyState === "idle" ? "" : COPY_LABEL[copyState]}
    </span>
  </form>;
};
