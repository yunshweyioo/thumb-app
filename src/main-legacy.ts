import { canvas, ctx, W, H, DPR } from './canvas.ts';
import { BAR_Y, BAR_CX, BAR_HALF, BAR_H, ORB_R, TIMER_CY, TAP_STEP, DRIFT_SPD,
         ROUND_TIME, METER_SEGS, METER_H, METER_W, METER_GAP, SEG_H,
         LOBBY_BTN, HOW_BTN, HS_BTN } from './constants.ts';
import { hexAlpha, shadeHex, txt, glowTxt, fireGrad } from './renderer/CanvasUtils.ts';
import { storage } from './storage/StorageManager.ts';
import { GameState, initGameState, cloneGameState } from './state/GameState.ts';
import { SHAPES, ALIENS, getAlienColor, alienAnim, drawAlienSprite } from './sprites/AlienSprites.ts';
import { burst, tickParticles, drawParticles, resetParticles } from './vfx/Particles.ts';
import { shakeAmt, flashAlpha, flashCol, orbBounce, orbVelX, coinAngle, orbitAngle, orbTrail,
         addShake, tickShake, getShakeOffset, addFlash, tickFlash,
         triggerOrbBounce, tickOrb, setOrbVelX, pushTrail, tickTrail,
         resetScreenEffects } from './vfx/ScreenEffects.ts';
import { addComboText, tickComboTexts, drawComboTexts,
         addPuText, tickPuTexts, drawPuTexts, resetFloatTexts } from './vfx/FloatTexts.ts';
import { scoreScale, triggerScorePop, tickScorePop, resetScorePop } from './vfx/ScorePop.ts';
import { rhythmTracker } from './rhythm/RhythmTracker.ts';
import { sfxTap, sfxWin, startPinTone, updatePinTone, stopPinTone } from './audio/ChiptuneAudio.ts';
import { phaseController } from './state/PhaseController.ts';
import { spIdx } from './audio/AudioEngine.ts';
import { PU_TYPES, puEffects, getPuEffects, getActivePU, resetPowerUps,
         spawnPowerUp, collectPowerUp, tickPowerUp,
         drawPowerUp, drawEffectHud } from './powerups/PowerUpSystem.ts';
import { getCanvasScale, clientToCanvas } from './mobile/MobileScale.ts';
import { TugOfWarMode } from './modes/TugOfWarMode.ts';
import { modeRegistry } from './modes/ModeRegistry.ts';
import { inputBus, GameAction } from './input/InputBus.ts';
import './input/KeyboardInput.ts';
import './input/MouseInput.ts';
import './input/TouchInput.ts';
import { tickBoot } from './renderer/DrawBoot.ts';
import { draw as rendererDraw } from './renderer/Renderer.ts';
import { CHANGE_BTN, ESC_BTN } from './input/MouseInput.ts';

let howToPlayFrom  = 'charSelect'; // where to return after dismissing howToPlay
const ALPHA        = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let nameEntryState = { letters: ['A','A','A'], cursor: 0, winner: 1 };
let lbNewName      = null; // name to highlight after entry

let lobbyHover  = false;
let changeHover = false;

// ── Lobby idle tracking ────────────────────────────────────────────────────────
let lobbyEnteredTime = 0;
let prevPhase = null;

// ── Active game mode ──────────────────────────────────────────────────────────
let activeMode: TugOfWarMode;

// ── State ─────────────────────────────────────────────────────────────────────
let state: GameState = initGameState();
function initState() {
  state = initGameState();
  resetParticles();
  resetScreenEffects();
  resetScorePop();
  rhythmTracker.reset();
  spIdx[0] = spIdx[1] = 0;
  resetFloatTexts();
  resetPowerUps();
  if (activeMode) activeMode.init(state, activeMode.defaultConfig);
}
modeRegistry.register(TugOfWarMode);
activeMode = new TugOfWarMode();
initState();


// ── Input ─────────────────────────────────────────────────────────────────────

// Keyboard/mouse/touch events are now dispatched via inputBus (see src/input/)

