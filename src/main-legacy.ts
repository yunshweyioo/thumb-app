import { canvas, ctx, W, H, DPR } from './canvas.ts';
import { BAR_Y, BAR_CX, BAR_HALF, BAR_H, ORB_R, TIMER_CY, TAP_STEP, DRIFT_SPD,
         ROUND_TIME, METER_SEGS, METER_H, METER_W, METER_GAP, SEG_H,
         LOBBY_BTN, HOW_BTN, HS_BTN } from './constants.ts';
import { hexAlpha, shadeHex, txt, glowTxt, fireGrad } from './renderer/CanvasUtils.ts';

// ── Colors ────────────────────────────────────────────────────────────────────
function P1C() { return ALIENS[state ? state.p1Icon : 0].c; }
function P2C() { return ALIENS[state ? state.p2Icon : 8].c; }

let howToPlayFrom  = 'charSelect'; // where to return after dismissing howToPlay
const ALPHA        = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let nameEntryState = { letters: ['A','A','A'], cursor: 0, winner: 1 };
let lbNewName      = null; // name to highlight after entry

// Pre-generated star positions for background
const BG_STARS = Array.from({length: 90}, (_, i) => {
  const rng = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  const x   = (rng - Math.floor(rng)) * W;
  const rng2 = Math.sin(i * 269.5 + 183.3) * 43758.5453;
  const y   = (rng2 - Math.floor(rng2)) * H;
  const rng3 = Math.sin(i * 419.2 + 77.1) * 43758.5453;
  const f   = rng3 - Math.floor(rng3);
  const s   = f < 0.15 ? 3 : f < 0.45 ? 2 : 1;
  return [Math.round(x), Math.round(y), s];
});
let lobbyHover  = false;

