// Minimal GIF encoder for exporting ASCII art animations
// Uses canvas frames → GIF via manual encoding

export class GifEncoder {
  private frames: { data: ImageData; delay: number }[] = [];
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  addFrame(canvas: HTMLCanvasElement, delay: number = 100) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    this.frames.push({ data: imageData, delay });
  }

  async encode(): Promise<Blob> {
    // Build GIF binary
    const pixels = this.frames.map(f => f.data.data);
    const delays = this.frames.map(f => f.delay);

    const gif = buildGif(this.width, this.height, pixels, delays);
    return new Blob([gif.buffer as ArrayBuffer], { type: 'image/gif' });
  }
}

// --- GIF89a binary builder ---

function buildGif(
  width: number,
  height: number,
  frames: Uint8ClampedArray[],
  delays: number[]
): Uint8Array {
  const parts: number[] = [];

  // Header
  writeStr(parts, 'GIF89a');

  // Logical Screen Descriptor
  writeU16(parts, width);
  writeU16(parts, height);
  parts.push(0x70); // no GCT, 8-bit color depth
  parts.push(0x00); // bg color
  parts.push(0x00); // pixel aspect

  // Netscape looping extension
  parts.push(0x21, 0xFF, 0x0B);
  writeStr(parts, 'NETSCAPE2.0');
  parts.push(0x03, 0x01);
  writeU16(parts, 0); // loop forever
  parts.push(0x00);

  for (let i = 0; i < frames.length; i++) {
    const palette = buildPalette(frames[i]);
    const indexed = indexPixels(frames[i], palette);

    // Graphics Control Extension
    parts.push(0x21, 0xF9, 0x04);
    parts.push(0x04); // dispose: restore to bg
    writeU16(parts, Math.round(delays[i] / 10)); // delay in centiseconds
    parts.push(0x00); // transparent color index (none)
    parts.push(0x00);

    // Image Descriptor
    parts.push(0x2C);
    writeU16(parts, 0); // left
    writeU16(parts, 0); // top
    writeU16(parts, width);
    writeU16(parts, height);
    parts.push(0x87); // local color table, 256 entries (2^(7+1))

    // Local Color Table (256 * 3 bytes)
    for (let c = 0; c < 256; c++) {
      parts.push(palette[c * 3], palette[c * 3 + 1], palette[c * 3 + 2]);
    }

    // LZW compressed image data
    const lzw = lzwEncode(indexed, 8);
    parts.push(8); // LZW minimum code size
    // Write in sub-blocks of max 255 bytes
    let offset = 0;
    while (offset < lzw.length) {
      const blockSize = Math.min(255, lzw.length - offset);
      parts.push(blockSize);
      for (let j = 0; j < blockSize; j++) {
        parts.push(lzw[offset + j]);
      }
      offset += blockSize;
    }
    parts.push(0x00); // block terminator
  }

  parts.push(0x3B); // GIF trailer

  return new Uint8Array(parts);
}

function writeStr(arr: number[], s: string) {
  for (let i = 0; i < s.length; i++) arr.push(s.charCodeAt(i));
}

function writeU16(arr: number[], v: number) {
  arr.push(v & 0xFF, (v >> 8) & 0xFF);
}

// Build a 256-color palette using median-cut quantization (simplified)
function buildPalette(pixels: Uint8ClampedArray): Uint8Array {
  const palette = new Uint8Array(768); // 256 * 3

  // Sample colors and find 256 representative ones
  const colorCounts = new Map<number, number>();
  for (let i = 0; i < pixels.length; i += 4) {
    // Quantize to 5-bit per channel for grouping
    const r = pixels[i] >> 3;
    const g = pixels[i + 1] >> 3;
    const b = pixels[i + 2] >> 3;
    const key = (r << 10) | (g << 5) | b;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }

  // Sort by frequency and take top 256
  const sorted = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 256);

  for (let i = 0; i < sorted.length; i++) {
    const key = sorted[i][0];
    palette[i * 3] = ((key >> 10) & 0x1F) << 3;
    palette[i * 3 + 1] = ((key >> 5) & 0x1F) << 3;
    palette[i * 3 + 2] = (key & 0x1F) << 3;
  }

  return palette;
}

// Map pixels to palette indices
function indexPixels(pixels: Uint8ClampedArray, palette: Uint8Array): Uint8Array {
  const count = pixels.length / 4;
  const indexed = new Uint8Array(count);

  // Build lookup from quantized colors to palette index
  const lookup = new Map<number, number>();
  for (let i = 0; i < 256; i++) {
    const r = palette[i * 3] >> 3;
    const g = palette[i * 3 + 1] >> 3;
    const b = palette[i * 3 + 2] >> 3;
    const key = (r << 10) | (g << 5) | b;
    if (!lookup.has(key)) lookup.set(key, i);
  }

  for (let i = 0; i < count; i++) {
    const r = pixels[i * 4] >> 3;
    const g = pixels[i * 4 + 1] >> 3;
    const b = pixels[i * 4 + 2] >> 3;
    const key = (r << 10) | (g << 5) | b;

    if (lookup.has(key)) {
      indexed[i] = lookup.get(key)!;
    } else {
      // Find nearest palette color
      let bestDist = Infinity;
      let bestIdx = 0;
      for (let p = 0; p < 256; p++) {
        const pr = palette[p * 3] >> 3;
        const pg = palette[p * 3 + 1] >> 3;
        const pb = palette[p * 3 + 2] >> 3;
        const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = p;
        }
      }
      indexed[i] = bestIdx;
      lookup.set(key, bestIdx); // cache for next time
    }
  }

  return indexed;
}

// LZW compression for GIF
function lzwEncode(indexed: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  const output: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;

  function writeBits(code: number, bits: number) {
    bitBuffer |= code << bitCount;
    bitCount += bits;
    while (bitCount >= 8) {
      output.push(bitBuffer & 0xFF);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  }

  // Initialize code table
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const maxTableSize = 4096;
  const table = new Map<string, number>();

  function initTable() {
    table.clear();
    for (let i = 0; i < clearCode; i++) {
      table.set(String(i), i);
    }
    nextCode = eoiCode + 1;
    codeSize = minCodeSize + 1;
  }

  initTable();
  writeBits(clearCode, codeSize);

  if (indexed.length === 0) {
    writeBits(eoiCode, codeSize);
    if (bitCount > 0) output.push(bitBuffer & 0xFF);
    return new Uint8Array(output);
  }

  let prefix = String(indexed[0]);

  for (let i = 1; i < indexed.length; i++) {
    const c = String(indexed[i]);
    const combined = prefix + ',' + c;

    if (table.has(combined)) {
      prefix = combined;
    } else {
      writeBits(table.get(prefix)!, codeSize);

      if (nextCode < maxTableSize) {
        table.set(combined, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      } else {
        writeBits(clearCode, codeSize);
        initTable();
      }

      prefix = c;
    }
  }

  writeBits(table.get(prefix)!, codeSize);
  writeBits(eoiCode, codeSize);

  if (bitCount > 0) {
    output.push(bitBuffer & 0xFF);
  }

  return new Uint8Array(output);
}
