import React from "react";
import { MdSearch } from "react-icons/md";

export type Command = {
  id: string
  label: string
  group: string
  icon: React.ReactNode
  hint?: string
  keywords?: string
  action(): void
};

type CommandPaletteProps = {
  isOpen: boolean
  commands: Command[]
  onClose(): void
};

type CommandPaletteState = {
  query: string
  activeIndex: number
};

function matches(command: Command, query: string): boolean {
  if (!query) return true;
  const haystack = `${command.label} ${command.group} ${command.keywords || ""}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).every(token => haystack.includes(token));
}

export class CommandPalette extends React.Component<CommandPaletteProps, CommandPaletteState> {
  state: CommandPaletteState = { query: "", activeIndex: 0 };
  inputRef = React.createRef<HTMLInputElement>();
  listRef = React.createRef<HTMLDivElement>();

  componentDidUpdate(prevProps: CommandPaletteProps) {
    if (this.props.isOpen && !prevProps.isOpen) {
      this.setState({ query: "", activeIndex: 0 });
      requestAnimationFrame(() => this.inputRef.current?.focus());
    }
  }

  get filtered(): Command[] {
    return this.props.commands.filter(c => matches(c, this.state.query));
  }

  run = (command: Command) => {
    this.props.onClose();
    command.action();
  };

  onKeyDown = (e: React.KeyboardEvent) => {
    const list = this.filtered;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.setState(s => ({ activeIndex: Math.min(s.activeIndex + 1, list.length - 1) }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.setState(s => ({ activeIndex: Math.max(s.activeIndex - 1, 0) }));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const command = list[this.state.activeIndex];
      if (command) this.run(command);
    } else if (e.key === "Escape") {
      this.props.onClose();
    }
  };

  render() {
    if (!this.props.isOpen) return null;
    const list = this.filtered;

    const groups: string[] = [];
    for (const c of list) if (!groups.includes(c.group)) groups.push(c.group);

    let runningIndex = -1;

    return <div className="meridian-cmdk-overlay" onMouseDown={e => { if (e.target === e.currentTarget) this.props.onClose(); }}>
      <div className="meridian-cmdk" onKeyDown={this.onKeyDown}>
        <div className="meridian-cmdk-input-row">
          <MdSearch />
          <input
            ref={this.inputRef}
            className="meridian-cmdk-input"
            placeholder="Jump to anything — layers, sources, panels, actions…"
            value={this.state.query}
            onChange={e => this.setState({ query: e.target.value, activeIndex: 0 })}
          />
        </div>
        <div className="meridian-cmdk-list" ref={this.listRef}>
          {list.length === 0 && <div className="meridian-cmdk-empty">No matches.</div>}
          {groups.map(group => (
            <React.Fragment key={group}>
              <div className="meridian-cmdk-group-label">{group}</div>
              {list.filter(c => c.group === group).map(command => {
                runningIndex++;
                const isActive = runningIndex === this.state.activeIndex;
                return <div
                  key={command.id}
                  className={`meridian-cmdk-item${isActive ? " meridian-cmdk-item--active" : ""}`}
                  onMouseEnter={() => this.setState({ activeIndex: runningIndex })}
                  onClick={() => this.run(command)}
                >
                  <span className="meridian-cmdk-item-icon">{command.icon}</span>
                  <span className="meridian-cmdk-item-label">{command.label}</span>
                  {command.hint && <span className="meridian-cmdk-item-hint">{command.hint}</span>}
                </div>;
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>;
  }
}