// ── Audio ─────────────────────────────────────────────────────────────────────
let ac = null;
function getAC() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
// Scott Pilgrim style — cycling chiptune hit sounds, pitch scales with tap speed
const SP_SCALES = [
  [1, 1.5], [1.25, 1.78], [1.5, 2], [1.12, 1.68], [0.89, 1.33], [1.33, 1.78],
];
const spIdx = [0, 0];
function sfxTap(player) {
  try {
    const a   = getAC();
    const t   = a.currentTime;
    const tps = getTPS(player);
    // Base pitch: P1 higher/brighter, P2 lower/punchier
    const root  = player === 1 ? 587 : 440;  // D5 vs A4
    const boost = 1 + Math.min(tps / 20, 0.3);  // pitch creeps up when spamming fast
    const [r1, r2] = SP_SCALES[spIdx[player-1] % SP_SCALES.length];
    spIdx[player-1]++;

    // ── Layer 1: punchy square-wave sweep ──
    const o1 = a.createOscillator(), g1 = a.createGain();
    o1.connect(g1); g1.connect(a.destination);
    o1.type = 'square';
    o1.frequency.setValueAtTime(root * r2 * boost, t);
    o1.frequency.exponentialRampToValueAtTime(root * r1 * boost * 0.55, t + 0.06);
    g1.gain.setValueAtTime(0.13, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o1.start(t); o1.stop(t + 0.09);

    // ── Layer 2: sub-octave thud ──
    const o2 = a.createOscillator(), g2 = a.createGain();
    o2.connect(g2); g2.connect(a.destination);
    o2.type = 'square';
    o2.frequency.setValueAtTime(root * r1 * boost * 0.5, t);
    o2.frequency.exponentialRampToValueAtTime(root * boost * 0.25, t + 0.05);
    g2.gain.setValueAtTime(0.07, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o2.start(t); o2.stop(t + 0.06);

    // ── Layer 3: noise burst (percussive crunch) ──
    const bufLen = Math.floor(a.sampleRate * 0.04);
    const buf    = a.createBuffer(1, bufLen, a.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
    const noise  = a.createBufferSource();
    noise.buffer = buf;
    const gn     = a.createGain();
    noise.connect(gn); gn.connect(a.destination);
    gn.gain.setValueAtTime(0.055, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.start(t); noise.stop(t + 0.04);
  } catch (_) {}
}
function sfxCountdown(isGo) {
  try {
    const a = getAC(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.frequency.value = isGo ? 880 : 440;
    o.type = 'sine';
    g.gain.setValueAtTime(0.18, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + (isGo ? 0.25 : 0.1));
    o.start(); o.stop(a.currentTime + (isGo ? 0.25 : 0.1));
  } catch (_) {}
}
function sfxWin(player) {
  try {
    const a = getAC();
    const freqs = player === 1 ? [523,659,784,1047] : [392,494,587,784];
    freqs.forEach((f, i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination);
      const t = a.currentTime + i * 0.11;
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.start(t); o.stop(t + 0.35);
    });
  } catch (_) {}
}
let pinTone = null;
function startPinTone() {
  if (pinTone) return;
  try {
    const a = getAC(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = 'sawtooth'; o.frequency.value = 80;
    g.gain.setValueAtTime(0, a.currentTime);
    g.gain.linearRampToValueAtTime(0.04, a.currentTime + 0.3);
    o.start();
    pinTone = { o, g };
  } catch (_) {}
}
function updatePinTone(prog) {
  if (!pinTone) return;
  try {
    const a = getAC();
    pinTone.o.frequency.setTargetAtTime(80 + prog * 280, a.currentTime, 0.05);
    pinTone.g.gain.setTargetAtTime(0.025 + prog * 0.05, a.currentTime, 0.05);
  } catch (_) {}
}
function stopPinTone() {
  if (!pinTone) return;
  try {
    const a = getAC();
    pinTone.g.gain.linearRampToValueAtTime(0, a.currentTime + 0.12);
    pinTone.o.stop(a.currentTime + 0.12);
  } catch (_) {}
  pinTone = null;
}

// ── Particles ─────────────────────────────────────────────────────────────────
const particles = [];
function burst(player, orbX, big) {
  const color = player === 1 ? P1C() : P2C();
  const count = big ? 32 : 12;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.7;
    const spd   = big ? (90 + Math.random() * 240) : (55 + Math.random() * 140);
    particles.push({
      x: orbX, y: BAR_Y,
      vx: Math.cos(angle) * spd * (player === 1 ? 0.7 : -0.7) + (Math.random()-0.5)*90,
      vy: Math.sin(angle) * spd,
      r: big ? (5 + Math.random() * 8) : (3 + Math.random() * 5),
      life: 1.0, decay: big ? 1.5 : 2.2, color,
    });
  }
}
function tickParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 200 * dt; p.vx *= (1 - 1.5 * dt);
    p.life -= p.decay * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function drawParticles() {
  for (const p of particles) {
    const sz = Math.ceil(p.r * Math.max(0.1, p.life));
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life) * 0.9;
    ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x - sz/2), Math.round(p.y - sz/2), sz, sz);
    ctx.restore();
  }
}

// ── Screen shake ──────────────────────────────────────────────────────────────
let shakeAmt = 0;
function addShake(v) { shakeAmt = Math.max(shakeAmt, v); }
function tickShake(dt) { shakeAmt = Math.max(0, shakeAmt - dt * 18); }
function getShakeOffset() {
  return shakeAmt > 0.2
    ? { x: (Math.random()-0.5)*shakeAmt*14, y: (Math.random()-0.5)*shakeAmt*14 }
    : { x: 0, y: 0 };
}

// ── Screen flash ──────────────────────────────────────────────────────────────
let flashAlpha = 0, flashCol = '#fff';
function addFlash(col, a = 1) { flashAlpha = a; flashCol = col; }
function tickFlash(dt) { flashAlpha = Math.max(0, flashAlpha - dt * 4); }

// ── Orb bounce ────────────────────────────────────────────────────────────────
let orbBounce = 0;
let orbVelX   = 0;   // -1..1, direction+magnitude of recent tap
let coinAngle  = 0;
let orbitAngle = 0;   // for orbiting dots
function triggerOrbBounce() { orbBounce = 1; }
function tickOrb(dt) {
  orbBounce  = Math.max(0, orbBounce - dt * 9);
  orbVelX   *= Math.max(0, 1 - dt * 6);
  coinAngle  += orbVelX * dt * 18;
  // Orbit dots spin at base speed + boost from current velocity
  orbitAngle += dt * (2.5 + Math.abs(orbVelX) * 8);
}

// ── Orb trail ─────────────────────────────────────────────────────────────────
const orbTrail = [];
function pushTrail(x) {
  orbTrail.push({ x, age: 0 });
  if (orbTrail.length > 28) orbTrail.shift();
}
function tickTrail(dt) { orbTrail.forEach(t => t.age += dt); }

// ── Tap history (TPS) ─────────────────────────────────────────────────────────
const tapHistory  = [[], []];
const lastTapTime = [0, 0];     // ms timestamp of previous tap
const lastTapGap  = [0, 0];     // interval of previous tap pair
const rhythmBonus = [0, 0];     // 0..1 — how consistent the rhythm is

function recordTap(player) {
  const now = performance.now();
  const idx = player - 1;
  const gap = now - lastTapTime[idx];
  if (lastTapTime[idx] > 0 && gap < 600) {
    // How similar is this gap to the last gap? (1 = identical, 0 = very different)
    const consistency = lastTapGap[idx] > 0
      ? Math.max(0, 1 - Math.abs(gap - lastTapGap[idx]) / lastTapGap[idx])
      : 0;
    rhythmBonus[idx] = Math.min(1, rhythmBonus[idx] * 0.6 + consistency * 0.5);
  } else {
    rhythmBonus[idx] *= 0.4; // gap too long, decay bonus
  }
  lastTapGap[idx]  = gap;
  lastTapTime[idx] = now;
  tapHistory[idx].push(now);
}

function getTPS(player) {
  const now = performance.now();
  tapHistory[player-1] = tapHistory[player-1].filter(t => now - t < 1000);
  return tapHistory[player-1].length;
}

// ── Vertical energy meters ────────────────────────────────────────────────────
const meterLevel = [0, 0];   // smooth 0-1
const meterPeak  = [0, 0];   // held peak indicator 0-1
const meterPeakT = [0, 0];   // timer before peak falls

function spikeMe(player) {
  const p = player - 1;
  meterLevel[p] = Math.min(1, meterLevel[p] + 0.18);
  if (meterLevel[p] >= meterPeak[p]) { meterPeak[p] = meterLevel[p]; meterPeakT[p] = 0.55; }
}
function tickMeters(dt) {
  for (let p = 0; p < 2; p++) {
    const target = Math.min(getTPS(p + 1) / 10, 1);
    meterLevel[p] += (target > meterLevel[p] ? 10 : 3) * dt * (target - meterLevel[p]);
    meterLevel[p] = Math.max(0, Math.min(1, meterLevel[p]));
    meterPeakT[p] -= dt;
    if (meterPeakT[p] < 0) meterPeak[p] = Math.max(meterLevel[p], meterPeak[p] - dt * 1.5);
  }
}


function drawMeter(player) {
  const isP1 = player === 1;
  const mx   = isP1 ? 26 : W - 26;
  const col  = isP1 ? P1C() : P2C();
  const lv   = meterLevel[player - 1];
  const topY = BAR_Y - METER_H / 2;
  const PAD  = 4; // casing padding

  // Segment colour ramp: green → yellow-green → yellow → orange → red
  function segColor(frac) {
    if (frac <= 0.20) return '#22dd22';
    if (frac <= 0.40) return '#88dd00';
    if (frac <= 0.58) return '#ddcc00';
    if (frac <= 0.75) return '#ffaa00';
    if (frac <= 0.88) return '#ff5500';
    return '#ff1100';
  }

  // Outer casing
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mx - METER_W/2 - PAD, topY - PAD, METER_W + PAD*2, METER_H + PAD*2, 4);
  ctx.fillStyle = '#0d0d18';
  ctx.fill();
  ctx.strokeStyle = '#555566';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Segments
  for (let i = 0; i < METER_SEGS; i++) {
    const frac = (i + 1) / METER_SEGS;
    const sy   = topY + METER_H - (i + 1) * SEG_H - i * METER_GAP;
    const on   = frac <= lv;
    const sc   = segColor(frac);

    ctx.save();
    if (on) { ctx.shadowColor = sc; ctx.shadowBlur = 8; }
    ctx.beginPath(); ctx.rect(mx - METER_W/2, sy, METER_W, SEG_H);
    ctx.fillStyle = on ? sc : hexAlpha(sc, 0.1);
    ctx.fill();
    if (!on) { ctx.strokeStyle = hexAlpha(sc, 0.2); ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
  }

  // Label
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save();
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.shadowColor = col; ctx.shadowBlur = 8;
  ctx.fillStyle = col;
  glowTxt('PWR', mx, topY - 10);
  ctx.restore();
}

// ── Pixel-art alien sprites ────────────────────────────────────────────────
// 0=empty  1=body  2=eye accent
const SHAPES = [
  // 0: Classic wide crab (11×8)
  [[0,0,1,0,0,0,0,0,1,0,0],
   [0,0,0,1,0,0,0,1,0,0,0],
   [0,0,1,1,1,1,1,1,1,0,0],
   [0,1,1,2,1,1,1,2,1,1,0],
   [1,1,1,1,1,1,1,1,1,1,1],
   [1,0,1,1,1,1,1,1,1,0,1],
   [1,0,1,0,0,0,0,0,1,0,1],
   [0,0,0,1,1,0,1,1,0,0,0]],
  // 1: Tall insect (9×8)
  [[0,0,0,1,0,1,0,0,0],
   [0,0,1,1,1,1,1,0,0],
   [0,1,1,1,1,1,1,1,0],
   [1,1,2,1,1,1,2,1,1],
   [1,1,1,1,1,1,1,1,1],
   [0,0,1,1,1,1,1,0,0],
   [0,0,1,0,0,0,1,0,0],
   [0,1,0,0,0,0,0,1,0]],
  // 2: Round blob/ghost (9×8)
  [[0,0,0,1,1,1,0,0,0],
   [0,0,1,1,1,1,1,0,0],
   [0,1,2,1,1,1,2,1,0],
   [1,1,1,1,1,1,1,1,1],
   [1,1,1,1,1,1,1,1,1],
   [0,1,1,1,1,1,1,1,0],
   [0,0,1,0,0,0,1,0,0],
   [0,1,0,0,0,0,0,1,0]],
  // 3: Spider with legs (9×8)
  [[1,0,0,0,1,0,0,0,1],
   [0,1,0,1,1,1,0,1,0],
   [0,0,1,2,1,2,1,0,0],
   [0,1,1,1,1,1,1,1,0],
   [1,1,1,1,1,1,1,1,1],
   [0,1,1,0,1,0,1,1,0],
   [0,0,0,1,0,1,0,0,0],
   [0,0,1,0,0,0,1,0,0]],
];

const ALIENS = [
  {s:0,c:'#8833cc',e:'#ff5555'}, // 0  purple crab
  {s:1,c:'#aacc33',e:'#ffee00'}, // 1  yellow-green insect
  {s:2,c:'#ff44aa',e:'#ffff44'}, // 2  pink blob
  {s:3,c:'#ffaa00',e:'#8833cc'}, // 3  orange spider
  {s:0,c:'#33ccbb',e:'#8833cc'}, // 4  teal crab
  {s:1,c:'#cc33cc',e:'#ffee00'}, // 5  magenta insect
  {s:2,c:'#ffee00',e:'#aa33cc'}, // 6  yellow blob
  {s:3,c:'#ff5500',e:'#ffff44'}, // 7  orange-red spider
  {s:0,c:'#ff2266',e:'#ffff44'}, // 8  hot-pink crab
  {s:1,c:'#66cc22',e:'#cc44cc'}, // 9  green insect
  {s:2,c:'#4466ee',e:'#ffaa00'}, // 10 blue blob
  {s:3,c:'#44cccc',e:'#884499'}, // 11 teal spider
  {s:0,c:'#6644bb',e:'#ff4444'}, // 12 blue-purple crab
  {s:1,c:'#ee4411',e:'#ffee00'}, // 13 orange-red insect
  {s:2,c:'#ccee22',e:'#884499'}, // 14 yellow-green blob
  {s:3,c:'#44aa44',e:'#ffee00'}, // 15 green spider
];

// ── Per-alien select animation ─────────────────────────────────────────────────
// Returns {dx, dy, sx, sy, rot} canvas transforms for the selected sprite
function alienAnim(i, t) {
  const s = Math.sin, c = Math.cos, abs = Math.abs;
  switch (i) {
    case  0: return { dx: s(t*4)*6,            dy: 0,                   sx: 1,                    sy: 1,           rot: 0             }; // crab: scuttle L/R
    case  1: return { dx: 0,                   dy: -abs(s(t*5))*9,      sx: 1,                    sy: 1,           rot: 0             }; // insect: hop
    case  2: { const p=0.82+0.18*s(t*3);       return {dx:0,dy:0,       sx:p,                     sy:p,            rot:0             }; } // blob: pulse
    case  3: return { dx: 0,                   dy: 0,                   sx: 1,                    sy: 1,           rot: t * 2.0       }; // spider: spin
    case  4: return { dx: s(t*6)*5,            dy: s(t*12)*2,           sx: 1,                    sy: 1,           rot: s(t*6)*0.12   }; // crab: scuttle+tilt
    case  5: return { dx: s(t*9)*3,            dy: -abs(s(t*9))*7,      sx: 1,                    sy: 1,           rot: 0             }; // insect: flutter
    case  6: { const q=1+0.22*s(t*4);          return {dx:0,dy:5*(q-1), sx:q,                     sy:2-q,          rot:0             }; } // blob: squash & stretch
    case  7: return { dx: s(t*22)*3,           dy: c(t*19)*3,           sx: 1,                    sy: 1,           rot: 0             }; // spider: vibrate
    case  8: return { dx: s(t*3)*7,            dy: 0,                   sx: 1,                    sy: 1,           rot: s(t*3)*0.18   }; // crab: wave
    case  9: { const j=(t*3.5)%(Math.PI*2);    return {dx:0,           dy:-abs(s(j))*11,          sx:1,            sy:1,            rot:0}; } // insect: jump
    case 10: { const p=0.88+0.12*s(t*2.5);     return {dx:0,dy:s(t*2.5)*4, sx:p,                 sy:p,            rot:0             }; } // blob: float+breathe
    case 11: return { dx: 0,                   dy: 0,                   sx: 1,                    sy: 1,           rot: s(t*1.4)*0.45 }; // spider: sway
    case 12: return { dx: s(t*11)*8,           dy: 0,                   sx: 1,                    sy: 1,           rot: 0             }; // crab: dash
    case 13: { const z=1+0.2*s(t*3.5);         return {dx:0,dy:0,       sx:z,                     sy:z,            rot:0             }; } // insect: zoom
    case 14: return { dx: s(t*5)*5,            dy: c(t*5)*4,            sx: 1,                    sy: 1,           rot: s(t*5)*0.22   }; // blob: orbit wiggle
    case 15: return { dx: 0,                   dy: s(t*2)*6,            sx: 1,                    sy: 1,           rot: 0             }; // spider: float
    default: return { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 };
  }
}

function drawAlienSprite(idx, cx, cy, ps) {
  const a = ALIENS[idx];
  const grid = SHAPES[a.s];
  const cols = grid[0].length, rows = grid.length;
  const ox = cx - (cols * ps) / 2;
  const oy = cy - (rows * ps) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (!v) continue;
      ctx.fillStyle = v === 2 ? a.e : a.c;
      ctx.fillRect(Math.round(ox + c * ps), Math.round(oy + r * ps), ps, ps);
    }
  }
}

