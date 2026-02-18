// Effect manager: chains effects, handles auto-cycling

import type { AsciiGrid } from '../engine/renderer';
import type { PreEffect, PostEffect, AsciiEffect, ColorMode, EffectState } from './types';
import { applyColorMode, applyRainbowCycle } from './color';
import { allGlitchEffects, clearStutterFrame } from './glitch';
import { allPreEffects, allPostPsychedelicEffects } from './psychedelic';
import { figletOverlay } from './figlet';

export interface EffectManagerState {
  colorMode: ColorMode;
  effects: Record<string, EffectState>;
  autoCycle: boolean;
  globalIntensity: number;
}

const COLOR_MODES: ColorMode[] = ['truecolor', 'neon', 'heatmap', 'matrix', 'mono', 'gameboy', 'cga', 'c64', 'thermal', 'nightvision'];

// All registered effects
const preEffects: PreEffect[] = [...allPreEffects];
const postEffects: PostEffect[] = [
  ...allPostPsychedelicEffects,
  ...allGlitchEffects,
  figletOverlay,
];

// Rainbow is a special post-effect handled separately
const RAINBOW_KEY = 'rainbowCycle';

export function getAllEffects(): AsciiEffect[] {
  return [...preEffects, ...postEffects];
}

export function getEffectList(): { key: string; name: string; stage: string }[] {
  return [
    { key: RAINBOW_KEY, name: 'Rainbow Cycle', stage: 'post' },
    ...preEffects.map(e => ({ key: e.key, name: e.name, stage: e.stage })),
    ...postEffects.map(e => ({ key: e.key, name: e.name, stage: e.stage })),
  ];
}

export function getColorModes(): ColorMode[] {
  return COLOR_MODES;
}

export function getDefaultState(): EffectManagerState {
  const effects: Record<string, EffectState> = {};

  effects[RAINBOW_KEY] = { enabled: false, intensity: 0.7 };
  for (const e of [...preEffects, ...postEffects]) {
    effects[e.key] = { enabled: false, intensity: 0.5 };
  }

  return {
    colorMode: 'truecolor',
    effects,
    autoCycle: false,
    globalIntensity: 0.7,
  };
}

export function cycleColorMode(current: ColorMode): ColorMode {
  const idx = COLOR_MODES.indexOf(current);
  return COLOR_MODES[(idx + 1) % COLOR_MODES.length];
}

// Apply all active pre-effects to pixel data
export function applyPreEffects(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  t: number,
  state: EffectManagerState
): Uint8ClampedArray {
  let result = pixels;

  for (const effect of preEffects) {
    const es = state.effects[effect.key];
    if (es?.enabled) {
      result = effect.apply(result, width, height, t, es.intensity * state.globalIntensity);
    }
  }

  return result;
}

// Apply color mode and all active post-effects to ASCII grid
export function applyPostEffects(
  grid: AsciiGrid,
  t: number,
  state: EffectManagerState
): AsciiGrid {
  let result = grid;

  // Apply color mode first
  result = applyColorMode(result, state.colorMode, t);

  // Rainbow cycle (special post-effect)
  const rainbow = state.effects[RAINBOW_KEY];
  if (rainbow?.enabled) {
    result = applyRainbowCycle(result, t, rainbow.intensity * state.globalIntensity);
  }

  // Apply other post-effects
  for (const effect of postEffects) {
    const es = state.effects[effect.key];
    if (es?.enabled) {
      result = effect.apply(result, t, es.intensity * state.globalIntensity);
    }
  }

  return result;
}

// Auto-cycle: randomly toggle effects over time
let lastCycleTime = -1;
const CYCLE_INTERVAL = 6; // seconds

export function autoCycleTick(
  state: EffectManagerState,
  t: number
): EffectManagerState | null {
  if (!state.autoCycle) {
    lastCycleTime = -1;
    return null;
  }
  if (lastCycleTime >= 0 && t - lastCycleTime < CYCLE_INTERVAL) return null;
  lastCycleTime = t;

  const newState = {
    ...state,
    effects: { ...state.effects },
  };

  const effectKeys = Object.keys(newState.effects);
  const numToToggle = 1 + Math.floor(Math.random() * 2);

  // Use a Set to avoid toggling the same effect twice
  const toggled = new Set<string>();
  for (let i = 0; i < numToToggle; i++) {
    let key: string;
    let attempts = 0;
    do {
      key = effectKeys[Math.floor(Math.random() * effectKeys.length)];
      attempts++;
    } while (toggled.has(key) && attempts < 10);
    toggled.add(key);
    const current = newState.effects[key];
    newState.effects[key] = {
      enabled: !current.enabled,
      intensity: 0.3 + Math.random() * 0.7,
    };
  }

  // Occasionally change color mode
  if (Math.random() < 0.3) {
    newState.colorMode = COLOR_MODES[Math.floor(Math.random() * COLOR_MODES.length)];
  }

  return newState;
}

// Randomize all effects
export function randomizeEffects(state: EffectManagerState): EffectManagerState {
  const newState = {
    ...state,
    effects: { ...state.effects },
    colorMode: COLOR_MODES[Math.floor(Math.random() * COLOR_MODES.length)],
  };

  for (const key of Object.keys(newState.effects)) {
    newState.effects[key] = {
      enabled: Math.random() > 0.5,
      intensity: 0.3 + Math.random() * 0.7,
    };
  }

  return newState;
}

// Reset all effects
export function resetEffects(_state: EffectManagerState): EffectManagerState {
  clearStutterFrame();
  return getDefaultState();
}