const _canvas = document.getElementById('c');

function inRect(mx, my, rect) {
  return mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h;
}
function submitNameEntry() {
  const ne = nameEntryState;
  const name = ne.letters.filter(l => l !== '_').join('') || 'ANON';
  storage.addLBEntry(name, ne.winner === 1 ? state.p1Icon : state.p2Icon, ne.spamCount, ne.spamRate);
  lbNewName = name;
  state.phase = 'leaderboard';
}

// ── InputBus subscriber ───────────────────────────────────────────────────────
inputBus.subscribe((action: GameAction) => {
  switch (action.type) {
    case 'escape': {
      if (state.phase === 'charSelect') return;
      if (state.phase === 'nameEntry') { state.phase = 'leaderboard'; return; }
      if (state.phase === 'leaderboard') { state.phase = 'lobby'; lbNewName = null; return; }
      const i1 = state.p1Icon, i2 = state.p2Icon;
      initState();
      state.p1Icon = i1; state.p2Icon = i2;
      state.p1Cursor = i1; state.p2Cursor = i2;
      state.phase = 'lobby';
      return;
    }
    case 'restart': {
      if (state.phase !== 'gameOver') return;
      const i1 = state.p1Icon, i2 = state.p2Icon;
      initState();
      state.p1Icon = i1; state.p2Icon = i2;
      state.p1Cursor = i1; state.p2Cursor = i2;
      state.phase = 'lobby';
      return;
    }
    case 'confirm': {
      if (state.phase === 'charSelect') {
        state.p1Icon = state.p1Cursor; state.p2Icon = state.p2Cursor; state.phase = 'lobby'; return;
      }
      if (state.phase === 'howToPlay') { storage.setSeenHowTo(); state.phase = howToPlayFrom; return; }
      if (state.phase === 'nameEntry') { submitNameEntry(); return; }
      if (state.phase === 'leaderboard') { state.phase = 'lobby'; lbNewName = null; return; }
      if (state.phase === 'lobby') { phaseController.startCountdown(state); return; }
      return;
    }
    case 'tap': {
      if (state.phase === 'playing') activeMode.onInput(state, action.player, 'tap');
      return;
    }
    case 'navigate': {
      if (state.phase !== 'charSelect') return;
      if (action.player === 1) {
        if (action.direction === 'next') state.p1Cursor = (state.p1Cursor + 1) % 16;
        else                             state.p1Cursor = (state.p1Cursor + 15) % 16;
      } else {
        if (action.direction === 'next') state.p2Cursor = (state.p2Cursor + 1) % 16;
        else                             state.p2Cursor = (state.p2Cursor + 15) % 16;
      }
      return;
    }
    case 'nameChar': {
      if (state.phase !== 'nameEntry') return;
      const ch = /^[A-Z0-9]$/.test(action.char) ? action.char : null;
      if (!ch) return;
      const ne = nameEntryState;
      ne.letters[ne.cursor] = ch;
      if (ne.cursor < 9) { ne.cursor++; } else { submitNameEntry(); }
      return;
    }
    case 'nameBackspace': {
      if (state.phase !== 'nameEntry') return;
      const ne = nameEntryState;
      if (ne.cursor > 0) { ne.cursor--; ne.letters[ne.cursor] = '_'; }
      return;
    }
    case 'nameSubmit': {
      if (state.phase === 'nameEntry') submitNameEntry();
      return;
    }
    case 'click': {
      const { x: mx, y: my } = action;
      if (state.phase !== 'charSelect' && state.phase !== 'nameEntry' && state.phase !== 'leaderboard' && inRect(mx, my, CHANGE_BTN)) { phaseController.goToCharSelect(state); return; }
      if (state.phase !== 'charSelect' && state.phase !== 'nameEntry' && inRect(mx, my, ESC_BTN)) {
        const i1 = state.p1Icon, i2 = state.p2Icon;
        if (state.phase === 'leaderboard') { state.phase = 'lobby'; lbNewName = null; return; }
        initState(); state.p1Icon = i1; state.p2Icon = i2;
        state.p1Cursor = i1; state.p2Cursor = i2; state.phase = 'lobby'; return;
      }
      if (state.phase === 'lobby' && inRect(mx, my, HOW_BTN)) { howToPlayFrom = 'lobby'; state.phase = 'howToPlay'; return; }
      if (state.phase === 'lobby' && inRect(mx, my, HS_BTN)) { lbNewName = null; state.phase = 'leaderboard'; return; }
      if (state.phase === 'leaderboard') { state.phase = 'lobby'; lbNewName = null; return; }
      if (state.phase === 'howToPlay') { storage.setSeenHowTo(); state.phase = howToPlayFrom; return; }
      if (state.phase === 'nameEntry') {
        const ne = nameEntryState;
        const ALPHA_FULL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        if (my > H - 60) {
          submitNameEntry();
        } else if (mx < W / 2) {
          if (ne.cursor > 0) { ne.cursor--; }
        } else {
          const cur = ne.letters[ne.cursor] === '_' ? -1 : ALPHA_FULL.indexOf(ne.letters[ne.cursor]);
          ne.letters[ne.cursor] = ALPHA_FULL[(cur + 1) % ALPHA_FULL.length];
          if (ne.cursor < 9) ne.cursor++;
          else submitNameEntry();
        }
        return;
      }
      if (state.phase === 'charSelect') {
        const csGridY = Math.round((H - 272) / 2) + 10;
        if (my > csGridY + 272 - 10) {
          state.p1Icon = state.p1Cursor; state.p2Icon = state.p2Cursor; state.phase = 'lobby';
        } else if (mx < W / 2) {
          state.p1Cursor = (state.p1Cursor + 1) % 16;
        } else {
          state.p2Cursor = (state.p2Cursor + 1) % 16;
        }
        return;
      }
      if (state.phase === 'gameOver') {
        const i1 = state.p1Icon, i2 = state.p2Icon;
        initState();
        state.p1Icon = i1; state.p2Icon = i2;
        state.p1Cursor = i1; state.p2Cursor = i2;
        state.phase = 'lobby';
        return;
      }
      if (state.phase === 'lobby') { phaseController.startCountdown(state); }
      return;
    }
    case 'hover': {
      if (action.target === 'lobby')  lobbyHover  = action.active;
      if (action.target === 'change') changeHover = action.active;
      _canvas.style.cursor = (changeHover || lobbyHover) ? 'pointer' : 'default';
      return;
    }
  }
});