// ── Score pop ─────────────────────────────────────────────────────────────────
let scoreScale = [1, 1];
function triggerScorePop(p) { scoreScale[p-1] = 1.7; }
function tickScorePop(dt) {
  scoreScale[0] = Math.max(1, scoreScale[0] - dt * 5);
  scoreScale[1] = Math.max(1, scoreScale[1] - dt * 5);
}

// ── Boot sequence ─────────────────────────────────────────────────────────────
const BOOT_LINES = [
  'SPAMCO SYSTEMS v1.0',
  '',
  '> MEMORY CHECK..... OK',
  '> AUDIO............ OK',
  '> VIDEO............ OK',
  '',
  '> LOADING SPAM WARS...',
  '',
];
let bootLineShown = 0, bootLineTimer = 0, bootDoneTimer = 0;
const BOOT_LINE_DELAY = 0.18;

// ── Combo floating texts ───────────────────────────────────────────────────────
const comboTexts = [];
const lastComboShow = [0, 0];
function addComboText(text, x, y, col) {
  comboTexts.push({ text, x, y, vy: -55, alpha: 1.0, col });
}
function tickComboTexts(dt) {
  for (let i = comboTexts.length - 1; i >= 0; i--) {
    const c = comboTexts[i];
    c.y += c.vy * dt; c.alpha -= dt * 1.8;
    if (c.alpha <= 0) comboTexts.splice(i, 1);
  }
}
function drawComboTexts() {
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

// ── Power-up pickup texts (zoom-out + fade, different from combo float-up) ────
const puTexts = [];
function addPuText(text, x, y, col) {
  puTexts.push({ text, x, y, col, alpha: 1.0, scale: 0.4, age: 0 });
}
function tickPuTexts(dt) {
  for (let i = puTexts.length - 1; i >= 0; i--) {
    const p = puTexts[i];
    p.age   += dt;
    p.scale  = Math.min(1.4, p.scale + dt * 4.5); // zoom from small → overshoot
    p.alpha -= dt * 1.4;
    if (p.alpha <= 0) puTexts.splice(i, 1);
  }
}
function drawPuTexts() {
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

// ── Power-ups ─────────────────────────────────────────────────────────────────
const PU_TYPES = [
  { id: 'speed',  label: 'SPD', col: '#ffee00', desc: 'SPEED UP!',   dur: 4.0 },
  { id: 'reverse', label: 'REV', col: '#ff4444', desc: 'REVERSE!',   dur: 2.5 },
  { id: 'freeze', label: 'FRZ', col: '#88ffee', desc: 'FREEZE!',     dur: 2.5 },
];
let powerUp = null;   // { pos: -1..1, typeIdx, age }
let puSpawnTimer = 5;
const puEffects = [{ id: null, timer: 0 }, { id: null, timer: 0 }];

function spawnPowerUp() {
  const sign = Math.random() > 0.5 ? 1 : -1;
  const pos  = sign * (0.15 + Math.random() * 0.55);
  powerUp = { pos, typeIdx: Math.floor(Math.random() * PU_TYPES.length), age: 0 };
}
function collectPowerUp(player) {
  if (!powerUp) return;
  const pu  = PU_TYPES[powerUp.typeIdx];
  const idx = player - 1;
  puEffects[idx] = { id: pu.id, timer: pu.dur };
  const col = player === 1 ? P1C() : P2C();
  const px  = BAR_CX + powerUp.pos * BAR_HALF;
  addPuText(pu.desc, px, BAR_Y - 28, pu.col);
  addFlash(pu.col, 0.28);
  powerUp = null;
  puSpawnTimer = 4 + Math.random() * 2;
}
function tickPowerUp(dt) {
  puSpawnTimer -= dt;
  if (!powerUp && puSpawnTimer <= 0) { spawnPowerUp(); puSpawnTimer = 4 + Math.random() * 2; }
  if (powerUp) {
    powerUp.age += dt;
    if (Math.abs(state.balance - powerUp.pos) < 0.055) {
      collectPowerUp(powerUp.pos > 0 ? 1 : 2);
    }
  }
  for (const e of puEffects) { if (e.timer > 0) e.timer -= dt; }
}
function drawPowerUp() {
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

// ── High score (wins per player) ──────────────────────────────────────────────
function getWins(p) { try { return parseInt(localStorage.getItem(`spamwars_wins_p${p}`) || '0'); } catch { return 0; } }
function addWin(p)  { try { localStorage.setItem(`spamwars_wins_p${p}`, getWins(p) + 1); }          catch {} }

// ── Leaderboard storage ───────────────────────────────────────────────────────
function getLB() { try { return JSON.parse(localStorage.getItem('spamwars_lb') || '[]'); } catch { return []; } }
function saveLB(lb) { try { localStorage.setItem('spamwars_lb', JSON.stringify(lb)); } catch {} }
function addLBEntry(name, icon, spamCount, spamRate) {
  const lb = getLB();
  const ex = lb.find(e => e.name === name);
  const date = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
  if (ex) { ex.wins++; ex.icon = icon; ex.date = date; ex.spamCount = spamCount; ex.spamRate = spamRate; }
  else lb.push({ name, wins: 1, icon, date, spamCount, spamRate });
  lb.sort((a, b) => b.wins - a.wins);
  saveLB(lb.slice(0, 10));
}

// ── Lobby idle tracking ────────────────────────────────────────────────────────
let lobbyEnteredTime = 0;
let prevPhase = null;

// ── Active effect HUD helper ───────────────────────────────────────────────────
function drawEffectHud() {
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

// ── State ─────────────────────────────────────────────────────────────────────
let state;
function initState() {
  state = {
    balance: 0,
    scores: [0, 0], round: 1,
    phase: 'boot', countdown: 3, cdTimer: 1.0, cdScale: 1.6,
    reTimer: 0, roundWinner: null,
    roundTimer: ROUND_TIME,
    tapFlash: [0, 0], tapCount: [0, 0], totalTaps: [0, 0], timeActive: [0, 0],
    p1Icon: 0, p2Icon: 8,
    p1Cursor: 0, p2Cursor: 8,
  };
  particles.length = orbTrail.length = 0;
  orbBounce = orbVelX = coinAngle = orbitAngle = shakeAmt = flashAlpha = 0;
  scoreScale = [1, 1];
  meterLevel[0] = meterLevel[1] = meterPeak[0] = meterPeak[1] = 0;
  meterPeakT[0] = meterPeakT[1] = 0;
  spIdx[0] = spIdx[1] = 0;
  tapHistory[0].length = tapHistory[1].length = 0;
  lastTapTime[0] = lastTapTime[1] = lastTapGap[0] = lastTapGap[1] = rhythmBonus[0] = rhythmBonus[1] = 0;
  comboTexts.length = 0; puTexts.length = 0;
  lastComboShow[0] = lastComboShow[1] = 0;
  powerUp = null; puSpawnTimer = 5;
  puEffects[0] = { id: null, timer: 0 };
  puEffects[1] = { id: null, timer: 0 };
}
initState();


// ── Input ─────────────────────────────────────────────────────────────────────
function startCountdown() {
  state.balance = 0;
  state.phase = 'countdown';
  state.countdown = 3; state.cdTimer = 1.0; state.cdScale = 1.6;
}

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['a','s','l','k',' '].includes(k)) e.preventDefault();
  if (k === 'escape') {
    e.preventDefault();
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
  if (k === 'r' && state.phase === 'gameOver') {
    const i1 = state.p1Icon, i2 = state.p2Icon;
    initState();
    state.p1Icon = i1; state.p2Icon = i2;
    state.p1Cursor = i1; state.p2Cursor = i2;
    state.phase = 'lobby';
    return;
  }
  if (state.phase === 'charSelect') {
    if (k === 's') { state.p1Cursor = (state.p1Cursor + 1) % 16; return; }
    if (k === 'a') { state.p1Cursor = (state.p1Cursor + 15) % 16; return; }
    if (k === 'l') { state.p2Cursor = (state.p2Cursor + 1) % 16; return; }
    if (k === 'k') { state.p2Cursor = (state.p2Cursor + 15) % 16; return; }
    if (k === ' ') { state.p1Icon = state.p1Cursor; state.p2Icon = state.p2Cursor; state.phase = 'lobby'; return; }
    return;
  }
  if (k === ' ' && state.phase === 'howToPlay') { localStorage.setItem('spamwars_seen_howto','1'); state.phase = howToPlayFrom; return; }
  if (state.phase === 'nameEntry') {
    const ne = nameEntryState;
    const ch = k.length === 1 && /[a-z0-9]/i.test(k) ? k.toUpperCase() : null;
    if (ch) {
      ne.letters[ne.cursor] = ch;
      if (ne.cursor < 9) { ne.cursor++; } else { submitNameEntry(); }
      return;
    }
    if (k === 'backspace') {
      if (ne.cursor > 0) { ne.cursor--; ne.letters[ne.cursor] = '_'; } return;
    }
    if (k === ' ' || k === 'enter') { submitNameEntry(); return; }
    return;
  }
  if (state.phase === 'leaderboard') { state.phase = 'lobby'; lbNewName = null; return; }
  if ((k === ' ') && state.phase === 'lobby') { startCountdown(); return; }
  if (state.phase !== 'playing') return;
  if (k === 'a') onTap(1);
  if (k === 'l') onTap(2);
});

const _canvas = document.getElementById('c');

function canvasCoords(e) {
  const r = _canvas.getBoundingClientRect();
  return {
    mx: (e.clientX - r.left) * (W / r.width),
    my: (e.clientY - r.top)  * (H / r.height),
  };
}
function inRect(mx, my, rect) {
  return mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h;
}
function goToCharSelect() {
  state.p1Cursor = state.p1Icon;
  state.p2Cursor = state.p2Icon;
  state.phase = 'charSelect';
}
function submitNameEntry() {
  const ne = nameEntryState;
  const name = ne.letters.filter(l => l !== '_').join('') || 'ANON';
  addLBEntry(name, ne.winner === 1 ? state.p1Icon : state.p2Icon, ne.spamCount, ne.spamRate);
  lbNewName = name;
  state.phase = 'leaderboard';
}

_canvas.addEventListener('click', e => {
  const { mx, my } = canvasCoords(e);
  if (state.phase !== 'charSelect' && inRect(mx, my, CHANGE_BTN)) { goToCharSelect(); return; }
  if (state.phase === 'lobby' && inRect(mx, my, HOW_BTN)) { howToPlayFrom = 'lobby'; state.phase = 'howToPlay'; return; }
  if (state.phase === 'lobby' && inRect(mx, my, HS_BTN)) { lbNewName = null; state.phase = 'leaderboard'; return; }
  if (state.phase === 'lobby') startCountdown();
});
_canvas.addEventListener('mousemove', e => {
  const { mx, my } = canvasCoords(e);
  // Change players button (all non-charSelect phases)
  changeHover = state.phase !== 'charSelect' && inRect(mx, my, CHANGE_BTN);
  // Lobby press-start hover
  lobbyHover = state.phase === 'lobby' && inRect(mx, my, LOBBY_BTN);
  _canvas.style.cursor = (changeHover || lobbyHover) ? 'pointer' : 'default';
});
_canvas.addEventListener('mouseleave', () => {
  lobbyHover = false;
  changeHover = false;
  _canvas.style.cursor = 'default';
});
function onTap(player) {
  const idx = player - 1;
  // Freeze effect: this player's taps do nothing
  if (puEffects[idx].id === 'freeze' && puEffects[idx].timer > 0) return;

  const orbX = BAR_CX + state.balance * BAR_HALF;
  // Speed boost effect
  const speedMult = (puEffects[idx].id === 'speed' && puEffects[idx].timer > 0) ? 1.6 : 1;
  const step = TAP_STEP * (1 + rhythmBonus[idx] * 0.6) * speedMult;
  const oppIdx = 1 - idx;
  const reversed = puEffects[oppIdx].id === 'reverse' && puEffects[oppIdx].timer > 0;
  if (player === 1) state.balance = reversed ? Math.max(-1, state.balance - step) : Math.min( 1, state.balance + step);
  else              state.balance = reversed ? Math.min( 1, state.balance + step) : Math.max(-1, state.balance - step);
  state.tapFlash[player-1] = 0.18;
  state.tapCount[player-1]++;
  state.totalTaps[player-1]++;
  recordTap(player);
  // Combo floating text
  const now = performance.now();
  if (rhythmBonus[idx] > 0.65 && now - lastComboShow[idx] > 700) {
    const words = rhythmBonus[idx] > 0.9 ? 'PERFECT!' : rhythmBonus[idx] > 0.78 ? 'COMBO!' : 'NICE!';
    const col   = player === 1 ? P1C() : P2C();
    addComboText(words, orbX + (player === 1 ? 44 : -44), BAR_Y - 32, col);
    lastComboShow[idx] = now;
  }
  triggerOrbBounce();
  orbVelX = Math.max(-1, Math.min(1, orbVelX + (player === 1 ? 0.7 : -0.7)));
  spikeMe(player);
  burst(player, orbX, false);
  sfxTap(player);
  // Instant win if orb reaches the opponent's end
  if (state.balance >= 1.0) { winRound(1); return; }
  if (state.balance <= -1.0) { winRound(2); return; }
}

// ── Game logic ────────────────────────────────────────────────────────────────
function tickGame(dt) {
  // Accumulate each player's personal active time (excludes freeze)
  for (let idx = 0; idx < 2; idx++) {
    if (!(puEffects[idx].id === 'freeze' && puEffects[idx].timer > 0))
      state.timeActive[idx] += dt;
  }
  // Option E: tug zones — drift gets stronger past the 50% mark (comeback mechanic)
  const absBal   = Math.abs(state.balance);
  const tugBoost = absBal > 0.5 ? 1 + (absBal - 0.5) * 3.5 : 1;

  // Idle boost — if both players have stopped tapping, ball snaps back faster
  const now         = performance.now();
  const sinceAnyTap = now - Math.max(lastTapTime[0], lastTapTime[1]);
  const idleBoost   = sinceAnyTap > 250 ? 1 + Math.min(4, (sinceAnyTap - 250) / 200) : 1;

  const drift = DRIFT_SPD * tugBoost * idleBoost * dt;
  if      (state.balance > 0) state.balance = Math.max(0, state.balance - drift);
  else if (state.balance < 0) state.balance = Math.min(0, state.balance + drift);
  tickPowerUp(dt);
  tickComboTexts(dt);
  tickPuTexts(dt);

  // Round countdown
  state.roundTimer -= dt;
  if (state.roundTimer <= 5 && Math.floor(state.roundTimer + dt) > Math.floor(state.roundTimer)) {
    addShake(0.2); // light shake each second in final 5s
  }
  if (state.roundTimer <= 0) {
    // Whoever's side the orb is on wins; tap count breaks ties
    if      (state.balance > 0.01)  winRound(1);
    else if (state.balance < -0.01) winRound(2);
    else    drawRound();
    return;
  }

  state.tapFlash[0] = Math.max(0, state.tapFlash[0] - dt * 6);
  state.tapFlash[1] = Math.max(0, state.tapFlash[1] - dt * 6);

  const orbX = BAR_CX + state.balance * BAR_HALF;
  pushTrail(orbX);
  tickParticles(dt); tickOrb(dt); tickTrail(dt);
  tickShake(dt); tickFlash(dt); tickScorePop(dt); tickMeters(dt);
}
function winRound(player) {
  state.scores[player-1]++;
  state.phase = 'roundEnd'; state.roundWinner = player; state.reTimer = 3.2;
  const orbX = BAR_CX + state.balance * BAR_HALF;
  burst(player, orbX, true); burst(player, orbX, true);
  addShake(1.2); addFlash(player === 1 ? P1C() : P2C(), 0.6);
  sfxWin(player); triggerScorePop(player);
  if (state.scores[player-1] >= 2) addWin(player);
}
function drawRound() {
  state.phase = 'roundEnd'; state.roundWinner = 0; state.reTimer = 2.8;
  addShake(0.5); addFlash('#888', 0.25);
}
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
    state.round++; state.balance = 0; state.tapCount = [0,0];
    state.roundTimer = ROUND_TIME;
    state.phase = 'lobby';
    particles.length = orbTrail.length = 0;
    tapHistory[0].length = tapHistory[1].length = 0;
  lastTapTime[0] = lastTapTime[1] = lastTapGap[0] = lastTapGap[1] = rhythmBonus[0] = rhythmBonus[1] = 0;
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
    bootLineTimer += dt;
    while (bootLineTimer >= BOOT_LINE_DELAY && bootLineShown < BOOT_LINES.length) {
      bootLineShown++; bootLineTimer -= BOOT_LINE_DELAY;
    }
    if (bootLineShown >= BOOT_LINES.length) {
      bootDoneTimer += dt;
      if (bootDoneTimer > 1.0) {
        howToPlayFrom = 'charSelect';
        state.phase = localStorage.getItem('spamwars_seen_howto') ? 'charSelect' : 'howToPlay';
      }
    }
  } else if (state.phase === 'lobby') {
    tickParticles(dt); tickShake(dt); tickFlash(dt);
  } else if (state.phase === 'countdown') {
    state.cdTimer -= dt;
    state.cdScale = Math.max(1, state.cdScale - dt * 4.5);
    if (state.cdTimer <= 0) {
      if (state.countdown > 1) {
        state.countdown--; state.cdTimer = 1.0; state.cdScale = 1.6; sfxCountdown(false);
      } else if (state.countdown === 1) {
        state.countdown = 0; state.cdTimer = 0.6; state.cdScale = 1.6; sfxCountdown(true);
      } else {
        state.phase = 'playing'; state.tapCount = [0,0];
      }
    }
    tickParticles(dt); tickShake(dt); tickFlash(dt); tickScorePop(dt); tickMeters(dt);
  } else if (state.phase === 'playing') {
    tickGame(dt);
  } else if (state.phase === 'roundEnd') {
    tickParticles(dt); tickShake(dt); tickFlash(dt); tickScorePop(dt);
    state.reTimer -= dt;
    if (state.reTimer <= 0) nextRound();
  } else if (state.phase === 'gameOver' || state.phase === 'nameEntry' || state.phase === 'leaderboard') {
    tickParticles(dt); tickFlash(dt);
  }
  draw();
  requestAnimationFrame(loop);
}

