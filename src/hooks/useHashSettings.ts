import { useEffect, useCallback } from 'react';

interface HashSettings {
  colorMode?: string;
  resolution?: number;
  charset?: number;
  phosphor?: number;
  crt?: boolean;
  burnIn?: boolean;
  interlace?: boolean;
  mirror?: boolean;
  effects?: string; // comma-separated enabled effect keys
}

const VALID_COLOR_MODES = new Set([
  'truecolor', 'neon', 'heatmap', 'matrix', 'mono',
  'gameboy', 'cga', 'c64', 'thermal', 'nightvision',
]);

export function encodeHash(settings: HashSettings): string {
  const params = new URLSearchParams();
  if (settings.colorMode) params.set('cm', settings.colorMode);
  if (settings.resolution) params.set('res', String(settings.resolution));
  if (settings.charset !== undefined) params.set('cs', String(settings.charset));
  if (settings.phosphor !== undefined) params.set('ph', String(settings.phosphor));
  if (settings.crt) params.set('crt', '1');
  if (settings.burnIn) params.set('burn', '1');
  if (settings.interlace) params.set('ilace', '1');
  if (settings.mirror) params.set('mir', '1');
  if (settings.effects) params.set('fx', settings.effects);
  return params.toString();
}

export function decodeHash(hash: string): HashSettings {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const settings: HashSettings = {};

  const cm = params.get('cm');
  if (cm && VALID_COLOR_MODES.has(cm)) settings.colorMode = cm;

  const res = params.get('res');
  if (res) {
    const n = parseInt(res, 10);
    if (Number.isInteger(n) && n >= 20 && n <= 300) settings.resolution = n;
  }

  const cs = params.get('cs');
  if (cs) {
    const n = parseInt(cs, 10);
    if (Number.isInteger(n) && n >= 0 && n < 20) settings.charset = n;
  }

  const ph = params.get('ph');
  if (ph) {
    const n = parseInt(ph, 10);
    if (Number.isInteger(n) && n >= 0 && n < 20) settings.phosphor = n;
  }

  if (params.get('crt') === '1') settings.crt = true;
  if (params.get('burn') === '1') settings.burnIn = true;
  if (params.get('ilace') === '1') settings.interlace = true;
  if (params.get('mir') === '1') settings.mirror = true;

  const fx = params.get('fx');
  if (fx) {
    // Only allow alphanumeric effect keys
    const keys = fx.split(',').filter(k => /^[a-zA-Z0-9]+$/.test(k));
    if (keys.length > 0) settings.effects = keys.join(',');
  }

  return settings;
}

export function useHashSettings(
  onLoad: (settings: HashSettings) => void,
) {
  // Load from hash on mount
  useEffect(() => {
    if (window.location.hash) {
      const settings = decodeHash(window.location.hash);
      onLoad(settings);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateHash = useCallback((settings: HashSettings) => {
    const hash = encodeHash(settings);
    window.history.replaceState(null, '', hash ? `#${hash}` : window.location.pathname);
  }, []);

  return { updateHash };
}
