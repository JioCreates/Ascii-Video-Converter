// Simple block-letter ASCII art text overlay
// 3x5 pixel font for uppercase + digits

import type { AsciiGrid } from '../engine/renderer';
import type { PostEffect } from './types';

const FONT: Record<string, string[]> = {
  A: ['###', '# #', '###', '# #', '# #'],
  B: ['## ', '# #', '## ', '# #', '## '],
  C: ['###', '#  ', '#  ', '#  ', '###'],
  D: ['## ', '# #', '# #', '# #', '## '],
  E: ['###', '#  ', '## ', '#  ', '###'],
  F: ['###', '#  ', '## ', '#  ', '#  '],
  G: ['###', '#  ', '# #', '# #', '###'],
  H: ['# #', '# #', '###', '# #', '# #'],
  I: ['###', ' # ', ' # ', ' # ', '###'],
  J: ['###', '  #', '  #', '# #', '###'],
  K: ['# #', '# #', '## ', '# #', '# #'],
  L: ['#  ', '#  ', '#  ', '#  ', '###'],
  M: ['# #', '###', '###', '# #', '# #'],
  N: ['# #', '###', '###', '# #', '# #'],
  O: ['###', '# #', '# #', '# #', '###'],
  P: ['###', '# #', '###', '#  ', '#  '],
  Q: ['###', '# #', '# #', '###', '  #'],
  R: ['###', '# #', '## ', '# #', '# #'],
  S: ['###', '#  ', '###', '  #', '###'],
  T: ['###', ' # ', ' # ', ' # ', ' # '],
  U: ['# #', '# #', '# #', '# #', '###'],
  V: ['# #', '# #', '# #', '# #', ' # '],
  W: ['# #', '# #', '###', '###', '# #'],
  X: ['# #', '# #', ' # ', '# #', '# #'],
  Y: ['# #', '# #', ' # ', ' # ', ' # '],
  Z: ['###', '  #', ' # ', '#  ', '###'],
  '0': ['###', '# #', '# #', '# #', '###'],
  '1': [' # ', '## ', ' # ', ' # ', '###'],
  '2': ['###', '  #', '###', '#  ', '###'],
  '3': ['###', '  #', '###', '  #', '###'],
  '4': ['# #', '# #', '###', '  #', '  #'],
  '5': ['###', '#  ', '###', '  #', '###'],
  '6': ['###', '#  ', '###', '# #', '###'],
  '7': ['###', '  #', '  #', '  #', '  #'],
  '8': ['###', '# #', '###', '# #', '###'],
  '9': ['###', '# #', '###', '  #', '###'],
  ' ': ['   ', '   ', '   ', '   ', '   '],
  '!': [' # ', ' # ', ' # ', '   ', ' # '],
  '.': ['   ', '   ', '   ', '   ', ' # '],
  '-': ['   ', '   ', '###', '   ', '   '],
  ':': ['   ', ' # ', '   ', ' # ', '   '],
};

function renderText(text: string): string[] {
  const upper = text.toUpperCase();
  const lines: string[] = ['', '', '', '', ''];

  for (const ch of upper) {
    const glyph = FONT[ch] || FONT[' '];
    for (let row = 0; row < 5; row++) {
      lines[row] += glyph[row] + ' ';
    }
  }

  return lines;
}

export const figletOverlay: PostEffect = {
  name: 'Figlet Text',
  key: 'figletOverlay',
  stage: 'post',
  apply(grid, _t, _intensity) {
    // This effect is a no-op by default; the actual overlay text
    // is applied via applyFigletToGrid() called from the engine
    // when overlay text is set. The toggle just enables/disables it.
    return grid;
  },
};

export function applyFigletToGrid(
  grid: AsciiGrid,
  text: string,
  t: number,
  intensity: number = 1.0,
): AsciiGrid {
  if (!text.trim()) return grid;

  const lines = renderText(text);
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  if (rows < 7 || cols < 10) return grid;

  const result: AsciiGrid = grid.map(row => row.map(cell => ({ ...cell })));

  // Center the text vertically and horizontally
  const textWidth = lines[0].length;
  const startY = Math.floor((rows - 5) / 2);
  const startX = Math.floor((cols - textWidth) / 2);

  // Pulsing color
  const hue = (t * 60) % 360;
  const pulse = 0.7 + 0.3 * Math.sin(t * 3);

  for (let ly = 0; ly < 5; ly++) {
    const gridY = startY + ly;
    if (gridY < 0 || gridY >= rows) continue;

    for (let lx = 0; lx < lines[ly].length; lx++) {
      const gridX = startX + lx;
      if (gridX < 0 || gridX >= cols) continue;

      if (lines[ly][lx] === '#') {
        // Map hue to RGB (simplified)
        const h = ((hue + lx * 5) % 360) / 60;
        const hi = Math.floor(h) % 6;
        const f = h - Math.floor(h);
        const v = Math.floor(255 * pulse);
        let r = 0, g = 0, b = 0;
        switch (hi) {
          case 0: r = v; g = Math.floor(v * f); break;
          case 1: r = Math.floor(v * (1 - f)); g = v; break;
          case 2: g = v; b = Math.floor(v * f); break;
          case 3: g = Math.floor(v * (1 - f)); b = v; break;
          case 4: r = Math.floor(v * f); b = v; break;
          case 5: r = v; b = Math.floor(v * (1 - f)); break;
        }

        const orig = result[gridY][gridX];
        result[gridY][gridX] = {
          char: '\u2588',
          r: Math.round(orig.r * (1 - intensity) + r * intensity),
          g: Math.round(orig.g * (1 - intensity) + g * intensity),
          b: Math.round(orig.b * (1 - intensity) + b * intensity),
        };
      }
    }
  }

  return result;
}
