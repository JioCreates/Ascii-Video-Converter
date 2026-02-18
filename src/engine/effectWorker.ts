// Web Worker for offloading pre-effects processing from the main thread

import { allPreEffects } from '../effects/psychedelic';

interface WorkerMessage {
  pixels: ArrayBuffer;
  width: number;
  height: number;
  t: number;
  effects: { key: string; intensity: number }[];
  globalIntensity: number;
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  try {
    const { pixels, width, height, t, effects, globalIntensity } = e.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = new Uint8ClampedArray(pixels);

    for (const { key, intensity } of effects) {
      const effect = allPreEffects.find(eff => eff.key === key);
      if (effect) {
        current = effect.apply(current, width, height, t, intensity * globalIntensity);
      }
    }

    // Copy to a clean ArrayBuffer for transfer
    const out = new Uint8Array(current.length);
    out.set(current);
    self.postMessage({ pixels: out.buffer }, { transfer: [out.buffer] });
  } catch {
    // On error, return original pixels so the promise resolves
    const fallback = new Uint8Array(e.data.pixels);
    self.postMessage({ pixels: fallback.buffer }, { transfer: [fallback.buffer] });
  }
};
