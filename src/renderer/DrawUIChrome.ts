import { ctx, W } from '../canvas.ts';
import { CHANGE_BTN, ESC_BTN } from '../input/MouseInput.ts';
import { glowTxt } from './CanvasUtils.ts';

export { CHANGE_BTN, ESC_BTN };

const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

export function drawChangeBtn(changeHover: boolean): void {
  const PAD = 8, by = CHANGE_BTN.y, bh = CHANGE_BTN.h;
  ctx.font = '6px "Press Start 2P", monospace';
  const label = 'Change Player';
  const tw = ctx.measureText(label).width;
  const bw = tw + PAD * 2;
  const bx = CHANGE_BTN.x;
  CHANGE_BTN.w = bw; // keep in sync for hit-testing
  ctx.save();
  ctx.beginPath(); ctx.rect(bx, by, bw, bh);
  ctx.fillStyle = changeHover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.strokeStyle = changeHover ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = changeHover ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + bw / 2, by + bh / 2);
  ctx.restore();
}

export function drawEscHint(): void {
  const PAD = 8, by = 8, bh = 16;
  ctx.font = '6px "Press Start 2P", monospace';
  const label = isMobile ? 'TAP to Restart' : 'ESC to Restart';
  const tw = ctx.measureText(label).width;
  const bw = tw + PAD * 2;
  const bx = W - bw - 8;
  ESC_BTN.x = bx; ESC_BTN.w = bw; // keep in sync for hit-testing
  ctx.save();
  ctx.beginPath(); ctx.rect(bx, by, bw, bh);
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + bw / 2, by + bh / 2);
  ctx.restore();
}
