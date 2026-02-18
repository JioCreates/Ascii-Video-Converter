import { useState, useCallback } from 'react';
import type { EffectManagerState } from '../effects/manager';
import type { VideoPlayerState } from '../hooks/useVideoPlayer';
import { CHARSETS } from '../engine/renderer';
import type { CustomPreset } from '../hooks/useCustomPresets';
import { useSwipe } from '../hooks/useSwipe';

interface ControlBarProps {
  videoState: VideoPlayerState;
  effectState: EffectManagerState;
  effectList: { key: string; name: string; stage: string }[];
  crtEnabled: boolean;
  resolution: number;
  charsetIndex: number;
  audioReactive: boolean;
  isRecording: boolean;
  phosphorColor: string;
  burnIn: boolean;
  interlace: boolean;
  showTimestamp: boolean;
  scanLine: boolean;
  datamosh: boolean;
  showMarquee: boolean;
  onTogglePlay: () => void;
  onToggleReverse: () => void;
  onCycleSpeed: () => void;
  onSeek: (delta: number) => void;
  onToggleEffect: (index: number) => void;
  onNextColorMode: () => void;
  onToggleAutoCycle: () => void;
  onRandomize: () => void;
  onReset: () => void;
  onToggleCrt: () => void;
  onResolutionChange: (value: number) => void;
  onSetCharset: (index: number) => void;
  onToggleAudio: () => void;
  onScreenshot: () => void;
  onToggleRecord: () => void;
  onCyclePhosphor: () => void;
  onToggleBurnIn: () => void;
  onToggleInterlace: () => void;
  onToggleTimestamp: () => void;
  onCopyText: () => void;
  onApplyPreset: (name: string) => void;
  onChannelSwitch: () => void;
  onToggleScanLine: () => void;
  onToggleDatamosh: () => void;
  onToggleMarquee: () => void;
  onSetMarqueeText: (text: string) => void;
  marqueeText: string;
  customRamp: string;
  onSetCustomRamp: (ramp: string) => void;
  isMirrored: boolean;
  onToggleMirror: () => void;
  customPresets: CustomPreset[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: CustomPreset) => void;
  onDeletePreset: (name: string) => void;
  onExportGif: () => void;
  isExportingGif: boolean;
  onSetEffectIntensity: (key: string, intensity: number) => void;
}

const TABS = ['play', 'fx', 'display', 'tools'] as const;
type Tab = typeof TABS[number];

const PRESETS = ['MATRIX', 'SURVEIL', 'ACID', 'VHS', 'CLEAN'];

