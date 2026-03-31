import { inputBus } from './InputBus.ts';
import { canvas } from '../canvas.ts';
import { LOBBY_BTN, HOW_BTN, HS_BTN } from '../constants.ts';
import { clientToCanvas } from '../mobile/MobileScale.ts';

// CHANGE_BTN and ESC_BTN are defined in main-legacy.ts with dynamic widths set at draw time.
// We define them here with the same initial values; the draw function keeps them in sync.
export const CHANGE_BTN = { x: 8,   y: 8, w: 105, h: 16 };
export const ESC_BTN    = { x: 710, y: 8, w: 100, h: 16 };

function inRect(mx: number, my: number, r: { x: number; y: number; w: number; h: number }): boolean {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}

canvas.addEventListener('click', (e: MouseEvent) => {
  const { x: mx, y: my } = clientToCanvas(e.clientX, e.clientY);
  inputBus.dispatch({ type: 'click', x: mx, y: my });
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const { x: mx, y: my } = clientToCanvas(e.clientX, e.clientY);
  inputBus.dispatch({ type: 'hover', target: 'lobby',  active: inRect(mx, my, LOBBY_BTN) });
  inputBus.dispatch({ type: 'hover', target: 'change', active: inRect(mx, my, CHANGE_BTN) });
});

canvas.addEventListener('mouseleave', () => {
  inputBus.dispatch({ type: 'hover', target: 'lobby',  active: false });
  inputBus.dispatch({ type: 'hover', target: 'change', active: false });
});
