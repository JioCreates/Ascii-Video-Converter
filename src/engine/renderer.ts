// Core ASCII renderer: converts pixel data to ASCII character + color grid

export interface AsciiCell {
  char: string;
  r: number;
  g: number;
  b: number;
}

export type AsciiGrid = AsciiCell[][];

// Character sets ordered from sparse (dark) to dense (bright)
export const CHARSETS = [
  { name: 'ASCII',    ramp: ' .·:;!=+*#%@█' },
  { name: 'BLOCKS',   ramp: ' ░▒▓█' },
  { name: 'BRAILLE',  ramp: ' ⠁⠉⠋⠛⠟⠿⣿' },
  { name: 'KATAKANA', ramp: ' .ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｸｹﾀﾅﾎﾑﾒﾓﾔﾗﾘﾙﾚﾝ█' },
  { name: 'BINARY',   ramp: ' 01' },
  { name: 'HEX',      ramp: ' 0123456789ABCDEF' },
] as const;

export function pixelsToAscii(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  ramp: string = CHARSETS[0].ramp
): AsciiGrid {
  const grid: AsciiGrid = [];
  const rampLen = ramp.length;

  for (let y = 0; y < height; y++) {
    const row: AsciiCell[] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      // Perceived brightness (ITU-R BT.601)
      const brightness = r * 0.299 + g * 0.587 + b * 0.114;

      // Map brightness (0-255) to character index
      const charIndex = Math.min(
        Math.floor((brightness / 255) * rampLen),
        rampLen - 1
      );

      row.push({ char: ramp[charIndex], r, g, b });
    }
    grid.push(row);
  }

  return grid;
}

// Modify pixel data in-place (for pre-ASCII effects)
export function getPixelBrightness(r: number, g: number, b: number): number {
  return r * 0.299 + g * 0.587 + b * 0.114;
}
