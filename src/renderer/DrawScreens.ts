import { ctx, W, H } from '../canvas.ts';
import { LOBBY_BTN, HOW_BTN, HS_BTN } from '../constants.ts';
import { hexAlpha, txt, glowTxt } from './CanvasUtils.ts';
import { drawAlienSprite, alienAnim } from '../sprites/AlienSprites.ts';
import { themeManager } from '../theme/ThemeManager.ts';
import type { GameState } from '../state/GameState.ts';
import type { IStorageManager } from '../storage/StorageManager.ts';

const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

export interface NameEntryState {
  letters: string[];
  cursor: number;
  winner: number;
  spamCount?: number;
  spamRate?: string;
}

export function drawCharSelect(state: GameState, p1Color: string, p2Color: string): void {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // Title
  ctx.save();
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#fff';
  txt('CHOOSE YOUR FIGHTER', W / 2, 22);
  ctx.restore();

  const CELL = 68, COLS = 4;
  const GRID_W = CELL * COLS;
  const GRID_H = CELL * COLS;
  const GRID_Y = Math.round((H - GRID_H) / 2) + 10;

  const p1gx = W / 4 - GRID_W / 2;
  const p2gx = W * 3 / 4 - GRID_W / 2;

  [1, 2].forEach(p => {
    const gx     = p === 1 ? p1gx : p2gx;
    const cursor = p === 1 ? state.p1Cursor : state.p2Cursor;
    const pc     = themeManager.getAliens()[cursor].c;
    const prevKey = p === 1 ? 'A' : 'K';
    const nextKey = p === 1 ? 'S' : 'L';

    const panCX = gx + GRID_W / 2;
    const kw = 22, kh = 20;

    function keyCap(label: string, kx: number, ky: number) {
      ctx.save();
      ctx.shadowColor = pc; ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeStyle = pc; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(kx - kw / 2, ky - kh / 2, kw, kh); ctx.fill(); ctx.stroke();
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, kx, ky);
      ctx.restore();
    }

    // Player label
    ctx.save();
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.shadowColor = pc; ctx.shadowBlur = 18;
    ctx.fillStyle = pc;
    txt(`PLAYER ${p}`, panCX, GRID_Y - 44);
    ctx.restore();

    // Key caps row
    const hintY = GRID_Y - 20;
    const prevKX = panCX - 36, nextKX = panCX + 36;

    keyCap(prevKey, prevKX, hintY);
    keyCap(nextKey, nextKX, hintY);

    // Arrows beside key caps
    ctx.save();
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.shadowColor = pc; ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';  ctx.textBaseline = 'middle';
    ctx.fillText('\u25C0', prevKX - kw / 2 - 6, hintY);
    ctx.textAlign = 'left';
    ctx.fillText('\u25B6', nextKX + kw / 2 + 6, hintY);
    ctx.restore();

    // 4x4 grid
    for (let i = 0; i < 16; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx  = gx + col * CELL + CELL / 2;
      const cy  = GRID_Y + row * CELL + CELL / 2;
      const sel = i === cursor;

      // Cell bg + border
      ctx.save();
      ctx.fillStyle   = sel ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.03)';
      ctx.strokeStyle = sel ? pc : 'rgba(255,255,255,0.1)';
      ctx.lineWidth   = sel ? 2 : 1;
      if (sel) { ctx.shadowColor = pc; ctx.shadowBlur = 16; }
      ctx.beginPath();
      ctx.rect(gx + col * CELL + 3, GRID_Y + row * CELL + 3, CELL - 6, CELL - 6);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      // Alien sprite — animated when selected
      ctx.save();
      if (sel) {
        const t = performance.now() * 0.001;
        const { dx, dy, sx, sy, rot } = alienAnim(i, t);
        ctx.shadowColor = themeManager.getAliens()[i].c; ctx.shadowBlur = 20;
        ctx.translate(cx + dx, cy + dy);
        if (rot) ctx.rotate(rot);
        ctx.scale(sx, sy);
        drawAlienSprite(i, 0, 0, 4);
      } else {
        drawAlienSprite(i, cx, cy, 3);
      }
      ctx.restore();
    }
  });

  // Divider line
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(W / 2, GRID_Y - 52); ctx.lineTo(W / 2, GRID_Y + GRID_H + 16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Bottom "press space" blink
  const blinkOn = (performance.now() % 1100) < 660;
  ctx.save();
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.shadowColor = '#ffee00'; ctx.shadowBlur = blinkOn ? 14 : 0;
  ctx.fillStyle = blinkOn ? '#ffee00' : 'rgba(255,238,0,0.15)';
  txt(isMobile ? 'TAP BOTTOM TO CONFIRM' : 'PRESS SPACE TO CONFIRM', W / 2, GRID_Y + GRID_H + 26);
  ctx.restore();
}

