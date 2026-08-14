import React from "react";
import classnames from "classnames";
import {detect} from "detect-browser";

import {
  MdOpenInBrowser,
  MdSettings,
  MdLayers,
  MdHelpOutline,
  MdFindInPage,
  MdLanguage,
  MdSave,
  MdPublic,
  MdCode,
  MdSearch,
  MdAutoAwesome,
  MdHistory,
  MdFolderOpen,
  MdPhoneIphone
} from "react-icons/md";
import { DEVICE_PRESETS } from "../libs/devices";
import pkgJson from "../../package.json";
import { withTranslation, type WithTranslation } from "react-i18next";
import { supportedLanguages } from "../i18n";
import type { OnStyleChangedCallback } from "../libs/definitions";
import type { DockPanelType } from "./DockPanel";
import { CoordinateJump } from "./CoordinateJump";
import type { MapCoordinates } from "../libs/mapCoordinates";

// This is required because of <https://stackoverflow.com/a/49846426>, there isn't another way to detect support that I'm aware of.
const browser = detect();
const colorAccessibilityFiltersEnabled = ["chrome", "firefox"].indexOf(browser!.name) > -1;

export type ModalTypes = "settings" | "sources" | "open" | "shortcuts" | "export" | "debug" | "globalState" | "codeEditor";

const APP_NAME = "Meridian";

