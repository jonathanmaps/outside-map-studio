import React from "react";
import { ScrollContainer } from "./ScrollContainer";
import { type WithTranslation, withTranslation } from "react-i18next";
import { IconContext } from "react-icons";

type AppLayoutInternalProps = {
  toolbar: React.ReactElement
  layerList: React.ReactElement
  layerEditor?: React.ReactElement
  codeEditor?: React.ReactElement
  map: React.ReactElement
  bottom?: React.ReactElement
  modals?: React.ReactNode
} & WithTranslation;

class AppLayoutInternal extends React.Component<AppLayoutInternalProps> {
  layoutRef = React.createRef<HTMLDivElement>();
  resizeObserver?: ResizeObserver;
  resizeFrame?: number;

  componentDidMount() {
    if (typeof ResizeObserver === "undefined" || !this.layoutRef.current) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    });
    this.layoutRef.current.querySelectorAll(".maputnik-layout-list, .maputnik-layout-drawer")
      .forEach(element => this.resizeObserver?.observe(element));
  }

  componentWillUnmount() {
    this.resizeObserver?.disconnect();
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
  }

  render() {
    document.body.dir = this.props.i18n.dir();

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
            <div className="maputnik-layout-list">
              {this.props.layerList}
            </div>
            <div className="maputnik-layout-drawer">
              <ScrollContainer>
                {this.props.layerEditor}
              </ScrollContainer>
            </div>
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
