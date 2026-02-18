import { useState, useRef, useCallback, useEffect } from 'react';
import { Terminal } from './components/Terminal';
import { AsciiCanvas } from './components/AsciiCanvas';
import { ControlBar } from './components/ControlBar';
import { MiniPlaybackBar } from './components/MiniPlaybackBar';
import { HelpOverlay } from './components/HelpOverlay';
import { BootSequence } from './components/BootSequence';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useEffects } from './hooks/useEffects';
import { useAsciiEngine } from './hooks/useAsciiEngine';
import { useKeyboard } from './hooks/useKeyboard';
import { useAudioAnalyser } from './hooks/useAudioAnalyser';
import { CHARSETS } from './engine/renderer';
import { useCustomPresets, type CustomPreset } from './hooks/useCustomPresets';
import { useHashSettings } from './hooks/useHashSettings';
import { GifEncoder } from './engine/gifEncoder';

const PHOSPHOR_COLORS = [
  {
    name: 'green',
    text: '#33ff33',
    textDim: '#1a8a1a',
    glowRgb: '51, 255, 51',
    screenBg: '#001a00',
    screenBgCrt: '#002200',
    border: '#0a3a0a',
    btnBg: '#0a1a0a',
    btnHover: '#0f2a0f',
  },
  {
    name: 'amber',
    text: '#ffb000',
    textDim: '#8a6000',
    glowRgb: '255, 176, 0',
    screenBg: '#1a1000',
    screenBgCrt: '#221500',
    border: '#3a2a0a',
    btnBg: '#1a100a',
    btnHover: '#2a1a0f',
  },
  {
    name: 'white',
    text: '#e0e0e0',
    textDim: '#707070',
    glowRgb: '224, 224, 224',
    screenBg: '#0a0a0a',
    screenBgCrt: '#111111',
    border: '#2a2a2a',
    btnBg: '#0f0f0f',
    btnHover: '#1a1a1a',
  },
  {
    name: 'blue',
    text: '#33ccff',
    textDim: '#1a6a8a',
    glowRgb: '51, 204, 255',
    screenBg: '#001020',
    screenBgCrt: '#001528',
    border: '#0a2a3a',
    btnBg: '#0a1520',
    btnHover: '#0f2030',
  },
];

interface PresetDef {
  colorMode: string;
  effects: Record<string, boolean>;
  intensity?: number;
  charsetIndex?: number;
  phosphorIndex?: number;
}

const PRESETS: Record<string, PresetDef> = {
  MATRIX: {
    colorMode: 'matrix',
    effects: { digitalNoise: true },
    intensity: 0.7,
    charsetIndex: 3,
    phosphorIndex: 0,
  },
  SURVEIL: {
    colorMode: 'mono',
    effects: { digitalNoise: true, scanlineShift: true },
    intensity: 0.3,
    charsetIndex: 0,
  },
  ACID: {
    colorMode: 'neon',
    effects: { rainbowCycle: true, waveDistortion: true, kaleidoscope: true },
    intensity: 0.8,
    charsetIndex: 2,
  },
  VHS: {
    colorMode: 'truecolor',
    effects: { vhsTracking: true, scanlineShift: true, digitalNoise: true },
    intensity: 0.6,
    charsetIndex: 0,
  },
  CLEAN: {
    colorMode: 'truecolor',
    effects: {},
    intensity: 0.5,
    charsetIndex: 0,
    phosphorIndex: 0,
  },
};

