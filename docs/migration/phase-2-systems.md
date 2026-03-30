# Phase 2: Game Systems

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## Context for a new agent

**What is this repo?** Spam Wars — a 2-player browser tapping game. P1 taps `A`, P2 taps `L`. The orb moves toward whoever taps faster. 16 alien characters, 3 power-ups, retro chiptune audio.

**What has already been done (Phase 1)?** The game was migrated from a monolithic `index.html` into a Vite + TypeScript project. The script was moved verbatim into `src/main-legacy.ts`. These modules were extracted: `canvas.ts`, `constants.ts`, `renderer/CanvasUtils.ts`, `storage/StorageManager.ts`, `state/GameState.ts`.

**Reference file:** `public/reference.html` is a READ-ONLY copy of the original game. It is served at `http://localhost:5173/reference.html`. Every Playwright check in this phase compares the new implementation against it.

**What this phase does:** Extract the five self-contained game subsystems from `main-legacy.ts` into dedicated modules. No logic changes — pure lift-and-shift:
1. `AlienSprites` — SHAPES/ALIENS arrays, animation, sprite drawing
2. VFX — Particles, ScreenEffects (shake/flash/orb), FloatTexts, ScorePop
3. `RhythmTracker` + `ChiptuneAudio` — tap tracking, TPS, energy meters, all sound effects
4. `PowerUpSystem` — spawn, collect, tick, draw
5. `MobileScale` — responsive scaling, fullscreen

**Working directory:** `/Users/yunnie/cc-projects/thumb-app`

**How to start:**
```bash
npm run dev &    # dev server at localhost:5173
npm test         # should show 12 passing
```

**Current `src/main-legacy.ts` still contains** (will be extracted this phase):
- `SHAPES`, `ALIENS`, `P1C()`, `P2C()`, `alienAnim()`, `drawAlienSprite()` — lines ~614–711
- `particles[]`, `burst()`, `tickParticles()`, `drawParticles()` — lines ~427–461
- `shakeAmt`, `flashAlpha`, `orbBounce`, `orbTrail` and related functions — lines ~465–499
- `comboTexts[]`, `puTexts[]` and related functions — lines ~736–788
- `scoreScale[]`, `triggerScorePop()`, `tickScorePop()` — lines ~714–716
- `tapHistory`, `recordTap()`, `getTPS()`, `spikeMe()`, `tickMeters()`, `drawMeter()` — lines ~502–610
- `ac`, `getAC()`, `sfxTap()`, `sfxCountdown()`, `sfxWin()`, pin tone functions — lines ~311–424
- `PU_TYPES`, `powerUp`, `puEffects`, all power-up functions — lines ~791–853
- `isMobile`, `applyMobileScale()`, fullscreen functions — lines ~2429–2493

---

## Task 1: Extract AlienSprites

**What:** Move sprite data and rendering out of `main-legacy.ts`. Also add `getAlienColor()` helper to replace `P1C()`/`P2C()` — this decouples color lookup from global state.

**Files:** Create `src/sprites/AlienSprites.ts`. Modify `src/main-legacy.ts`.

- [ ] **Step 1: Create `src/sprites/AlienSprites.ts`**

Copy `SHAPES`, `ALIENS`, `alienAnim()`, `drawAlienSprite()` verbatim from `main-legacy.ts`. Add `getAlienColor()`:

```typescript
import { ctx } from '../canvas.ts';

// Paste SHAPES array here (the 4 pixel-art grids from main-legacy.ts)
export const SHAPES = [ /* ... */ ] as const;

// Paste ALIENS array here (16 entries: { s: shapeIdx, c: colorHex, e: eyeHex })
export const ALIENS: Array<{ s: number; c: string; e: string }> = [ /* ... */ ];

// Replaces the global P1C() / P2C() functions
export function getAlienColor(idx: number): string {
  return ALIENS[idx]?.c ?? '#8833cc';
}

// Paste alienAnim() verbatim
export function alienAnim(i: number, t: number): { dx: number; dy: number; sx: number; sy: number; rot: number } {
  // ...
}

// Paste drawAlienSprite() verbatim
export function drawAlienSprite(idx: number, cx: number, cy: number, ps: number): void {
  // ...
}
```

