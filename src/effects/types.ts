import type { AsciiGrid } from '../engine/renderer';

export type EffectStage = 'pre' | 'post';

// Pre-ASCII effect: operates on raw pixel data
export interface PreEffect {
  name: string;
  key: string;
  stage: 'pre';
  apply(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    t: number,
    intensity: number
  ): Uint8ClampedArray;
}

// Post-ASCII effect: operates on the character/color grid
export interface PostEffect {
  name: string;
  key: string;
  stage: 'post';
  apply(
    grid: AsciiGrid,
    t: number,
    intensity: number
  ): AsciiGrid;
}

export type AsciiEffect = PreEffect | PostEffect;

// Color modes are a special category applied during/after ASCII conversion
export type ColorMode = 'truecolor' | 'neon' | 'heatmap' | 'matrix' | 'mono' | 'gameboy' | 'cga' | 'c64' | 'thermal' | 'nightvision';

export interface EffectState {
  enabled: boolean;
  intensity: number; // 0.0 - 1.0
}
