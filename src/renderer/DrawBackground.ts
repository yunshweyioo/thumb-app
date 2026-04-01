import { ctx, W, H } from '../canvas.ts';
import { hexAlpha } from './CanvasUtils.ts';
import { themeManager } from '../theme/ThemeManager.ts';

// Deterministic star positions (seeded from sin hash, not Math.random)
export const BG_STARS: Array<[number, number, number]> = Array.from({ length: 90 }, (_, i) => {
  const rng = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  const x   = (rng - Math.floor(rng)) * W;
  const rng2 = Math.sin(i * 269.5 + 183.3) * 43758.5453;
  const y   = (rng2 - Math.floor(rng2)) * H;
  const rng3 = Math.sin(i * 419.2 + 77.1) * 43758.5453;
  const f   = rng3 - Math.floor(rng3);
  const s   = f < 0.15 ? 3 : f < 0.45 ? 2 : 1;
  return [Math.round(x), Math.round(y), s] as [number, number, number];
});

export function drawBg(balance: number, p1Color: string, p2Color: string): void {
  // Clean dark fill
  ctx.fillStyle = 'rgba(8, 4, 28, 0.92)';
  ctx.fillRect(0, 0, W, H);

  // Pixel stars
  ctx.fillStyle = themeManager.get().colors.starColor;
  for (const [sx, sy, ss] of BG_STARS) {
    ctx.fillRect(sx, sy, ss, ss);
  }

  // Side glow based on who's ahead
  if (Math.abs(balance) > 0.05) {
    const col = balance > 0 ? p1Color : p2Color;
    const gx  = balance > 0 ? 0 : W;
    const mag = Math.abs(balance);
    const sg  = ctx.createRadialGradient(gx, H / 2, 0, gx, H / 2, W * 0.6);
    sg.addColorStop(0, hexAlpha(col, mag * 0.09));
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  }
}
