// Glitch effects: corruption, noise, VHS, scanline shift

import type { AsciiGrid, AsciiCell } from '../engine/renderer';
import type { PostEffect } from './types';

const glitchSymbols = '░▒▓█▄▀▐▌╔╗╚╝║═╬╩╦╠╣┃━┣┫┳┻╋!@#$%^&*<>{}[]|\\/?~';

// Scanline Shift: randomly offset rows horizontally
export const scanlineShift: PostEffect = {
  name: 'Scanline Shift',
  key: 'scanlineShift',
  stage: 'post',
  apply(grid, _t, intensity) {
    return grid.map((row) => {
      if (Math.random() > intensity * 0.3) return row;

      const shift = Math.floor((Math.random() - 0.5) * row.length * intensity * 0.3);
      if (shift === 0) return row;

      const newRow: AsciiCell[] = [];
      for (let x = 0; x < row.length; x++) {
        const srcX = ((x - shift) % row.length + row.length) % row.length;
        newRow.push({ ...row[srcX] });
      }
      return newRow;
    });
  },
};

// Pixel Corruption: replace random chars with garbage symbols
export const pixelCorruption: PostEffect = {
  name: 'Pixel Corruption',
  key: 'pixelCorruption',
  stage: 'post',
  apply(grid, _t, intensity) {
    return grid.map(row =>
      row.map(cell => {
        if (Math.random() < intensity * 0.08) {
          return {
            char: glitchSymbols[Math.floor(Math.random() * glitchSymbols.length)],
            r: Math.random() > 0.5 ? 255 : cell.r,
            g: Math.random() > 0.7 ? 255 : cell.g,
            b: Math.random() > 0.5 ? 255 : cell.b,
          };
        }
        return cell;
      })
    );
  },
};

// VHS Tracking: horizontal bands with color channel separation
export const vhsTracking: PostEffect = {
  name: 'VHS Tracking',
  key: 'vhsTracking',
  stage: 'post',
  apply(grid, t, intensity) {
    const bandHeight = 3 + Math.floor(Math.random() * 5);
    const bandY = Math.floor((t * 30 + Math.sin(t * 2) * 10) % (grid.length + bandHeight)) - bandHeight;

    return grid.map((row, y) => {
      const channelShift = Math.floor(intensity * 3);

      return row.map((cell, x) => {
        const newCell = { ...cell };

        if (channelShift > 0 && x >= channelShift && x < row.length - channelShift) {
          newCell.r = row[Math.min(x + channelShift, row.length - 1)].r;
          newCell.b = row[Math.max(x - channelShift, 0)].b;
        }

        if (y >= bandY && y < bandY + bandHeight) {
          const bandIntensity = 1 - Math.abs(y - bandY - bandHeight / 2) / (bandHeight / 2);
          const shift = Math.floor(bandIntensity * intensity * 8);
          const srcX = Math.max(0, Math.min(x + shift, row.length - 1));
          newCell.char = row[srcX].char;
          newCell.r = Math.min(255, newCell.r + Math.floor(40 * bandIntensity));
        }

        return newCell;
      });
    });
  },
};

// Digital Noise: random static characters
export const digitalNoise: PostEffect = {
  name: 'Digital Noise',
  key: 'digitalNoise',
  stage: 'post',
  apply(grid, _t, intensity) {
    return grid.map(row =>
      row.map(cell => {
        if (Math.random() < intensity * 0.05) {
          const gray = Math.floor(Math.random() * 200);
          return {
            char: Math.random() > 0.5 ? '░' : '▒',
            r: gray,
            g: gray,
            b: gray,
          };
        }
        return cell;
      })
    );
  },
};

// Frame Stutter: occasionally return previous frame
let stutterFrame: AsciiGrid | null = null;

export function clearStutterFrame() {
  stutterFrame = null;
}

export const frameStutter: PostEffect = {
  name: 'Frame Stutter',
  key: 'frameStutter',
  stage: 'post',
  apply(grid, _t, intensity) {
    // Clear stale frame if dimensions changed
    if (stutterFrame && (stutterFrame.length !== grid.length || stutterFrame[0]?.length !== grid[0]?.length)) {
      stutterFrame = null;
    }

    if (stutterFrame && Math.random() < intensity * 0.15) {
      return stutterFrame;
    }

    stutterFrame = grid.map(row => row.map(cell => ({ ...cell })));
    return grid;
  },
};

export const allGlitchEffects: PostEffect[] = [
  scanlineShift,
  pixelCorruption,
  vhsTracking,
  digitalNoise,
  frameStutter,
];
