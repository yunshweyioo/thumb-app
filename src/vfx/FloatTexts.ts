import { ctx } from '../canvas.ts';

interface ComboText { text: string; x: number; y: number; vy: number; alpha: number; col: string; }
interface PuText    { text: string; x: number; y: number; col: string; alpha: number; scale: number; age: number; }

const comboTexts: ComboText[] = [];
const puTexts: PuText[] = [];

export function addComboText(text: string, x: number, y: number, col: string): void {
  comboTexts.push({ text, x, y, vy: -55, alpha: 1.0, col });
}
export function tickComboTexts(dt: number): void {
  for (let i = comboTexts.length - 1; i >= 0; i--) {
    const c = comboTexts[i];
    c.y += c.vy * dt; c.alpha -= dt * 1.8;
    if (c.alpha <= 0) comboTexts.splice(i, 1);
  }
}
export function drawComboTexts(): void {
  for (const c of comboTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, c.alpha);
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = c.col; ctx.shadowBlur = 14;
    ctx.fillStyle = '#fff';
    ctx.fillText(c.text, c.x, c.y);
    ctx.restore();
  }
}

export function addPuText(text: string, x: number, y: number, col: string): void {
  puTexts.push({ text, x, y, col, alpha: 1.0, scale: 0.4, age: 0 });
}
export function tickPuTexts(dt: number): void {
  for (let i = puTexts.length - 1; i >= 0; i--) {
    const p = puTexts[i];
    p.age   += dt;
    p.scale  = Math.min(1.4, p.scale + dt * 4.5); // zoom from small → overshoot
    p.alpha -= dt * 1.4;
    if (p.alpha <= 0) puTexts.splice(i, 1);
  }
}
export function drawPuTexts(): void {
  for (const p of puTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale, p.scale);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.shadowColor = p.col; ctx.shadowBlur = 20;
    ctx.fillStyle = p.col;
    ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }
}

export function resetFloatTexts(): void {
  comboTexts.length = 0;
  puTexts.length = 0;
}
