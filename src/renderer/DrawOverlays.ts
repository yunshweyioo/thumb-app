import { ctx, W, H } from '../canvas.ts';
import { hexAlpha, glowTxt, fireGrad } from './CanvasUtils.ts';
import { themeManager } from '../theme/ThemeManager.ts';

export function drawOverlay(color: string, title: string, sub: string): void {
  // Transparent at top so the score header stays readable, dark from ~130px down
  const og = ctx.createLinearGradient(0, 100, 0, 155);
  og.addColorStop(0, 'rgba(0,0,0,0)');
  og.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, W, 155);
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 155, W, H - 155);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // Title — fire gradient + strong glow
  ctx.save();
  ctx.font = '20px "Press Start 2P", monospace';
  ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 50;
  ctx.fillStyle = fireGrad(H / 2 - 32, H / 2 - 12);
  ctx.fillText(title, W / 2, H / 2 - 22);
  ctx.restore();

  if (sub) {
    ctx.save();
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.shadowColor = themeManager.get().colors.accent; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffcc44';
    glowTxt(sub, W / 2, H / 2 + 20);
    ctx.restore();
  }
}

export function drawScreenFlash(flashAlphaVal: number, flashColVal: string): void {
  if (flashAlphaVal <= 0) return;
  const fg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  fg.addColorStop(0,   hexAlpha(flashColVal, flashAlphaVal * 0.45));
  fg.addColorStop(0.5, hexAlpha(flashColVal, flashAlphaVal * 0.2));
  fg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
}
