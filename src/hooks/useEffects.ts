import { useState, useCallback, useMemo } from 'react';
import {
  getDefaultState,
  cycleColorMode,
  randomizeEffects,
  getEffectList,
  autoCycleTick,
  type EffectManagerState,
} from '../effects/manager';

export function useEffects() {
  const [state, setState] = useState<EffectManagerState>(getDefaultState());
  const [crtEnabled, setCrtEnabled] = useState(false);

  const effectList = useMemo(() => getEffectList(), []);

  const toggleEffect = useCallback((index: number) => {
    const effect = effectList[index];
    if (!effect) return;

    setState(s => ({
      ...s,
      effects: {
        ...s.effects,
        [effect.key]: {
          ...s.effects[effect.key],
          enabled: !s.effects[effect.key]?.enabled,
        },
      },
    }));
  }, [effectList]);

  const nextColorMode = useCallback(() => {
    setState(s => ({ ...s, colorMode: cycleColorMode(s.colorMode) }));
  }, []);

  const adjustIntensity = useCallback((delta: number) => {
    setState(s => ({
      ...s,
      globalIntensity: Math.max(0.1, Math.min(1.0, s.globalIntensity + delta)),
    }));
  }, []);

  const toggleAutoCycle = useCallback(() => {
    setState(s => ({ ...s, autoCycle: !s.autoCycle }));
  }, []);

  const randomize = useCallback(() => {
    setState(s => randomizeEffects(s));
  }, []);

  const reset = useCallback(() => {
    setState(() => getDefaultState());
  }, []);

  const toggleCrt = useCallback(() => {
    setCrtEnabled(v => !v);
  }, []);

  const setCrt = useCallback((enabled: boolean) => {
    setCrtEnabled(enabled);
  }, []);

  const tickAutoCycle = useCallback((t: number) => {
    setState(s => {
      const newState = autoCycleTick(s, t);
      return newState || s;
    });
  }, []);

  const setColorMode = useCallback((mode: string) => {
    const valid = ['truecolor', 'neon', 'heatmap', 'matrix', 'mono', 'gameboy', 'cga', 'c64', 'thermal', 'nightvision'];
    if (valid.includes(mode)) {
      setState(s => ({ ...s, colorMode: mode as EffectManagerState['colorMode'] }));
    }
  }, []);

  const setEffectIntensity = useCallback((key: string, intensity: number) => {
    setState(s => ({
      ...s,
      effects: {
        ...s.effects,
        [key]: {
          ...s.effects[key],
          intensity: Math.max(0.1, Math.min(1.0, intensity)),
        },
      },
    }));
  }, []);

  const applyPreset = useCallback((preset: { colorMode: string; effects: Record<string, boolean>; intensity?: number }) => {
    setState(s => {
      const newEffects = { ...s.effects };
      for (const key of Object.keys(newEffects)) {
        newEffects[key] = { ...newEffects[key], enabled: false };
      }
      for (const [key, enabled] of Object.entries(preset.effects)) {
        if (newEffects[key]) {
          newEffects[key] = { ...newEffects[key], enabled };
        }
      }
      return {
        ...s,
        colorMode: preset.colorMode as EffectManagerState['colorMode'],
        effects: newEffects,
        globalIntensity: preset.intensity ?? s.globalIntensity,
        autoCycle: false,
      };
    });
  }, []);

  return {
    state,
    crtEnabled,
    effectList,
    toggleEffect,
    nextColorMode,
    setColorMode,
    adjustIntensity,
    toggleAutoCycle,
    randomize,
    reset,
    toggleCrt,
    setCrt,
    tickAutoCycle,
    applyPreset,
    setEffectIntensity,
  };
}