// ── Game logic — onTap, tickGame, winRound, drawRound moved to TugOfWarMode ──
function nextRound() {
  if (state.scores[0] >= 2 || state.scores[1] >= 2 || state.round >= 3) {
    const w = state.scores[0] > state.scores[1] ? 1 : state.scores[1] > state.scores[0] ? 2 : 0;
    if (w > 0) {
      const taps = state.totalTaps[w - 1];
      const rate = state.timeActive[w - 1] > 0 ? (taps / state.timeActive[w - 1]).toFixed(1) : '0.0';
      nameEntryState = { letters: ['_','_','_','_','_','_','_','_','_','_'], cursor: 0, winner: w, spamCount: taps, spamRate: rate };
      state.phase = 'nameEntry';
    } else {
      state.phase = 'gameOver';
    }
  } else {
    state.round++; state.tapCount = [0,0];
    state.phase = 'lobby';
    resetParticles(); orbTrail.length = 0;
    rhythmTracker.reset();
    activeMode.init(state, activeMode.defaultConfig);
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let lastTime = null;
function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  // Track lobby entry for INSERT COIN idle
  if (state.phase !== prevPhase) {
    if (state.phase === 'lobby') lobbyEnteredTime = ts;
    prevPhase = state.phase;
  }

  if (state.phase === 'boot') {
    if (tickBoot(dt)) {
      howToPlayFrom = 'charSelect';
      state.phase = storage.getSeenHowTo() ? 'charSelect' : 'howToPlay';
    }
  } else if (state.phase === 'lobby') {
    tickParticles(dt); tickShake(dt); tickFlash(dt);
  } else if (state.phase === 'countdown') {
    const phaseEvts = phaseController.tick(state, dt);
    for (const ev of phaseEvts) {
      if (ev.type === 'round_start') { state.tapCount = [0, 0]; }
    }
    tickParticles(dt); tickShake(dt); tickFlash(dt); tickScorePop(dt); rhythmTracker.tickMeters(dt);
  } else if (state.phase === 'playing') {
    const result = activeMode.tick(state, dt);
    if (result.won !== null) {
      if (result.won === 0) {
        // draw
        state.phase = 'roundEnd'; state.roundWinner = 0; state.reTimer = 2.8;
        addShake(0.5); addFlash('#888', 0.25);
      } else {
        // player won
        const w = result.won;
        state.scores[w - 1]++;
        state.phase = 'roundEnd'; state.roundWinner = w; state.reTimer = 3.2;
        const orbX = BAR_CX + activeMode.balance * BAR_HALF;
        const winColor = w === 1 ? getAlienColor(state.p1Icon) : getAlienColor(state.p2Icon);
        burst(winColor, orbX, true); burst(winColor, orbX, true);
        addShake(1.2); addFlash(winColor, 0.6);
        sfxWin(w); triggerScorePop(w);
        if (state.scores[w - 1] >= 2) storage.addWin(w);
      }
    }
  } else if (state.phase === 'roundEnd') {
    tickParticles(dt); tickShake(dt); tickFlash(dt); tickScorePop(dt);
    const phaseEvts = phaseController.tick(state, dt);
    for (const ev of phaseEvts) {
      if (ev.type === 'round_end_expired') { nextRound(); }
    }
  } else if (state.phase === 'gameOver' || state.phase === 'nameEntry' || state.phase === 'leaderboard') {
    tickParticles(dt); tickFlash(dt);
  }
  rendererDraw({
    state,
    storage,
    p1Color: getAlienColor(state.p1Icon),
    p2Color: getAlienColor(state.p2Icon),
    lobbyHover,
    changeHover,
    lbNewName,
    nameEntryState,
    hudData: activeMode.getHudData(state),
  });
  requestAnimationFrame(loop);
}

// ── Full-page synthwave background canvas ─────────────────────────────────────
(function() {
  const bgc = document.getElementById('bg-canvas');
  const bx  = bgc.getContext('2d');
  function paintBg() {
    const bw = window.innerWidth, bh = window.innerHeight;
    bgc.width  = bw;
    bgc.height = bh;

    const g = bx.createLinearGradient(0, 0, 0, bh);
    g.addColorStop(0,    '#1e1068');
    g.addColorStop(0.44, '#100840');
    g.addColorStop(0.5,  '#04011a');
    g.addColorStop(0.56, '#100840');
    g.addColorStop(1,    '#1e1068');
    bx.fillStyle = g;
    bx.fillRect(0, 0, bw, bh);

    const vx = bw / 2, vy = bh / 2;
    bx.strokeStyle = '#3399cc';
    bx.lineWidth = 1;
    bx.globalAlpha = 0.45;
    function grid(toY) {
      const sign = toY > vy ? 1 : -1, span = Math.abs(toY - vy);
      for (let i = 0; i <= 14; i++) {
        bx.beginPath(); bx.moveTo(vx, vy); bx.lineTo((i/14)*bw, toY); bx.stroke();
      }
      for (let j = 1; j <= 9; j++) {
        const t = Math.pow(j/9, 0.55), y = vy + sign*span*t, fr = Math.abs(y-vy)/span;
        bx.beginPath(); bx.moveTo(vx - vx*fr, y); bx.lineTo(vx + (bw-vx)*fr, y); bx.stroke();
      }
    }
    grid(bh); grid(0);
    bx.globalAlpha = 1;

    bx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      const rx = Math.sin(i*127.1+311.7)*43758.5453, sx = (rx-Math.floor(rx))*bw;
      const ry = Math.sin(i*269.5+183.3)*43758.5453, sy = (ry-Math.floor(ry))*bh;
      const rs = Math.sin(i*419.2+77.1) *43758.5453, ss = (rs-Math.floor(rs))<0.3?2:1;
      bx.fillRect(Math.round(sx), Math.round(sy), ss, ss);
    }

    const vg = bx.createRadialGradient(bw/2,bh/2,bh*0.2, bw/2,bh/2,bh*0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    bx.fillStyle = vg; bx.fillRect(0, 0, bw, bh);
  }
  paintBg();
  window.addEventListener('resize', paintBg);
})();

// ── Mobile scaling ────────────────────────────────────────────────────────────
// Directly set CSS properties on each element so canvas scales correctly in Safari iOS
function applyMobileScale() {
  // Cap scale by both width (892px design) and height (~590px total content height)
  // Use visualViewport.height for accurate height on iOS (excludes browser chrome)
  const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
  const sW = (window.innerWidth - 8) / 892;
  const sH = (vh - 8) / 590;
  const s  = Math.min(1, sW, sH);
  if (s >= 1) return;
  // Scale canvas display size (internal resolution/drawing coords unchanged)
  canvas.style.width  = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
  // Scale bezel padding and border-radius
  const bezel = document.getElementById('crt-bezel');
  bezel.style.padding      = `${Math.round(30*s)}px ${Math.round(36*s)}px ${Math.round(40*s)}px ${Math.round(36*s)}px`;
  bezel.style.borderRadius = `${Math.round(60*s)}px`;
  // Scale title, tagline, and content gap
  document.getElementById('title').style.fontSize   = (3    * s) + 'rem';
  document.getElementById('tagline').style.fontSize = (0.45 * s) + 'rem';
  document.getElementById('content').style.gap      = Math.round(10 * s) + 'px';
  // Scale ticker width and font size
  document.getElementById('ticker').style.width    = Math.floor(892 * s) + 'px';
  document.getElementById('ticker').style.fontSize = (0.42 * s) + 'rem';
  // Scale .crt-screw divs (top-right and bottom-left)
  const sz = Math.round(14 * s);
  const screws = document.querySelectorAll('.crt-screw');
  if (screws[0]) {
    screws[0].style.width  = sz + 'px'; screws[0].style.height = sz + 'px';
    screws[0].style.top    = Math.round(18 * s) + 'px';
    screws[0].style.right  = Math.round(26 * s) + 'px';
  }
  if (screws[1]) {
    screws[1].style.width  = sz + 'px'; screws[1].style.height = sz + 'px';
    screws[1].style.bottom = Math.round(22 * s) + 'px';
    screws[1].style.left   = Math.round(22 * s) + 'px';
  }
  // Scale ::before / ::after pseudo-element screws (top-left and bottom-right)
  let st = document.getElementById('screw-scale-style');
  if (!st) { st = document.createElement('style'); st.id = 'screw-scale-style'; document.head.appendChild(st); }
  st.textContent = `
    #crt-bezel::before, #crt-bezel::after { width:${sz}px; height:${sz}px; }
    #crt-bezel::before { top:${Math.round(18*s)}px; left:${Math.round(22*s)}px; }
    #crt-bezel::after  { bottom:${Math.round(22*s)}px; right:${Math.round(26*s)}px; }
  `;
}
applyMobileScale();
window.addEventListener('resize', applyMobileScale);
if (window.visualViewport) window.visualViewport.addEventListener('resize', applyMobileScale);

// Fullscreen on landscape rotation (mobile)
function tryFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req) req.call(el).catch(() => {});
}
function tryExitFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (exit && (document.fullscreenElement || document.webkitFullscreenElement)) exit.call(document).catch(() => {});
}
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    if (Math.abs(window.orientation ?? 0) === 90) tryFullscreen();
    else tryExitFullscreen();
    applyMobileScale();
  }, 350);
});

// ── Touch input (mobile) ──────────────────────────────────────────────────────
const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

requestAnimationFrame(loop);
