// Manages the effect worker lifecycle and provides async pixel processing

import type { EffectManagerState } from '../effects/manager';
import { allPreEffects } from '../effects/psychedelic';

export class EffectWorkerManager {
  private worker: Worker | null = null;
  private pending: ((pixels: Uint8ClampedArray) => void) | null = null;
  private busy = false;

  constructor() {
    try {
      this.worker = new Worker(
        new URL('./effectWorker.ts', import.meta.url),
        { type: 'module' }
      );
      this.worker.onmessage = (e: MessageEvent<{ pixels: ArrayBuffer }>) => {
        this.busy = false;
        if (this.pending) {
          const resolve = this.pending;
          this.pending = null;
          resolve(new Uint8ClampedArray(e.data.pixels));
        }
      };
      this.worker.onerror = () => {
        // If worker fails, fall back to sync
        this.worker = null;
      };
    } catch {
      // Workers not supported, will fall back to sync
      this.worker = null;
    }
  }

  get available(): boolean {
    return this.worker !== null && !this.busy;
  }

  process(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    t: number,
    state: EffectManagerState
  ): Promise<Uint8ClampedArray> | null {
    if (!this.worker || this.busy) return null;

    // Collect active pre-effects
    const effects: { key: string; intensity: number }[] = [];
    const preEffectKeys = new Set(allPreEffects.map(e => e.key));

    for (const [key, es] of Object.entries(state.effects)) {
      if (es.enabled && preEffectKeys.has(key)) {
        effects.push({ key, intensity: es.intensity });
      }
    }

    // If no pre-effects active, skip worker
    if (effects.length === 0) return null;

    this.busy = true;

    // Copy pixels to transferable buffer
    const buffer = pixels.buffer.slice(0) as ArrayBuffer;

    return new Promise<Uint8ClampedArray>((resolve) => {
      this.pending = resolve;

      // Set a timeout to avoid blocking if worker hangs
      setTimeout(() => {
        if (this.pending === resolve) {
          this.busy = false;
          this.pending = null;
          resolve(pixels); // Fall back to original pixels
        }
      }, 50);

      this.worker!.postMessage(
        { pixels: buffer, width, height, t, effects, globalIntensity: state.globalIntensity },
        [buffer]
      );
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}
