import { ctx, W, H } from '../canvas.ts';
import { BAR_Y, BAR_CX, BAR_HALF, BAR_H, ORB_R, TIMER_CY, ROUND_TIME } from '../constants.ts';
import { hexAlpha, shadeHex, txt, glowTxt, fireGrad } from './CanvasUtils.ts';
import type { GameState } from '../state/GameState.ts';

export function drawScore(
  state: GameState,
  p1Color: string,
  p2Color: string,
  scoreScaleArr: [number, number],
): void {
  const cx = W / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // Player labels
  ctx.font = '13px "Press Start 2P", monospace';
  ctx.save(); ctx.shadowColor = p1Color; ctx.shadowBlur = 12;
  ctx.fillStyle = p1Color; glowTxt('P1', cx - 155, 38); ctx.restore();
  ctx.save(); ctx.shadowColor = p2Color; ctx.shadowBlur = 12;
  ctx.fillStyle = p2Color; glowTxt('P2', cx + 155, 38); ctx.restore();

  // Score numbers
  ctx.save();
  ctx.translate(cx - 155, 68);
  ctx.scale(scoreScaleArr[0], scoreScaleArr[0]);
  ctx.font = '32px "Press Start 2P", monospace';
  ctx.shadowColor = p1Color; ctx.shadowBlur = 28;
  ctx.fillStyle = p1Color;
  ctx.fillText(String(state.scores[0]), 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(cx + 155, 68);
  ctx.scale(scoreScaleArr[1], scoreScaleArr[1]);
  ctx.font = '32px "Press Start 2P", monospace';
  ctx.shadowColor = p2Color; ctx.shadowBlur = 28;
  ctx.fillStyle = p2Color;
  ctx.fillText(String(state.scores[1]), 0, 0);
  ctx.restore();

  // VS box
  const vsY = 62;
  ctx.save();
  ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.rect(cx - 24, vsY - 14, 48, 28);
  ctx.fillStyle = '#0e0800'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,136,0,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  ctx.font = '11px "Press Start 2P", monospace';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  txt('VS', cx, vsY);

  // Round row
  const rowY = 108;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.save(); ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffcc44';
  glowTxt(`ROUND ${state.round} / 3`, cx, rowY); ctx.restore();

  // Pixel-art heart
  const HEART_FILL = [
    [0,1,1,0,0,0,1,1,0],
    [1,1,1,1,0,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,0,0],
    [0,0,0,1,1,1,0,0,0],
    [0,0,0,0,1,0,0,0,0],
  ];
  const HEART_OUTLINE = [
    [0,1,1,0,0,0,1,1,0],
    [1,0,0,1,0,1,0,0,1],
    [1,0,0,0,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [0,1,0,0,0,0,0,1,0],
    [0,0,1,0,0,0,1,0,0],
    [0,0,0,1,0,1,0,0,0],
    [0,0,0,0,1,0,0,0,0],
  ];

  function drawHeart(hx: number, hy: number, ps: number, color: string, filled: boolean) {
    const grid = filled ? HEART_FILL : HEART_OUTLINE;
    const cols = grid[0].length, rows = grid.length;
    const ox = hx - (cols * ps) / 2;
    const oy = hy - (rows * ps) / 2;
    ctx.save();
    if (filled) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
    ctx.fillStyle = filled ? color : hexAlpha('#aabbcc', 0.5);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c]) ctx.fillRect(Math.round(ox + c * ps), Math.round(oy + r * ps), ps, ps);
      }
    }
    ctx.restore();
  }

  const ps = 2, hSpacing = 24;
  for (let i = 0; i < 2; i++) {
    drawHeart(cx - 108 + i * hSpacing, rowY, ps, p1Color, i < state.scores[0]);
  }
  for (let i = 0; i < 2; i++) {
    drawHeart(cx + 88 + i * hSpacing, rowY, ps, p2Color, i < state.scores[1]);
  }
}

