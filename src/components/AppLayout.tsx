import React from "react";
import { ScrollContainer } from "./ScrollContainer";
import { type WithTranslation, withTranslation } from "react-i18next";
import { IconContext } from "react-icons";
import { ResizeHandle } from "./ResizeHandle";

type AppLayoutInternalProps = {
  toolbar: React.ReactElement
  layerList: React.ReactElement
  layerEditor?: React.ReactElement
  codeEditor?: React.ReactElement
  map: React.ReactElement
  bottom?: React.ReactElement
  modals?: React.ReactNode
} & WithTranslation;

type AppLayoutInternalState = {
  listWidth: number
  drawerWidth: number
  viewportWidth: number
};

const DEFAULT_LIST_WIDTH = 200;
const DEFAULT_DRAWER_WIDTH = 370;
const MIN_LIST_WIDTH = 160;
const MIN_DRAWER_WIDTH = 260;
const STORAGE_KEY = "maputnik:layout:panel-widths";

/** The layer editor is scaled down so its fields and embedded JSON need
 * less scrolling. Declared here rather than in CSS so the resize handle can
 * account for it — pointer travel is in screen pixels, panel width isn't. */
const DRAWER_ZOOM = 0.82;

/** Panel widths persist, so a layout tuned for long layer names survives a
 * reload rather than snapping back every session. */
function loadWidths(): {listWidth: number, drawerWidth: number} {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        listWidth: Number(parsed.listWidth) || DEFAULT_LIST_WIDTH,
        drawerWidth: Number(parsed.drawerWidth) || DEFAULT_DRAWER_WIDTH,
      };
    }
  } catch {
    // Corrupt or unavailable storage shouldn't stop the editor loading.
  }
  return {listWidth: DEFAULT_LIST_WIDTH, drawerWidth: DEFAULT_DRAWER_WIDTH};
}

class AppLayoutInternal extends React.Component<AppLayoutInternalProps, AppLayoutInternalState> {
  layoutRef = React.createRef<HTMLDivElement>();
  resizeObserver?: ResizeObserver;
  resizeFrame?: number;

  state: AppLayoutInternalState = {
    ...loadWidths(),
    viewportWidth: typeof window === "undefined" ? 1440 : window.innerWidth,
  };

  componentDidMount() {
    window.addEventListener("resize", this.onWindowResize);

    if (typeof ResizeObserver === "undefined" || !this.layoutRef.current) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    });
    this.layoutRef.current.querySelectorAll(".maputnik-layout-list, .maputnik-layout-drawer")
      .forEach(element => this.resizeObserver?.observe(element));
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.onWindowResize);
    this.resizeObserver?.disconnect();
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
  }

  onWindowResize = () => {
    if (window.innerWidth !== this.state.viewportWidth) {
      this.setState({viewportWidth: window.innerWidth});
    }
  };

  /** Upper bounds track the viewport so the panels can never crowd the map
   * off the screen on a narrow window. */
  get maxListWidth() {
    return Math.max(MIN_LIST_WIDTH, Math.min(640, this.state.viewportWidth * 0.4));
  }

  get maxDrawerWidth() {
    return Math.max(MIN_DRAWER_WIDTH, Math.min(900, this.state.viewportWidth * 0.55));
  }

  persist(next: Partial<Pick<AppLayoutInternalState, "listWidth" | "drawerWidth">>) {
    this.setState(next as AppLayoutInternalState, () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          listWidth: this.state.listWidth,
          drawerWidth: this.state.drawerWidth,
        }));
      } catch {
        // Not worth failing a resize over.
      }
      // MapLibre resizes from its container, which just changed.
      window.dispatchEvent(new Event("resize"));
    });
  }

  render() {
    document.body.dir = this.props.i18n.dir();
    const t = this.props.t;

    // Clamp on the way out too, so a stored width stays sane after the
    // window has been made much narrower since it was saved.
    const listWidth = Math.min(this.state.listWidth, this.maxListWidth);
    const drawerWidth = Math.min(this.state.drawerWidth, this.maxDrawerWidth);

    return <IconContext.Provider value={{size: "14px"}}>
      <div className="maputnik-layout">
        {this.props.toolbar}
        <div className="maputnik-layout-main" ref={this.layoutRef}>
          {this.props.codeEditor && <div className="maputnik-layout-code-editor">
            <ScrollContainer>
              {this.props.codeEditor}
            </ScrollContainer>
          </div>
          }
          {!this.props.codeEditor && <>
            <div className="maputnik-layout-list" style={{width: listWidth}}>
              {this.props.layerList}
            </div>
            <ResizeHandle
              label={t("Layer list width")}
              width={listWidth}
              min={MIN_LIST_WIDTH}
              max={this.maxListWidth}
              defaultWidth={DEFAULT_LIST_WIDTH}
              onResize={width => this.persist({listWidth: width})}
            />
            <div className="maputnik-layout-drawer" style={{width: drawerWidth, zoom: DRAWER_ZOOM}}>
              <ScrollContainer>
                {this.props.layerEditor}
              </ScrollContainer>
            </div>
            <ResizeHandle
              label={t("Layer editor width")}
              width={drawerWidth}
              min={MIN_DRAWER_WIDTH}
              max={this.maxDrawerWidth}
              defaultWidth={DEFAULT_DRAWER_WIDTH}
              scale={DRAWER_ZOOM}
              onResize={width => this.persist({drawerWidth: width})}
            />
          </>}
          {this.props.map}
        </div>
        {this.props.bottom && <div className="maputnik-layout-bottom">
          {this.props.bottom}
        </div>
        }
        {this.props.modals}
      </div>
    </IconContext.Provider>;
  }
}

export const AppLayout = withTranslation()(AppLayoutInternal);
