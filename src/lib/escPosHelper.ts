/**
 * ESC/POS Helper for Thermal Printers (58mm/80mm)
 * Provides methods to generate binary commands for text, styles, and alignments.
 */

export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;

export class EscPosEncoder {
  private buffer: number[] = [];
  private encoder = new TextEncoder();

  /** Initialize printer */
  initialize() {
    this.buffer.push(ESC, 0x40);
    return this;
  }

  /** Align: 0=Left, 1=Center, 2=Right */
  align(n: 0 | 1 | 2) {
    this.buffer.push(ESC, 0x61, n);
    return this;
  }

  /** Text size: 0x00=normal, 0x11=double height/width */
  size(n: number = 0x00) {
    this.buffer.push(GS, 0x21, n);
    return this;
  }

  /** Bold: 1=on, 0=off */
  bold(n: 0 | 1) {
    this.buffer.push(ESC, 0x45, n);
    return this;
  }

  /** Underline: 0=off, 1=thin, 2=thick */
  underline(n: 0 | 1 | 2) {
    this.buffer.push(ESC, 0x2d, n);
    return this;
  }

  /** Print text and add line feed */
  line(text: string = "") {
    const bytes = this.encoder.encode(text);
    this.buffer.push(...Array.from(bytes), LF);
    return this;
  }

  /** Add multiple line feeds */
  feed(n: number = 1) {
    for (let i = 0; i < n; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  /** Add a dashed or solid line separator */
  separator(width: 32 | 48 = 32, char: string = "-") {
    this.line(char.repeat(width));
    return this;
  }

  /** Print a two-column row with left and right alignment */
  row(left: string, right: string, width: 32 | 48 = 32) {
    const spaces = width - left.length - right.length;
    if (spaces > 0) {
      this.line(left + " ".repeat(spaces) + right);
    } else {
      // If too long, print on separate lines or truncate
      this.line(left);
      this.align(2).line(right).align(0);
    }
    return this;
  }

  /** Get the final Uint8Array buffer */
  encode(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /**
   * Print a raster image (monochrome)
   * Converts RGBA ImageData from canvas to 1-bit monochrome bytes for ESC/POS `GS v 0`.
   * Width must be a multiple of 8.
   */
  image(imgData: ImageData) {
    const width = imgData.width;
    const height = imgData.height;
    
    // Bytes per row (width in dots / 8)
    const bytesPerRow = Math.ceil(width / 8);
    
    // GS v 0 m xL xH yL yH d1...dk
    this.buffer.push(GS, 0x76, 0x30, 0x00);
    this.buffer.push(bytesPerRow % 256, Math.floor(bytesPerRow / 256));
    this.buffer.push(height % 256, Math.floor(height / 256));
    
    const data = imgData.data;
    
    for (let y = 0; y < height; y++) {
      for (let xByte = 0; xByte < bytesPerRow; xByte++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = xByte * 8 + bit;
          if (x < width) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // Simple threshold: if transparent or bright, white (0), else black (1)
            // Luma = 0.299R + 0.587G + 0.114B
            const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
            const isBlack = (a > 128) && (brightness < 128);
            
            if (isBlack) {
              byte |= (1 << (7 - bit));
            }
          }
        }
        this.buffer.push(byte);
      }
    }
    
    return this;
  }
}
