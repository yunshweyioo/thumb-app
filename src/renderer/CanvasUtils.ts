import { ctx } from '../canvas.ts';

export function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
}

export function shadeHex(hex: string, d: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.min(255, Math.max(0, (n >> 16) + d))},${Math.min(255, Math.max(0, ((n >> 8) & 255) + d))},${Math.min(255, Math.max(0, (n & 255) + d))})`;
}

// Draw text with no shadow bleed — always resets shadow state first
export function txt(text: string, x: number, y: number): void {
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.fillText(text, x, y);
}

// Draw text with glow — does NOT reset shadow
export function glowTxt(text: string, x: number, y: number): void {
  ctx.fillText(text, x, y);
}

// Fire gradient fill matching the title: top=yellow → bottom=dark red
// y0/y1 are the top and bottom of the text in current coordinate space
export function fireGrad(y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0,    '#ffe600');
  g.addColorStop(0.35, '#ff9900');
  g.addColorStop(0.7,  '#ff3300');
  g.addColorStop(1,    '#cc1100');
  return g;
}