- [ ] **Step 2: In `main-legacy.ts`, delete `SHAPES`, `ALIENS`, `P1C()`, `P2C()`, `alienAnim()`, `drawAlienSprite()`. Add import:**

```typescript
import { SHAPES, ALIENS, getAlienColor, alienAnim, drawAlienSprite } from './sprites/AlienSprites.ts';
```

- [ ] **Step 3: Replace `P1C()` and `P2C()` in `main-legacy.ts`:**

Search for `P1C()` → replace with `getAlienColor(state.p1Icon)`
Search for `P2C()` → replace with `getAlienColor(state.p2Icon)`

- [ ] **Step 4: Playwright comparison — alien sprites render correctly**

```
// New implementation — charSelect phase (shows alien grid)
browser_navigate("http://localhost:5173")
browser_wait_for("canvas")
browser_press_key("Space")     // skip boot/howToPlay
browser_take_screenshot(filename="reference/screenshots/phase2-task1-new-charSelect.png")

// Reference
browser_navigate("http://localhost:5173/reference.html")
browser_wait_for("canvas")
browser_press_key("Space")
browser_take_screenshot(filename="reference/screenshots/phase2-task1-ref-charSelect.png")

browser_console_messages()     // must be empty
```

Verify: alien sprites in both screenshots look identical (same shapes, same colors, same grid layout).

- [ ] **Step 5: Commit**

```bash
git add src/sprites/AlienSprites.ts src/main-legacy.ts
git commit -m "refactor: extract AlienSprites (SHAPES, ALIENS, getAlienColor, drawAlienSprite)"
```

---

## Task 2: Extract VFX subsystems

**What:** Move all visual effect code into 4 focused modules. Each module owns its own mutable state.

**Critical change:** `burst(player, orbX, big)` → `burst(color: string, orbX: number, big: boolean)`. This removes the dependency on alien color data from inside the particle system.

**Files:** Create `src/vfx/Particles.ts`, `src/vfx/ScreenEffects.ts`, `src/vfx/FloatTexts.ts`, `src/vfx/ScorePop.ts`. Modify `src/main-legacy.ts`.

- [ ] **Step 1: Create `src/vfx/Particles.ts`**

Source lines in `main-legacy.ts`: ~427–461. The `burst()` signature changes — it receives `color` as a parameter.

```typescript
import { ctx } from '../canvas.ts';
import { BAR_Y } from '../constants.ts';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; life: number; decay: number; color: string;
}

const particles: Particle[] = [];

// color param replaces the old player: 1|2 param
export function burst(color: string, orbX: number, big: boolean): void {
  // paste verbatim, replace the player→color lookup with the color param directly
}
export function tickParticles(dt: number): void { /* paste verbatim */ }
export function drawParticles(): void { /* paste verbatim */ }
```

- [ ] **Step 2: Create `src/vfx/ScreenEffects.ts`**

Source lines: ~465–499. Exports all state and functions for shake, flash, orb animation, and trail.

```typescript
export let shakeAmt = 0;
export let flashAlpha = 0;
export let flashCol = '#ffffff';
export let orbBounce = 0;
export let orbVelX = 0;
export let coinAngle = 0;
export let orbitAngle = 0;
export const orbTrail: Array<{ x: number; age: number }> = [];

export function addShake(v: number): void { /* paste */ }
export function tickShake(dt: number): void { /* paste */ }
export function getShakeOffset(): { x: number; y: number } { /* paste */ }
export function addFlash(col: string, a: number): void { /* paste */ }
export function tickFlash(dt: number): void { /* paste */ }
export function triggerOrbBounce(): void { orbBounce = 1; }
export function tickOrb(dt: number): void { /* paste */ }
export function pushTrail(x: number): void { /* paste */ }
export function tickTrail(dt: number): void { /* paste */ }
```

