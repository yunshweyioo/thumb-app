import { inputBus } from './InputBus.ts';
import { canvas, W, H } from '../canvas.ts';
import { clientToCanvas } from '../mobile/MobileScale.ts';

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const { x: tx, y: ty } = clientToCanvas(touch.clientX, touch.clientY);
    const isLeft   = tx < W / 2;
    const isBottom = ty > H * 0.82;

    if (isBottom) {
      inputBus.dispatch({ type: 'confirm' });
      continue;
    }
    inputBus.dispatch({ type: 'click', x: tx, y: ty });
    if (isLeft) {
      inputBus.dispatch({ type: 'tap', player: 1 });
      inputBus.dispatch({ type: 'navigate', direction: 'prev', player: 1 });
    } else {
      inputBus.dispatch({ type: 'tap', player: 2 });
      inputBus.dispatch({ type: 'navigate', direction: 'prev', player: 2 });
    }
  }
}, { passive: false });