export function drawLobby(
  state: GameState,
  storage: IStorageManager,
  lobbyHover: boolean,
  p1Color: string,
  p2Color: string,
): void {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  const blinkOn = (performance.now() % 1100) < 605;
  if (blinkOn) {
    const hov = lobbyHover;
    ctx.save();
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.shadowColor = hov ? '#ffffff' : '#ffee00';
    ctx.shadowBlur  = hov ? 28 : 16;
    ctx.fillStyle   = hov ? '#ffffff' : '#ffee00';
    glowTxt('PRESS SPACE TO START', W / 2, LOBBY_BTN.y + LOBBY_BTN.h / 2);
    ctx.restore();
  }

  // Per-player win counts
  const w1 = storage.getWins(1), w2 = storage.getWins(2);
  if (w1 > 0 || w2 > 0) {
    const wy = LOBBY_BTN.y + LOBBY_BTN.h / 2 + 30;
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.save();
    ctx.fillStyle = hexAlpha(p1Color, 0.6);
    ctx.shadowColor = p1Color; ctx.shadowBlur = 6;
    ctx.textAlign = 'right';
    ctx.fillText(`P1 WINS: ${w1}`, W / 2 - 10, wy);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = hexAlpha(p2Color, 0.6);
    ctx.shadowColor = p2Color; ctx.shadowBlur = 6;
    ctx.textAlign = 'left';
    ctx.fillText(`P2 WINS: ${w2}`, W / 2 + 10, wy);
    ctx.restore();
  }

  // "HOW TO PLAY" + "HIGH SCORES" buttons
  ctx.save();
  ctx.font = '5px "Press Start 2P", monospace';
  const PAD2 = 14, GAP2 = 10;
  const hwW = ctx.measureText('HOW TO PLAY').width  + PAD2;
  const hsW = ctx.measureText('LEADERBOARD').width + PAD2;
  const totalBtnW = hwW + GAP2 + hsW;
  HOW_BTN.x = W / 2 - totalBtnW / 2; HOW_BTN.w = hwW;
  HS_BTN.x  = HOW_BTN.x + hwW + GAP2; HS_BTN.w = hsW;
  for (const [btn, label] of [[HOW_BTN, 'HOW TO PLAY'], [HS_BTN, 'LEADERBOARD']] as const) {
    ctx.beginPath(); ctx.rect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, btn.x + btn.w / 2, btn.y + btn.h / 2);
  }
  ctx.restore();
}

