// Keyboard + mouse state, in logical field coordinates.
// The canvas letterboxes the 1280x800 field, so mouse pixels are converted
// with the same scale/offset the renderer uses.
import { FIELD } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = FIELD.width / 2;
    this.mouseY = FIELD.height / 2 - 120;
    this.mouseDown = false;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this._onKeyDown = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.key.toLowerCase());
      this.keys.add(event.key.toLowerCase());
    };
    this._onKeyUp = (event) => {
      this.keys.delete(event.key.toLowerCase());
    };
    this._onMouseMove = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (event.clientX - rect.left - this.offsetX) / this.scale;
      this.mouseY = (event.clientY - rect.top - this.offsetY) / this.scale;
    };
    this._onMouseDown = (event) => {
      this._onMouseMove(event);
      this.mouseDown = true;
    };
    this._onMouseUp = () => {
      this.mouseDown = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pressed.clear();
      this.mouseDown = false;
    });
  }

  setView(scale, offsetX, offsetY) {
    this.scale = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  down(key) {
    return this.keys.has(key.toLowerCase());
  }

  // True once, on the frame the key went down. Cleared by endFrame().
  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }

  // -1/0/1 movement vector from WASD or arrow keys.
  moveVector() {
    let dx = 0;
    let dy = 0;
    if (this.down('a') || this.down('arrowleft')) dx -= 1;
    if (this.down('d') || this.down('arrowright')) dx += 1;
    if (this.down('w') || this.down('arrowup')) dy -= 1;
    if (this.down('s') || this.down('arrowdown')) dy += 1;
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }
    return { dx, dy };
  }

  endFrame() {
    this.pressed.clear();
  }
}