- [ ] **Step 3: Create `src/vfx/FloatTexts.ts`**

Source lines: ~736–788.

```typescript
import { ctx } from '../canvas.ts';

interface ComboText { text: string; x: number; y: number; vy: number; alpha: number; col: string; }
interface PuText    { text: string; x: number; y: number; col: string; alpha: number; scale: number; age: number; }

const comboTexts: ComboText[] = [];
const puTexts: PuText[] = [];

export function addComboText(text: string, x: number, y: number, col: string): void { /* paste */ }
export function tickComboTexts(dt: number): void { /* paste */ }
export function drawComboTexts(): void { /* paste */ }
export function addPuText(text: string, x: number, y: number, col: string): void { /* paste */ }
export function tickPuTexts(dt: number): void { /* paste */ }
export function drawPuTexts(): void { /* paste */ }
```

- [ ] **Step 4: Create `src/vfx/ScorePop.ts`**

Source lines: ~714–716.

```typescript
export const scoreScale: [number, number] = [1, 1];

export function triggerScorePop(p: 1 | 2): void {
  scoreScale[p - 1] = 1.7;
}

export function tickScorePop(dt: number): void {
  for (let i = 0; i < 2; i++) {
    if (scoreScale[i] > 1) scoreScale[i] = Math.max(1, scoreScale[i] - 5 * dt);
  }
}
```

- [ ] **Step 5: In `main-legacy.ts`, delete all moved code. Add imports:**

```typescript
import { burst, tickParticles, drawParticles } from './vfx/Particles.ts';
import { shakeAmt, orbBounce, orbVelX, coinAngle, orbitAngle, orbTrail,
         addShake, tickShake, getShakeOffset, addFlash, tickFlash,
         triggerOrbBounce, tickOrb, pushTrail, tickTrail } from './vfx/ScreenEffects.ts';
import { addComboText, tickComboTexts, drawComboTexts,
         addPuText, tickPuTexts, drawPuTexts } from './vfx/FloatTexts.ts';
import { scoreScale, triggerScorePop, tickScorePop } from './vfx/ScorePop.ts';
```

- [ ] **Step 6: Fix `burst()` call sites in `main-legacy.ts`**

Search for `burst(1,` and `burst(2,` — replace with color param:

```typescript
// Old:  burst(1, orbX, false)
// New:  burst(getAlienColor(state.p1Icon), orbX, false)

// Old:  burst(2, orbX, true)
// New:  burst(getAlienColor(state.p2Icon), orbX, true)
```

- [ ] **Step 7: Playwright comparison — particles and effects**

```
// New implementation — start a game and tap
browser_navigate("http://localhost:5173")
browser_press_key("Space")     // advance
browser_press_key("Space")     // start game (lobby → countdown)
// wait ~4s for countdown to finish — use browser_wait_for or multiple screenshots
browser_press_key("a")
browser_press_key("a")
browser_press_key("a")
browser_take_screenshot(filename="reference/screenshots/phase2-task2-new-playing.png")

// Reference
browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_press_key("Space")
browser_press_key("a")
browser_press_key("a")
browser_press_key("a")
browser_take_screenshot(filename="reference/screenshots/phase2-task2-ref-playing.png")

browser_console_messages()     // must be empty
```

Verify: particles, screen shake, and energy meters all visible and matching.

- [ ] **Step 8: Commit**

```bash
git add src/vfx/ src/main-legacy.ts
git commit -m "refactor: extract VFX subsystems (Particles, ScreenEffects, FloatTexts, ScorePop)"
```

---

## Task 3: Extract RhythmTracker and ChiptuneAudio

**What:** Move tap-rate tracking + energy meter + all sound effects into dedicated modules. `RhythmTracker` is exported as both a class (for unit tests) and a singleton (for the game loop).

**Files:** Create `src/rhythm/RhythmTracker.ts`, `src/audio/AudioEngine.ts`, `src/audio/ChiptuneAudio.ts`. Create `tests/RhythmTracker.test.ts`. Modify `src/main-legacy.ts`.