export function drawNameEntry(
  state: GameState,
  p1Color: string,
  p2Color: string,
  nameEntryState: NameEntryState,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cx = W / 2;
  const ne = nameEntryState;
  const winCol = ne.winner === 1 ? p1Color : p2Color;

  // Title
  ctx.font = '11px "Press Start 2P", monospace';
  ctx.fillStyle = winCol; ctx.shadowColor = winCol; ctx.shadowBlur = 20;
  ctx.fillText(`PLAYER ${ne.winner} WINS!`, cx, 58);
  ctx.shadowBlur = 0;
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('ENTER YOUR NAME', cx, 86);

  // Text field box
  const FIELD_W = 400, FIELD_H = 44, FIELD_Y = 108;
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - FIELD_W / 2, FIELD_Y, FIELD_W, FIELD_H);
  ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
  ctx.strokeStyle = winCol; ctx.lineWidth = 1.5;
  ctx.shadowColor = winCol; ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  // Characters
  ctx.font = '16px "Press Start 2P", monospace';
  ctx.textBaseline = 'middle';
  const charW = ctx.measureText('A').width + 4;
  const blinkOn = (performance.now() % 900) < 520;
  const visibleCount = ne.cursor + 1;
  const tx0 = cx - (visibleCount * charW) / 2;
  const ty = FIELD_Y + FIELD_H / 2;

  for (let i = 0; i < visibleCount; i++) {
    const tx = tx0 + i * charW;
    const letter = ne.letters[i];
    const isCursor = i === ne.cursor;

    if (isCursor && blinkOn) {
      ctx.fillStyle = winCol; ctx.shadowColor = winCol; ctx.shadowBlur = 10;
      ctx.fillText('|', tx + charW * 0.1, ty);
      ctx.shadowBlur = 0;
    } else if (letter !== '_') {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(letter, tx, ty);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillText('_', tx, ty);
    }
  }

  // Spam stats
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText(`${ne.spamCount ?? 0} TAPS  \u00B7  ${ne.spamRate ?? '0.0'}/s`, cx, 174);

  // Controls hint
  ctx.font = '5px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillText(isMobile ? 'TAP RIGHT = NEXT LETTER  \u00B7  LEFT = BACK  \u00B7  BOTTOM = DONE' : 'TYPE YOUR NAME  \u00B7  ENTER TO CONFIRM', cx, 192);

  // Mobile confirm hint
  if (isMobile) {
    const blinkC = (performance.now() % 1100) < 660;
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = blinkC ? 'rgba(255,238,0,0.6)' : 'rgba(255,238,0,0.15)';
    ctx.shadowColor = '#ffee00'; ctx.shadowBlur = blinkC ? 10 : 0;
    ctx.fillText('\u25BC  CONFIRM', cx, H - 26);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

export function drawLeaderboard(storage: IStorageManager, lbNewName: string | null): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cx = W / 2;

  // Title
  ctx.font = '13px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffee00'; ctx.shadowColor = '#ffee00'; ctx.shadowBlur = 20;
  ctx.fillText('\u2605  LEADERBOARD  \u2605', cx, 30);
  ctx.shadowBlur = 0;

  // Divider
  ctx.strokeStyle = 'rgba(255,238,0,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, 48); ctx.lineTo(W - 60, 48); ctx.stroke();

  // Column headers
  ctx.font = '5px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textAlign = 'left';  ctx.fillText('RANK',  90,  62);
  ctx.textAlign = 'left';  ctx.fillText('NAME',  220, 62);
  ctx.textAlign = 'right'; ctx.fillText('WINS',  430, 62);
  ctx.textAlign = 'right'; ctx.fillText('TAPS',  530, 62);
  ctx.textAlign = 'right'; ctx.fillText('RATE',  630, 62);
  ctx.textAlign = 'right'; ctx.fillText('DATE',  730, 62);

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.moveTo(60, 70); ctx.lineTo(W - 60, 70); ctx.stroke();

  const lb = storage.getLB();
  const RANKS = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH', '9TH', '10TH'];
  const RANK_COLS = ['#ffd700', '#c0c0c0', '#cd7f32'];
  const ROW_H = 26;
  const startY = 84;

  if (lb.length === 0) {
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.fillText('NO SCORES YET', cx, startY + 60);
    ctx.fillText('PLAY A MATCH TO ENTER!', cx, startY + 86);
  }

  for (let i = 0; i < lb.length; i++) {
    const e   = lb[i];
    const y   = startY + i * ROW_H;
    const col = i < 3 ? RANK_COLS[i] : 'rgba(255,255,255,0.55)';
    const isNew = e.name === lbNewName && i === lb.findIndex(x => x.name === lbNewName);
    const blinkOn = isNew && (performance.now() % 800) < 480;

    // Row highlight for new entry
    if (isNew) {
      ctx.save();
      ctx.fillStyle = blinkOn ? 'rgba(255,238,0,0.07)' : 'transparent';
      ctx.fillRect(60, y - 10, W - 120, ROW_H);
      ctx.restore();
    }

    // Rank
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = isNew && blinkOn ? '#ffee00' : col;
    if (i < 3) { ctx.shadowColor = col; ctx.shadowBlur = 8; }
    ctx.textAlign = 'left'; ctx.fillText(RANKS[i], 90, y + 3);
    ctx.shadowBlur = 0;

    // Alien sprite
    drawAlienSprite(e.icon ?? 0, 175, y + 3, 2);

    // Name
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = isNew && blinkOn ? '#ffee00' : (i < 3 ? col : '#ffffff');
    if (i < 3) { ctx.shadowColor = col; ctx.shadowBlur = 6; }
    ctx.textAlign = 'left'; ctx.fillText(e.name, 220, y + 3);
    ctx.shadowBlur = 0;

    // Wins
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = i < 3 ? col : 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'right'; ctx.fillText(String(e.wins), 430, y + 3);

    // Taps
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'right'; ctx.fillText(e.spamCount != null ? String(e.spamCount) : '-', 530, y + 3);

    // Rate
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'right'; ctx.fillText(e.spamRate ? `${e.spamRate}/s` : '-', 630, y + 3);

    // Date
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'right'; ctx.fillText(e.date ?? '', 730, y + 3);
  }

  // Bottom divider + prompt
  const tableBottom = startY + Math.max(lb.length, 1) * ROW_H + 8;
  ctx.strokeStyle = 'rgba(255,238,0,0.3)';
  ctx.beginPath(); ctx.moveTo(60, tableBottom); ctx.lineTo(W - 60, tableBottom); ctx.stroke();

  const blinkP = (performance.now() % 1100) < 660;
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ffee00'; ctx.shadowBlur = blinkP ? 12 : 0;
  ctx.fillStyle = blinkP ? '#ffee00' : 'rgba(255,238,0,0.2)';
  ctx.fillText(isMobile ? 'TAP TO CONTINUE' : 'PRESS ANY KEY TO CONTINUE', cx, tableBottom + 18);
  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawHowToPlay(): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  const cx = W / 2;
  const rowData = [
    { color: '#cc66ff', label: 'PLAYER 1',  hint: isMobile ? 'TAP LEFT SIDE'  : 'A / S  KEYS' },
    { color: '#ff4499', label: 'PLAYER 2',  hint: isMobile ? 'TAP RIGHT SIDE' : 'K / L  KEYS' },
    { color: '#ffffff', label: 'GOAL',      hint: 'PUSH ORB TO OPPONENT SIDE' },
    { color: '#ffffff', label: 'WIN',       hint: 'FIRST TO WIN 2 ROUNDS' },
  ];
  const puData = [
    { color: '#ffee00', label: 'SPD', hint: 'YOUR TAPS MOVE FASTER' },
    { color: '#ff4444', label: 'REV', hint: "OPP TAPS BACKFIRE ON THEM" },
    { color: '#88ffee', label: 'FRZ', hint: 'OPPONENT FROZEN BRIEFLY' },
  ];

  // Vertically center the whole block
  const TITLE_H = 14, ROW_SPACING = 20, PU_SPACING = 17, PROMPT_H = 10;
  const blockH = TITLE_H + 14 + 1 + 12
               + rowData.length * ROW_SPACING + 10
               + 8 + puData.length * PU_SPACING
               + 12 + 1 + 12 + PROMPT_H;
  let y = Math.round((H - blockH) / 2);

  // Title
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffee00'; ctx.shadowColor = '#ffee00'; ctx.shadowBlur = 18;
  ctx.fillText('HOW TO PLAY', cx, y + TITLE_H / 2);
  ctx.shadowBlur = 0;
  y += TITLE_H + 14;

  // Divider
  ctx.strokeStyle = 'rgba(255,238,0,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(W - 80, y); ctx.stroke();
  y += 1 + 12;

  // Main rows
  for (const r of rowData) {
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.shadowColor = r.color; ctx.shadowBlur = 8;
    ctx.fillStyle = r.color; ctx.textAlign = 'right';
    ctx.fillText(r.label, cx - 12, y + 6);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'left';
    ctx.fillText(r.hint, cx + 12, y + 6);
    y += ROW_SPACING;
  }
  y += 10;

  // Power-ups sub-header
  ctx.font = '5px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.textAlign = 'center';
  ctx.fillText('\u2014 POWER-UPS \u2014', cx, y + 4);
  y += 8 + 8;

  // Power-up rows
  for (const p of puData) {
    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    ctx.fillRect(cx - 60, y, 4, 4);
    ctx.shadowBlur = 0;
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = p.color; ctx.textAlign = 'left';
    ctx.fillText(p.label, cx - 52, y + 4);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(p.hint, cx - 20, y + 4);
    y += PU_SPACING;
  }
  y += 12;

  // Divider
  ctx.strokeStyle = 'rgba(255,238,0,0.3)';
  ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(W - 80, y); ctx.stroke();
  y += 1 + 12;

  // Blink prompt
  const blinkOn = (performance.now() % 1100) < 660;
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ffee00'; ctx.shadowBlur = blinkOn ? 14 : 0;
  ctx.fillStyle = blinkOn ? '#ffee00' : 'rgba(255,238,0,0.15)';
  ctx.fillText(isMobile ? 'TAP TO CONTINUE' : 'PRESS SPACE TO CONTINUE', cx, y + PROMPT_H / 2);
  ctx.restore();
}
