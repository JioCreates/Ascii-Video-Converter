// Psychedelic effects: wave distortion, kaleidoscope, edge detection, etc.

import type { AsciiGrid, AsciiCell } from '../engine/renderer';
import type { PreEffect, PostEffect } from './types';

// Wave Distortion: sinusoidal displacement of rows/columns
export const waveDistortion: PostEffect = {
  name: 'Wave Distortion',
  key: 'waveDistortion',
  stage: 'post',
  apply(grid, t, intensity) {
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    if (rows === 0 || cols === 0) return grid;

    const result: AsciiGrid = [];

    for (let y = 0; y < rows; y++) {
      const row: AsciiCell[] = [];
      const xOffset = Math.floor(Math.sin(y * 0.15 + t * 3) * intensity * 5);

      for (let x = 0; x < cols; x++) {
        const yOffset = Math.floor(Math.sin(x * 0.1 + t * 2) * intensity * 3);

        const srcX = ((x - xOffset) % cols + cols) % cols;
        const srcY = Math.max(0, Math.min(rows - 1, y - yOffset));

        row.push({ ...grid[srcY][srcX] });
      }
      result.push(row);
    }

    return result;
  },
};

// Kaleidoscope: mirror frame into 4x symmetry
export const kaleidoscope: PreEffect = {
  name: 'Kaleidoscope',
  key: 'kaleidoscope',
  stage: 'pre',
  apply(pixels, width, height, _t, intensity) {
    const result = new Uint8ClampedArray(pixels);
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);

    for (let y = 0; y < halfH; y++) {
      for (let x = 0; x < halfW; x++) {
        const srcI = (y * width + x) * 4;
        const r = pixels[srcI];
        const g = pixels[srcI + 1];
        const b = pixels[srcI + 2];
        const a = pixels[srcI + 3];

        const rightX = width - 1 - x;
        const rightI = (y * width + rightX) * 4;

        const bottomY = height - 1 - y;
        const bottomI = (bottomY * width + x) * 4;

        const brI = (bottomY * width + rightX) * 4;

        const blend = intensity;

        // Right mirror
        result[rightI] = Math.round(pixels[rightI] * (1 - blend) + r * blend);
        result[rightI + 1] = Math.round(pixels[rightI + 1] * (1 - blend) + g * blend);
        result[rightI + 2] = Math.round(pixels[rightI + 2] * (1 - blend) + b * blend);
        result[rightI + 3] = a;

        // Bottom mirror
        result[bottomI] = Math.round(pixels[bottomI] * (1 - blend) + r * blend);
        result[bottomI + 1] = Math.round(pixels[bottomI + 1] * (1 - blend) + g * blend);
        result[bottomI + 2] = Math.round(pixels[bottomI + 2] * (1 - blend) + b * blend);
        result[bottomI + 3] = a;

        // Bottom-right mirror
        result[brI] = Math.round(pixels[brI] * (1 - blend) + r * blend);
        result[brI + 1] = Math.round(pixels[brI + 1] * (1 - blend) + g * blend);
        result[brI + 2] = Math.round(pixels[brI + 2] * (1 - blend) + b * blend);
        result[brI + 3] = a;
      }
    }

    return result;
  },
};

// Edge Detection: Sobel filter on pixel data
export const edgeDetection: PreEffect = {
  name: 'Edge Detection',
  key: 'edgeDetection',
  stage: 'pre',
  apply(pixels, width, height, _t, intensity) {
    // Start with a copy so border pixels retain original values
    const result = new Uint8ClampedArray(pixels);

    const gray = (i: number) =>
      pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        const tl = gray(((y - 1) * width + (x - 1)) * 4);
        const tc = gray(((y - 1) * width + x) * 4);
        const tr = gray(((y - 1) * width + (x + 1)) * 4);
        const ml = gray((y * width + (x - 1)) * 4);
        const mr = gray((y * width + (x + 1)) * 4);
        const bl = gray(((y + 1) * width + (x - 1)) * 4);
        const bc = gray(((y + 1) * width + x) * 4);
        const br = gray(((y + 1) * width + (x + 1)) * 4);

        const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
        const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
        const edge = Math.min(255, Math.sqrt(gx * gx + gy * gy));

        result[idx] = Math.round(pixels[idx] * (1 - intensity) + edge * intensity);
        result[idx + 1] = Math.round(pixels[idx + 1] * (1 - intensity) + edge * intensity);
        result[idx + 2] = Math.round(pixels[idx + 2] * (1 - intensity) + edge * intensity);
        result[idx + 3] = 255;
      }
    }

    return result;
  },
};

