import { useRef, useCallback, useEffect } from 'react';

export interface AudioLevels {
  bass: number;    // 0-1
  mid: number;     // 0-1
  treble: number;  // 0-1
  volume: number;  // 0-1 overall
}

const EMPTY_LEVELS: AudioLevels = { bass: 0, mid: 0, treble: 0, volume: 0 };

// Persist audio nodes across remounts since createMediaElementSource can only be called once per element
const audioNodeCache = new WeakMap<HTMLVideoElement, { ctx: AudioContext; source: MediaElementAudioSourceNode; analyser: AnalyserNode }>();

export function useAudioAnalyser(videoElement: HTMLVideoElement | null) {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const levelsRef = useRef<AudioLevels>(EMPTY_LEVELS);
  const enabledRef = useRef(false);
  const connectedRef = useRef(false);

  const connect = useCallback(() => {
    if (!videoElement || connectedRef.current) return;

    try {
      // Reuse existing audio nodes if already created for this element
      const cached = audioNodeCache.get(videoElement);
      if (cached) {
        ctxRef.current = cached.ctx;
        analyserRef.current = cached.analyser;
        sourceRef.current = cached.source;
        dataRef.current = new Uint8Array(cached.analyser.frequencyBinCount);
        connectedRef.current = true;
        return;
      }

      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(videoElement);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioNodeCache.set(videoElement, { ctx, source, analyser });

      ctxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      connectedRef.current = true;
    } catch {
      // May fail if already connected or CORS
    }
  }, [videoElement]);

  const enable = useCallback(() => {
    if (!videoElement) return;
    videoElement.muted = false;
    connect();
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume();
    }
    enabledRef.current = true;
  }, [videoElement, connect]);

  const disable = useCallback(() => {
    if (videoElement) videoElement.muted = true;
    enabledRef.current = false;
    levelsRef.current = EMPTY_LEVELS;
  }, [videoElement]);

  // Call this each frame to update levels
  const update = useCallback(() => {
    if (!enabledRef.current || !analyserRef.current || !dataRef.current) {
      levelsRef.current = EMPTY_LEVELS;
      return;
    }

    const analyser = analyserRef.current;
    const data = dataRef.current;
    analyser.getByteFrequencyData(data);

    const binCount = data.length;
    const bassEnd = Math.floor(binCount * 0.15);
    const midEnd = Math.floor(binCount * 0.5);

    let bassSum = 0, midSum = 0, trebleSum = 0;
    for (let i = 0; i < binCount; i++) {
      if (i < bassEnd) bassSum += data[i];
      else if (i < midEnd) midSum += data[i];
      else trebleSum += data[i];
    }

    const bass = bassSum / (bassEnd * 255);
    const mid = midSum / ((midEnd - bassEnd) * 255);
    const treble = trebleSum / ((binCount - midEnd) * 255);
    const volume = (bass + mid + treble) / 3;

    levelsRef.current = { bass, mid, treble, volume };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    levelsRef,
    enable,
    disable,
    update,
    isEnabled: () => enabledRef.current,
  };
}
