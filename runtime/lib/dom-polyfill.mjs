/**
 * Minimal DOM stubs for pdfjs-dist in Node/serverless.
 * Must be imported before pdfjs-dist.
 */
const g = globalThis;

if (typeof g.DOMMatrix === "undefined") {
  g.DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

if (typeof g.ImageData === "undefined") {
  g.ImageData = class ImageData {
    constructor(data, width = 0, height = 0) {
      this.data = data || new Uint8ClampedArray(0);
      this.width = width;
      this.height = height;
    }
  };
}

if (typeof g.Path2D === "undefined") {
  g.Path2D = class Path2D {
    constructor() {}
  };
}