export function drawBar(
  balance: number,
  p1Color: string,
  p2Color: string,
  orbBounce: number,
  orbVelX: number,
  coinAngle: number,
  orbitAngle: number,
  orbTrail: Array<{ x: number; age: number }>,
  tapFlash: [number, number],
): void {
  const bx = BAR_CX - BAR_HALF;
  const by = BAR_Y - BAR_H / 2;
  const bw = BAR_HALF * 2;

  // Segmented retro pixel bar
  const N_SEGS = 30, SEG_GAP = 2;
  const SEG_W  = (bw - (N_SEGS + 1) * SEG_GAP) / N_SEGS;
  const SEG_H  = BAR_H - 8;
  const SEG_Y  = by + 4;
  const half   = N_SEGS / 2;

  // Outer casing
  ctx.save();
  ctx.fillStyle = '#06040e';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, BAR_H, BAR_H / 2); ctx.fill();
  ctx.strokeStyle = '#334455'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  // Clip segments
  ctx.save();
  ctx.beginPath(); ctx.roundRect(bx, by, bw, BAR_H, BAR_H / 2); ctx.clip();

  // Segments
  const litCount = Math.abs(balance) * half;
  for (let i = 0; i < N_SEGS; i++) {
    const sx    = bx + SEG_GAP + i * (SEG_W + SEG_GAP);
    const right = i >= half;
    const col   = right ? p1Color : p2Color;
    const lit   = right
      ? (balance > 0 && (i - half) < litCount)
      : (balance < 0 && (half - 1 - i) < litCount);

    ctx.fillStyle = lit ? col : hexAlpha(col, 0.08);
    ctx.beginPath(); ctx.roundRect(sx, SEG_Y, SEG_W, SEG_H, 3); ctx.fill();
    if (!lit) { ctx.strokeStyle = hexAlpha(col, 0.18); ctx.lineWidth = 1; ctx.stroke(); }
  }

  ctx.restore(); // end clip

  // Outer glow
  if (Math.abs(balance) > 0.05) {
    const glowCol = balance > 0 ? p1Color : p2Color;
    ctx.save();
    ctx.shadowColor = glowCol; ctx.shadowBlur = 12;
    ctx.strokeStyle = hexAlpha(glowCol, 0.35); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, BAR_H, BAR_H / 2); ctx.stroke();
    ctx.restore();
  }

  // Center tick
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(BAR_CX - 1, by + 1, 2, BAR_H - 2);
  ctx.restore();

  // End zone indicators
  const ezNow   = performance.now() * 0.001;
  const ezPulse = 0.5 + 0.5 * Math.sin(ezNow * 2.6);
  const nearR   = Math.max(0, (balance  - 0.45) / 0.55);
  const nearL   = Math.max(0, (-balance - 0.45) / 0.55);

  // Inner cap glows
  const capW = 52;
  function drawCapGlow(side: string, col: string, proximity: number) {
    const alpha = 0.14 + ezPulse * 0.10 + proximity * 0.38;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(bx, by, bw, BAR_H, BAR_H / 2); ctx.clip();
    const x0 = side === 'right' ? bx + bw - capW : bx + capW;
    const x1 = side === 'right' ? bx + bw        : bx;
    const cg  = ctx.createLinearGradient(x0, 0, x1, 0);
    cg.addColorStop(0, 'rgba(0,0,0,0)');
    cg.addColorStop(1, hexAlpha(col, alpha));
    ctx.fillStyle = cg;
    ctx.fillRect(side === 'right' ? bx + bw - capW : bx, by, capW, BAR_H);
    ctx.restore();
  }
  drawCapGlow('right', p1Color, nearR);
  drawCapGlow('left',  p2Color, nearL);

  // Outer chevron arrows
  function drawChevrons(originX: number, col: string, dir: number, proximity: number) {
    const baseAlpha = 0.28 + ezPulse * 0.18 + proximity * 0.54;
    for (let i = 0; i < 3; i++) {
      const ax = originX + dir * (9 + i * 9);
      ctx.save();
      ctx.globalAlpha = baseAlpha * (1 - i * 0.28);
      ctx.strokeStyle = col; ctx.lineWidth = 1.8;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(ax - dir * 5, BAR_Y - 7);
      ctx.lineTo(ax,           BAR_Y);
      ctx.lineTo(ax - dir * 5, BAR_Y + 7);
      ctx.stroke();
      ctx.restore();
    }
  }
  drawChevrons(bx + bw, p1Color,  1, nearR);
  drawChevrons(bx,      p2Color, -1, nearL);

  // Trail
  const orbX    = BAR_CX + balance * BAR_HALF;
  const trailCol = balance > 0.05 ? p1Color : balance < -0.05 ? p2Color : '#c8c0ff';
  for (const t of orbTrail) {
    const frac = 1 - t.age / 0.45;
    if (frac <= 0) continue;
    ctx.save();
    ctx.globalAlpha = frac * frac * 0.55;
    ctx.shadowColor = trailCol; ctx.shadowBlur = 10 * frac;
    ctx.beginPath(); ctx.arc(t.x, BAR_Y, ORB_R * frac * 0.88, 0, Math.PI * 2);
    ctx.fillStyle = trailCol; ctx.fill();
    ctx.restore();
  }

  // Orb
  const orbCol = balance > 0.05 ? p1Color : balance < -0.05 ? p2Color : '#e0e0ff';
  const coinX  = Math.cos(coinAngle);
  const scaleX = Math.max(0.08, Math.abs(coinX));
  const scaleY = 1 + orbBounce * 0.15;

  // Orbit dots
  const orbitR  = ORB_R * 1.75;
  const dotR    = 3;
  const speed   = Math.abs(orbVelX);
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const angle = orbitAngle + (i * Math.PI * 2) / 3;
    const dx = Math.cos(angle) * orbitR;
    const dy = Math.sin(angle) * orbitR * 0.45;
    const alpha = 0.4 + speed * 0.5 + 0.15 * Math.sin(angle * 2);
    ctx.save();
    ctx.shadowColor = orbCol; ctx.shadowBlur = 8;
    ctx.fillStyle = hexAlpha(orbCol, Math.min(1, alpha));
    ctx.beginPath();
    ctx.arc(orbX + dx, BAR_Y + dy, dotR * (0.7 + speed * 0.4), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(orbX, BAR_Y);
  ctx.scale(scaleX, scaleY);

  // Main body with strong glow
  ctx.save();
  ctx.shadowColor = orbCol; ctx.shadowBlur = 26;
  ctx.beginPath(); ctx.arc(0, 0, ORB_R, 0, Math.PI * 2);
  const og = ctx.createRadialGradient(-ORB_R * 0.3, -ORB_R * 0.3, 0, 0, 0, ORB_R);
  og.addColorStop(0,    '#ffffff');
  og.addColorStop(0.2,  'rgba(255,255,255,0.85)');
  og.addColorStop(0.5,  orbCol);
  og.addColorStop(1,    shadeHex(orbCol, -55));
  ctx.fillStyle = og; ctx.fill();
  ctx.restore();

  // Specular highlight
  const hlX = -Math.sign(coinX || 1) * ORB_R * 0.28;
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.beginPath(); ctx.arc(hlX, -ORB_R * 0.28, ORB_R * 0.23, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();

  ctx.restore(); // pop squash/stretch transform
}

export function drawRoundTimer(roundTimer: number): void {
  const t    = Math.max(0, roundTimer);
  const secs = Math.ceil(t);
  const cx   = W / 2;
  const cy   = BAR_Y - 72;
  const urgent = t <= 5;

  // Pixel progress bar
  const prog  = t / ROUND_TIME;
  const barW  = 80, barH = 5;
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - barW / 2, cy - 24, barW, barH);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  if (prog > 0) {
    ctx.beginPath(); ctx.rect(cx - barW / 2, cy - 24, barW * prog, barH);
    ctx.shadowColor = urgent ? '#ff2020' : '#ff8800'; ctx.shadowBlur = 10;
    ctx.fillStyle = urgent ? '#ff2020' : fireGrad(cy - 24, cy - 19); ctx.fill();
  }
  ctx.restore();

  // Timer number
  const fs = urgent ? 16 : 14;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = urgent ? '#ff2020' : '#ff8800'; ctx.shadowBlur = urgent ? 22 : 14;
  ctx.font = `${fs}px "Press Start 2P", monospace`;
  ctx.fillStyle = urgent ? '#ff2020' : fireGrad(cy - fs / 2, cy + fs / 2);
  glowTxt(String(secs), cx, cy);
  ctx.restore();

  if (urgent) {
    ctx.save();
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff4040';
    glowTxt('HURRY!', cx, cy + 20);
    ctx.restore();
  }
}

export function drawCountdown(state: GameState): void {
  const text = state.countdown > 0 ? String(state.countdown) : 'GO!';
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.translate(W / 2, TIMER_CY);
  ctx.scale(state.cdScale, state.cdScale);
  if (state.countdown === 0) {
    ctx.font = '48px "Press Start 2P", monospace';
    ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 50;
    ctx.fillStyle = fireGrad(-24, 24);
  } else {
    ctx.font = '56px "Press Start 2P", monospace';
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 40;
    ctx.fillStyle = fireGrad(-28, 28);
  }
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