function formatVhsTimestamp(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `REC  ${mm}/${dd}/${yyyy}  ${hh}:${min}:${ss}`;
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [resolution, setResolution] = useState(120);
  const [charsetIndex, setCharsetIndex] = useState(0);
  const [audioReactive, setAudioReactive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [urlValue, setUrlValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [phosphorIndex, setPhosphorIndex] = useState(0);
  const [burnIn, setBurnIn] = useState(false);
  const [interlace, setInterlace] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [vhsTime, setVhsTime] = useState('');
  const [scanLine, setScanLine] = useState(false);
  const [datamosh, setDatamosh] = useState(false);
  const [channelSwitching, setChannelSwitching] = useState(false);
  const [showMarquee, setShowMarquee] = useState(false);
  const [marqueeText, setMarqueeText] = useState('LIVE FROM THE MAINFRAME >>> ');
  const [screensaver, setScreensaver] = useState(false);
  const [customRamp, setCustomRamp] = useState('');
  const [isMirrored, setIsMirrored] = useState(false);
  const [isExportingGif, setIsExportingGif] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const exportCancelRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const idleTimerRef = useRef<number>(0);
  const screensaverRef = useRef<HTMLDivElement>(null);
  const bounceRef = useRef({ x: 50, y: 50, dx: 1.2, dy: 0.8 });
  const bounceRafRef = useRef(0);

  const {
    videoElement,
    imageElement,
    state: videoState,
    loadFile,
    loadUrl,
    loadImage,
    loadWebcam,
    loadScreen,
    togglePlay,
    toggleReverse,
    cycleSpeed,
    seek,
    unload,
  } = useVideoPlayer();

  const {
    state: effectState,
    crtEnabled,
    effectList,
    toggleEffect,
    nextColorMode,
    adjustIntensity,
    toggleAutoCycle,
    randomize,
    reset,
    toggleCrt,
    setCrt,
    tickAutoCycle,
    applyPreset,
    setEffectIntensity,
  } = useEffects();

  const { presets: customPresets, addPreset, removePreset } = useCustomPresets();

  const {
    levelsRef: audioLevelsRef,
    enable: enableAudio,
    disable: disableAudio,
    update: audioUpdate,
    isEnabled: isAudioEnabled,
  } = useAudioAnalyser(videoElement);

  const { getFps, renderOneFrame, getAsciiText } = useAsciiEngine(
    canvasRef,
    videoElement,
    imageElement,
    effectState,
    videoState.isPlaying,
    videoState.isReversed,
    videoState.playbackSpeed,
    resolution,
    charsetIndex,
    audioLevelsRef,
    audioUpdate,
    burnIn,
    interlace,
    scanLine,
    datamosh,
    channelSwitching,
    customRamp,
    isMirrored,
    marqueeText,
    tickAutoCycle
  );

  // Load settings from URL hash on mount
  const { updateHash } = useHashSettings((settings) => {
    if (settings.colorMode) {
      applyPreset({ colorMode: settings.colorMode, effects: {}, intensity: effectState.globalIntensity });
    }
    if (settings.resolution) setResolution(settings.resolution);
    if (settings.charset !== undefined) setCharsetIndex(settings.charset);
    if (settings.phosphor !== undefined) setPhosphorIndex(settings.phosphor);
    if (settings.crt) toggleCrt();
    if (settings.burnIn) setBurnIn(true);
    if (settings.interlace) setInterlace(true);
    if (settings.mirror) setIsMirrored(true);
    if (settings.effects) {
      const keys = settings.effects.split(',');
      for (const key of keys) {
        const idx = effectList.findIndex(e => e.key === key);
        if (idx !== -1) toggleEffect(idx);
      }
    }
  });

  // Update hash when settings change (debounced)
  useEffect(() => {
    const enabledFx = effectList
      .filter(fx => effectState.effects[fx.key]?.enabled)
      .map(fx => fx.key)
      .join(',');

    updateHash({
      colorMode: effectState.colorMode !== 'truecolor' ? effectState.colorMode : undefined,
      resolution: resolution !== 120 ? resolution : undefined,
      charset: charsetIndex !== 0 ? charsetIndex : undefined,
      phosphor: phosphorIndex !== 0 ? phosphorIndex : undefined,
      crt: crtEnabled || undefined,
      burnIn: burnIn || undefined,
      interlace: interlace || undefined,
      mirror: isMirrored || undefined,
      effects: enabledFx || undefined,
    });
  }, [effectState, resolution, charsetIndex, phosphorIndex, crtEnabled, burnIn, interlace, isMirrored, effectList, updateHash]);

  // Phosphor color CSS variable sync
  const phosphor = PHOSPHOR_COLORS[phosphorIndex];
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--text', phosphor.text);
    root.style.setProperty('--accent', phosphor.text);
    root.style.setProperty('--text-dim', phosphor.textDim);
    root.style.setProperty('--accent-dim', phosphor.textDim);
    root.style.setProperty('--terminal-border', phosphor.border);
    root.style.setProperty('--btn-bg', phosphor.btnBg);
    root.style.setProperty('--btn-hover', phosphor.btnHover);
    root.style.setProperty('--btn-active', phosphor.border);
    root.style.setProperty('--btn-active-border', phosphor.text);
    root.style.setProperty('--glow-rgb', phosphor.glowRgb);
    root.style.setProperty('--screen-bg', phosphor.screenBg);
    root.style.setProperty('--screen-bg-crt', phosphor.screenBgCrt);
  }, [phosphor]);

  // VHS timestamp updater
  useEffect(() => {
    if (!showTimestamp) return;
    setVhsTime(formatVhsTimestamp());
    const interval = setInterval(() => setVhsTime(formatVhsTimestamp()), 1000);
    return () => clearInterval(interval);
  }, [showTimestamp]);

  // Screensaver idle detection
  const resetIdle = useCallback(() => {
    setScreensaver(false);
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      if (videoState.isLoaded) setScreensaver(true);
    }, 120000); // 2 minutes idle
  }, [videoState.isLoaded]);

  useEffect(() => {
    if (!videoState.isLoaded) return;
    const events = ['keydown', 'mousemove', 'click', 'touchstart'] as const;
    events.forEach(evt => window.addEventListener(evt, resetIdle));
    resetIdle();
    return () => {
      events.forEach(evt => window.removeEventListener(evt, resetIdle));
      clearTimeout(idleTimerRef.current);
    };
  }, [resetIdle, videoState.isLoaded]);

  // Screensaver DVD-bounce animation
  useEffect(() => {
    if (!screensaver) {
      cancelAnimationFrame(bounceRafRef.current);
      return;
    }
    const animate = () => {
      const el = screensaverRef.current;
      if (!el || !el.parentElement) return;
      const p = bounceRef.current;
      const maxX = el.parentElement.clientWidth - 220;
      const maxY = el.parentElement.clientHeight - 50;
      p.x += p.dx;
      p.y += p.dy;
      if (p.x <= 0 || p.x >= maxX) { p.dx = -p.dx; p.x = Math.max(0, Math.min(maxX, p.x)); }
      if (p.y <= 0 || p.y >= maxY) { p.dy = -p.dy; p.y = Math.max(0, Math.min(maxY, p.y)); }
      el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      bounceRafRef.current = requestAnimationFrame(animate);
    };
    bounceRafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(bounceRafRef.current);
  }, [screensaver]);

  const cyclePhosphor = useCallback(() => {
    setPhosphorIndex(i => (i + 1) % PHOSPHOR_COLORS.length);
  }, []);

  const toggleBurnIn = useCallback(() => setBurnIn(v => !v), []);
  const toggleInterlace = useCallback(() => setInterlace(v => !v), []);
  const toggleTimestamp = useCallback(() => setShowTimestamp(v => !v), []);
  const toggleScanLine = useCallback(() => setScanLine(v => !v), []);
  const toggleDatamosh = useCallback(() => setDatamosh(v => !v), []);
  const toggleMarquee = useCallback(() => setShowMarquee(v => !v), []);
  const toggleMirror = useCallback(() => setIsMirrored(v => !v), []);

  const triggerTransition = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 300);
  }, []);

  const handleSaveCustomPreset = useCallback((name: string) => {
    const effectStates: Record<string, boolean> = {};
    for (const fx of effectList) {
      if (effectState.effects[fx.key]?.enabled) {
        effectStates[fx.key] = true;
      }
    }
    addPreset({
      name,
      colorMode: effectState.colorMode,
      effects: effectStates,
      intensity: effectState.globalIntensity,
      charsetIndex,
      phosphorIndex,
      crt: crtEnabled,
      burnIn,
      interlace,
      mirror: isMirrored,
    });
  }, [effectState, effectList, charsetIndex, phosphorIndex, crtEnabled, burnIn, interlace, isMirrored, addPreset]);

  const handleLoadCustomPreset = useCallback((preset: CustomPreset) => {
    triggerTransition();
    applyPreset({
      colorMode: preset.colorMode,
      effects: preset.effects,
      intensity: preset.intensity,
    });
    setCharsetIndex(preset.charsetIndex);
    setPhosphorIndex(preset.phosphorIndex);
    setCrt(preset.crt);
    setBurnIn(preset.burnIn);
    setInterlace(preset.interlace);
    setIsMirrored(preset.mirror);
  }, [applyPreset, triggerTransition, setCrt]);

  const handleCopyText = useCallback(() => {
    const text = getAsciiText();
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
  }, [getAsciiText]);

  const handleApplyPreset = useCallback((name: string) => {
    const preset = PRESETS[name];
    if (!preset) return;
    triggerTransition();
    applyPreset({
      colorMode: preset.colorMode,
      effects: preset.effects,
      intensity: preset.intensity,
    });
    if (preset.charsetIndex !== undefined) {
      setCharsetIndex(preset.charsetIndex);
    }
    if (preset.phosphorIndex !== undefined) {
      setPhosphorIndex(preset.phosphorIndex);
    }
  }, [applyPreset, triggerTransition]);

  const currentPresetRef = useRef<string>('');
  const handleChannelSwitch = useCallback(() => {
    if (channelSwitching) return;
    setChannelSwitching(true);
    triggerTransition();
    setTimeout(() => {
      const presetNames = Object.keys(PRESETS);
      const candidates = presetNames.filter(n => n !== currentPresetRef.current);
      const randomName = candidates[Math.floor(Math.random() * candidates.length)] || presetNames[0];
      currentPresetRef.current = randomName;
      handleApplyPreset(randomName);
      setChannelSwitching(false);
    }, 600);
  }, [channelSwitching, handleApplyPreset, triggerTransition]);

  const cycleCharset = useCallback(() => {
    setCharsetIndex(i => (i + 1) % CHARSETS.length);
  }, []);

  const toggleAudio = useCallback(() => {
    if (isAudioEnabled()) {
      disableAudio();
      setAudioReactive(false);
    } else {
      enableAudio();
      setAudioReactive(true);
    }
  }, [enableAudio, disableAudio, isAudioEnabled]);

  const handleScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `ascii-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const handleToggleRecord = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
          ? 'video/webm; codecs=vp9'
          : 'video/webm',
      });
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `ascii-${Date.now()}.webm`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    }
  }, [isRecording]);

  const handleExport = useCallback(async () => {
    const video = videoElement;
    const canvas = canvasRef.current;
    if (!video || !canvas || isExporting) return;
    if (!isFinite(video.duration) || video.duration <= 0) return;

    setIsExporting(true);
    setExportProgress(0);
    exportCancelRef.current = false;

    const wasPlaying = !video.paused;
    video.pause();

    const fps = 24;
    const duration = video.duration;
    const totalFrames = Math.ceil(duration * fps);

    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm',
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.start();

    for (let i = 0; i < totalFrames; i++) {
      if (exportCancelRef.current) break;

      video.currentTime = i / fps;
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 2000);
        video.addEventListener('seeked', () => { clearTimeout(timeout); resolve(); }, { once: true });
      });

      const syntheticTimestamp = performance.now();
      renderOneFrame(syntheticTimestamp, false);

      if (track && 'requestFrame' in track) {
        track.requestFrame();
      }

      await new Promise((r) => setTimeout(r, 0));
      setExportProgress(Math.round(((i + 1) / totalFrames) * 100));
    }

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    await stopped;

    if (!exportCancelRef.current && chunks.length > 0) {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `ascii-export-${Date.now()}.webm`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }

    if (wasPlaying && !exportCancelRef.current) {
      video.play().catch(() => {});
    }

    setIsExporting(false);
    setExportProgress(0);
  }, [videoElement, isExporting, renderOneFrame]);

  const handleCancelExport = useCallback(() => {
    exportCancelRef.current = true;
  }, []);

  const handleExportGif = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || isExportingGif) return;

    setIsExportingGif(true);

    const gifEncoder = new GifEncoder(canvas.width, canvas.height);
    const totalFrames = 30; // capture ~3 seconds at 10fps
    const frameDelay = 100; // ms between frames

    for (let i = 0; i < totalFrames; i++) {
      await new Promise(r => setTimeout(r, frameDelay));
      gifEncoder.addFrame(canvas, frameDelay);
    }

    const blob = await gifEncoder.encode();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `ascii-${Date.now()}.gif`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    setIsExportingGif(false);
  }, [isExportingGif]);

  const handleLoadFile = useCallback((file: File) => {
    // Check if it's an image
    if (file.type.startsWith('image/')) {
      loadImage(file);
    } else {
      loadFile(file);
    }
  }, [loadFile, loadImage]);

  const handleLoadUrl = useCallback(() => {
    if (!urlValue.trim()) return;
    loadUrl(urlValue.trim());
    setUrlValue('');
  }, [loadUrl, urlValue]);

  const handleGoBack = useCallback(() => {
    unload();
    setDrawerOpen(true);
    setShowHelp(false);
    setShowInfo(false);
    setScreensaver(false);
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
    if (audioReactive) {
      disableAudio();
      setAudioReactive(false);
    }
  }, [unload, isRecording, audioReactive, disableAudio]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLoadFile(file);
  }, [handleLoadFile]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      outputRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const seekAbsolute = useCallback((time: number) => {
    if (videoElement) videoElement.currentTime = time;
  }, [videoElement]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const dragCounterRef = useRef(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('video/') || file.type.startsWith('image/'))) {
      handleLoadFile(file);
    }
  }, [handleLoadFile]);

  // Scroll wheel to adjust resolution
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!videoState.isLoaded) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    setResolution(r => Math.max(20, Math.min(300, r + delta)));
  }, [videoState.isLoaded]);

  // Pinch-to-zoom for resolution on touch devices
  const pinchRef = useRef<{ startDist: number; startRes: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = {
        startDist: Math.hypot(dx, dy),
        startRes: resolution,
      };
    }
  }, [resolution]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / pinchRef.current.startDist;
      const newRes = Math.round(pinchRef.current.startRes * scale);
      setResolution(Math.max(20, Math.min(300, newRes)));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  useKeyboard(
    {
      togglePlay,
      toggleReverse,
      cycleSpeed,
      seekForward: () => seek(5),
      seekBackward: () => seek(-5),
      nextColorMode,
      toggleEffect,
      adjustIntensity,
      toggleAutoCycle,
      randomize,
      reset,
      toggleCrt,
      toggleFullscreen,
      toggleInfo: () => setShowInfo(v => !v),
      toggleHelp: () => setShowHelp(v => !v),
      goBack: handleGoBack,
      cycleCharset,
      toggleAudio,
      screenshot: handleScreenshot,
      toggleRecord: handleToggleRecord,
      cyclePhosphor,
      toggleBurnIn,
      toggleInterlace,
      toggleTimestamp,
      copyText: handleCopyText,
      channelSwitch: handleChannelSwitch,
      toggleScanLine,
      toggleDatamosh,
      toggleMarquee,
      toggleMirror,
    },
    videoState.isLoaded
  );

  const charsetName = CHARSETS[charsetIndex]?.name ?? 'ASCII';

  const title = videoState.isLoaded
    ? `ascii-player — ${videoState.fileName}`
    : 'ascii-player';

  if (booting) {
    return (
      <div className="app">
        <Terminal
          ref={terminalRef}
          title="ascii-player"
          crtEnabled={true}
          drawerOpen={false}
          onToggleDrawer={() => {}}
          drawerContent={null}
          miniBar={null}
        >
          <BootSequence onComplete={() => setBooting(false)} />
        </Terminal>
      </div>
    );
  }

  const miniBar = videoState.isLoaded ? (
    <MiniPlaybackBar
      isPlaying={videoState.isPlaying}
      currentTime={videoState.currentTime}
      duration={videoState.duration}
      playbackSpeed={videoState.playbackSpeed}
      isReversed={videoState.isReversed}
      isFullscreen={isFullscreen}
      onTogglePlay={togglePlay}
      onSeekAbsolute={seekAbsolute}
      onToggleFullscreen={toggleFullscreen}
    />
  ) : null;

  const drawerContent = (
    <>
      <div className="drawer-input-row">
        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept="video/*,image/*"
          onChange={handleFileInput}
        />
        <button
          className="ctrl-btn drawer-load-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          LOAD FILE
        </button>
        <button className="ctrl-btn" onClick={loadWebcam}>
          WEBCAM
        </button>
        <button className="ctrl-btn" onClick={loadScreen}>
          SCREEN
        </button>
        <div className="drawer-url-input">
          <span className="drawer-url-prompt">&gt;</span>
          <input
            type="text"
            placeholder="paste direct .mp4/.webm url..."
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLoadUrl()}
            spellCheck={false}
          />
          <button
            className="ctrl-btn"
            onClick={handleLoadUrl}
            disabled={!urlValue.trim()}
          >
            GO
          </button>
        </div>
        {videoState.isLoaded && videoElement && isFinite(videoState.duration) && videoState.duration > 0 && (
          <button
            className="ctrl-btn drawer-export-btn"
            onClick={handleExport}
            disabled={isExporting}
          >
            EXPORT
          </button>
        )}
        {videoState.isLoaded && (
          <button className="ctrl-btn drawer-eject-btn" onClick={handleGoBack}>
            EJECT
          </button>
        )}
      </div>
      {videoState.isLoaded && (
        <ControlBar
          videoState={videoState}
          effectState={effectState}
          effectList={effectList}
          crtEnabled={crtEnabled}
          resolution={resolution}
          charsetIndex={charsetIndex}
          audioReactive={audioReactive}
          isRecording={isRecording}
          phosphorColor={phosphor.name}
          burnIn={burnIn}
          interlace={interlace}
          showTimestamp={showTimestamp}
          scanLine={scanLine}
          datamosh={datamosh}
          showMarquee={showMarquee}
          onTogglePlay={togglePlay}
          onToggleReverse={toggleReverse}
          onCycleSpeed={cycleSpeed}
          onSeek={seek}
          onToggleEffect={toggleEffect}
          onNextColorMode={nextColorMode}
          onToggleAutoCycle={toggleAutoCycle}
          onRandomize={randomize}
          onReset={reset}
          onToggleCrt={toggleCrt}
          onResolutionChange={setResolution}
          onSetCharset={setCharsetIndex}
          onToggleAudio={toggleAudio}
          onScreenshot={handleScreenshot}
          onToggleRecord={handleToggleRecord}
          onCyclePhosphor={cyclePhosphor}
          onToggleBurnIn={toggleBurnIn}
          onToggleInterlace={toggleInterlace}
          onToggleTimestamp={toggleTimestamp}
          onCopyText={handleCopyText}
          onApplyPreset={handleApplyPreset}
          onChannelSwitch={handleChannelSwitch}
          onToggleScanLine={toggleScanLine}
          onToggleDatamosh={toggleDatamosh}
          onToggleMarquee={toggleMarquee}
          onSetMarqueeText={setMarqueeText}
          marqueeText={marqueeText}
          customRamp={customRamp}
          onSetCustomRamp={setCustomRamp}
          isMirrored={isMirrored}
          onToggleMirror={toggleMirror}
          customPresets={customPresets}
          onSavePreset={handleSaveCustomPreset}
          onLoadPreset={handleLoadCustomPreset}
          onDeletePreset={removePreset}
          onExportGif={handleExportGif}
          isExportingGif={isExportingGif}
          onSetEffectIntensity={setEffectIntensity}
        />
      )}
    </>
  );

  return (
    <div className="app">
      <Terminal
        ref={terminalRef}
        title={title}
        crtEnabled={crtEnabled}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen(v => !v)}
        drawerContent={drawerContent}
        miniBar={miniBar}
      >
        <div
          ref={outputRef}
          className={`terminal-main ${isDragging ? 'drag-active' : ''} ${isTransitioning ? 'preset-transition' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AsciiCanvas canvasRef={canvasRef} />
          {!videoState.isLoaded && !isDragging && (
            <div className="empty-state">
              <div className="empty-cursor">&#9608;</div>
              <div className="empty-text">DROP VIDEO OR IMAGE HERE</div>
              <div className="empty-sub">or open drawer below</div>
            </div>
          )}
          {isDragging && (
            <div className="drop-active-overlay">
              <div>DROP TO LOAD</div>
            </div>
          )}
          {videoState.error && (
            <div className="error-overlay">
              <div className="error-icon">ERROR</div>
              <div className="error-message">{videoState.error}</div>
              <button className="error-back-btn" onClick={handleGoBack}>
                Go Back
              </button>
            </div>
          )}
          {showInfo && (
            <div className="info-overlay">
              <div>FPS: {getFps()}</div>
              <div>Color: {effectState.colorMode}</div>
              <div>Charset: {charsetName}</div>
              <div>Phosphor: {phosphor.name}</div>
              <div>Intensity: {Math.round(effectState.globalIntensity * 100)}%</div>
              <div>Speed: {videoState.playbackSpeed}x{videoState.isReversed ? ' REV' : ''}</div>
              <div>Resolution: {resolution}col</div>
              <div>Audio: {audioReactive ? 'ON' : 'OFF'}</div>
              <div>Burn-in: {burnIn ? 'ON' : 'OFF'}</div>
              <div>Interlace: {interlace ? 'ON' : 'OFF'}</div>
              <div>Scan: {scanLine ? 'ON' : 'OFF'}</div>
              <div>Datamosh: {datamosh ? 'ON' : 'OFF'}</div>
              <div>Auto-cycle: {effectState.autoCycle ? 'ON' : 'OFF'}</div>
              <div>Active FX: {
                effectList
                  .filter(fx => effectState.effects[fx.key]?.enabled)
                  .map(fx => fx.name)
                  .join(', ') || 'None'
              }</div>
            </div>
          )}
          {isRecording && (
            <div className="recording-indicator">
              <span className="rec-dot" /> REC
            </div>
          )}
          {showTimestamp && (
            <div className="vhs-timestamp">{vhsTime}</div>
          )}
          {showMarquee && marqueeText && (
            <div className="marquee-overlay">
              <div className="marquee-track">
                <span className="marquee-text">{marqueeText.repeat(5)}</span>
              </div>
            </div>
          )}
          {screensaver && (
            <div className="screensaver-overlay" onClick={() => setScreensaver(false)}>
              <div ref={screensaverRef} className="screensaver-bouncer">
                [ ASCII PLAYER ]
              </div>
            </div>
          )}
          {isExporting && (
            <div className="export-overlay">
              <div className="export-title">RENDERING VIDEO...</div>
              <div className="export-bar">
                <div className="export-bar-fill" style={{ width: `${exportProgress}%` }} />
              </div>
              <div className="export-percent">{exportProgress}%</div>
              <button className="ctrl-btn export-cancel-btn" onClick={handleCancelExport}>
                CANCEL
              </button>
            </div>
          )}
        </div>
      </Terminal>

      <HelpOverlay visible={showHelp} onClose={() => setShowHelp(false)} />

      <div className="app-footer">
        Press <span className="key-hint">?</span> for keyboard shortcuts
      </div>
    </div>
  );
}
