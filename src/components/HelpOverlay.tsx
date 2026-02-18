interface HelpOverlayProps {
  visible: boolean;
  onClose: () => void;
}

const shortcuts = [
  ['Space', 'Play / Pause'],
  ['J', 'Toggle reverse playback'],
  ['S', 'Cycle speed (0.25x-3x)'],
  ['Left/Right', 'Seek -5s / +5s'],
  ['E', 'Cycle color mode'],
  ['1-9', 'Toggle effects'],
  ['+/-', 'Effect intensity'],
  ['A', 'Auto-cycle FX'],
  ['R', 'Randomize FX'],
  ['0', 'Reset all FX'],
  ['C', 'Toggle CRT mode'],
  ['V', 'Cycle phosphor color'],
  ['B', 'Toggle burn-in'],
  ['N', 'Toggle interlace'],
  ['T', 'Toggle VHS timestamp'],
  ['D', 'Toggle datamosh'],
  ['L', 'Toggle scan line'],
  ['W', 'Channel switch'],
  ['H', 'Toggle marquee'],
  ['Q', 'Toggle mirror/flip'],
  ['X', 'Cycle character set'],
  ['M', 'Toggle audio reactive'],
  ['Y', 'Copy ASCII to clipboard'],
  ['P', 'Screenshot (PNG)'],
  ['G', 'Record / Stop (WebM)'],
  ['F', 'Toggle fullscreen'],
  ['I', 'Toggle info'],
  ['Scroll', 'Adjust resolution'],
  ['?', 'Toggle this help'],
  ['Esc', 'Eject / Back'],
];

export function HelpOverlay({ visible, onClose }: HelpOverlayProps) {
  if (!visible) return null;

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-content" onClick={e => e.stopPropagation()}>
        <div className="help-header">[ KEYBOARD SHORTCUTS ]</div>
        <div className="help-list">
          {shortcuts.map(([key, desc]) => (
            <div key={key} className="help-row">
              <span className="help-key">{key}</span>
              <span className="help-desc">{desc}</span>
            </div>
          ))}
        </div>
        <div className="help-footer">Press ? to close</div>
      </div>
    </div>
  );
}
