import { forwardRef, type ReactNode } from 'react';

interface TerminalProps {
  title: string;
  children: ReactNode;
  crtEnabled: boolean;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  drawerContent: ReactNode;
  miniBar?: ReactNode;
}

export const Terminal = forwardRef<HTMLDivElement, TerminalProps>(function Terminal(
  { title, children, crtEnabled, drawerOpen, onToggleDrawer, drawerContent, miniBar },
  ref
) {
  return (
    <div ref={ref} className={`terminal ${crtEnabled ? 'crt' : ''}`}>
      <div className="terminal-bezel">
        <div className="terminal-screen">
          <div className="terminal-titlebar">
            <span className="terminal-prompt">&#9608;</span>
            <span className="terminal-title">{title}</span>
          </div>
          <div className="terminal-body">
            {children}
          </div>
          {crtEnabled && <div className="crt-overlay" />}
          {crtEnabled && <div className="crt-vignette" />}
        </div>
        {miniBar}
        <div
          className={`terminal-drawer-handle ${drawerOpen ? 'open' : ''}`}
          onClick={onToggleDrawer}
        >
          <span className="drawer-arrow">{drawerOpen ? '\u25BC' : '\u25B2'}</span>
          <span>{drawerOpen ? 'CLOSE' : 'CONTROLS'}</span>
          <span className="drawer-arrow">{drawerOpen ? '\u25BC' : '\u25B2'}</span>
        </div>
        <div className={`terminal-drawer ${drawerOpen ? 'open' : ''}`}>
          {drawerContent}
        </div>
      </div>
    </div>
  );
});