// ── Draw: boot screen ─────────────────────────────────────────────────────────
function drawBoot() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const startX = 48, startY = 60, lineH = 24;
  for (let i = 0; i < Math.min(bootLineShown, BOOT_LINES.length); i++) {
    const line = BOOT_LINES[i];
    if (!line) continue;
    const isCmd = line.startsWith('>');
    ctx.save();
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = isCmd ? '#33ff55' : '#8899bb';
    ctx.shadowColor = isCmd ? '#33ff55' : 'transparent';
    ctx.shadowBlur  = isCmd ? 10 : 0;
    ctx.fillText(line, startX, startY + i * lineH);
    ctx.restore();
  }
  // Blinking cursor at end
  if (bootLineShown >= BOOT_LINES.length) {
    const blinkOn = (performance.now() % 700) < 350;
    if (blinkOn) {
      ctx.save();
      ctx.fillStyle = '#33ff55';
      ctx.shadowColor = '#33ff55'; ctx.shadowBlur = 10;
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('_', startX, startY + BOOT_LINES.length * lineH);
      ctx.restore();
    }
  }
}

// ── Draw: background ──────────────────────────────────────────────────────────
function drawBg() {
  // Clean dark fill — synthwave grid lives on the page bg canvas, not inside the game box
  ctx.fillStyle = 'rgba(8, 4, 28, 0.92)';
  ctx.fillRect(0, 0, W, H);

  // A handful of pixel stars
  ctx.fillStyle = '#ffffff';
  for (const [sx, sy, ss] of BG_STARS) {
    ctx.fillRect(sx, sy, ss, ss);
  }

  // Side glow based on who's ahead
  if (Math.abs(state.balance) > 0.05) {
    const col = state.balance > 0 ? P1C() : P2C();
    const gx  = state.balance > 0 ? 0 : W;
    const mag = Math.abs(state.balance);
    const sg  = ctx.createRadialGradient(gx, H/2, 0, gx, H/2, W * 0.6);
    sg.addColorStop(0, hexAlpha(col, mag * 0.09));
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
  }
}

