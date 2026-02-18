import { useState, useCallback, useEffect } from 'react';

export interface CustomPreset {
  name: string;
  colorMode: string;
  effects: Record<string, boolean>;
  intensity: number;
  charsetIndex: number;
  phosphorIndex: number;
  crt: boolean;
  burnIn: boolean;
  interlace: boolean;
  mirror: boolean;
}

const STORAGE_KEY = 'ascii-player-presets';
const MAX_PRESETS = 50;

function isValidPreset(p: unknown): p is CustomPreset {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.name === 'string' && o.name.length > 0 && o.name.length <= 100 &&
    typeof o.colorMode === 'string' && o.colorMode.length <= 50 &&
    typeof o.effects === 'object' && o.effects !== null && !Array.isArray(o.effects) &&
    typeof o.intensity === 'number' && isFinite(o.intensity) && o.intensity >= 0 && o.intensity <= 1 &&
    typeof o.charsetIndex === 'number' && Number.isInteger(o.charsetIndex) && o.charsetIndex >= 0 && o.charsetIndex < 20 &&
    typeof o.phosphorIndex === 'number' && Number.isInteger(o.phosphorIndex) && o.phosphorIndex >= 0 && o.phosphorIndex < 20 &&
    typeof o.crt === 'boolean' &&
    typeof o.burnIn === 'boolean' &&
    typeof o.interlace === 'boolean' &&
    typeof o.mirror === 'boolean'
  );
}

function loadPresets(): CustomPreset[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPreset).slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

function savePresets(presets: CustomPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function useCustomPresets() {
  const [presets, setPresets] = useState<CustomPreset[]>(() => loadPresets());

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  const addPreset = useCallback((preset: CustomPreset) => {
    setPresets(prev => {
      const filtered = prev.filter(p => p.name !== preset.name);
      return [...filtered, preset].slice(0, MAX_PRESETS);
    });
  }, []);

  const removePreset = useCallback((name: string) => {
    setPresets(prev => prev.filter(p => p.name !== name));
  }, []);

  return { presets, addPreset, removePreset };
}
