import { ctx, W } from '../canvas.ts';
import { BAR_Y, BAR_CX, BAR_HALF } from '../constants.ts';
import { addFlash } from '../vfx/ScreenEffects.ts';
import { addPuText } from '../vfx/FloatTexts.ts';
import { hexAlpha } from '../renderer/CanvasUtils.ts';

export const PU_TYPES = [
  { id: 'speed',   label: 'SPD', col: '#ffee00', desc: 'SPEED UP!', dur: 4.0 },
  { id: 'reverse', label: 'REV', col: '#ff4444', desc: 'REVERSE!',  dur: 2.5 },
  { id: 'freeze',  label: 'FRZ', col: '#88ffee', desc: 'FREEZE!',   dur: 2.5 },
] as const;

export type PUId = typeof PU_TYPES[number]['id'];
export interface PUState { pos: number; typeIdx: number; age: number; }
export interface PUEffect { id: PUId | null; timer: number; }

let powerUp: PUState | null = null;
let puSpawnTimer = 5;

export const puEffects: [PUEffect, PUEffect] = [
  { id: null, timer: 0 },
  { id: null, timer: 0 },
];

export function getActivePU(): PUState | null { return powerUp; }
export function getPuEffects(): [PUEffect, PUEffect] { return puEffects; }
export function resetPowerUps(): void {
  powerUp = null;
  puSpawnTimer = 5;
  puEffects[0] = { id: null, timer: 0 };
  puEffects[1] = { id: null, timer: 0 };
}

export function spawnPowerUp(): void {
  const sign = Math.random() > 0.5 ? 1 : -1;
  const pos  = sign * (0.15 + Math.random() * 0.55);
  powerUp = { pos, typeIdx: Math.floor(Math.random() * PU_TYPES.length), age: 0 };
}

export function collectPowerUp(player: 1 | 2): void {
  if (!powerUp) return;
  const pu  = PU_TYPES[powerUp.typeIdx];
  const idx = player - 1;
  puEffects[idx] = { id: pu.id, timer: pu.dur };
  const px  = BAR_CX + powerUp.pos * BAR_HALF;
  addPuText(pu.desc, px, BAR_Y - 28, pu.col);
  addFlash(pu.col, 0.28);
  powerUp = null;
  puSpawnTimer = 4 + Math.random() * 2;
}

export function tickPowerUp(dt: number, balance: number): void {
  puSpawnTimer -= dt;
  if (!powerUp && puSpawnTimer <= 0) { spawnPowerUp(); puSpawnTimer = 4 + Math.random() * 2; }
  if (powerUp) {
    powerUp.age += dt;
    if (Math.abs(balance - powerUp.pos) < 0.055) {
      collectPowerUp(powerUp.pos > 0 ? 1 : 2);
    }
  }
  for (const e of puEffects) { if (e.timer > 0) e.timer -= dt; }
}

export function drawPowerUp(): void {
  if (!powerUp) return;
  const pu  = PU_TYPES[powerUp.typeIdx];
  const t   = performance.now() * 0.001;
  const px  = BAR_CX + powerUp.pos * BAR_HALF;
  const bob = Math.sin(t * 4.5) * 4;
  const pulse = 0.65 + 0.35 * Math.sin(t * 5.5);

  ctx.save();
  ctx.shadowColor = pu.col; ctx.shadowBlur = 18 * pulse;
  ctx.beginPath();
  ctx.moveTo(px,      BAR_Y - 13 + bob);
  ctx.lineTo(px + 9,  BAR_Y      + bob);
  ctx.lineTo(px,      BAR_Y + 13 + bob);
  ctx.lineTo(px - 9,  BAR_Y      + bob);
  ctx.closePath();
  ctx.fillStyle = hexAlpha(pu.col, 0.82 * pulse);
  ctx.fill();
  ctx.strokeStyle = pu.col; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = '5px "Press Start 2P", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(pu.label, px, BAR_Y + bob);
  ctx.restore();
}

export function drawEffectHud(p1Color: string, p2Color: string): void {
  [0, 1].forEach(idx => {
    const e = puEffects[idx];
    if (!e.id || e.timer <= 0) return;
    const pu  = PU_TYPES.find(p => p.id === e.id);
    const px  = idx === 0 ? 140 : W - 140;
    const py  = BAR_Y + 76;
    const frac = e.timer / pu.dur;
    ctx.save();
    ctx.shadowColor = pu.col; ctx.shadowBlur = 10 * frac;
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = pu.col;
    ctx.fillText(pu.label, px, py);
    // tiny timer bar
    const bw = 40, bh = 4;
    ctx.beginPath(); ctx.rect(px - bw/2, py + 9, bw, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    ctx.beginPath(); ctx.rect(px - bw/2, py + 9, bw * frac, bh);
    ctx.fillStyle = pu.col; ctx.fill();
    ctx.restore();
  });
}