- [ ] **Step 1: Create `src/audio/AudioEngine.ts`**

Source: `ac` variable and `getAC()` function (~lines 312–322).

```typescript
let ac: AudioContext | null = null;

export function getAC(): AudioContext {
  if (!ac) ac = new AudioContext();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

// spIdx tracks which chiptune scale variant to use next for each player
export const spIdx: [number, number] = [0, 0];
```

- [ ] **Step 2: Create `src/audio/ChiptuneAudio.ts`**

Source: `SP_SCALES`, `sfxTap()`, `sfxCountdown()`, `sfxWin()`, `startPinTone()`, `updatePinTone()`, `stopPinTone()` (~lines 319–424).

```typescript
import { getAC, spIdx } from './AudioEngine.ts';
import { rhythmTracker } from '../rhythm/RhythmTracker.ts';

// Paste SP_SCALES array here (6 pairs of frequency multipliers)
const SP_SCALES = [ /* ... */ ];

let pinTone: { o: OscillatorNode; g: GainNode } | null = null;

// Paste all sfx functions verbatim
export function sfxTap(player: 1 | 2): void { /* paste */ }
export function sfxCountdown(isGo: boolean): void { /* paste */ }
export function sfxWin(player: 1 | 2): void { /* paste */ }
export function startPinTone(): void { /* paste */ }
export function updatePinTone(prog: number): void { /* paste */ }
export function stopPinTone(): void { /* paste */ }
```

- [ ] **Step 3: Create `src/rhythm/RhythmTracker.ts`**

Source: `tapHistory`, `lastTapTime`, `lastTapGap`, `rhythmBonus`, `meterLevel`, `meterPeak`, `meterPeakT`, `recordTap()`, `getTPS()`, `spikeMe()`, `tickMeters()`, `drawMeter()` (~lines 502–610).

Export a class (for tests) AND a singleton (for the game):

```typescript
import { ctx } from '../canvas.ts';
import { METER_SEGS, METER_H, METER_W, METER_GAP, SEG_H } from '../constants.ts';

export class RhythmTracker {
  tapHistory: [number[], number[]] = [[], []];
  lastTapTime: [number, number] = [0, 0];
  lastTapGap: [number, number] = [0, 0];
  rhythmBonus: [number, number] = [0, 0];
  meterLevel: [number, number] = [0, 0];
  meterPeak: [number, number] = [0, 0];
  meterPeakT: [number, number] = [0, 0];

  recordTap(player: 1 | 2, now = performance.now()): void { /* paste */ }
  getTPS(player: 1 | 2): number { /* paste */ }
  getBonus(player: 1 | 2): number { return this.rhythmBonus[player - 1]; }
  spikeMe(player: 1 | 2): void { /* paste */ }
  tickMeters(dt: number): void { /* paste */ }

  // Takes colors as params so this module doesn't import alien data
  drawMeter(player: 1 | 2, p1Color: string, p2Color: string): void { /* paste drawMeter() verbatim, use param colors */ }
}

export const rhythmTracker = new RhythmTracker();
```

- [ ] **Step 4: In `main-legacy.ts`, delete moved code and add imports:**

```typescript
import { rhythmTracker } from './rhythm/RhythmTracker.ts';
import { sfxTap, sfxCountdown, sfxWin, startPinTone, updatePinTone, stopPinTone } from './audio/ChiptuneAudio.ts';
```

Replace all `recordTap(p)` with `rhythmTracker.recordTap(p)`, `getTPS(p)` with `rhythmTracker.getTPS(p)`, etc.

Replace `drawMeter(1)` with `rhythmTracker.drawMeter(1, getAlienColor(state.p1Icon), getAlienColor(state.p2Icon))`.

