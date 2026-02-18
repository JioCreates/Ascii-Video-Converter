// Renders an ASCII grid onto a visible canvas using fillText

import type { AsciiGrid } from './renderer';

export interface RenderOptions {
  burnIn?: boolean;
  interlace?: boolean;
  frameCount?: number;
  bgColor?: string;
  scanLine?: number; // 0-1 position of the scan beam, undefined = off
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private charWidth: number = 0;
  private charHeight: number = 0;
  private fontFamily: string;
  private cachedFontSize: number = -1;

  constructor(canvas: HTMLCanvasElement, fontFamily: string = '"Courier New", monospace') {
    this.ctx = canvas.getContext('2d')!;
    this.fontFamily = fontFamily;
  }

  measureFont(fontSize: number): { charWidth: number; charHeight: number } {
    if (fontSize === this.cachedFontSize) {
      return { charWidth: this.charWidth, charHeight: this.charHeight };
    }
    this.cachedFontSize = fontSize;
    this.ctx.font = `${fontSize}px ${this.fontFamily}`;
    const metrics = this.ctx.measureText('@');
    this.charWidth = metrics.width;
    this.charHeight = fontSize * 1.1;
    return { charWidth: this.charWidth, charHeight: this.charHeight };
  }

  // Calculate optimal font size to fit grid within canvas
  calculateFontSize(
    canvasWidth: number,
    canvasHeight: number,
    gridCols: number,
    gridRows: number
  ): number {
    const maxFontByWidth = canvasWidth / gridCols / 0.6; // ~0.6 char width ratio
    const maxFontByHeight = canvasHeight / gridRows / 1.1;
    return Math.max(4, Math.min(maxFontByWidth, maxFontByHeight));
  }

  render(
    grid: AsciiGrid,
    canvasWidth: number,
    canvasHeight: number,
    fontSize: number,
    useColor: boolean = true,
    options?: RenderOptions
  ) {
    const ctx = this.ctx;
    const bg = options?.bgColor || '#0a0a0a';

    // Burn-in: semi-transparent clear preserves previous frame ghosting
    if (options?.burnIn) {
      ctx.fillStyle = bg;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    ctx.font = `${fontSize}px ${this.fontFamily}`;
    ctx.textBaseline = 'top';

    const { charWidth, charHeight } = this.measureFont(fontSize);

    // Center the grid
    const totalWidth = grid[0]?.length * charWidth || 0;
    const totalHeight = grid.length * charHeight;
    const offsetX = Math.max(0, (canvasWidth - totalWidth) / 2);
    const offsetY = Math.max(0, (canvasHeight - totalHeight) / 2);

    // Interlace: only draw odd or even rows, alternating each frame
    const interlaceSkipOdd = options?.interlace ? ((options?.frameCount ?? 0) % 2 === 0) : false;

    for (let y = 0; y < grid.length; y++) {
      if (options?.interlace && (y % 2 === (interlaceSkipOdd ? 1 : 0))) continue;

      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (cell.char === ' ') continue;

        if (useColor) {
          ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`;
        } else {
          ctx.fillStyle = '#cccccc';
        }

        ctx.fillText(
          cell.char,
          offsetX + x * charWidth,
          offsetY + y * charHeight
        );
      }
    }

    // Slow scan line beam
    if (options?.scanLine !== undefined) {
      const scanY = options.scanLine * canvasHeight;
      // Broad glow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, scanY - 8, canvasWidth, 16);
      // Medium glow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, scanY - 3, canvasWidth, 6);
      // Bright core
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(0, scanY - 1, canvasWidth, 2);
    }
  }
}
