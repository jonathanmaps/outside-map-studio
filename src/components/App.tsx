import React from "react";
import cloneDeep from "lodash.clonedeep";
import clamp from "lodash.clamp";
import buffer from "buffer";
import get from "lodash.get";
import {unset} from "lodash";
import {arrayMoveMutable} from "array-move";
import hash from "string-hash";
import { PMTiles } from "pmtiles";
import {type Map, type LayerSpecification, type StyleSpecification, type ValidationError, type SourceSpecification} from "maplibre-gl";
import {validateStyleMin} from "@maplibre/maplibre-gl-style-spec";
import latest from "@maplibre/maplibre-gl-style-spec/dist/latest.json";

import { MapMaplibreGl } from "./MapMaplibreGl";
import { MapOpenLayers } from "./MapOpenLayers";
import { CodeEditor } from "./CodeEditor";
import { LayerList } from "./LayerList";
import { LayerEditor } from "./LayerEditor";
import { AppToolbar, type MapState } from "./AppToolbar";
import { AppLayout } from "./AppLayout";
import { AppMessagePanel as MessagePanel } from "./AppMessagePanel";

import { ModalSettings } from "./modals/ModalSettings";
import { ModalExport } from "./modals/ModalExport";
import { ModalSources } from "./modals/ModalSources";
import { ModalOpen } from "./modals/ModalOpen";
import { ModalShortcuts } from "./modals/ModalShortcuts";
import { ModalDebug } from "./modals/ModalDebug";
import { ModalGlobalState } from "./modals/ModalGlobalState";

import { ErrorBoundary } from "./ErrorBoundary";
import { CommandPalette, type Command } from "./CommandPalette";
import { AICopilotPanel } from "./AICopilotPanel";
import { TimelinePanel } from "./TimelinePanel";
import { WorkspacePanel } from "./WorkspacePanel";
import type { DockPanelType } from "./DockPanel";
import {
  MdOpenInBrowser, MdSave, MdCode, MdLayers, MdSettings, MdPublic,
  MdMap, MdFindInPage, MdAutoAwesome, MdHistory, MdFolderOpen,
  MdUndo, MdRedo, MdKeyboard,
} from "react-icons/md";

import {downloadGlyphsMetadata, downloadSpriteMetadata} from "../libs/metadata";
import { emptyStyle, getAccessToken, replaceAccessTokens } from "../libs/style";
import { undoMessages, redoMessages } from "../libs/diffmessage";
import { createStyleStore, type IStyleStore } from "../libs/store/style-store-factory";
import { RevisionStore } from "../libs/revisions";
import { LayerWatcher } from "../libs/layerwatcher";
import { touchWorkspaceMeta } from "../libs/workspace";
import tokens from "../config/tokens.json";
import isEqual from "lodash.isequal";
import { type MapOptions } from "maplibre-gl";
import { type MappedError, type OnStyleChangedOpts, type StyleSpecificationWithId } from "../libs/definitions";
import {formatMapCoordinates, parseMapCoordinates, type MapCoordinates} from "../libs/mapCoordinates";

// Buffer must be defined globally for @maplibre/maplibre-gl-style-spec validate() function to succeed.
window.Buffer = buffer.Buffer;

function setFetchAccessToken(url: string, mapStyle: StyleSpecification) {
  const matchesTilehosting = url.match(/\.tilehosting\.com/);
  const matchesMaptiler = url.match(/\.maptiler\.com/);
  const matchesThunderforest = url.match(/\.thunderforest\.com/);
  const matchesLocationIQ = url.match(/\.locationiq\.com/);
  if (matchesTilehosting || matchesMaptiler) {
    const accessToken = getAccessToken("openmaptiles", mapStyle, {allowFallback: true});
    if (accessToken) {
      return url.replace("{key}", accessToken);
    }
  }
  else if (matchesThunderforest) {
    const accessToken = getAccessToken("thunderforest", mapStyle, {allowFallback: true});
    if (accessToken) {
      return url.replace("{key}", accessToken);
    }
  }
  else if (matchesLocationIQ) {
    const accessToken = getAccessToken("locationiq", mapStyle, {allowFallback: true});
    if (accessToken) {
      return url.replace("{key}", accessToken);
    }
  }
  else {
    return url;
  }
}

