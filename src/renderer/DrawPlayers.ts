import { ctx, W, H } from '../canvas.ts';
import { BAR_Y } from '../constants.ts';
import { hexAlpha, txt, glowTxt } from './CanvasUtils.ts';
import { drawAlienSprite, alienAnim } from '../sprites/AlienSprites.ts';
import type { GameState } from '../state/GameState.ts';

const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

export function drawPlayers(
  state: GameState,
  p1Color: string,
  p2Color: string,
  tps: [number, number],
): void {
  const p1x = 140, p2x = W - 140, py = BAR_Y;

  function side(px: number, player: number, flash: number, tpsVal: number) {
    const col = player === 1 ? p1Color : p2Color;
    const key = isMobile ? 'TAP' : (player === 1 ? 'A' : 'L');
    const fa  = flash / 0.18;

    // Key square
    ctx.save();
    if (flash > 0) { ctx.shadowColor = col; ctx.shadowBlur = 28 * fa; }
    ctx.beginPath(); ctx.rect(px - 28, py - 28, 56, 56);
    ctx.fillStyle = flash > 0 ? hexAlpha(col, 0.18 + 0.18 * fa) : hexAlpha(col, 0.07);
    ctx.fill();
    ctx.strokeStyle = flash > 0 ? col : hexAlpha(col, 0.4);
    ctx.lineWidth = flash > 0 ? 2 : 1.5; ctx.stroke();
    ctx.restore();

    // Alien icon above key box
    const alienIdx = player === 1 ? state.p1Icon : state.p2Icon;
    ctx.save();
    if (flash > 0) { ctx.shadowColor = col; ctx.shadowBlur = 20 * fa; }
    drawAlienSprite(alienIdx, px, py - 52, 4);
    ctx.restore();

    // Key letter
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.save();
    ctx.shadowColor = col; ctx.shadowBlur = flash > 0 ? 24 : 14;
    ctx.fillStyle = flash > 0 ? '#fff' : col;
    glowTxt(key, px, py);
    ctx.restore();

    // TPS speed bar
    const barY = py + 46, barW = 48, barH = 6;
    const filled = Math.min(tpsVal / 12, 1);
    ctx.save();
    ctx.beginPath(); ctx.rect(px - barW / 2, barY, barW, barH);
    ctx.fillStyle = '#080818'; ctx.fill();
    ctx.strokeStyle = hexAlpha(col, 0.2); ctx.lineWidth = 1; ctx.stroke();
    if (filled > 0) {
      ctx.beginPath(); ctx.rect(px - barW / 2, barY, barW * filled, barH);
      ctx.shadowColor = col; ctx.shadowBlur = 6;
      ctx.fillStyle = col; ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.fillStyle = col;
    glowTxt(`${tpsVal}/s`, px, barY + barH + 11);
    ctx.restore();

    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,220,120,0.55)';
    txt(`${state.tapCount[player - 1]}`, px, barY + barH + 24);
  }

  side(p1x, 1, state.tapFlash[0], tps[0]);
  side(p2x, 2, state.tapFlash[1], tps[1]);
}

export function drawWinCelebration(
  state: GameState,
  p1Color: string,
  p2Color: string,
): void {
  if (state.roundWinner === 0) return;
  const w        = state.roundWinner!;
  const alienIdx = w === 1 ? state.p1Icon : state.p2Icon;
  const col      = w === 1 ? p1Color : p2Color;
  const t        = performance.now() * 0.001;
  const elapsed  = 3.2 - state.reTimer;
  const cx = W / 2, cy = H / 2 + 62;

  function smoothstep(p: number) { return p * p * (3 - 2 * p); }

  let finalX = cx, finalY = cy, finalRot = 0, finalSX = 1, finalSY = 1, glow = 36;

  if (elapsed < 0.55) {
    const p   = elapsed / 0.55;
    const ep  = 1 - Math.pow(1 - p, 3);
    finalSX   = ep;
    finalSY   = ep;
    finalRot  = (1 - ep) * (1 - ep) * Math.PI * 2.5;
    glow      = 40 + ep * 35;
  } else if (elapsed < 1.4) {
    const p    = (elapsed - 0.55) / 0.85;
    const wave = Math.abs(Math.sin(p * Math.PI * 3));
    finalY     = cy - wave * 22;
    finalSX    = 1 + wave * 0.10;
    finalSY    = 1 + wave * 0.15;
    glow       = 44;
  } else {
    const blend = smoothstep(Math.min(1, (elapsed - 1.4) / 0.5));
    const { dx, dy, sx, sy, rot } = alienAnim(alienIdx, t);
    finalX  = cx + dx * 2.2 * blend;
    finalY  = cy + dy * 2.2 * blend;
    finalRot = rot * blend;
    finalSX  = 1 + (sx - 1) * blend;
    finalSY  = 1 + (sy - 1) * blend;
    glow     = 38;
  }

  ctx.save();
  ctx.shadowColor = col; ctx.shadowBlur = glow;
  ctx.translate(finalX, finalY);
  if (finalRot) ctx.rotate(finalRot);
  ctx.scale(finalSX, finalSY);
  drawAlienSprite(alienIdx, 0, 0, 7);
  ctx.restore();
}

