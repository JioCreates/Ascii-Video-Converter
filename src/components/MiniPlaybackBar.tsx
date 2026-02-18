import { useCallback } from 'react';

interface MiniPlaybackBarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  isReversed: boolean;
  isFullscreen: boolean;
  onTogglePlay: () => void;
  onSeekAbsolute: (time: number) => void;
  onToggleFullscreen: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MiniPlaybackBar({
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  isReversed,
  isFullscreen,
  onTogglePlay,
  onSeekAbsolute,
  onToggleFullscreen,
}: MiniPlaybackBarProps) {
  const hasProgress = isFinite(duration) && duration > 0;
  const progress = hasProgress ? (currentTime / duration) * 100 : 0;

  const handleProgressDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!hasProgress) return;
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const seek = (clientX: number) => {
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        onSeekAbsolute(ratio * duration);
      };
      seek(e.clientX);
      const onMove = (ev: MouseEvent) => seek(ev.clientX);
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [hasProgress, duration, onSeekAbsolute]
  );

  return (
    <div className="mini-playback-bar">
      <button className="mini-play-btn" onClick={onTogglePlay} title="Play/Pause (Space)">
        {isPlaying ? '\u23F8' : '\u25B6'}
      </button>
      {hasProgress ? (
        <>
          <div className="mini-progress-bar" onMouseDown={handleProgressDrag}>
            <div className="mini-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="mini-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </>
      ) : (
        <>
          <div className="mini-live-badge">LIVE</div>
          <div style={{ flex: 1 }} />
        </>
      )}
      <span className="mini-speed">
        {playbackSpeed}x{isReversed ? ' REV' : ''}
      </span>
      <button
        className={`mini-fullscreen-btn ${isFullscreen ? 'active' : ''}`}
        onClick={onToggleFullscreen}
        title="Fullscreen (F)"
      >
        {isFullscreen ? '[ ]' : '[\u00A0]'}
      </button>
    </div>
  );
}