export function ControlBar({
  videoState,
  effectState,
  effectList,
  crtEnabled,
  resolution,
  charsetIndex,
  audioReactive,
  isRecording,
  phosphorColor,
  burnIn,
  interlace,
  showTimestamp,
  scanLine,
  datamosh,
  showMarquee,
  onTogglePlay,
  onToggleReverse,
  onCycleSpeed,
  onSeek,
  onToggleEffect,
  onNextColorMode,
  onToggleAutoCycle,
  onRandomize,
  onReset,
  onToggleCrt,
  onResolutionChange,
  onSetCharset,
  onToggleAudio,
  onScreenshot,
  onToggleRecord,
  onCyclePhosphor,
  onToggleBurnIn,
  onToggleInterlace,
  onToggleTimestamp,
  onCopyText,
  onApplyPreset,
  onChannelSwitch,
  onToggleScanLine,
  onToggleDatamosh,
  onToggleMarquee,
  onSetMarqueeText,
  marqueeText,
  customRamp,
  onSetCustomRamp,
  isMirrored,
  onToggleMirror,
  customPresets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onExportGif,
  isExportingGif,
  onSetEffectIntensity,
}: ControlBarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('play');
  const [presetName, setPresetName] = useState('');
  const [expandedFx, setExpandedFx] = useState<string | null>(null);

  const nextTab = useCallback(() => {
    setActiveTab(t => TABS[(TABS.indexOf(t) + 1) % TABS.length]);
  }, []);

  const prevTab = useCallback(() => {
    setActiveTab(t => TABS[(TABS.indexOf(t) - 1 + TABS.length) % TABS.length]);
  }, []);

  const swipeHandlers = useSwipe(nextTab, prevTab);

  return (
    <div className="control-bar">
      {/* Tab bar */}
      <div className="control-tab-bar">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`control-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="control-tab-panels" {...swipeHandlers}>
      {/* PLAY tab */}
      <div className={`control-tab-panel ${activeTab === 'play' ? 'active' : ''}`}>
        <div className="control-row playback-controls">
          <button className="ctrl-btn seek-btn" onClick={() => onSeek(-5)} title="Seek -5s (Left Arrow)">
            {'\u23EA'}
          </button>
          <button
            className={`ctrl-btn ${videoState.isReversed ? 'active' : ''}`}
            onClick={onToggleReverse}
            title="Toggle Reverse (J)"
          >
            REV
          </button>
          <button className="ctrl-btn play-btn" onClick={onTogglePlay} title="Play/Pause (Space)">
            {videoState.isPlaying ? '\u23F8' : '\u25B6'}
          </button>
          <button
            className="ctrl-btn speed-btn"
            onClick={onCycleSpeed}
            title="Cycle Speed (S)"
          >
            {videoState.playbackSpeed}x
          </button>
          <button className="ctrl-btn seek-btn" onClick={() => onSeek(5)} title="Seek +5s (Right Arrow)">
            {'\u23E9'}
          </button>
        </div>

        <div className="control-row slider-row">
          <span className="slider-label">RES</span>
          <input
            type="range"
            className="res-slider"
            min={20}
            max={300}
            value={resolution}
            onChange={e => onResolutionChange(parseInt(e.target.value))}
            title={`Resolution: ${resolution} columns`}
          />
          <span className="slider-value">{resolution}col</span>

          <div className="charset-toggles">
            {CHARSETS.map((cs, i) => (
              <button
                key={cs.name}
                className={`ctrl-btn charset-btn ${charsetIndex === i ? 'active' : ''}`}
                onClick={() => onSetCharset(i)}
                title={`${cs.name} charset`}
              >
                {cs.name}
              </button>
            ))}
          </div>

          <button
            className="ctrl-btn"
            onClick={onCyclePhosphor}
            title="Cycle Phosphor (V)"
            style={{ marginLeft: 4 }}
          >
            P:{phosphorColor.toUpperCase()}
          </button>
        </div>
      </div>

      {/* FX tab */}
      <div className={`control-tab-panel ${activeTab === 'fx' ? 'active' : ''}`}>
        <div className="control-row fx-controls">
          <button
            className="ctrl-btn mode-btn"
            onClick={onNextColorMode}
            title="Cycle Color Mode (Tab)"
          >
            [{effectState.colorMode.toUpperCase()}]
          </button>

          <span className="slider-label" style={{ marginLeft: 8 }}>FX</span>
          <span className="slider-value">{Math.round(effectState.globalIntensity * 100)}%</span>
        </div>

        <div className="control-row fx-controls">
          <div className="effect-toggles">
            {effectList.map((fx, i) => {
              const es = effectState.effects[fx.key];
              const isExpanded = expandedFx === fx.key;
              return (
                <div key={fx.key} className="fx-item">
                  <button
                    className={`ctrl-btn fx-btn ${es?.enabled ? 'active' : ''}`}
                    onClick={() => onToggleEffect(i)}
                    onContextMenu={e => {
                      e.preventDefault();
                      setExpandedFx(isExpanded ? null : fx.key);
                    }}
                    title={`${fx.name} (${i + 1}) — right-click for intensity`}
                  >
                    {i + 1}:{fx.name.slice(0, 8)}
                  </button>
                  {isExpanded && es && (
                    <div className="fx-intensity-slider">
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={Math.round(es.intensity * 100)}
                        onChange={e => onSetEffectIntensity(fx.key, parseInt(e.target.value) / 100)}
                        className="fx-slider"
                      />
                      <span className="fx-slider-val">{Math.round(es.intensity * 100)}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="fx-actions">
            <button
              className={`ctrl-btn ${effectState.autoCycle ? 'active' : ''}`}
              onClick={onToggleAutoCycle}
              title="Auto-Cycle (A)"
            >
              AUTO
            </button>
            <button className="ctrl-btn" onClick={onRandomize} title="Randomize (R)">
              RNG
            </button>
            <button className="ctrl-btn" onClick={onReset} title="Reset (0)">
              RST
            </button>
          </div>
        </div>

        <div className="control-row ramp-row">
          <span className="slider-label">RAMP</span>
          <input
            type="text"
            className="ramp-input"
            placeholder="custom chars dark\u2192bright (e.g.  .:-=+*#%@)"
            value={customRamp}
            onChange={e => onSetCustomRamp(e.target.value)}
            spellCheck={false}
          />
          {customRamp && (
            <button className="ctrl-btn" onClick={() => onSetCustomRamp('')} title="Clear custom ramp">
              CLR
            </button>
          )}
        </div>
      </div>

      {/* DISPLAY tab */}
      <div className={`control-tab-panel ${activeTab === 'display' ? 'active' : ''}`}>
        <div className="control-row fx-controls">
          <button
            className={`ctrl-btn ${crtEnabled ? 'active' : ''}`}
            onClick={onToggleCrt}
            title="CRT Mode (C)"
          >
            CRT
          </button>
          <button
            className={`ctrl-btn ${burnIn ? 'active' : ''}`}
            onClick={onToggleBurnIn}
            title="Burn-in (B)"
          >
            BURN
          </button>
          <button
            className={`ctrl-btn ${interlace ? 'active' : ''}`}
            onClick={onToggleInterlace}
            title="Interlace (N)"
          >
            ILACE
          </button>
          <button
            className={`ctrl-btn ${showTimestamp ? 'active' : ''}`}
            onClick={onToggleTimestamp}
            title="VHS Timestamp (T)"
          >
            VHS
          </button>
          <button
            className={`ctrl-btn ${scanLine ? 'active' : ''}`}
            onClick={onToggleScanLine}
            title="Scan Line (L)"
          >
            SCAN
          </button>
          <button
            className={`ctrl-btn ${datamosh ? 'active' : ''}`}
            onClick={onToggleDatamosh}
            title="Datamosh (D)"
          >
            MOSH
          </button>
          <button
            className="ctrl-btn"
            onClick={onChannelSwitch}
            title="Channel Switch (W)"
          >
            CH
          </button>
          <button
            className={`ctrl-btn ${isMirrored ? 'active' : ''}`}
            onClick={onToggleMirror}
            title="Mirror/Flip (Q)"
          >
            MIRROR
          </button>
        </div>

        <div className="control-row marquee-row">
          <button
            className={`ctrl-btn ${showMarquee ? 'active' : ''}`}
            onClick={onToggleMarquee}
            title="Toggle Marquee (H)"
          >
            MARQUEE
          </button>
          <input
            type="text"
            className="marquee-input"
            placeholder="type marquee text..."
            value={marqueeText}
            onChange={e => onSetMarqueeText(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>

      {/* TOOLS tab */}
      <div className={`control-tab-panel ${activeTab === 'tools' ? 'active' : ''}`}>
        <div className="control-row fx-controls">
          <button
            className={`ctrl-btn ${audioReactive ? 'active' : ''}`}
            onClick={onToggleAudio}
            title="Audio Reactive (M)"
          >
            AUDIO
          </button>
          <button className="ctrl-btn" onClick={onCopyText} title="Copy ASCII (Y)">
            COPY
          </button>
          <button className="ctrl-btn" onClick={onScreenshot} title="Screenshot (P)">
            SNAP
          </button>
          <button
            className={`ctrl-btn ${isRecording ? 'active' : ''}`}
            onClick={onToggleRecord}
            title="Record WebM (G)"
          >
            {isRecording ? 'STOP' : 'REC'}
          </button>
          <button
            className={`ctrl-btn ${isExportingGif ? 'active' : ''}`}
            onClick={onExportGif}
            disabled={isExportingGif}
            title="Export GIF"
          >
            {isExportingGif ? 'GIF...' : 'GIF'}
          </button>
        </div>

        <div className="control-row preset-row">
          <span className="slider-label">LOAD</span>
          {PRESETS.map(name => (
            <button
              key={name}
              className="ctrl-btn preset-btn"
              onClick={() => onApplyPreset(name)}
            >
              {name}.EXE
            </button>
          ))}
        </div>

        <div className="control-row preset-row">
          <span className="slider-label">SAVE</span>
          <input
            type="text"
            className="ramp-input"
            placeholder="preset name..."
            value={presetName}
            onChange={e => setPresetName(e.target.value.toUpperCase().slice(0, 12))}
            onKeyDown={e => {
              if (e.key === 'Enter' && presetName.trim()) {
                onSavePreset(presetName.trim());
                setPresetName('');
              }
            }}
            spellCheck={false}
            style={{ maxWidth: 150 }}
          />
          <button
            className="ctrl-btn"
            onClick={() => {
              if (presetName.trim()) {
                onSavePreset(presetName.trim());
                setPresetName('');
              }
            }}
            disabled={!presetName.trim()}
          >
            +
          </button>
        </div>

        {customPresets.length > 0 && (
          <div className="control-row preset-row">
            <span className="slider-label">USER</span>
            {customPresets.map(p => (
              <button
                key={p.name}
                className="ctrl-btn preset-btn"
                onClick={() => onLoadPreset(p)}
                onContextMenu={e => { e.preventDefault(); onDeletePreset(p.name); }}
                title={`Load ${p.name} (right-click to delete)`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>{/* close control-tab-panels */}
    </div>
  );
}
