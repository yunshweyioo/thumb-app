import { canvas, W, H } from '../canvas.ts';

export interface CanvasScale {
  scaleX: number;
  scaleY: number;
}

export function getCanvasScale(): CanvasScale {
  const rect = canvas.getBoundingClientRect();
  return {
    scaleX: W / rect.width,
    scaleY: H / rect.height,
  };
}

export function clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const { scaleX, scaleY } = getCanvasScale();
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top)  * scaleY,
  };
}