- [ ] **Step 5: Create `tests/RhythmTracker.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RhythmTracker } from '../src/rhythm/RhythmTracker.ts';

describe('RhythmTracker', () => {
  let rt: RhythmTracker;
  beforeEach(() => { rt = new RhythmTracker(); });

  it('getTPS returns 0 with no taps', () => {
    expect(rt.getTPS(1)).toBe(0);
  });
  it('getTPS counts taps within 1000ms window', () => {
    const now = performance.now();
    rt.recordTap(1, now - 800);
    rt.recordTap(1, now - 400);
    rt.recordTap(1, now);
    expect(rt.getTPS(1)).toBeGreaterThan(0);
  });
  it('getTPS excludes taps older than 1000ms', () => {
    const now = performance.now();
    rt.recordTap(1, now - 2000);
    expect(rt.getTPS(1)).toBe(0);
  });
  it('rhythmBonus stays in 0..1 range', () => {
    for (let i = 0; i < 10; i++) rt.recordTap(1, i * 200);
    expect(rt.getBonus(1)).toBeGreaterThanOrEqual(0);
    expect(rt.getBonus(1)).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: `16 tests passed` (12 from Phase 1 + 4 new).

- [ ] **Step 7: Playwright comparison — audio triggers (no crashes) and meters visible**

```
browser_navigate("http://localhost:5173")
browser_press_key("Space")
browser_press_key("Space")      // start game
browser_press_key("a")
browser_press_key("a")
browser_press_key("a")
browser_take_screenshot(filename="reference/screenshots/phase2-task3-new-meters.png")
browser_console_messages()      // must be empty — audio errors would show here

browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_press_key("Space")
browser_press_key("a")
browser_press_key("a")
browser_press_key("a")
browser_take_screenshot(filename="reference/screenshots/phase2-task3-ref-meters.png")
```

Compare: energy meters at same height, no console errors.

- [ ] **Step 8: Commit**

```bash
git add src/rhythm/ src/audio/ tests/RhythmTracker.test.ts src/main-legacy.ts
git commit -m "refactor: extract RhythmTracker and ChiptuneAudio"
```

---

## Task 4: Extract PowerUpSystem

**What:** Move the power-up subsystem. `tickPowerUp()` needs `balance` as a parameter (instead of reading from global state) — this is the only signature change.

**Files:** Create `src/powerups/PowerUpSystem.ts`. Modify `src/main-legacy.ts`.

**Source lines in `main-legacy.ts`:** `PU_TYPES`, `powerUp`, `puSpawnTimer`, `puEffects`, `spawnPowerUp()`, `collectPowerUp()`, `tickPowerUp()`, `drawPowerUp()`, `drawEffectHud()` — lines ~791–853 plus `drawEffectHud()` ~877.

- [ ] **Step 1: Create `src/powerups/PowerUpSystem.ts`**

```typescript
import { ctx } from '../canvas.ts';
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

export function spawnPowerUp(): void { /* paste verbatim */ }
export function collectPowerUp(player: 1 | 2): void { /* paste verbatim */ }

// balance param replaces reading from global state
export function tickPowerUp(dt: number, balance: number): void {
  // paste verbatim, replace state.balance references with the balance param
}

export function drawPowerUp(): void { /* paste verbatim */ }
export function drawEffectHud(p1Color: string, p2Color: string): void {
  // paste drawEffectHud() verbatim, replace P1C()/P2C() with the params
}
```

- [ ] **Step 2: In `main-legacy.ts`, delete moved code and add imports:**

```typescript
import { PU_TYPES, puEffects, getPuEffects, getActivePU,
         spawnPowerUp, collectPowerUp, tickPowerUp,
         drawPowerUp, drawEffectHud } from './powerups/PowerUpSystem.ts';
```

Fix the `tickPowerUp()` call to pass balance:
```typescript
// Old: tickPowerUp(dt)
// New: tickPowerUp(dt, state.balance)
```

Replace inline power-up effect checks in `onTap()` with `getPuEffects()`.

- [ ] **Step 3: Playwright comparison — power-up spawns after ~5s**

```
// Start game and wait for power-up to appear
browser_navigate("http://localhost:5173")
browser_press_key("Space")
browser_press_key("Space")
// Wait ~6 seconds for the first power-up spawn (puSpawnTimer starts at 5)
browser_take_screenshot(filename="reference/screenshots/phase2-task4-new-powerup.png")

browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_press_key("Space")
browser_take_screenshot(filename="reference/screenshots/phase2-task4-ref-powerup.png")

browser_console_messages()     // must be empty
```

- [ ] **Step 4: Commit**

```bash
git add src/powerups/PowerUpSystem.ts src/main-legacy.ts
git commit -m "refactor: extract PowerUpSystem"
```

---

## Task 5: Extract MobileScale

**What:** Move mobile detection, scaling, fullscreen, and the decorative background canvas into a side-effect module. Importing it registers the event listeners automatically.

**Files:** Create `src/mobile/MobileScale.ts`. Modify `src/main-legacy.ts`.

**Source lines:** `isMobile`, `applyMobileScale()`, `tryFullscreen()`, `tryExitFullscreen()`, background canvas paint, `resize`/`orientationchange` listeners — lines ~2429–2493.

- [ ] **Step 1: Create `src/mobile/MobileScale.ts`**

```typescript
export const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export function applyMobileScale(): void { /* paste verbatim */ }
export function tryFullscreen(): void { /* paste verbatim */ }
export function tryExitFullscreen(): void { /* paste verbatim */ }

// These run immediately on import (side-effect registration)
window.addEventListener('resize', applyMobileScale);
window.addEventListener('orientationchange', applyMobileScale);
applyMobileScale();  // run once on load
```

- [ ] **Step 2: In `main-legacy.ts`, delete moved code and add import:**

```typescript
import { isMobile, applyMobileScale, tryFullscreen, tryExitFullscreen } from './mobile/MobileScale.ts';
```

- [ ] **Step 3: Playwright full regression — all phases work**

```
browser_navigate("http://localhost:5173")
browser_console_messages()           // must be empty

// Test full game flow
browser_press_key("Space")           // advance boot
browser_press_key("s")               // P1 cycle alien
browser_press_key("k")               // P2 cycle alien
browser_take_screenshot(filename="reference/screenshots/phase2-done-new-charSelect.png")
browser_press_key("Space")           // confirm → lobby
browser_press_key("Space")           // start countdown
browser_press_key("a")               // P1 tap during countdown (should buffer or do nothing)
browser_press_key("a")               // P1 tap
browser_press_key("l")               // P2 tap
browser_take_screenshot(filename="reference/screenshots/phase2-done-new-playing.png")
browser_press_key("Escape")          // return to lobby
browser_take_screenshot(filename="reference/screenshots/phase2-done-new-lobby.png")
browser_console_messages()           // must be empty

// Same flow on reference
browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_press_key("s")
browser_press_key("k")
browser_take_screenshot(filename="reference/screenshots/phase2-done-ref-charSelect.png")
browser_press_key("Space")
browser_press_key("Space")
browser_press_key("a")
browser_press_key("l")
browser_take_screenshot(filename="reference/screenshots/phase2-done-ref-playing.png")
```

Compare all pairs. Both must look identical.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: `16 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add src/mobile/MobileScale.ts src/main-legacy.ts reference/screenshots/
git commit -m "refactor: extract MobileScale; phase 2 complete"
```

---

## Phase 2 Complete ✓

**Deliverables:**
- `npm run dev` — game fully playable, VFX and audio work
- `npm test` — 16 tests pass
- `public/reference.html` still untouched; Playwright confirms visual parity
- New modules: `AlienSprites`, `Particles`, `ScreenEffects`, `FloatTexts`, `ScorePop`, `RhythmTracker`, `AudioEngine`, `ChiptuneAudio`, `PowerUpSystem`, `MobileScale`
- `main-legacy.ts` now contains only: draw functions, game loop, input handlers, game logic

**Next:** `docs/migration/phase-3-input-renderer.md`
