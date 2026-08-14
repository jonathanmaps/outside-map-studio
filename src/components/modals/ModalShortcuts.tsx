import React from "react";
import { type WithTranslation, withTranslation } from "react-i18next";

import { Modal } from "./Modal";


type ModalShortcutsInternalProps = {
  isOpen: boolean
  onOpenToggle(): void
} & WithTranslation;


class ModalShortcutsInternal extends React.Component<ModalShortcutsInternalProps> {
  render() {
    const t = this.props.t;
    const help = [
      {
        key: <kbd>?</kbd>,
        text: t("Shortcuts menu")
      },
      {
        key: <kbd>o</kbd>,
        text: t("Open modal")
      },
      {
        key: <kbd>e</kbd>,
        text: t("Export modal")
      },
      {
        key: <kbd>d</kbd>,
        text: t("Data Sources modal")
      },
      {
        key: <kbd>s</kbd>,
        text: t("Style Settings modal")
      },
      {
        key: <kbd>g</kbd>,
        text: t("Global State modal")
      },
      {
        key: <kbd>j</kbd>,
        text: t("Toggle code (JSON) editor")
      },
      {
        key: <kbd>i</kbd>,
        text: t("Toggle inspect")
      },
      {
        key: <kbd>m</kbd>,
        text: t("Focus map")
      },
      {
        key: <kbd>!</kbd>,
        text: t("Debug modal")
      },
    ];

    const panelShortcuts = [
      {
        key: <><kbd>⌘</kbd> + <kbd>K</kbd></>,
        text: t("Command palette")
      },
      {
        key: <kbd>/</kbd>,
        text: t("Command palette")
      },
      {
        key: <kbd>c</kbd>,
        text: t("Copilot panel")
      },
      {
        key: <kbd>t</kbd>,
        text: t("Timeline panel")
      },
      {
        key: <kbd>w</kbd>,
        text: t("Workspace panel")
      },
    ];

    const layerShortcuts = [
      {
        key: <kbd>[</kbd>,
        text: t("Select previous layer")
      },
      {
        key: <kbd>]</kbd>,
        text: t("Select next layer")
      },
      {
        key: <kbd>v</kbd>,
        text: t("Show/hide the selected layer")
      },
      {
        key: <kbd>x</kbd>,
        text: t("Isolate the selected layer")
      },
      {
        key: <kbd>f</kbd>,
        text: t("Find layers")
      },
      {
        key: <><kbd>⌘</kbd> + <kbd>Z</kbd></>,
        text: t("Undo")
      },
      {
        key: <><kbd>⌘</kbd> + <kbd>⇧</kbd> + <kbd>Z</kbd></>,
        text: t("Redo")
      },
    ];


    const mapShortcuts = [
      {
        key: <kbd>+</kbd>,
        text: t("Increase the zoom level by 1.",)
      },
      {
        key: <><kbd>Shift</kbd> + <kbd>+</kbd></>,
        text: t("Increase the zoom level by 2.",)
      },
      {
        key: <kbd>-</kbd>,
        text: t("Decrease the zoom level by 1.",)
      },
      {
        key: <><kbd>Shift</kbd> + <kbd>-</kbd></>,
        text: t("Decrease the zoom level by 2.",)
      },
      {
        key: <kbd>Up</kbd>,
        text: t("Pan up by 100 pixels.",)
      },
      {
        key: <kbd>Down</kbd>,
        text: t("Pan down by 100 pixels.",)
      },
      {
        key: <kbd>Left</kbd>,
        text: t("Pan left by 100 pixels.",)
      },
      {
        key: <kbd>Right</kbd>,
        text: t("Pan right by 100 pixels.",)
      },
      {
        key: <><kbd>Shift</kbd> + <kbd>Right</kbd></>,
        text: t("Increase the rotation by 15 degrees.",)
      },
      {
        key: <><kbd>Shift</kbd> + <kbd>Left</kbd></>,
        text: t("Decrease the rotation by 15 degrees.")
      },
      {
        key: <><kbd>Shift</kbd> + <kbd>Up</kbd></>,
        text: t("Increase the pitch by 10 degrees.")
      },
      {
        key: <><kbd>Shift</kbd> + <kbd>Down</kbd></>,
        text: t("Decrease the pitch by 10 degrees.")
      },
    ];


    return <Modal
      data-wd-key="modal:shortcuts"
      isOpen={this.props.isOpen}
      onOpenToggle={this.props.onOpenToggle}
      title={t("Shortcuts")}
    >
      <section className="maputnik-modal-section maputnik-modal-shortcuts">
        <p>
          {t("These work anywhere except while you're typing in a field. Press ESC to leave a field first.")}
        </p>
        <dl>
          {help.map((item, idx) => {
            return <div key={idx} className="maputnik-modal-shortcuts__shortcut">
              <dt key={"dt"+idx}>{item.key}</dt>
              <dd key={"dd"+idx}>{item.text}</dd>
            </div>;
          })}
        </dl>

        <h2>{t("Panels")}</h2>
        <dl>
          {panelShortcuts.map((item, idx) => {
            return <div key={idx} className="maputnik-modal-shortcuts__shortcut">
              <dt key={"dt"+idx}>{item.key}</dt>
              <dd key={"dd"+idx}>{item.text}</dd>
            </div>;
          })}
        </dl>

        <h2>{t("Layers")}</h2>
        <dl>
          {layerShortcuts.map((item, idx) => {
            return <div key={idx} className="maputnik-modal-shortcuts__shortcut">
              <dt key={"dt"+idx}>{item.key}</dt>
              <dd key={"dd"+idx}>{item.text}</dd>
            </div>;
          })}
        </dl>

        <h2>{t("Map")}</h2>
        <p>{t("If the Map is in focused you can use the following shortcuts")}</p>
        <ul>
          {mapShortcuts.map((item, idx) => {
            return <li key={idx}>
              <span>{item.key}</span> {item.text}
            </li>;
          })}
        </ul>
      </section>
    </Modal>;
  }
}

export const ModalShortcuts = withTranslation()(ModalShortcutsInternal);
