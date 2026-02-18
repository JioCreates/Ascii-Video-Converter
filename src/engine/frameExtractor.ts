// Extracts pixel data from a video/image element using an offscreen canvas

export class FrameExtractor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private _width: number;
  private _height: number;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  get width() { return this._width; }
  get height() { return this._height; }

  resize(width: number, height: number) {
    this._width = width;
    this._height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  extractPixels(source: CanvasImageSource): Uint8ClampedArray | null {
    if (this._width <= 0 || this._height <= 0 || !isFinite(this._width) || !isFinite(this._height)) return null;

    try {
      this.ctx.drawImage(source, 0, 0, this._width, this._height);
      return this.ctx.getImageData(0, 0, this._width, this._height).data;
    } catch {
      return null;
    }
  }
}
