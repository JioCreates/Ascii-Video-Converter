// Color mode effects: transform the color of each ASCII cell

import type { AsciiGrid } from '../engine/renderer';
import type { ColorMode } from './types';

// HSL to RGB conversion
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function brightness(r: number, g: number, b: number): number {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

// Neon/Cyberpunk palette remap
function neonRemap(r: number, g: number, b: number): [number, number, number] {
  const br = brightness(r, g, b) / 255;
  // Map to neon colors based on brightness bands
  if (br < 0.2) return [10, 0, 20];
  if (br < 0.35) return [Math.floor(180 * br), 0, Math.floor(255 * br)];
  if (br < 0.5) return [255, 0, Math.floor(200 * br)];
  if (br < 0.65) return [0, Math.floor(255 * br), Math.floor(255 * br)];
  if (br < 0.8) return [Math.floor(255 * br), 255, 0];
  return [255, Math.floor(100 + 155 * br), 255];
}

// Heatmap: brightness → blue to red gradient
function heatmapRemap(r: number, g: number, b: number): [number, number, number] {
  const br = brightness(r, g, b) / 255;
  if (br < 0.25) return [0, 0, Math.floor(255 * br * 4)];
  if (br < 0.5) return [0, Math.floor(255 * (br - 0.25) * 4), 255];
  if (br < 0.75) return [Math.floor(255 * (br - 0.5) * 4), 255, Math.floor(255 * (1 - (br - 0.5) * 4))];
  return [255, Math.floor(255 * (1 - (br - 0.75) * 4)), 0];
}

// Thermal camera: black → blue → purple → red → orange → yellow → white
function thermalRemap(br: number): [number, number, number] {
  if (br < 0.15) return [0, 0, Math.floor(br / 0.15 * 80)];
  if (br < 0.3) return [Math.floor((br - 0.15) / 0.15 * 100), 0, 80 + Math.floor((br - 0.15) / 0.15 * 80)];
  if (br < 0.5) return [100 + Math.floor((br - 0.3) / 0.2 * 155), 0, Math.floor(160 * (1 - (br - 0.3) / 0.2))];
  if (br < 0.7) return [255, Math.floor((br - 0.5) / 0.2 * 180), 0];
  if (br < 0.85) return [255, 180 + Math.floor((br - 0.7) / 0.15 * 75), Math.floor((br - 0.7) / 0.15 * 60)];
  return [255, 255, 60 + Math.floor((br - 0.85) / 0.15 * 195)];
}

// Retro palette definitions
type Palette = [number, number, number][];

const GAMEBOY_PALETTE: Palette = [
  [15, 56, 15],
  [48, 98, 48],
  [139, 172, 15],
  [155, 188, 15],
];

const CGA_PALETTE: Palette = [
  [0, 0, 0],
  [85, 255, 255],
  [255, 85, 255],
  [255, 255, 255],
];

const C64_PALETTE: Palette = [
  [0, 0, 0],
  [255, 255, 255],
  [136, 0, 0],
  [170, 255, 238],
  [204, 68, 204],
  [0, 204, 85],
  [0, 0, 170],
  [238, 238, 119],
  [221, 136, 85],
  [102, 68, 0],
  [255, 119, 119],
  [51, 51, 51],
  [119, 119, 119],
  [170, 255, 102],
  [0, 136, 255],
  [187, 187, 187],
];

function nearestPaletteColor(r: number, g: number, b: number, palette: Palette): [number, number, number] {
  let bestDist = Infinity;
  let best = palette[0];
  for (const color of palette) {
    const dr = r - color[0];
    const dg = g - color[1];
    const db = b - color[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = color;
    }
  }
  return best;
}

function paletteRemap(r: number, g: number, b: number, palette: Palette): [number, number, number] {
  return nearestPaletteColor(r, g, b, palette);
}

// Matrix rain state (column drops)
const matrixDrops: { col: number; row: number; speed: number; length: number }[] = [];
let matrixInitializedCols = -1;
let lastMatrixT = -1;

function initMatrix(cols: number) {
  if (cols <= 0) return;
  matrixDrops.length = 0;
  for (let i = 0; i < Math.floor(cols * 0.4); i++) {
    matrixDrops.push({
      col: Math.floor(Math.random() * cols),
      row: Math.random() * -20,
      speed: 0.3 + Math.random() * 0.7,
      length: 5 + Math.floor(Math.random() * 15),
    });
  }
  matrixInitializedCols = cols;
}

const matrixChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789';

export function applyColorMode(
  grid: AsciiGrid,
  mode: ColorMode,
  _t: number
): AsciiGrid {
  if (mode === 'truecolor') return grid;

  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  if (mode === 'mono') {
    return grid.map(row =>
      row.map(cell => ({
        char: cell.char,
        r: 204, g: 204, b: 204,
      }))
    );
  }

  if (mode === 'neon') {
    return grid.map(row =>
      row.map(cell => {
        const [r, g, b] = neonRemap(cell.r, cell.g, cell.b);
        return { char: cell.char, r, g, b };
      })
    );
  }

  if (mode === 'heatmap') {
    return grid.map(row =>
      row.map(cell => {
        const [r, g, b] = heatmapRemap(cell.r, cell.g, cell.b);
        return { char: cell.char, r, g, b };
      })
    );
  }

  if (mode === 'gameboy') {
    return grid.map(row =>
      row.map(cell => {
        const [r, g, b] = paletteRemap(cell.r, cell.g, cell.b, GAMEBOY_PALETTE);
        return { char: cell.char, r, g, b };
      })
    );
  }

  if (mode === 'cga') {
    return grid.map(row =>
      row.map(cell => {
        const [r, g, b] = paletteRemap(cell.r, cell.g, cell.b, CGA_PALETTE);
        return { char: cell.char, r, g, b };
      })
    );
  }

  if (mode === 'c64') {
    return grid.map(row =>
      row.map(cell => {
        const [r, g, b] = paletteRemap(cell.r, cell.g, cell.b, C64_PALETTE);
        return { char: cell.char, r, g, b };
      })
    );
  }

  if (mode === 'thermal') {
    return grid.map(row =>
      row.map(cell => {
        const br = brightness(cell.r, cell.g, cell.b) / 255;
        const [r, g, b] = thermalRemap(br);
        return { char: cell.char, r, g, b };
      })
    );
  }

  if (mode === 'nightvision') {
    return grid.map(row =>
      row.map(cell => {
        const br = brightness(cell.r, cell.g, cell.b) / 255;
        return {
          char: cell.char,
          r: Math.floor(br * 40),
          g: Math.floor(80 + br * 175),
          b: Math.floor(br * 40),
        };
      })
    );
  }

  if (mode === 'matrix') {
    if (matrixInitializedCols !== cols) initMatrix(cols);

    // Green monochrome base
    const result: AsciiGrid = grid.map(row =>
      row.map(cell => {
        const br = brightness(cell.r, cell.g, cell.b) / 255;
        return {
          char: cell.char,
          r: 0,
          g: Math.floor(40 + br * 180),
          b: 0,
        };
      })
    );

    // Only advance drops when time changes (avoid double-render mutation)
    const shouldAdvance = _t !== lastMatrixT;
    if (shouldAdvance) lastMatrixT = _t;

    // Overlay matrix rain drops
    for (const drop of matrixDrops) {
      if (shouldAdvance) {
        drop.row += drop.speed;
        if (drop.row > rows + drop.length) {
          drop.row = -drop.length;
          drop.col = Math.floor(Math.random() * cols);
          drop.speed = 0.3 + Math.random() * 0.7;
        }
      }

      for (let i = 0; i < drop.length; i++) {
        const y = Math.floor(drop.row - i);
        if (y >= 0 && y < rows && drop.col < cols) {
          const fade = 1 - i / drop.length;
          const green = Math.floor(100 + 155 * fade);
          if (i === 0) {
            // Head of drop: bright white-green
            result[y][drop.col] = {
              char: matrixChars[Math.floor(Math.random() * matrixChars.length)],
              r: 180, g: 255, b: 180,
            };
          } else {
            result[y][drop.col] = {
              char: matrixChars[Math.floor(Math.random() * matrixChars.length)],
              r: 0, g: green, b: 0,
            };
          }
        }
      }
    }

    return result;
  }

  return grid;
}

// Rainbow cycle: shifts hue over time (used as a post-effect)
export function applyRainbowCycle(
  grid: AsciiGrid,
  t: number,
  intensity: number
): AsciiGrid {
  const hueShift = (t * 120) % 360; // 120 degrees per second

  return grid.map((row, y) =>
    row.map((cell, x) => {
      // Each position gets a slightly different hue for a wave effect
      const hue = (hueShift + y * 8 + x * 3) % 360;
      const br = brightness(cell.r, cell.g, cell.b) / 255;
      const [r, g, b] = hslToRgb(hue, 1.0, 0.2 + br * 0.5);

      // Blend between original and rainbow based on intensity
      return {
        char: cell.char,
        r: Math.round(cell.r * (1 - intensity) + r * intensity),
        g: Math.round(cell.g * (1 - intensity) + g * intensity),
        b: Math.round(cell.b * (1 - intensity) + b * intensity),
      };
    })
  );
}