// ── Draw: score header ────────────────────────────────────────────────────────
function drawScore() {
  const cx = W / 2;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // Player labels
  ctx.font = '13px "Press Start 2P", monospace';
  ctx.save(); ctx.shadowColor = P1C(); ctx.shadowBlur = 12;
  ctx.fillStyle = P1C(); glowTxt('P1', cx - 155, 38); ctx.restore();
  ctx.save(); ctx.shadowColor = P2C(); ctx.shadowBlur = 12;
  ctx.fillStyle = P2C(); glowTxt('P2', cx + 155, 38); ctx.restore();

  // Score numbers — fire gradient + glow
  ctx.save();
  ctx.translate(cx - 155, 68);
  ctx.scale(scoreScale[0], scoreScale[0]);
  ctx.font = '32px "Press Start 2P", monospace';
  ctx.shadowColor = P1C(); ctx.shadowBlur = 28;
  ctx.fillStyle = P1C();
  ctx.fillText(state.scores[0], 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(cx + 155, 68);
  ctx.scale(scoreScale[1], scoreScale[1]);
  ctx.font = '32px "Press Start 2P", monospace';
  ctx.shadowColor = P2C(); ctx.shadowBlur = 28;
  ctx.fillStyle = P2C();
  ctx.fillText(state.scores[1], 0, 0);
  ctx.restore();

  // VS — pixel box
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

  // Pixel-art heart (9×8 grid, ps = pixel size)
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

  function drawHeart(hx, hy, ps, color, filled) {
    const grid = filled ? HEART_FILL : HEART_OUTLINE;
    const cols = grid[0].length, rows = grid.length;
    const ox = hx - (cols * ps) / 2;
    const oy = hy - (rows * ps) / 2;
    ctx.save();
    if (filled) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
    ctx.fillStyle = filled ? color : hexAlpha('#aabbcc', 0.5);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c]) ctx.fillRect(Math.round(ox + c*ps), Math.round(oy + r*ps), ps, ps);
      }
    }
    ctx.restore();
  }

  const ps = 2, hSpacing = 24;
  // P1 hearts (left of ROUND text)
  for (let i = 0; i < 2; i++) {
    drawHeart(cx - 108 + i * hSpacing, rowY, ps, P1C(), i < state.scores[0]);
  }
  // P2 hearts (right of ROUND text)
  for (let i = 0; i < 2; i++) {
    drawHeart(cx + 88 + i * hSpacing, rowY, ps, P2C(), i < state.scores[1]);
  }
}