// Invert / Solarize
export const invertSolarize: PreEffect = {
  name: 'Invert/Solarize',
  key: 'invertSolarize',
  stage: 'pre',
  apply(pixels, _width, _height, _t, intensity) {
    const result = new Uint8ClampedArray(pixels);
    const threshold = 128;

    for (let i = 0; i < pixels.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const val = pixels[i + c];
        const inverted = val > threshold ? 255 - val : val;
        result[i + c] = Math.round(val * (1 - intensity) + inverted * intensity);
      }
    }

    return result;
  },
};

// Zoom Pulse: oscillating zoom
export const zoomPulse: PreEffect = {
  name: 'Zoom Pulse',
  key: 'zoomPulse',
  stage: 'pre',
  apply(pixels, width, height, t, intensity) {
    const result = new Uint8ClampedArray(pixels.length);
    const zoom = 1 + Math.sin(t * 2) * intensity * 0.3;

    const cx = width / 2;
    const cy = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = Math.floor(cx + (x - cx) / zoom);
        const srcY = Math.floor(cy + (y - cy) / zoom);

        const dstI = (y * width + x) * 4;

        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const srcI = (srcY * width + srcX) * 4;
          result[dstI] = pixels[srcI];
          result[dstI + 1] = pixels[srcI + 1];
          result[dstI + 2] = pixels[srcI + 2];
          result[dstI + 3] = pixels[srcI + 3];
        } else {
          result[dstI + 3] = 255;
        }
      }
    }

    return result;
  },
};

// Pixel Sort: sort pixel spans by brightness for a glitchy aesthetic
export const pixelSort: PreEffect = {
  name: 'Pixel Sort',
  key: 'pixelSort',
  stage: 'pre',
  apply(pixels, width, height, _t, intensity) {
    const result = new Uint8ClampedArray(pixels);
    const threshold = 60 + (1 - intensity) * 140; // lower intensity = higher threshold = fewer sorted spans

    for (let y = 0; y < height; y++) {
      // Find spans of pixels above brightness threshold, then sort them
      let spanStart = -1;

      for (let x = 0; x <= width; x++) {
        const i = (y * width + x) * 4;
        const br = x < width
          ? pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
          : 0;

        if (br > threshold && x < width) {
          if (spanStart === -1) spanStart = x;
        } else {
          if (spanStart !== -1 && x - spanStart > 2) {
            // Sort this span by brightness
            const span: { br: number; r: number; g: number; b: number; a: number }[] = [];
            for (let sx = spanStart; sx < x; sx++) {
              const si = (y * width + sx) * 4;
              span.push({
                br: pixels[si] * 0.299 + pixels[si + 1] * 0.587 + pixels[si + 2] * 0.114,
                r: pixels[si], g: pixels[si + 1], b: pixels[si + 2], a: pixels[si + 3],
              });
            }
            span.sort((a, b) => a.br - b.br);
            for (let j = 0; j < span.length; j++) {
              const di = (y * width + spanStart + j) * 4;
              result[di] = span[j].r;
              result[di + 1] = span[j].g;
              result[di + 2] = span[j].b;
              result[di + 3] = span[j].a;
            }
          }
          spanStart = -1;
        }
      }
    }

    return result;
  },
};

export const allPreEffects: PreEffect[] = [
  kaleidoscope,
  edgeDetection,
  invertSolarize,
  zoomPulse,
  pixelSort,
];

export const allPostPsychedelicEffects: PostEffect[] = [
  waveDistortion,
];