const MeridianMark = () => (
  <svg className="maputnik-toolbar-mark" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.4" />
    <path d="M3 12H21" stroke="currentColor" strokeWidth="1.4" />
    <path d="M12 2.75C15.25 6 15.25 18 12 21.25C8.75 18 8.75 6 12 2.75Z" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

type IconTextProps = {
  children?: React.ReactNode
};


class IconText extends React.Component<IconTextProps> {
  render() {
    return <span className="maputnik-icon-text">{this.props.children}</span>;
  }
}

type ToolbarLinkProps = {
  className?: string
  children?: React.ReactNode
  href?: string
  label?: string
};

class ToolbarLink extends React.Component<ToolbarLinkProps> {
  render() {
    return <a
      className={classnames("maputnik-toolbar-link", this.props.className)}
      href={this.props.href}
      rel="noopener noreferrer"
      target="_blank"
      data-wd-key="toolbar:link"
      title={this.props.label}
      aria-label={this.props.label}
    >
      {this.props.children}
    </a>;
  }
}

type ToolbarSelectProps = {
  children?: React.ReactNode
  wdKey?: string
  title?: string
};

class ToolbarSelect extends React.Component<ToolbarSelectProps> {
  render() {
    return <div
      className='maputnik-toolbar-select'
      data-wd-key={this.props.wdKey}
      title={this.props.title}
    >
      {this.props.children}
    </div>;
  }
}

type ToolbarActionProps = {
  children?: React.ReactNode
  onClick?(...args: unknown[]): unknown
  wdKey?: string
  className?: string
  /** Also used as the accessible name — the visible label is hidden by
   * CSS at narrow widths, which drops it from the accessibility tree. */
  label: string
};

class ToolbarAction extends React.Component<ToolbarActionProps> {
  render() {
    return <button
      className={classnames("maputnik-toolbar-action", this.props.className)}
      data-wd-key={this.props.wdKey}
      onClick={this.props.onClick}
      title={this.props.label}
      aria-label={this.props.label}
    >
      {this.props.children}
    </button>;
  }
}

export type MapState = "map" | "inspect" | "filter-achromatopsia" | "filter-deuteranopia" | "filter-protanopia" | "filter-tritanopia";

type AppToolbarInternalProps = {
  mapStyle: object
  inspectModeEnabled: boolean
  onStyleChanged: OnStyleChangedCallback
  // A new style has been uploaded
  onStyleOpen: OnStyleChangedCallback
  // A dict of source id's and the available source layers
  sources: object
  children?: React.ReactNode
  onToggleModal(modal: ModalTypes): void
  onSetMapState(mapState: MapState): unknown
  mapState?: MapState
  renderer?: string
  activeDockPanel?: DockPanelType
  onToggleDockPanel(panel: Exclude<DockPanelType, null>): void
  onOpenCommandPalette(): void
  mapCoordinates: MapCoordinates
  onCoordinateJump(coordinates: MapCoordinates): void
  deviceId: string | null
  onSelectDevice(id: string | null): void
} & WithTranslation;

class AppToolbarInternal extends React.Component<AppToolbarInternalProps> {
  state = {
    isOpen: {
      settings: false,
      sources: false,
      open: false,
      add: false,
      export: false,
    }
  };

  handleSelection(val: MapState) {
    this.props.onSetMapState(val);
  }

  handleLanguageChange(val: string) {
    this.props.i18n.changeLanguage(val);
  }

  onSkip = (target: string) => {
    if (target === "map") {
      (document.querySelector(".maplibregl-canvas") as HTMLCanvasElement).focus();
    }
    else {
      const el = document.querySelector("#skip-target-"+target) as HTMLButtonElement;
      el.focus();
    }
  };

  render() {
    const t = this.props.t;
    const views = [
      {
        id: "map",
        group: "general",
        title: t("Map"),
      },
      {
        id: "inspect",
        group: "general",
        title: t("Inspect"),
        disabled: this.props.renderer === "ol",
      },
      {
        id: "filter-deuteranopia",
        group: "color-accessibility",
        title: t("Deuteranopia filter"),
        disabled: !colorAccessibilityFiltersEnabled,
      },
      {
        id: "filter-protanopia",
        group: "color-accessibility",
        title: t("Protanopia filter"),
        disabled: !colorAccessibilityFiltersEnabled,
      },
      {
        id: "filter-tritanopia",
        group: "color-accessibility",
        title: t("Tritanopia filter"),
        disabled: !colorAccessibilityFiltersEnabled,
      },
      {
        id: "filter-achromatopsia",
        group: "color-accessibility",
        title: t("Achromatopsia filter"),
        disabled: !colorAccessibilityFiltersEnabled,
      },
    ];

    const currentView = views.find((view) => {
      return view.id === this.props.mapState;
    });

    return <nav className='maputnik-toolbar'>
      <div className="maputnik-toolbar__inner">
        <div
          className="maputnik-toolbar-logo-container"
        >
          {/* Keyboard accessible quick links */}
          <button
            data-wd-key="root:skip:layer-list"
            className="maputnik-toolbar-skip"
            onClick={_e => this.onSkip("layer-list")}
          >
            {t("Layers list")}
          </button>
          <button
            data-wd-key="root:skip:layer-editor"
            className="maputnik-toolbar-skip"
            onClick={_e => this.onSkip("layer-editor")}
          >
            {t("Layer editor")}
          </button>
          <button
            data-wd-key="root:skip:map-view"
            className="maputnik-toolbar-skip"
            onClick={_e => this.onSkip("map")}
          >
            {t("Map view")}
          </button>
          <a
            className="maputnik-toolbar-logo"
            target="blank"
            rel="noreferrer noopener"
            href="https://github.com/maplibre/maputnik"
            title={t("Forked from Maputnik")}
          >
            <MeridianMark />
            <h1>
              <span className="maputnik-toolbar-name">{APP_NAME}</span>
              <span className="maputnik-toolbar-version">{pkgJson.version}</span>
            </h1>
          </a>
        </div>

        <button
          className="maputnik-toolbar-search"
          data-wd-key="nav:command-palette"
          onClick={this.props.onOpenCommandPalette}
          title={t("Jump to anything (⌘K)")}
          aria-label={t("Open command palette")}
        >
          <MdSearch />
          <IconText>{t("Jump to anything")}</IconText>
          <span className="maputnik-space" />
          <kbd>⌘K</kbd>
        </button>

        <CoordinateJump
          coordinates={this.props.mapCoordinates}
          onJump={this.props.onCoordinateJump}
        />

        <div className="maputnik-toolbar__actions" role="navigation" aria-label="Toolbar">
          <ToolbarAction wdKey="nav:open" label={t("Open style")} onClick={() => this.props.onToggleModal("open")}>
            <MdOpenInBrowser />
            <IconText>{t("Open")}</IconText>
          </ToolbarAction>
          <ToolbarAction wdKey="nav:export" label={t("Save / Export style")} onClick={() => this.props.onToggleModal("export")}>
            <MdSave />
            <IconText>{t("Save")}</IconText>
          </ToolbarAction>
          <ToolbarAction wdKey="nav:code-editor" label={t("Code editor")} onClick={() => this.props.onToggleModal("codeEditor")}>
            <MdCode />
            <IconText>{t("Code")}</IconText>
          </ToolbarAction>
          <ToolbarAction wdKey="nav:sources" label={t("Data sources")} onClick={() => this.props.onToggleModal("sources")}>
            <MdLayers />
            <IconText>{t("Sources")}</IconText>
          </ToolbarAction>
          <ToolbarAction wdKey="nav:settings" label={t("Style settings")} onClick={() => this.props.onToggleModal("settings")}>
            <MdSettings />
            <IconText>{t("Settings")}</IconText>
          </ToolbarAction>
          <ToolbarAction wdKey="nav:global-state" label={t("Global state")} onClick={() => this.props.onToggleModal("globalState")}>
            <MdPublic />
            <IconText>{t("State")}</IconText>
          </ToolbarAction>

          <span className="maputnik-toolbar-divider" />

          <ToolbarAction
            wdKey="nav:ai-copilot"
            label={t("Copilot — on-device style intelligence")}
            className={classnames("maputnik-toolbar-action--ai", {
              "maputnik-toolbar-action--active": this.props.activeDockPanel === "ai"
            })}
            onClick={() => this.props.onToggleDockPanel("ai")}
          >
            <MdAutoAwesome />
            <IconText>{t("Copilot")}</IconText>
          </ToolbarAction>
          <ToolbarAction
            wdKey="nav:timeline"
            label={t("Timeline — checkpoints and diffs")}
            className={classnames({
              "maputnik-toolbar-action--active": this.props.activeDockPanel === "timeline"
            })}
            onClick={() => this.props.onToggleDockPanel("timeline")}
          >
            <MdHistory />
            <IconText>{t("Timeline")}</IconText>
          </ToolbarAction>
          <ToolbarAction
            wdKey="nav:workspace"
            label={t("Workspace — all saved styles")}
            className={classnames({
              "maputnik-toolbar-action--active": this.props.activeDockPanel === "workspace"
            })}
            onClick={() => this.props.onToggleDockPanel("workspace")}
          >
            <MdFolderOpen />
            <IconText>{t("Workspace")}</IconText>
          </ToolbarAction>

          <ToolbarSelect wdKey="nav:inspect" title={t("View mode — map, inspect, or color-blindness filters")}>
            <MdFindInPage />
            <IconText>{t("View")}
              <select
                className="maputnik-select"
                data-wd-key="maputnik-select"
                aria-label={t("View mode")}
                onChange={(e) => this.handleSelection(e.target.value as MapState)}
                value={currentView?.id}
              >
                {views.filter(v => v.group === "general").map((item) => {
                  return (
                    <option key={item.id} value={item.id} disabled={item.disabled} data-wd-key={item.id}>
                      {item.title}
                    </option>
                  );
                })}
                <optgroup label={t("Color accessibility")}>
                  {views.filter(v => v.group === "color-accessibility").map((item) => {
                    return (
                      <option key={item.id} value={item.id} disabled={item.disabled}>
                        {item.title}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </IconText>
          </ToolbarSelect>

          <ToolbarSelect wdKey="nav:device" title={t("Preview the map at a phone or tablet size")}>
            <MdPhoneIphone />
            <select
              className="maputnik-select"
              data-wd-key="maputnik-device-select"
              aria-label={t("Device preview")}
              value={this.props.deviceId ?? ""}
              onChange={(e) => this.props.onSelectDevice(e.target.value || null)}
            >
              <option value="">{t("Desktop")}</option>
              {(["Phone", "Tablet"] as const).map(group => (
                <optgroup key={group} label={t(group)}>
                  {DEVICE_PRESETS.filter(d => d.group === group).map(d => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </ToolbarSelect>

          <ToolbarSelect wdKey="nav:language" title={t("Language")}>
            <MdLanguage />
            <select
              className="maputnik-select"
              data-wd-key="maputnik-lang-select"
              aria-label={t("Language")}
              onChange={(e) => this.handleLanguageChange(e.target.value)}
              value={this.props.i18n.language}
            >
              {Object.entries(supportedLanguages).map(([code, name]) => {
                return (
                  <option key={code} value={code}>
                    {name}
                  </option>
                );
              })}
            </select>
          </ToolbarSelect>

          <ToolbarLink href={"https://github.com/maplibre/maputnik/wiki"} label={t("Help — opens the wiki")}>
            <MdHelpOutline />
          </ToolbarLink>
        </div>
      </div>
    </nav>;
  }
}

export const AppToolbar = withTranslation()(AppToolbarInternal);