// ── Draw: tug-of-war bar ──────────────────────────────────────────────────────
function drawBar() {
  const bx = BAR_CX - BAR_HALF;
  const by = BAR_Y - BAR_H / 2;
  const bw = BAR_HALF * 2;
  const r  = 2; // sharp/pixel look

  // ── Segmented retro pixel bar ──────────────────────────────────────────────
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

  // Clip segments to rounded casing shape
  ctx.save();
  ctx.beginPath(); ctx.roundRect(bx, by, bw, BAR_H, BAR_H / 2); ctx.clip();

  // Segments
  const litCount = Math.abs(state.balance) * half;
  for (let i = 0; i < N_SEGS; i++) {
    const sx    = bx + SEG_GAP + i * (SEG_W + SEG_GAP);
    const right = i >= half;
    const col   = right ? P1C() : P2C();
    const lit   = right
      ? (state.balance > 0 && (i - half) < litCount)
      : (state.balance < 0 && (half - 1 - i) < litCount);

    ctx.fillStyle = lit ? col : hexAlpha(col, 0.08);
    ctx.beginPath(); ctx.roundRect(sx, SEG_Y, SEG_W, SEG_H, 3); ctx.fill();
    if (!lit) { ctx.strokeStyle = hexAlpha(col, 0.18); ctx.lineWidth = 1; ctx.stroke(); }
  }

  ctx.restore(); // end clip

  // Outer glow on the filled side (no shadow bleed inside clip)
  if (Math.abs(state.balance) > 0.05) {
    const glowCol = state.balance > 0 ? P1C() : P2C();
    ctx.save();
    ctx.shadowColor = glowCol; ctx.shadowBlur = 12;
    ctx.strokeStyle = hexAlpha(glowCol, 0.35); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, BAR_H, BAR_H / 2); ctx.stroke();
    ctx.restore();
  }

  // Center tick mark
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(BAR_CX - 1, by + 1, 2, BAR_H - 2);
  ctx.restore();

  // ── End zone indicators ────────────────────────────────────────────────────
  const ezNow   = performance.now() * 0.001;
  const ezPulse = 0.5 + 0.5 * Math.sin(ezNow * 2.6);
  const nearR   = Math.max(0, (state.balance  - 0.45) / 0.55); // orb approaching right end
  const nearL   = Math.max(0, (-state.balance - 0.45) / 0.55); // orb approaching left end

  // Inner cap glows (clipped to bar shape)
  const capW = 52;
  function drawCapGlow(side, col, proximity) {
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
  drawCapGlow('right', P1C(), nearR);
  drawCapGlow('left',  P2C(), nearL);

  // Outer chevron arrows
  function drawChevrons(originX, col, dir, proximity) {
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
  drawChevrons(bx + bw, P1C(),  1, nearR); // right end, pointing right →
  drawChevrons(bx,      P2C(), -1, nearL); // left end,  pointing left  ←

  // Trail — glowing, quadratic fade
  const orbX    = BAR_CX + state.balance * BAR_HALF;
  const trailCol = state.balance > 0.05 ? P1C() : state.balance < -0.05 ? P2C() : '#c8c0ff';
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

  // Orb — coin spin + pulsing ring + specular
  const orbCol = state.balance > 0.05 ? P1C() : state.balance < -0.05 ? P2C() : '#e0e0ff';
  const pt     = performance.now() * 0.002;
  // Coin spin: X flattens and flips like a coin; Y stays round
  const coinX  = Math.cos(coinAngle);                // -1..1
  const scaleX = Math.max(0.08, Math.abs(coinX));    // never fully flat
  const scaleY = 1 + orbBounce * 0.15;               // slight pop on tap

  // Orbit dots — 3 dots equally spaced, spin faster with velocity
  const orbitR  = ORB_R * 1.75;
  const dotR    = 3;
  const speed   = Math.abs(orbVelX);
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const angle = orbitAngle + (i * Math.PI * 2) / 3;
    const dx = Math.cos(angle) * orbitR;
    const dy = Math.sin(angle) * orbitR * 0.45; // flatten vertically so they stay in the bar
    const alpha = 0.4 + speed * 0.5 + 0.15 * Math.sin(angle * 2); // shimmer
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

  // Specular highlight — shifts with coin face direction
  const hlX = -Math.sign(coinX || 1) * ORB_R * 0.28;
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.beginPath(); ctx.arc(hlX, -ORB_R * 0.28, ORB_R * 0.23, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();

  ctx.restore(); // pop squash/stretch transform
}

// ── Draw: player side panels ──────────────────────────────────────────────────
function drawPlayers() {
  const p1x = 140, p2x = W - 140, py = BAR_Y;

  function side(px, player, flash, tps) {
    const col = player === 1 ? P1C() : P2C();
    const key = isMobile ? 'TAP' : (player === 1 ? 'A' : 'L');
    const fa  = flash / 0.18;

    // Key square — pixel/retro style
    ctx.save();
    if (flash > 0) { ctx.shadowColor = col; ctx.shadowBlur = 28 * fa; }
    ctx.beginPath(); ctx.rect(px - 28, py - 28, 56, 56);
    ctx.fillStyle = flash > 0 ? hexAlpha(col, 0.18 + 0.18 * fa) : hexAlpha(col, 0.07);
    ctx.fill();
    ctx.strokeStyle = flash > 0 ? col : hexAlpha(col, 0.4);
    ctx.lineWidth = flash > 0 ? 2 : 1.5; ctx.stroke();
    ctx.restore();

    // Alien icon (selected character) above key box
    const alienIdx = player === 1 ? state.p1Icon : state.p2Icon;
    ctx.save();
    if (flash > 0) { ctx.shadowColor = col; ctx.shadowBlur = 20 * fa; }
    drawAlienSprite(alienIdx, px, py - 52, 4);
    ctx.restore();

    // Key letter (small, below)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.save();
    ctx.shadowColor = col; ctx.shadowBlur = flash > 0 ? 24 : 14;
    ctx.fillStyle = flash > 0 ? '#fff' : col;
    glowTxt(key, px, py);
    ctx.restore();

    // TPS speed bar — pixel style
    const barY = py + 46, barW = 48, barH = 6;
    const filled = Math.min(tps / 12, 1);
    ctx.save();
    ctx.beginPath(); ctx.rect(px - barW/2, barY, barW, barH);
    ctx.fillStyle = '#080818'; ctx.fill();
    ctx.strokeStyle = hexAlpha(col, 0.2); ctx.lineWidth = 1; ctx.stroke();
    if (filled > 0) {
      ctx.beginPath(); ctx.rect(px - barW/2, barY, barW * filled, barH);
      ctx.shadowColor = col; ctx.shadowBlur = 6;
      ctx.fillStyle = col; ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.fillStyle = col;
    glowTxt(`${tps}/s`, px, barY + barH + 11);
    ctx.restore();

    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,220,120,0.55)';
    txt(`${state.tapCount[player-1]}`, px, barY + barH + 24);
  }

  side(p1x, 1, state.tapFlash[0], getTPS(1));
  side(p2x, 2, state.tapFlash[1], getTPS(2));
}

// ── Draw: round timer ─────────────────────────────────────────────────────────
function drawRoundTimer() {
  const t    = Math.max(0, state.roundTimer);
  const secs = Math.ceil(t);
  const cx   = W / 2;
  const cy   = BAR_Y - 72;
  const urgent = t <= 5;
  const color  = urgent ? '#ff2020' : '#ffffff';

  // Pixel progress bar (horizontal, above timer text)
  const prog  = t / ROUND_TIME;
  const barW  = 80, barH = 5;
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - barW/2, cy - 24, barW, barH);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  if (prog > 0) {
    ctx.beginPath(); ctx.rect(cx - barW/2, cy - 24, barW * prog, barH);
    ctx.shadowColor = urgent ? '#ff2020' : '#ff8800'; ctx.shadowBlur = 10;
    ctx.fillStyle = urgent ? '#ff2020' : fireGrad(cy - 24, cy - 19); ctx.fill();
  }
  ctx.restore();

  // Timer number — fire gradient
  const fs = urgent ? 16 : 14;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = urgent ? '#ff2020' : '#ff8800'; ctx.shadowBlur = urgent ? 22 : 14;
  ctx.font = `${fs}px "Press Start 2P", monospace`;
  ctx.fillStyle = urgent ? '#ff2020' : fireGrad(cy - fs/2, cy + fs/2);
  glowTxt(secs, cx, cy);
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

// ── Draw: countdown ───────────────────────────────────────────────────────────
function drawCountdown() {
  const text = state.countdown > 0 ? String(state.countdown) : 'GO!';
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.translate(W/2, TIMER_CY);
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

// ── Draw: overlays ────────────────────────────────────────────────────────────
function drawOverlay(color, title, sub) {
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
  ctx.fillStyle = fireGrad(H/2 - 32, H/2 - 12);
  ctx.fillText(title, W/2, H/2 - 22);
  ctx.restore();

  if (sub) {
    ctx.save();
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffcc44';
    glowTxt(sub, W/2, H/2 + 20);
    ctx.restore();
  }
}

// ── Draw: win celebration alien ───────────────────────────────────────────────
function drawWinCelebration() {
  if (state.roundWinner === 0) return;
  const w        = state.roundWinner;
  const alienIdx = w === 1 ? state.p1Icon : state.p2Icon;
  const col      = w === 1 ? P1C() : P2C();
  const t        = performance.now() * 0.001;
  const elapsed  = 3.2 - state.reTimer;
  const cx = W / 2, cy = H / 2 + 62;

  // Smoothstep: smooth S-curve 0→1
  function smoothstep(p) { return p * p * (3 - 2 * p); }

  let finalX = cx, finalY = cy, finalRot = 0, finalSX = 1, finalSY = 1, glow = 36;

  if (elapsed < 0.55) {
    // Phase 1: smooth pop-in + decelerate-spin + drop from above (0 → 0.55s)
    const p   = elapsed / 0.55;
    const ep  = 1 - Math.pow(1 - p, 3); // ease-out cubic — grows smoothly to 1, no snap
    finalSX   = ep;
    finalSY   = ep;
    finalRot  = (1 - ep) * (1 - ep) * Math.PI * 2.5;  // decelerating spin → 0
    glow      = 40 + ep * 35;
  } else if (elapsed < 1.4) {
    // Phase 2: victory hops with squash & stretch (0.55 → 1.4s)
    // 3 integer hops so sin(3π)=0 — alien lands cleanly at cy on exit
    const p    = (elapsed - 0.55) / 0.85;
    const wave = Math.abs(Math.sin(p * Math.PI * 3));
    finalY     = cy - wave * 22;
    finalSX    = 1 + wave * 0.10;   // stretch wide at peak
    finalSY    = 1 + wave * 0.15;   // stretch tall at peak
    glow       = 44;
  } else {
    // Phase 3: smoothly blend into idle alien animation (1.4s → 1.9s)
    const blend = smoothstep(Math.min(1, (elapsed - 1.4) / 0.5));
    const { dx, dy, sx, sy, rot } = alienAnim(alienIdx, t);
    finalX  = cx + dx * 2.2 * blend;
    finalY  = cy + dy * 2.2 * blend;
    finalRot = rot * blend;
    finalSX  = 1 + (sx - 1) * blend;  // lerp from 1 so scale is continuous
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

// ── Draw: character select ────────────────────────────────────────────────────
function drawCharSelect() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // Title
  ctx.save();
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#fff';
  txt('CHOOSE YOUR FIGHTER', W / 2, 22);
  ctx.restore();

  const CELL = 68, COLS = 4;
  const GRID_W = CELL * COLS; // 272
  const GRID_H = CELL * COLS; // 272
  const GRID_Y = Math.round((H - GRID_H) / 2) + 10; // vertically centered with slight offset for header

  const p1gx = W / 4 - GRID_W / 2;   // left panel grid left edge
  const p2gx = W * 3 / 4 - GRID_W / 2; // right panel grid left edge

  [1, 2].forEach(p => {
    const gx     = p === 1 ? p1gx : p2gx;
    const cursor = p === 1 ? state.p1Cursor : state.p2Cursor;
    const pc     = ALIENS[cursor].c;
    const prevKey = p === 1 ? 'A' : 'K';
    const nextKey = p === 1 ? 'S' : 'L';

    const panCX = gx + GRID_W / 2;
    const kw = 22, kh = 20;

    function keyCap(label, kx, ky) {
      ctx.save();
      ctx.shadowColor = pc; ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeStyle = pc; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(kx - kw/2, ky - kh/2, kw, kh); ctx.fill(); ctx.stroke();
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

    // Key caps row: ← [Q]   [A] →  (with breathing room below player label)
    const hintY = GRID_Y - 20;
    const prevKX = panCX - 36, nextKX = panCX + 36;

    keyCap(prevKey, prevKX, hintY);
    keyCap(nextKey, nextKX, hintY);

    // Arrows beside the key caps
    ctx.save();
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.shadowColor = pc; ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';  ctx.textBaseline = 'middle';
    ctx.fillText('◀', prevKX - kw/2 - 6, hintY);
    ctx.textAlign = 'left';
    ctx.fillText('▶', nextKX + kw/2 + 6, hintY);
    ctx.restore();

    // 4×4 grid
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
        ctx.shadowColor = ALIENS[i].c; ctx.shadowBlur = 20;
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

  // Divider line between panels
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

// ── Draw: name entry ──────────────────────────────────────────────────────────
function drawNameEntry() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cx = W / 2;
  const ne = nameEntryState;
  const winCol = ne.winner === 1 ? P1C() : P2C();

  // Title
  ctx.font = '11px "Press Start 2P", monospace';
  ctx.fillStyle = winCol; ctx.shadowColor = winCol; ctx.shadowBlur = 20;
  ctx.fillText(`PLAYER ${ne.winner} WINS!`, cx, 58);
  ctx.shadowBlur = 0;
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('ENTER YOUR NAME', cx, 86);

  // Single text-field box (10 chars)
  const FIELD_W = 400, FIELD_H = 44, FIELD_Y = 108;
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - FIELD_W/2, FIELD_Y, FIELD_W, FIELD_H);
  ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
  ctx.strokeStyle = winCol; ctx.lineWidth = 1.5;
  ctx.shadowColor = winCol; ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  // Render characters centered — only filled slots + cursor, growing outward from center
  ctx.font = '16px "Press Start 2P", monospace';
  ctx.textBaseline = 'middle';
  const charW = ctx.measureText('A').width + 4;
  const blinkOn = (performance.now() % 900) < 520;
  const visibleCount = ne.cursor + 1; // filled chars + cursor slot
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
  ctx.fillText(`${ne.spamCount ?? 0} TAPS  ·  ${ne.spamRate ?? '0.0'}/s`, cx, 174);

  // Controls hint
  ctx.font = '5px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillText(isMobile ? 'TAP RIGHT = NEXT LETTER  ·  LEFT = BACK  ·  BOTTOM = DONE' : 'TYPE YOUR NAME  ·  ENTER TO CONFIRM', cx, 192);

  // Mobile confirm hint
  if (isMobile) {
    const blinkC = (performance.now() % 1100) < 660;
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = blinkC ? 'rgba(255,238,0,0.6)' : 'rgba(255,238,0,0.15)';
    ctx.shadowColor = '#ffee00'; ctx.shadowBlur = blinkC ? 10 : 0;
    ctx.fillText('▼  CONFIRM', cx, H - 26);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

// ── Draw: leaderboard ─────────────────────────────────────────────────────────
function drawLeaderboard() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.92)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const cx = W / 2;

  // Title
  ctx.font = '13px "Press Start 2P", monospace';
  ctx.fillStyle = '#ffee00'; ctx.shadowColor = '#ffee00'; ctx.shadowBlur = 20;
  ctx.fillText('★  LEADERBOARD  ★', cx, 30);
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

  const lb = getLB();
  const RANKS = ['1ST','2ND','3RD','4TH','5TH','6TH','7TH','8TH','9TH','10TH'];
  const RANK_COLS = ['#ffd700','#c0c0c0','#cd7f32'];
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
    ctx.textAlign = 'right'; ctx.fillText(e.wins, 430, y + 3);

    // Taps
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'right'; ctx.fillText(e.spamCount ?? '-', 530, y + 3);

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

// ── Draw: how to play ─────────────────────────────────────────────────────────
function drawHowToPlay() {
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
  ctx.fillText('— POWER-UPS —', cx, y + 4);
  y += 8 + 8;

  // Power-up rows
  for (const p of puData) {
    // Colored dot indicator
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

// ── Draw: lobby ───────────────────────────────────────────────────────────────
function drawLobby() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  const blinkOn = (performance.now() % 1100) < 605;
  if (blinkOn) {
    const hov = lobbyHover;
    ctx.save();
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.shadowColor = hov ? '#ffffff' : '#ffee00';
    ctx.shadowBlur  = hov ? 28 : 16;
    ctx.fillStyle   = hov ? '#ffffff' : '#ffee00';
    glowTxt('PRESS SPACE TO START', W/2, LOBBY_BTN.y + LOBBY_BTN.h / 2);
    ctx.restore();
  }

  // Per-player win counts
  const w1 = getWins(1), w2 = getWins(2);
  if (w1 > 0 || w2 > 0) {
    const wy = LOBBY_BTN.y + LOBBY_BTN.h / 2 + 30;
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.save();
    ctx.fillStyle = hexAlpha(P1C(), 0.6);
    ctx.shadowColor = P1C(); ctx.shadowBlur = 6;
    ctx.textAlign = 'right';
    ctx.fillText(`P1 WINS: ${w1}`, W / 2 - 10, wy);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = hexAlpha(P2C(), 0.6);
    ctx.shadowColor = P2C(); ctx.shadowBlur = 6;
    ctx.textAlign = 'left';
    ctx.fillText(`P2 WINS: ${w2}`, W / 2 + 10, wy);
    ctx.restore();
  }

  // "HOW TO PLAY" + "HIGH SCORES" buttons side by side at top center
  ctx.save();
  ctx.font = '5px "Press Start 2P", monospace';
  const PAD2 = 14, GAP2 = 10;
  const hwW = ctx.measureText('HOW TO PLAY').width  + PAD2;
  const hsW = ctx.measureText('LEADERBOARD').width + PAD2;
  const totalBtnW = hwW + GAP2 + hsW;
  HOW_BTN.x = W/2 - totalBtnW/2; HOW_BTN.w = hwW;
  HS_BTN.x  = HOW_BTN.x + hwW + GAP2; HS_BTN.w = hsW;
  for (const [btn, label] of [[HOW_BTN,'HOW TO PLAY'],[HS_BTN,'LEADERBOARD']]) {
    ctx.beginPath(); ctx.rect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, btn.x + btn.w/2, btn.y + btn.h/2);
  }
  ctx.restore();
}

// ── Draw: change players button (top-left) ────────────────────────────────────
const CHANGE_BTN = { x: 8, y: 8, w: 0, h: 16 }; // w set dynamically
const ESC_BTN    = { x: 0, y: 8, w: 0, h: 16 }; // x/w set dynamically
let changeHover = false;

function drawChangeBtn() {
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

// ── Draw: esc hint (top-right) ────────────────────────────────────────────────
function drawEscHint() {
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

function drawScreenFlash() {
  if (flashAlpha <= 0) return;
  const fg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.7);
  fg.addColorStop(0,   hexAlpha(flashCol, flashAlpha * 0.45));
  fg.addColorStop(0.5, hexAlpha(flashCol, flashAlpha * 0.2));
  fg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
}

// ── Main draw ─────────────────────────────────────────────────────────────────
function draw() {
  const { x: sx, y: sy } = getShakeOffset();
  ctx.save();
  ctx.translate(sx, sy);

  if (state.phase === 'boot') {
    drawBoot();
    ctx.restore();
    return;
  }

  drawBg();

  if (state.phase === 'howToPlay') {
    drawHowToPlay();
    ctx.restore();
    return;
  }

  if (state.phase === 'nameEntry') {
    drawNameEntry();
    ctx.restore();
    return;
  }

  if (state.phase === 'leaderboard') {
    drawLeaderboard();
    ctx.restore();
    return;
  }

  if (state.phase === 'charSelect') {
    drawCharSelect();
    drawScreenFlash();
    ctx.restore();
    return;
  }

  drawScore();
  drawMeter(1);
  drawMeter(2);
  drawBar();
  drawPlayers();
  drawParticles();

  if      (state.phase === 'lobby')     { drawLobby(); }
  else if (state.phase === 'playing')   { drawRoundTimer(); }
  else if (state.phase === 'countdown') { drawCountdown(); }
  else if (state.phase === 'roundEnd')  {
    if (state.roundWinner === 0) {
      drawOverlay('#aaaaaa', 'DRAW!', '');
    } else {
      const col = state.roundWinner === 1 ? P1C() : P2C();
      const ws = state.scores[state.roundWinner - 1];
      const matchWon = ws >= 2;
      drawOverlay(col,
        matchWon ? `Player ${state.roundWinner} wins!` : `Player ${state.roundWinner} wins the round!`,
        '');
      // Score between title (y≈188) and alien (y≈272)
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.shadowColor = col; ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffcc44';
      ctx.fillText(`${state.scores[0]}  –  ${state.scores[1]}`, W / 2, H / 2 + 14);
      ctx.restore();
      drawWinCelebration();
    }
  }
  else if (state.phase === 'gameOver')  {
    const w = state.scores[0] > state.scores[1] ? 1 : state.scores[1] > state.scores[0] ? 2 : 0;
    if (w === 0) {
      drawOverlay('#aaaaaa', 'MATCH DRAW!', `${state.scores[0]} – ${state.scores[1]}   ·   press ESC to restart`);
    } else {
      drawOverlay(w === 1 ? P1C() : P2C(),
        `Player ${w} wins!`,
        `${state.scores[0]} – ${state.scores[1]}   ·   press ESC to restart`);
      drawWinCelebration();
    }
  }

  drawPowerUp();
  drawComboTexts();
  drawPuTexts();
  drawEffectHud();
  drawChangeBtn();
  drawEscHint();
  drawScreenFlash();
  ctx.restore();
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

_canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    const r = _canvas.getBoundingClientRect();
    const mx = (touch.clientX - r.left) * (W / r.width);
    const my = (touch.clientY - r.top)  * (H / r.height);
    // Check overlay buttons first (work in any phase)
    if (state.phase === 'lobby' && inRect(mx, my, HOW_BTN)) { howToPlayFrom = 'lobby'; state.phase = 'howToPlay'; continue; }
    if (state.phase === 'lobby' && inRect(mx, my, HS_BTN)) { lbNewName = null; state.phase = 'leaderboard'; continue; }
    if (state.phase !== 'charSelect' && state.phase !== 'nameEntry' && state.phase !== 'leaderboard' && inRect(mx, my, CHANGE_BTN)) { goToCharSelect(); continue; }
    if (state.phase !== 'charSelect' && state.phase !== 'nameEntry' && inRect(mx, my, ESC_BTN)) {
      const i1 = state.p1Icon, i2 = state.p2Icon;
      if (state.phase === 'leaderboard') { state.phase = 'lobby'; lbNewName = null; continue; }
      initState(); state.p1Icon = i1; state.p2Icon = i2;
      state.p1Cursor = i1; state.p2Cursor = i2; state.phase = 'lobby'; continue;
    }
    const midX = r.left + r.width / 2;
    const isLeft = touch.clientX < midX;
    if (state.phase === 'leaderboard') { state.phase = 'lobby'; lbNewName = null; continue; }
    if (state.phase === 'nameEntry') {
      const ne = nameEntryState;
      const ALPHA_FULL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      if (my > H - 60) { // bottom confirm strip
        submitNameEntry();
      } else if (isLeft) {
        // left tap = go back one cursor position
        if (ne.cursor > 0) { ne.cursor--; }
      } else {
        // right tap = cycle current letter forward, then advance cursor
        const cur = ne.letters[ne.cursor] === '_' ? -1 : ALPHA_FULL.indexOf(ne.letters[ne.cursor]);
        ne.letters[ne.cursor] = ALPHA_FULL[(cur + 1) % ALPHA_FULL.length];
        if (ne.cursor < 9) ne.cursor++;
        else submitNameEntry();
      }
      continue;
    }
    if (state.phase === 'howToPlay') {
      localStorage.setItem('spamwars_seen_howto', '1'); state.phase = howToPlayFrom; continue;
    } else if (state.phase === 'playing') {
      if (isLeft) onTap(1); else onTap(2);
    } else if (state.phase === 'lobby') {
      startCountdown();
    } else if (state.phase === 'charSelect') {
      const cr = _canvas.getBoundingClientRect();
      const tmy = (touch.clientY - cr.top) * (H / cr.height);
      const tmx = (touch.clientX - cr.left) * (W / cr.width);
      const csGridY = Math.round((H - 272) / 2) + 10;
      if (tmy > csGridY + 272 - 10) {
        // tap in bottom confirm strip → confirm selection
        state.p1Icon = state.p1Cursor; state.p2Icon = state.p2Cursor; state.phase = 'lobby';
      } else if (tmx < W / 2) {
        state.p1Cursor = (state.p1Cursor + 1) % 16;
      } else {
        state.p2Cursor = (state.p2Cursor + 1) % 16;
      }
    } else if (state.phase === 'gameOver') {
      const i1 = state.p1Icon, i2 = state.p2Icon;
      initState();
      state.p1Icon = i1; state.p2Icon = i2;
      state.p1Cursor = i1; state.p2Cursor = i2;
      state.phase = 'lobby';
    }
  }
}, { passive: false });

requestAnimationFrame(loop);