/**
 * True when the event target is somewhere the user is entering text, so
 * single-key shortcuts must not steal the keystroke. Covers the CodeMirror
 * editor, which uses a contenteditable rather than a real <textarea>.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return !!el.closest?.(".cm-editor");
}

function updateRootSpec(spec: any, fieldName: string, newValues: any) {
  return {
    ...spec,
    $root: {
      ...spec.$root,
      [fieldName]: {
        ...spec.$root[fieldName],
        values: newValues
      }
    }
  };
}

type AppState = {
  errors: MappedError[],
  infos: string[],
  mapStyle: StyleSpecificationWithId,
  dirtyMapStyle?: StyleSpecification,
  selectedLayerIndex: number,
  selectedLayerOriginalId?: string,
  isolatedLayerId?: string,
  sources: {[key: string]: SourceSpecification & {layers: string[]} },
  vectorLayers: {},
  spec: any,
  mapView: {
    zoom: number,
    center: {
      lng: number,
      lat: number,
    },
    _from: "map" | "app"
  },
  maplibreGlDebugOptions: Partial<MapOptions> & {
    showTileBoundaries: boolean,
    showCollisionBoxes: boolean,
    showOverdrawInspector: boolean,
  },
  openlayersDebugOptions: {
    debugToolbox: boolean,
  },
  mapState: MapState
  isOpen: {
    settings: boolean
    sources: boolean
    open: boolean
    shortcuts: boolean
    export: boolean
    debug: boolean
    globalState: boolean
    codeEditor: boolean
  }
  fileHandle: FileSystemFileHandle | null
  activeDockPanel: DockPanelType
  commandPaletteOpen: boolean
};

export class App extends React.Component<any, AppState> {
  revisionStore: RevisionStore;
  styleStore: IStyleStore | null = null;
  layerWatcher: LayerWatcher;

  constructor(props: any) {
    super(props);

    this.revisionStore = new RevisionStore();
    this.configureKeyboardShortcuts();

    const urlCoordinates = parseMapCoordinates(window.location.hash, 0);

    this.state = {
      errors: [],
      infos: [],
      mapStyle: emptyStyle,
      selectedLayerIndex: 0,
      isolatedLayerId: undefined,
      sources: {},
      vectorLayers: {},
      mapState: "map",
      spec: latest,
      mapView: urlCoordinates ? {
        zoom: urlCoordinates.zoom,
        center: {lng: urlCoordinates.lng, lat: urlCoordinates.lat},
        _from: "app"
      } : {
        zoom: 0,
        center: {lng: 0, lat: 0},
        _from: "app"
      },
      isOpen: {
        settings: false,
        sources: false,
        open: false,
        shortcuts: false,
        export: false,
        debug: false,
        globalState: false,
        codeEditor: false
      },
      maplibreGlDebugOptions: {
        showTileBoundaries: false,
        showCollisionBoxes: false,
        showOverdrawInspector: false,
      },
      openlayersDebugOptions: {
        debugToolbox: false,
      },
      fileHandle: null,
      activeDockPanel: null,
      commandPaletteOpen: false,
    };

    this.layerWatcher = new LayerWatcher({
      onVectorLayersChange: v => this.setState({ vectorLayers: v })
    });
  }

  configureKeyboardShortcuts = () => {
    const shortcuts = [
      {
        key: "?",
        handler: () => {
          this.toggleModal("shortcuts");
        }
      },
      {
        key: "o",
        handler: () => {
          this.toggleModal("open");
        }
      },
      {
        key: "e",
        handler: () => {
          this.toggleModal("export");
        }
      },
      {
        key: "d",
        handler: () => {
          this.toggleModal("sources");
        }
      },
      {
        key: "s",
        handler: () => {
          this.toggleModal("settings");
        }
      },
      {
        key: "g",
        handler: () => {
          this.toggleModal("globalState");
        }
      },
      {
        key: "i",
        handler: () => {
          this.setMapState(
            this.state.mapState === "map" ? "inspect" : "map"
          );
        }
      },
      {
        key: "m",
        handler: () => {
          (document.querySelector(".maplibregl-canvas") as HTMLCanvasElement)?.focus();
        }
      },
      {
        key: "!",
        handler: () => {
          this.toggleModal("debug");
        }
      },
      // Panels
      {
        key: "c",
        handler: () => this.toggleDockPanel("ai")
      },
      {
        key: "t",
        handler: () => this.toggleDockPanel("timeline")
      },
      {
        key: "w",
        handler: () => this.toggleDockPanel("workspace")
      },
      {
        key: "j",
        handler: () => this.toggleModal("codeEditor")
      },
      {
        key: "/",
        handler: () => this.setState({ commandPaletteOpen: true })
      },
      // Layer navigation and manipulation
      {
        key: "[",
        handler: () => this.stepLayer(-1)
      },
      {
        key: "]",
        handler: () => this.stepLayer(1)
      },
      {
        key: "v",
        handler: () => {
          if (this.state.mapStyle.layers.length > 0) {
            this.onLayerVisibilityToggle(this.state.selectedLayerIndex);
          }
        }
      },
      {
        key: "x",
        handler: () => {
          if (this.state.mapStyle.layers.length > 0) {
            this.onLayerIsolationToggle(this.state.selectedLayerIndex);
          }
        }
      },
      {
        key: "f",
        handler: () => {
          const search = document.querySelector("[data-wd-key='layer-list:search']") as HTMLInputElement | null;
          search?.focus();
          search?.select();
        }
      },
    ];

    document.body.addEventListener("keyup", (e) => {
      if(e.key === "Escape") {
        (e.target as HTMLElement).blur();
        document.body.focus();
        return;
      }

      // Modifier combos belong to the browser/OS and to handleKeyPress.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Previously these only fired while document.body itself held focus,
      // so clicking almost anything (the map canvas, a layer row, a button)
      // silently killed every shortcut. Gate on "not typing" instead.
      if (!this.state.isOpen.shortcuts && isTypingTarget(e.target)) return;

      const shortcut = shortcuts.find(shortcut => shortcut.key === e.key);
      if(shortcut) {
        this.setModal("shortcuts", false);
        shortcut.handler();
      }
    });
  };

  /** Move the layer selection by `delta`, clamped to the list. */
  stepLayer = (delta: number) => {
    const layers = this.state.mapStyle.layers || [];
    if (layers.length === 0) return;
    const next = clamp(this.state.selectedLayerIndex + delta, 0, layers.length - 1);
    if (next !== this.state.selectedLayerIndex) this.onLayerSelect(next);
  };

  handleKeyPress = (e: KeyboardEvent) => {
    const cmdOrCtrl = navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? e.metaKey : e.ctrlKey;

    if (cmdOrCtrl && e.key.toLowerCase() === "k") {
      e.preventDefault();
      this.setState(state => ({ commandPaletteOpen: !state.commandPaletteOpen }));
      return;
    }

    if(navigator.platform.toUpperCase().indexOf("MAC") >= 0) {
      if(e.metaKey && e.shiftKey && e.keyCode === 90) {
        e.preventDefault();
        this.onRedo();
      }
      else if(e.metaKey && e.keyCode === 90) {
        e.preventDefault();
        this.onUndo();
      }
    }
    else {
      if(e.ctrlKey && e.keyCode === 90) {
        e.preventDefault();
        this.onUndo();
      }
      else if(e.ctrlKey && e.keyCode === 89) {
        e.preventDefault();
        this.onRedo();
      }
    }
  };

  toggleDockPanel = (panel: Exclude<DockPanelType, null>) => {
    this.setState(state => ({ activeDockPanel: state.activeDockPanel === panel ? null : panel }));
  };

  closeDockPanel = () => this.setState({ activeDockPanel: null });

  async componentDidMount() {
    this.styleStore = await createStyleStore((mapStyle, opts) => this.onStyleChanged(mapStyle, opts));
    window.addEventListener("keydown", this.handleKeyPress);
    window.addEventListener("hashchange", this.onLocationHashChange);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleKeyPress);
    window.removeEventListener("hashchange", this.onLocationHashChange);
  }

  onCoordinateJump = (coordinates: MapCoordinates) => {
    const url = new URL(window.location.href);
    url.hash = formatMapCoordinates(coordinates);
    history.replaceState(history.state, "Maputnik", url.href);
    this.setState({
      mapView: {
        zoom: coordinates.zoom,
        center: {lng: coordinates.lng, lat: coordinates.lat},
        _from: "app",
      }
    });
  };

  onLocationHashChange = () => {
    const coordinates = parseMapCoordinates(window.location.hash, this.state.mapView.zoom);
    if (!coordinates) return;
    const {mapView} = this.state;
    if (coordinates.zoom === mapView.zoom && coordinates.lat === mapView.center.lat && coordinates.lng === mapView.center.lng) return;
    this.onCoordinateJump(coordinates);
  };

  saveStyle(snapshotStyle: StyleSpecificationWithId) {
    this.styleStore?.save(snapshotStyle);
    touchWorkspaceMeta(snapshotStyle.id);
  }

  updateFonts(urlTemplate: string) {
    const metadata: {[key: string]: string} = this.state.mapStyle.metadata || {} as any;
    const accessToken = metadata["maputnik:openmaptiles_access_token"] || tokens.openmaptiles;

    const glyphUrl = (typeof urlTemplate === "string")? urlTemplate.replace("{key}", accessToken): urlTemplate;
    downloadGlyphsMetadata(glyphUrl).then(fonts => {
      this.setState({ spec: updateRootSpec(this.state.spec, "glyphs", fonts)});
    });
  }

  updateIcons(baseUrl: string) {
    downloadSpriteMetadata(baseUrl).then(icons => {
      this.setState({ spec: updateRootSpec(this.state.spec, "sprite", icons)});
    });
  }

  onChangeMetadataProperty = (property: string, value: any) => {
    // If we're changing renderer reset the map state.
    if (
      property === "maputnik:renderer" &&
      value !== get(this.state.mapStyle, ["metadata", "maputnik:renderer"], "mlgljs")
    ) {
      this.setState({
        mapState: "map"
      });
    }

    const changedStyle = {
      ...this.state.mapStyle,
      metadata: {
        ...(this.state.mapStyle as any).metadata,
        [property]: value
      }
    };

    this.onStyleChanged(changedStyle);
  };

  onStyleChanged = (newStyle: StyleSpecificationWithId, opts: OnStyleChangedOpts={}): void => {
    opts = {
      save: true,
      addRevision: true,
      initialLoad: false,
      ...opts,
    };


    // Detect empty style
    const oldStyle = this.state.mapStyle;
    const isEmptySources = !oldStyle.sources || Object.keys(oldStyle.sources).length === 0;
    const isEmptyLayers = !oldStyle.layers || oldStyle.layers.length === 0;
    const isEmptyStyle = isEmptySources && isEmptyLayers;

    // For the style object, find the urls that has "{key}" and insert the correct API keys
    // Without this, going from e.g. MapTiler to OpenLayers and back will lose the maptlier key.

    if (newStyle.glyphs && typeof newStyle.glyphs === "string") {
      newStyle.glyphs = setFetchAccessToken(newStyle.glyphs, newStyle);
    }

    if (newStyle.sprite && typeof newStyle.sprite === "string") {
      newStyle.sprite = setFetchAccessToken(newStyle.sprite, newStyle);
    }

    for (const [_sourceId, source] of Object.entries(newStyle.sources)) {
      if (source && "url" in source && typeof source.url === "string") {
        source.url = setFetchAccessToken(source.url, newStyle);
      }
    }


    if (opts.initialLoad) {
      this.getInitialStateFromUrl(newStyle);
    }

    const errors: ValidationError[] = validateStyleMin(newStyle) || [];
    // The validate function doesn't give us errors for duplicate error with
    // empty string for layer.id, manually deal with that here.
    const layerErrors: (Error | ValidationError)[] = [];
    if (newStyle && newStyle.layers) {
      const foundLayers = new global.Map();
      newStyle.layers.forEach((layer, index) => {
        if (layer.id === "" && foundLayers.has(layer.id)) {
          const error = new Error(
            `layers[${index}]: duplicate layer id [empty_string], previously used`
          );
          layerErrors.push(error);
        }
        foundLayers.set(layer.id, true);
      });
    }

    const mappedErrors: MappedError[] = layerErrors.concat(errors).map(error => {
      // Special case: Duplicate layer id
      const dupMatch = error.message.match(/layers\[(\d+)\]: (duplicate layer id "?(.*)"?, previously used)/);
      if (dupMatch) {
        const [, index, message] = dupMatch;
        return {
          message: error.message,
          parsed: {
            type: "layer",
            data: {
              index: parseInt(index, 10),
              key: "id",
              message,
            }
          }
        };
      }

      // Special case: Invalid source
      const invalidSourceMatch = error.message.match(/layers\[(\d+)\]: (source "(?:.*)" not found)/);
      if (invalidSourceMatch) {
        const [, index, message] = invalidSourceMatch;
        return {
          message: error.message,
          parsed: {
            type: "layer",
            data: {
              index: parseInt(index, 10),
              key: "source",
              message,
            }
          }
        };
      }

      const layerMatch = error.message.match(/layers\[(\d+)\]\.(?:(\S+)\.)?(\S+): (.*)/);
      if (layerMatch) {
        const [, index, group, property, message] = layerMatch;
        const key = (group && property) ? [group, property].join(".") : property;
        return {
          message: error.message,
          parsed: {
            type: "layer",
            data: {
              index: parseInt(index, 10),
              key,
              message
            }
          }
        };
      }
      else {
        return {
          message: error.message,
        };
      }
    });

    let dirtyMapStyle: StyleSpecification | undefined = undefined;
    if (errors.length > 0) {
      dirtyMapStyle = cloneDeep(newStyle);

      for (const error of errors) {
        const {message} = error;
        if (message) {
          try {
            const objPath = message.split(":")[0];
            // Errors can be deeply nested for example 'layers[0].filter[1][1][0]' we only care upto the property 'layers[0].filter'
            const unsetPath = objPath.match(/^\S+?\[\d+\]\.[^[]+/)![0];
            unset(dirtyMapStyle, unsetPath);
          }
          catch (err) {
            console.warn(message + " " + err);
          }
        }
      }
    }

    if(newStyle.glyphs !== this.state.mapStyle.glyphs) {
      this.updateFonts(newStyle.glyphs as string);
    }
    if(newStyle.sprite !== this.state.mapStyle.sprite) {
      this.updateIcons(newStyle.sprite as string);
    }

    if (opts.addRevision) {
      this.revisionStore.addRevision(newStyle);
    }
    if (opts.save) {
      this.saveStyle(newStyle);
    }

    const zoom = newStyle?.zoom;
    const center = newStyle?.center;
    const urlCoordinates = isEmptyStyle ? parseMapCoordinates(window.location.hash, zoom || 0) : null;

    this.setState({
      mapStyle: newStyle,
      dirtyMapStyle: dirtyMapStyle,
      mapView: urlCoordinates ? {
        zoom: urlCoordinates.zoom,
        center: {lng: urlCoordinates.lng, lat: urlCoordinates.lat},
        _from: "app"
      } : isEmptyStyle && zoom && center ? {
        zoom: zoom,
        center: {
          lng: center[0],
          lat: center[1],
        },
        _from: "app"
      } : this.state.mapView,
      errors: mappedErrors,
    }, () => {
      this.fetchSources();
      this.setStateInUrl();
    });
  };

  onUndo = () => {
    const activeStyle = this.revisionStore.undo();

    const messages = undoMessages(this.state.mapStyle, activeStyle);
    this.onStyleChanged(activeStyle, {addRevision: false});
    this.setState({
      infos: messages,
    });
  };

  onRedo = () => {
    const activeStyle = this.revisionStore.redo();
    const messages = redoMessages(this.state.mapStyle, activeStyle);
    this.onStyleChanged(activeStyle, {addRevision: false});
    this.setState({
      infos: messages,
    });
  };

  onMoveLayer = (move: {oldIndex: number; newIndex: number}) => {
    let { oldIndex, newIndex } = move;
    let layers = this.state.mapStyle.layers;
    oldIndex = clamp(oldIndex, 0, layers.length-1);
    newIndex = clamp(newIndex, 0, layers.length-1);
    if(oldIndex === newIndex) return;

    if (oldIndex === this.state.selectedLayerIndex) {
      this.setState({
        selectedLayerIndex: newIndex
      });
    }

    layers = layers.slice(0);
    arrayMoveMutable(layers, oldIndex, newIndex);
    this.onLayersChange(layers);
  };

  onLayersChange = (changedLayers: LayerSpecification[]) => {
    const changedStyle = {
      ...this.state.mapStyle,
      layers: changedLayers
    };
    this.onStyleChanged(changedStyle);
  };

  onLayerDestroy = (index: number) => {
    const layers = this.state.mapStyle.layers;
    if (layers[index]?.id === this.state.isolatedLayerId) {
      this.setState({isolatedLayerId: undefined});
    }
    const remainingLayers = layers.slice(0);
    remainingLayers.splice(index, 1);
    this.onLayersChange(remainingLayers);
  };

  onLayerCopy = (index: number) => {
    const layers = this.state.mapStyle.layers;
    const changedLayers = layers.slice(0);

    const clonedLayer = cloneDeep(changedLayers[index]);
    clonedLayer.id = clonedLayer.id + "-copy";
    changedLayers.splice(index, 0, clonedLayer);
    this.onLayersChange(changedLayers);
  };

  onLayerVisibilityToggle = (index: number) => {
    const layers = this.state.mapStyle.layers;
    const changedLayers = layers.slice(0);

    const layer = { ...changedLayers[index] };
    const changedLayout = "layout" in layer ? {...layer.layout} : {};
    changedLayout.visibility = changedLayout.visibility === "none" ? "visible" : "none";

    layer.layout = changedLayout;
    changedLayers[index] = layer;
    this.onLayersChange(changedLayers);
  };

  onLayerIsolationToggle = (index: number) => {
    const layerId = this.state.mapStyle.layers[index]?.id;
    if (!layerId) return;
    this.setState({
      isolatedLayerId: this.state.isolatedLayerId === layerId ? undefined : layerId,
      selectedLayerIndex: index,
      selectedLayerOriginalId: layerId,
    });
  };


  onLayerIdChange = (index: number, _oldId: string, newId: string) => {
    const changedLayers = this.state.mapStyle.layers.slice(0);
    changedLayers[index] = {
      ...changedLayers[index],
      id: newId
    };

    this.onLayersChange(changedLayers);
    if (this.state.isolatedLayerId === _oldId) {
      this.setState({isolatedLayerId: newId});
    }
  };

  onLayerChanged = (index: number, layer: LayerSpecification) => {
    const changedLayers = this.state.mapStyle.layers.slice(0);
    changedLayers[index] = layer;

    this.onLayersChange(changedLayers);
  };

  setMapState = (newState: MapState) => {
    this.setState({
      mapState: newState
    }, this.setStateInUrl);
  };

  setDefaultValues = (styleObj: StyleSpecificationWithId) => {
    const metadata: {[key: string]: string} = styleObj.metadata || {} as any;
    if(metadata["maputnik:renderer"] === undefined) {
      const changedStyle = {
        ...styleObj,
        metadata: {
          ...styleObj.metadata as any,
          "maputnik:renderer": "mlgljs"
        }
      };
      return changedStyle;
    } else {
      return styleObj;
    }
  };

  openStyle = (styleObj: StyleSpecificationWithId, fileHandle: FileSystemFileHandle | null) => {
    this.setState({fileHandle: fileHandle});
    styleObj = this.setDefaultValues(styleObj);
    this.onStyleChanged(styleObj);
  };

  async fetchSources() {
    const sourceList: {[key: string]: SourceSpecification & {layers: string[]}} = {};
    for(const key of Object.keys(this.state.mapStyle.sources)) {
      const source = this.state.mapStyle.sources[key];
      if(source.type !== "vector" || !("url" in source)) {
        sourceList[key] = this.state.sources[key] || {...this.state.mapStyle.sources[key]};
        if (sourceList[key].layers === undefined) {
          sourceList[key].layers = [];
        }
      } else {
        sourceList[key] = {
          type: source.type,
          layers: []
        };

        let url = source.url;

        try {
          url = setFetchAccessToken(url!, this.state.mapStyle);
        } catch(err) {
          console.warn("Failed to setFetchAccessToken: ", err);
        }

        const setVectorLayers = (json:any) => {
          if(!Object.prototype.hasOwnProperty.call(json, "vector_layers")) {
            return;
          }

          for(const layer of json.vector_layers) {
            sourceList[key].layers.push(layer.id);
          }
        };

        try {
          if (url!.startsWith("pmtiles://")) {
            const json = await (new PMTiles(url!.substring(10))).getTileJson("");
            setVectorLayers(json);
          } else {
            const response = await fetch(url!, { mode: "cors" });
            const json = await response.json();
            setVectorLayers(json);
          }
        } catch(err) {
          console.error(`Failed to process source for url: '${url}', ${err}`);
        }
      }
    }

    if(!isEqual(this.state.sources, sourceList)) {
      console.debug("Setting sources", sourceList);
      this.setState({
        sources: sourceList
      });
    }
  }

  _getRenderer () {
    const metadata: {[key:string]: string} = this.state.mapStyle.metadata || {} as any;
    return metadata["maputnik:renderer"] || "mlgljs";
  }

  onMapChange = (mapView: {
    zoom: number,
    center: {
      lng: number,
      lat: number,
    },
    _from: "map" | "app"
  }) => {
    this.setState({
      mapView,
    });
  };

  mapRenderer() {
    const {mapStyle, dirtyMapStyle} = this.state;
    const activeMapStyle = dirtyMapStyle || mapStyle;
    const hasIsolatedLayer = activeMapStyle.layers.some(layer => layer.id === this.state.isolatedLayerId);
    const renderedMapStyle = hasIsolatedLayer ? {
      ...activeMapStyle,
      layers: activeMapStyle.layers.map(layer => {
        if (layer.id === this.state.isolatedLayerId || layer.type === "background") return layer;
        return {
          ...layer,
          layout: {...layer.layout, visibility: "none"}
        } as LayerSpecification;
      })
    } : activeMapStyle;

    const mapProps = {
      mapStyle: renderedMapStyle,
      mapView: this.state.mapView,
      replaceAccessTokens: (mapStyle: StyleSpecification) => {
        return replaceAccessTokens(mapStyle, {
          allowFallback: true
        });
      },
      onDataChange: (e: {map: Map}) => {
        this.layerWatcher.analyzeMap(e.map);
        this.fetchSources();
      },
    };

    const renderer = this._getRenderer();

    let mapElement;

    // Check if OL code has been loaded?
    if(renderer === "ol") {
      mapElement = <MapOpenLayers
        {...mapProps}
        onChange={this.onMapChange}
        debugToolbox={this.state.openlayersDebugOptions.debugToolbox}
        onLayerSelect={(layerId) => this.onLayerSelect(+layerId)}
      />;
    } else {

      mapElement = <MapMaplibreGl {...mapProps}
        onChange={this.onMapChange}
        options={this.state.maplibreGlDebugOptions}
        inspectModeEnabled={this.state.mapState === "inspect"}
        highlightedLayer={this.state.mapStyle.layers[this.state.selectedLayerIndex]}
        onLayerSelect={this.onLayerSelect} />;
    }

    let filterName;
    if(this.state.mapState.match(/^filter-/)) {
      filterName = this.state.mapState.replace(/^filter-/, "");
    }
    const elementStyle: {filter?: string} = {};
    if (filterName) {
      elementStyle.filter = `url('#${filterName}')`;
    }

    return <div style={elementStyle} className="maputnik-map__container" data-wd-key="maplibre:container">
      {mapElement}
    </div>;
  }

  setStateInUrl = () => {
    const {mapStyle, isOpen} = this.state;
    const {selectedLayerIndex} = this.state;
    const url = new URL(location.href);
    const hashVal = hash(JSON.stringify(mapStyle));
    url.searchParams.set("layer", `${hashVal}~${selectedLayerIndex}`);

    const openModals = Object.entries(isOpen)
      .map(([key, val]) => (val === true ? key : null))
      .filter(val => val !== null);

    if (openModals.length > 0) {
      url.searchParams.set("modal", openModals.join(","));
    }
    else {
      url.searchParams.delete("modal");
    }

    // The view (map/inspect) is intentionally NOT persisted in the URL —
    // reloading should always come back in plain "map" view.
    url.searchParams.delete("view");

    history.replaceState({selectedLayerIndex}, "Maputnik", url.href);
  };

  getInitialStateFromUrl = (mapStyle: StyleSpecification) => {
    const url = new URL(location.href);
    const modalParam = url.searchParams.get("modal");

    if (modalParam && modalParam !== "") {
      const modals = modalParam.split(",");
      const modalObj: {[key: string]: boolean} = {};
      modals.forEach(modalName => {
        modalObj[modalName] = true;
      });

      this.setState({
        isOpen: {
          ...this.state.isOpen,
          ...modalObj,
        }
      });
    }

    const path = url.searchParams.get("layer");
    if (path) {
      try {
        const parts = path.split("~");
        const [hashVal, selectedLayerIndex] = [
          parts[0],
          parseInt(parts[1], 10),
        ];

        let valid = true;
        if (hashVal !== "-") {
          const currentHashVal = hash(JSON.stringify(mapStyle));
          if (currentHashVal !== parseInt(hashVal, 10)) {
            valid = false;
          }
        }
        if (valid) {
          this.setState({
            selectedLayerIndex,
            selectedLayerOriginalId: mapStyle.layers[selectedLayerIndex].id,
          });
        }
      }
      catch (err) {
        console.warn(err);
      }
    }
  };

  onLayerSelect = (index: number) => {
    this.setState({
      selectedLayerIndex: index,
      selectedLayerOriginalId: this.state.mapStyle.layers[index].id,
    }, this.setStateInUrl);
  };

  setModal(modalName: keyof AppState["isOpen"], value: boolean) {
    this.setState({
      isOpen: {
        ...this.state.isOpen,
        [modalName]: value
      }
    }, this.setStateInUrl);
  }

  toggleModal(modalName: keyof AppState["isOpen"]) {
    this.setModal(modalName, !this.state.isOpen[modalName]);
  }

  onSetFileHandle = (fileHandle: FileSystemFileHandle | null) => {
    this.setState({ fileHandle });
  };

  onChangeOpenlayersDebug = (key: keyof AppState["openlayersDebugOptions"], value: boolean) => {
    this.setState({
      openlayersDebugOptions: {
        ...this.state.openlayersDebugOptions,
        [key]: value,
      }
    });
  };

  onChangeMaplibreGlDebug = (key: keyof AppState["maplibreGlDebugOptions"], value: any) => {
    this.setState({
      maplibreGlDebugOptions: {
        ...this.state.maplibreGlDebugOptions,
        [key]: value,
      }
    });
  };

  buildCommands(): Command[] {
    const layers = this.state.mapStyle.layers || [];

    const commands: Command[] = [
      { id: "open", label: "Open a style", group: "File", icon: <MdOpenInBrowser />, hint: "O", action: () => this.setModal("open", true) },
      { id: "save", label: "Save / Export", group: "File", icon: <MdSave />, hint: "E", action: () => this.setModal("export", true) },
      { id: "code-editor", label: "Toggle code editor", group: "File", icon: <MdCode />, action: () => this.toggleModal("codeEditor") },
      { id: "sources", label: "Data sources", group: "Style", icon: <MdLayers />, hint: "D", action: () => this.setModal("sources", true) },
      { id: "settings", label: "Style settings", group: "Style", icon: <MdSettings />, hint: "S", action: () => this.setModal("settings", true) },
      { id: "global-state", label: "Global state", group: "Style", icon: <MdPublic />, hint: "G", action: () => this.setModal("globalState", true) },
      { id: "view-map", label: "Map view", group: "View", icon: <MdMap />, action: () => this.setMapState("map") },
      { id: "view-inspect", label: "Inspect view", group: "View", icon: <MdFindInPage />, hint: "I", action: () => this.setMapState("inspect") },
      { id: "undo", label: "Undo", group: "Edit", icon: <MdUndo />, hint: "⌘Z", action: this.onUndo },
      { id: "redo", label: "Redo", group: "Edit", icon: <MdRedo />, hint: "⌘⇧Z", action: this.onRedo },
      { id: "shortcuts", label: "Keyboard shortcuts", group: "Help", icon: <MdKeyboard />, hint: "?", action: () => this.setModal("shortcuts", true) },
      { id: "copilot", label: "Open Copilot", group: "Meridian", icon: <MdAutoAwesome />, keywords: "ai intelligence assistant", action: () => this.toggleDockPanel("ai") },
      { id: "timeline", label: "Open Timeline", group: "Meridian", icon: <MdHistory />, keywords: "history checkpoint version snapshot compare", action: () => this.toggleDockPanel("timeline") },
      { id: "workspace", label: "Open Workspace", group: "Meridian", icon: <MdFolderOpen />, keywords: "files projects manage switch", action: () => this.toggleDockPanel("workspace") },
    ];

    layers.forEach((layer, index) => {
      commands.push({
        id: `layer-${layer.id}-${index}`,
        label: layer.id || `Layer ${index}`,
        group: "Jump to layer",
        icon: <MdLayers />,
        hint: layer.type,
        action: () => this.onLayerSelect(index),
      });
    });

    return commands;
  }

  render() {
    const layers = this.state.mapStyle.layers || [];
    const selectedLayer = layers.length > 0 ? layers[this.state.selectedLayerIndex] : undefined;

    const toolbar = <AppToolbar
      renderer={this._getRenderer()}
      mapState={this.state.mapState}
      mapStyle={this.state.mapStyle}
      inspectModeEnabled={this.state.mapState === "inspect"}
      sources={this.state.sources}
      onStyleChanged={this.onStyleChanged}
      onStyleOpen={this.onStyleChanged}
      onSetMapState={this.setMapState}
      onToggleModal={(modal: keyof AppState["isOpen"]) => this.toggleModal(modal)}
      activeDockPanel={this.state.activeDockPanel}
      onToggleDockPanel={this.toggleDockPanel}
      onOpenCommandPalette={() => this.setState({ commandPaletteOpen: true })}
      mapCoordinates={{
        zoom: this.state.mapView.zoom,
        lat: this.state.mapView.center.lat,
        lng: this.state.mapView.center.lng,
      }}
      onCoordinateJump={this.onCoordinateJump}
    />;

    const codeEditor = this.state.isOpen.codeEditor ? <CodeEditor
      value={this.state.mapStyle}
      onChange={(style) => this.onStyleChanged(style)}
      onClose={() => this.setModal("codeEditor", false)}
    /> : undefined;

    const layerList = <LayerList
      onMoveLayer={this.onMoveLayer}
      onLayerDestroy={this.onLayerDestroy}
      onLayerCopy={this.onLayerCopy}
      onLayerVisibilityToggle={this.onLayerVisibilityToggle}
      onLayerIsolationToggle={this.onLayerIsolationToggle}
      isolatedLayerId={this.state.isolatedLayerId}
      onLayersChange={this.onLayersChange}
      onLayerSelect={this.onLayerSelect}
      selectedLayerIndex={this.state.selectedLayerIndex}
      layers={layers}
      sources={this.state.sources}
      errors={this.state.errors}
    />;

    const layerEditor = selectedLayer ? <ErrorBoundary resetKey={this.state.selectedLayerOriginalId}>
      <LayerEditor
        key={this.state.selectedLayerOriginalId}
        layer={selectedLayer}
        layerIndex={this.state.selectedLayerIndex}
        isFirstLayer={this.state.selectedLayerIndex < 1}
        isLastLayer={this.state.selectedLayerIndex === this.state.mapStyle.layers.length-1}
        sources={this.state.sources}
        vectorLayers={this.state.vectorLayers}
        spec={this.state.spec}
        onMoveLayer={this.onMoveLayer}
        onLayerChanged={this.onLayerChanged}
        onLayerDestroy={this.onLayerDestroy}
        onLayerCopy={this.onLayerCopy}
        onLayerVisibilityToggle={this.onLayerVisibilityToggle}
        onLayerIdChange={this.onLayerIdChange}
        errors={this.state.errors}
      />
    </ErrorBoundary> : undefined;

    const bottomPanel = (this.state.errors.length + this.state.infos.length) > 0 ? <MessagePanel
      currentLayer={selectedLayer}
      selectedLayerIndex={this.state.selectedLayerIndex}
      onLayerSelect={this.onLayerSelect}
      mapStyle={this.state.mapStyle}
      errors={this.state.errors}
      infos={this.state.infos}
    /> : undefined;


    const modals = <div>
      <ModalDebug
        renderer={this._getRenderer()}
        maplibreGlDebugOptions={this.state.maplibreGlDebugOptions}
        openlayersDebugOptions={this.state.openlayersDebugOptions}
        onChangeMaplibreGlDebug={this.onChangeMaplibreGlDebug}
        onChangeOpenlayersDebug={this.onChangeOpenlayersDebug}
        isOpen={this.state.isOpen.debug}
        onOpenToggle={() => this.toggleModal("debug")}
        mapView={this.state.mapView}
      />
      <ModalShortcuts
        isOpen={this.state.isOpen.shortcuts}
        onOpenToggle={() => this.toggleModal("shortcuts")}
      />
      <ModalSettings
        mapStyle={this.state.mapStyle}
        onStyleChanged={this.onStyleChanged}
        onChangeMetadataProperty={this.onChangeMetadataProperty}
        isOpen={this.state.isOpen.settings}
        onOpenToggle={() => this.toggleModal("settings")}
      />
      <ModalExport
        mapStyle={this.state.mapStyle}
        onStyleChanged={this.onStyleChanged}
        isOpen={this.state.isOpen.export}
        onOpenToggle={() => this.toggleModal("export")}
        fileHandle={this.state.fileHandle}
        onSetFileHandle={this.onSetFileHandle}
      />
      <ModalOpen
        isOpen={this.state.isOpen.open}
        onStyleOpen={this.openStyle}
        onOpenToggle={() => this.toggleModal("open")}
        fileHandle={this.state.fileHandle}
      />
      <ModalSources
        mapStyle={this.state.mapStyle}
        onStyleChanged={this.onStyleChanged}
        isOpen={this.state.isOpen.sources}
        onOpenToggle={() => this.toggleModal("sources")}
      />
      <ModalGlobalState
        mapStyle={this.state.mapStyle}
        onStyleChanged={this.onStyleChanged}
        isOpen={this.state.isOpen.globalState}
        onOpenToggle={() => this.toggleModal("globalState")}
      />

      <CommandPalette
        isOpen={this.state.commandPaletteOpen}
        commands={this.buildCommands()}
        onClose={() => this.setState({ commandPaletteOpen: false })}
      />

      {this.state.activeDockPanel === "ai" && <AICopilotPanel
        mapStyle={this.state.mapStyle}
        onStyleChanged={this.onStyleChanged}
        onUndo={this.onUndo}
        onClose={this.closeDockPanel}
      />}
      {this.state.activeDockPanel === "timeline" && <TimelinePanel
        mapStyle={this.state.mapStyle}
        onStyleChanged={this.onStyleChanged}
        onClose={this.closeDockPanel}
      />}
      {this.state.activeDockPanel === "workspace" && <WorkspacePanel
        currentStyleId={this.state.mapStyle.id}
        onOpenStyle={(style) => this.openStyle(style, null)}
        onClose={this.closeDockPanel}
      />}
    </div>;

    return <AppLayout
      toolbar={toolbar}
      layerList={layerList}
      layerEditor={layerEditor}
      codeEditor={codeEditor}
      map={this.mapRenderer()}
      bottom={bottomPanel}
      modals={modals}
    />;
  }
}
