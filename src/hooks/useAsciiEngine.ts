import { useRef, useCallback, useEffect } from 'react';
import { FrameExtractor } from '../engine/frameExtractor';
import { CanvasRenderer } from '../engine/canvasRenderer';
import { pixelsToAscii, CHARSETS } from '../engine/renderer';
import type { AsciiGrid } from '../engine/renderer';
import { applyPreEffects, applyPostEffects, type EffectManagerState } from '../effects/manager';
import { applyFigletToGrid } from '../effects/figlet';
import { EffectWorkerManager } from '../engine/effectWorkerManager';
import type { AudioLevels } from './useAudioAnalyser';

export function useAsciiEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  videoElement: HTMLVideoElement | null,
  imageElement: HTMLImageElement | null,
  effectState: EffectManagerState,
  isPlaying: boolean,
  isReversed: boolean,
  playbackSpeed: number,
  resolution: number,
  charsetIndex: number,
  audioLevelsRef: React.RefObject<AudioLevels>,
  audioUpdate: () => void,
  burnIn: boolean,
  interlace: boolean,
  scanLine: boolean,
  datamosh: boolean,
  staticNoise: boolean,
  customRamp: string,
  isMirrored: boolean,
  figletText: string,
  onAutoCycleTick?: (t: number) => void
) {
  const extractorRef = useRef<FrameExtractor | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const effectStateRef = useRef(effectState);
  const resolutionRef = useRef(resolution);
  const reverseRef = useRef(isReversed);
  const speedRef = useRef(playbackSpeed);
  const charsetRef = useRef(charsetIndex);
  const burnInRef = useRef(burnIn);
  const interlaceRef = useRef(interlace);
  const scanLineRef = useRef(scanLine);
  const datamoshRef = useRef(datamosh);
  const staticNoiseRef = useRef(staticNoise);
  const customRampRef = useRef(customRamp);
  const isMirroredRef = useRef(isMirrored);
  const figletTextRef = useRef(figletText);
  const frameCountRef = useRef(0);
  const fpsRef = useRef({ frames: 0, lastTime: 0, fps: 0 });
  const lastGridRef = useRef<AsciiGrid | null>(null);
  const prevPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const workerRef = useRef<EffectWorkerManager | null>(null);
  const workerResultRef = useRef<Uint8ClampedArray | null>(null);

  useEffect(() => { effectStateRef.current = effectState; }, [effectState]);
  useEffect(() => { resolutionRef.current = resolution; }, [resolution]);
  useEffect(() => { reverseRef.current = isReversed; }, [isReversed]);
  useEffect(() => { speedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { charsetRef.current = charsetIndex; }, [charsetIndex]);
  useEffect(() => { burnInRef.current = burnIn; }, [burnIn]);
  useEffect(() => { interlaceRef.current = interlace; }, [interlace]);
  useEffect(() => { scanLineRef.current = scanLine; }, [scanLine]);
  useEffect(() => { datamoshRef.current = datamosh; }, [datamosh]);
  useEffect(() => { staticNoiseRef.current = staticNoise; }, [staticNoise]);
  useEffect(() => { customRampRef.current = customRamp; }, [customRamp]);
  useEffect(() => { isMirroredRef.current = isMirrored; }, [isMirrored]);
  useEffect(() => { figletTextRef.current = figletText; }, [figletText]);

  // Initialize/cleanup effect worker
  useEffect(() => {
    workerRef.current = new EffectWorkerManager();
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const renderOneFrame = useCallback((timestamp: number, loop: boolean) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const t = (timestamp - startTimeRef.current) / 1000;

    const canvas = canvasRef.current;
    const source: CanvasImageSource | null = videoElement || imageElement || null;
    const isImage = source instanceof HTMLImageElement;

    if (!canvas || !source) {
      if (loop) rafRef.current = requestAnimationFrame((ts) => renderOneFrame(ts, true));
      return;
    }

    // Source readiness check
    if (!isImage && (source as HTMLVideoElement).readyState < 2) {
      if (loop) rafRef.current = requestAnimationFrame((ts) => renderOneFrame(ts, true));
      return;
    }
    if (isImage && !(source as HTMLImageElement).complete) {
      if (loop) rafRef.current = requestAnimationFrame((ts) => renderOneFrame(ts, true));
      return;
    }

    // Reverse playback: manually step video.currentTime backward (video only)
    if (!isImage && reverseRef.current && loop) {
      const video = source as HTMLVideoElement;
      if (isFinite(video.duration) && video.duration > 0) {
        const deltaMs = timestamp - (lastFrameTimeRef.current || timestamp);
        const deltaSec = (deltaMs / 1000) * speedRef.current;
        let newTime = video.currentTime - deltaSec;
        if (newTime <= 0) {
          newTime = video.duration + newTime;
        }
        video.currentTime = newTime;
      }
    }
    lastFrameTimeRef.current = timestamp;

    // Update audio analyser
    audioUpdate();

    if (!extractorRef.current) {
      extractorRef.current = new FrameExtractor(resolutionRef.current, 50);
    }
    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvas);
    }

    const extractor = extractorRef.current;
    const renderer = rendererRef.current;
    const state = effectStateRef.current;

    // Use device-pixel dimensions (set by ResizeObserver in AsciiCanvas)
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    if (canvasWidth === 0 || canvasHeight === 0) {
      if (loop) rafRef.current = requestAnimationFrame((ts) => renderOneFrame(ts, true));
      return;
    }

    // Get source dimensions
    const sourceWidth = isImage
      ? (source as HTMLImageElement).naturalWidth
      : (source as HTMLVideoElement).videoWidth;
    const sourceHeight = isImage
      ? (source as HTMLImageElement).naturalHeight
      : (source as HTMLVideoElement).videoHeight;

    const videoAspect = sourceWidth / sourceHeight;
    if (!videoAspect || !isFinite(videoAspect) || sourceWidth === 0) {
      if (loop) rafRef.current = requestAnimationFrame((ts) => renderOneFrame(ts, true));
      return;
    }

    // Grid preserves video aspect — uses actual char proportions (0.6w / 1.1h)
    const charAspect = 0.6 / 1.1;
    const gridCols = resolutionRef.current;
    const gridRows = Math.max(10, Math.round(gridCols * charAspect / videoAspect));

    extractor.resize(gridCols, gridRows);

    const ramp = customRampRef.current || CHARSETS[charsetRef.current]?.ramp || CHARSETS[0].ramp;

    // Static noise mode: render random characters instead of video
    if (staticNoiseRef.current) {
      const noiseGrid: AsciiGrid = Array.from({ length: gridRows }, () =>
        Array.from({ length: gridCols }, () => {
          const v = Math.floor(Math.random() * 256);
          return { char: ramp[Math.floor(Math.random() * ramp.length)], r: v, g: v, b: v };
        })
      );
      const fontSize = renderer.calculateFontSize(canvasWidth, canvasHeight, gridCols, gridRows);
      renderer.render(noiseGrid, canvasWidth, canvasHeight, fontSize, true, {});
      if (loop) rafRef.current = requestAnimationFrame((ts) => renderOneFrame(ts, true));
      return;
    }

    let pixels = extractor.extractPixels(source);
    if (!pixels) {
      if (loop) rafRef.current = requestAnimationFrame((ts) => renderOneFrame(ts, true));
      return;
    }

    // Audio reactive: modulate pixel brightness with bass
    const audio = audioLevelsRef.current;
    if (audio && audio.volume > 0) {
      const boost = 1 + audio.bass * 0.6;
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.min(255, pixels[i] * boost);
        pixels[i + 1] = Math.min(255, pixels[i + 1] * boost);
        pixels[i + 2] = Math.min(255, pixels[i + 2] * boost);
      }
    }

    // Datamosh: blend with previous frame
    if (datamoshRef.current && prevPixelsRef.current && prevPixelsRef.current.length === pixels.length) {
      const prev = prevPixelsRef.current;
      const blended = new Uint8ClampedArray(pixels.length);
      for (let i = 0; i < pixels.length; i++) {
        blended[i] = Math.round(pixels[i] * 0.35 + prev[i] * 0.65);
      }
      prevPixelsRef.current = new Uint8ClampedArray(pixels);
      pixels = blended;
    } else {
      prevPixelsRef.current = new Uint8ClampedArray(pixels);
    }

    // Try offloading pre-effects to worker (double-buffer: dispatch now, use result next frame)
    const worker = workerRef.current;
    if (worker?.available) {
      // Dispatch current pixels to worker for next frame
      const promise = worker.process(pixels, gridCols, gridRows, t, state);
      if (promise) {
        promise.then(result => { workerResultRef.current = result; });
      }
      // Use previous worker result if available, otherwise sync fallback
      if (workerResultRef.current && workerResultRef.current.length === pixels.length) {
        pixels = workerResultRef.current;
      } else {
        pixels = applyPreEffects(pixels, gridCols, gridRows, t, state);
      }
    } else {
      pixels = applyPreEffects(pixels, gridCols, gridRows, t, state);
    }

    let grid = pixelsToAscii(pixels, gridCols, gridRows, ramp);

    // Mirror/flip horizontally
    if (isMirroredRef.current) {
      grid = grid.map(row => [...row].reverse());
    }

    grid = applyPostEffects(grid, t, state);

    // Apply figlet text overlay if enabled
    const figletState = state.effects['figletOverlay'];
    if (figletTextRef.current && figletState?.enabled) {
      grid = applyFigletToGrid(grid, figletTextRef.current, t, figletState.intensity * state.globalIntensity);
    }

    lastGridRef.current = grid;
    frameCountRef.current++;

    const fontSize = renderer.calculateFontSize(canvasWidth, canvasHeight, gridCols, gridRows);
    renderer.render(grid, canvasWidth, canvasHeight, fontSize, state.colorMode !== 'mono', {
      burnIn: burnInRef.current,
      interlace: interlaceRef.current,
      frameCount: frameCountRef.current,
      scanLine: scanLineRef.current ? (t * 0.5) % 1 : undefined,
    });

    fpsRef.current.frames++;
    if (timestamp - fpsRef.current.lastTime >= 1000) {
      fpsRef.current.fps = fpsRef.current.frames;
      fpsRef.current.frames = 0;
      fpsRef.current.lastTime = timestamp;
    }

    if (onAutoCycleTick) onAutoCycleTick(t);

    if (loop) rafRef.current = requestAnimationFrame((ts) => renderOneFrame(ts, true));
  }, [canvasRef, videoElement, imageElement, audioLevelsRef, audioUpdate, onAutoCycleTick]);

  // Start/stop render loop
  useEffect(() => {
    const source = videoElement || imageElement;
    if (isPlaying && source) {
      lastFrameTimeRef.current = 0;
      rafRef.current = requestAnimationFrame((ts) => renderOneFrame(ts, true));
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, videoElement, imageElement, renderOneFrame]);

  // Render one frame when paused or settings change
  useEffect(() => {
    const source = videoElement || imageElement;
    if (!isPlaying && source && canvasRef.current) {
      const isImage = source instanceof HTMLImageElement;
      const ready = isImage
        ? (source as HTMLImageElement).complete
        : (source as HTMLVideoElement).readyState >= 2;
      if (ready) {
        requestAnimationFrame((ts) => renderOneFrame(ts, false));
      }
    }
  }, [isPlaying, videoElement, imageElement, effectState, resolution, charsetIndex, burnIn, interlace, scanLine, datamosh, customRamp, renderOneFrame]);

  const getAsciiText = useCallback((): string => {
    const grid = lastGridRef.current;
    if (!grid) return '';
    return grid.map(row => row.map(cell => cell.char).join('')).join('\n');
  }, []);

  return {
    getFps: () => fpsRef.current.fps,
    renderOneFrame,
    getAsciiText,
  };
}
