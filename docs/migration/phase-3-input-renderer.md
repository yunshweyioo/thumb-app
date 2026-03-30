# Phase 3: Input + Renderer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## Context for a new agent

**What is this repo?** Spam Wars — a 2-player browser tapping game. P1 taps `A`, P2 taps `L`. ~2566-line game being migrated from a monolithic `index.html` to a Vite + TypeScript project.

**What has been done (Phases 1–2)?** Vite project set up. The following have been extracted: `canvas.ts`, `constants.ts`, `CanvasUtils.ts`, `StorageManager.ts`, `GameState.ts`, `AlienSprites.ts`, all VFX modules, `RhythmTracker.ts`, `ChiptuneAudio.ts`, `PowerUpSystem.ts`, `MobileScale.ts`. The game runs identically to `public/reference.html`.

**What this phase does:**
1. Replace the tangled `keydown`/`click`/`touchstart` event listeners with a typed `InputBus` that dispatches semantic game actions — this decouples input from game logic, which is required for remote multiplayer later.
2. Split the ~1300-line draw section of `main-legacy.ts` into 8 focused renderer modules.
3. After this phase, `main-legacy.ts` contains only: the RAF game loop + the inputBus subscriber + core game logic (`tickGame`, `onTap`, `winRound`, `nextRound`).

**Working directory:** `/Users/yunnie/cc-projects/thumb-app`

**How to start:**
```bash
npm run dev &    # dev server at localhost:5173
npm test         # should show 16 passing
```

**Current `src/main-legacy.ts` still contains:**
- `keydown` listener (~line 938), `canvas.click` listener (~line 1016), `canvas.touchstart` listener (~line 2498)
- All draw functions: `drawBoot()`, `drawBg()`, `drawScore()`, `drawBar()`, `drawPlayers()`, `drawRoundTimer()`, `drawCountdown()`, `drawOverlay()`, `drawWinCelebration()`, `drawCharSelect()`, `drawNameEntry()`, `drawLeaderboard()`, `drawHowToPlay()`, `drawLobby()`, `drawChangeBtn()`, `drawEscHint()`, `drawScreenFlash()`
- The top-level `draw()` compositor (~line 2284)

**Reference for comparison:** `http://localhost:5173/reference.html` (never modify)

---

## Task 1: Create InputBus and wire input handlers

**Why InputBus matters:** Currently, event listeners directly mutate game state. That means there is no way to inject remote player input without re-wiring the game logic. `InputBus` sits between raw DOM events and game logic — a transport can later inject a `tap` action into `InputBus` the same way a keypress does.

**Files:** Create `src/input/InputBus.ts`, `src/input/KeyboardInput.ts`, `src/input/MouseInput.ts`, `src/input/TouchInput.ts`. Modify `src/main-legacy.ts`.

- [ ] **Step 1: Create `src/input/InputBus.ts`**

```typescript
export type GameAction =
  | { type: 'tap';          player: 1 | 2 }
  | { type: 'navigate';     direction: 'prev' | 'next'; player: 1 | 2 }
  | { type: 'confirm' }
  | { type: 'escape' }
  | { type: 'restart' }
  | { type: 'nameChar';     char: string }
  | { type: 'nameBackspace' }
  | { type: 'nameSubmit' }
  | { type: 'click';        x: number; y: number }
  | { type: 'hover';        target: string; active: boolean };

type Listener = (action: GameAction) => void;
const listeners: Listener[] = [];

export const inputBus = {
  dispatch(action: GameAction): void {
    // Copy array so listeners can safely unsubscribe during dispatch
    [...listeners].forEach(l => l(action));
  },
  subscribe(fn: Listener): () => void {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i > -1) listeners.splice(i, 1);
    };
  },
};
```

- [ ] **Step 2: Create `src/input/KeyboardInput.ts`**

Move the `keydown` handler from `main-legacy.ts`. Replace ALL direct state mutations with `inputBus.dispatch()` calls. Phase checks remain in the subscriber (not here):

```typescript
import { inputBus } from './InputBus.ts';

window.addEventListener('keydown', (e: KeyboardEvent) => {
  // Prevent double-firing browser shortcuts
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();

  switch (e.key) {
    case 'Escape':      inputBus.dispatch({ type: 'escape' }); break;
    case 'r': case 'R': inputBus.dispatch({ type: 'restart' }); break;
    case 'Enter':
    case ' ':           inputBus.dispatch({ type: 'confirm' }); break;
    case 'Backspace':   inputBus.dispatch({ type: 'nameBackspace' }); break;
    case 'a': case 'A':
      inputBus.dispatch({ type: 'tap',      player: 1 });
      inputBus.dispatch({ type: 'navigate', direction: 'prev', player: 1 });
      break;
    case 's': case 'S':
      inputBus.dispatch({ type: 'navigate', direction: 'next', player: 1 });
      break;
    case 'l': case 'L':
      inputBus.dispatch({ type: 'tap',      player: 2 });
      inputBus.dispatch({ type: 'navigate', direction: 'prev', player: 2 });
      break;
    case 'k': case 'K':
      inputBus.dispatch({ type: 'navigate', direction: 'next', player: 2 });
      break;
    default:
      if (e.key.length === 1) inputBus.dispatch({ type: 'nameChar', char: e.key.toUpperCase() });
  }
});
```

- [ ] **Step 3: Create `src/input/MouseInput.ts`**

Move the `click`, `mousemove`, `mouseleave` handlers. Dispatch `click` and `hover` actions:

```typescript
import { inputBus } from './InputBus.ts';
import { canvas, W, H, DPR } from '../canvas.ts';

function canvasCoords(e: MouseEvent): { mx: number; my: number } {
  const r = canvas.getBoundingClientRect();
  return {
    mx: (e.clientX - r.left) * (W / r.width),
    my: (e.clientY - r.top)  * (H / r.height),
  };
}

canvas.addEventListener('click', (e) => {
  const { mx, my } = canvasCoords(e);
  inputBus.dispatch({ type: 'click', x: mx, y: my });
});

canvas.addEventListener('mousemove', (e) => {
  const { mx, my } = canvasCoords(e);
  // Dispatch hover events for each known button
  // (copy button rects from main-legacy.ts and emit hover actions for each)
  inputBus.dispatch({ type: 'hover', target: 'lobby',  active: inRect(mx, my, LOBBY_BTN) });
  inputBus.dispatch({ type: 'hover', target: 'change', active: inRect(mx, my, CHANGE_BTN) });
});

canvas.addEventListener('mouseleave', () => {
  inputBus.dispatch({ type: 'hover', target: 'lobby',  active: false });
  inputBus.dispatch({ type: 'hover', target: 'change', active: false });
});
```

- [ ] **Step 4: Create `src/input/TouchInput.ts`**

Move the `touchstart` handler. Map touch zones to InputBus actions:

```typescript
import { inputBus } from './InputBus.ts';
import { canvas, W, H } from '../canvas.ts';

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  const r = canvas.getBoundingClientRect();
  const tx = (touch.clientX - r.left) * (W / r.width);
  const ty = (touch.clientY - r.top)  * (H / r.height);
  const isLeft   = tx < W / 2;
  const isBottom = ty > H * 0.82;

  if (isBottom) {
    inputBus.dispatch({ type: 'confirm' });
    return;
  }
  inputBus.dispatch({ type: 'click', x: tx, y: ty });
  if (isLeft) {
    inputBus.dispatch({ type: 'tap',      player: 1 });
    inputBus.dispatch({ type: 'navigate', direction: 'prev', player: 1 });
  } else {
    inputBus.dispatch({ type: 'tap',      player: 2 });
    inputBus.dispatch({ type: 'navigate', direction: 'prev', player: 2 });
  }
}, { passive: false });
```

- [ ] **Step 5: In `main-legacy.ts`, delete the three original event listener blocks. Add imports (side-effect style) and a single subscriber block:**

```typescript
import { inputBus, GameAction } from './input/InputBus.ts';
import './input/KeyboardInput.ts';   // registers keydown listener on import
import './input/MouseInput.ts';      // registers click/mousemove
import './input/TouchInput.ts';      // registers touchstart

inputBus.subscribe((action: GameAction) => {
  switch (action.type) {
    case 'escape':
      // paste the ESC handling logic from the old keydown listener
      break;
    case 'restart':
      // paste the R key handling logic
      break;
    case 'confirm':
      // paste the Space key handling (start game, dismiss howToPlay, etc.)
      break;
    case 'tap':
      if (state.phase === 'playing') onTap(action.player);
      break;
    case 'navigate':
      if (state.phase === 'charSelect') {
        // paste the A/S/K/L character selection logic
      }
      break;
    case 'nameChar':
      // paste name entry char logic
      break;
    case 'nameBackspace':
      // paste backspace logic
      break;
    case 'nameSubmit':
      // paste submit logic
      break;
    case 'click':
      // paste the old canvas.click button hit-test logic
      break;
    case 'hover':
      if (action.target === 'lobby')  lobbyHover  = action.active;
      if (action.target === 'change') changeHover = action.active;
      break;
  }
});
```

- [ ] **Step 6: Playwright input regression test**

```
browser_navigate("http://localhost:5173")
browser_console_messages()            // must be empty after load

// Keyboard: character select cycle
browser_press_key("Space")            // advance boot
browser_press_key("s")                // P1 next alien
browser_press_key("k")                // P2 next alien
browser_take_screenshot(filename="reference/screenshots/phase3-task1-new-charSelect.png")

// Confirm and start game
browser_press_key("Space")            // lobby
browser_press_key("Space")            // countdown
browser_press_key("a")                // P1 tap
browser_press_key("l")                // P2 tap
browser_take_screenshot(filename="reference/screenshots/phase3-task1-new-playing.png")

// ESC returns to lobby
browser_press_key("Escape")
browser_take_screenshot(filename="reference/screenshots/phase3-task1-new-lobby.png")
browser_console_messages()            // must be empty

// Reference for comparison
browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_press_key("s")
browser_press_key("k")
browser_take_screenshot(filename="reference/screenshots/phase3-task1-ref-charSelect.png")
```

Compare charSelect screenshots. Alien cursors must be in same positions.

- [ ] **Step 7: Commit**

```bash
git add src/input/ src/main-legacy.ts
git commit -m "refactor: extract InputBus and input handlers (keyboard, mouse, touch)"
```

---

## Task 2: Extract renderer modules

**What:** Split the ~1300 lines of draw functions into 8 focused files. Extract one file at a time and verify after each.

**Rule:** Draw functions receive the data they need as parameters. They do NOT import from `main-legacy.ts` or access global mutable state directly. This keeps them testable and prevents circular imports.

**Files to create:** `DrawBoot.ts`, `DrawBackground.ts`, `DrawUIChrome.ts`, `DrawHUD.ts`, `DrawPlayers.ts`, `DrawOverlays.ts`, `DrawScreens.ts`, `Renderer.ts`.

- [ ] **Step 1: Create `src/renderer/DrawBoot.ts`**

Source: `BOOT_LINES`, `bootLineShown`, `bootLineTimer`, `bootDoneTimer`, `BOOT_LINE_DELAY`, `drawBoot()` from `main-legacy.ts`.

```typescript
import { ctx, W, H } from '../canvas.ts';

export const BOOT_LINES = [
  // paste BOOT_LINES array
];
export let bootLineShown = 0;
export let bootLineTimer = 0;
export let bootDoneTimer = 0;
export const BOOT_LINE_DELAY = 0.18;

// Returns true when the boot sequence is complete
export function tickBoot(dt: number): boolean {
  // move the boot tick logic from the main RAF loop here
  // return true when bootDoneTimer <= 0 and all lines shown
  return false; // replace with actual logic
}

export function drawBoot(): void { /* paste drawBoot() verbatim */ }
```

Playwright check: `browser_navigate("http://localhost:5173")` → boot text scrolls correctly.

- [ ] **Step 2: Create `src/renderer/DrawBackground.ts`**

Source: `BG_STARS` array generation and `drawBg()`.

```typescript
import { ctx, W, H } from '../canvas.ts';
import { BAR_Y } from '../constants.ts';

export const BG_STARS: Array<[number, number, number]> =
  Array.from({ length: 90 }, () => [
    Math.random() * 820,
    Math.random() * 420,
    Math.random() * 1.5 + 0.5,
  ]);

// balance is the current orb position (-1..1), used for side-glow effect
export function drawBg(balance: number): void { /* paste drawBg() verbatim, use balance param */ }
```

- [ ] **Step 3: Create `src/renderer/DrawUIChrome.ts`**

Source: `CHANGE_BTN`, `ESC_BTN`, `changeHover`, `drawChangeBtn()`, `drawEscHint()`.

```typescript
import { ctx, W, H } from '../canvas.ts';
import { hexAlpha } from './CanvasUtils.ts';

export const CHANGE_BTN = { x: 8,   y: 8,  w: 105, h: 22 };
export const ESC_BTN    = { x: 710, y: 8,  w: 100, h: 22 };

export function drawChangeBtn(hover: boolean): void { /* paste verbatim */ }
export function drawEscHint(): void { /* paste verbatim */ }
```

- [ ] **Step 4: Create `src/renderer/DrawHUD.ts`**

Source: `drawScore()`, `drawBar()`, `drawRoundTimer()`, `drawCountdown()`. These are the largest HUD draw functions (~300 lines).

```typescript
import { ctx, W, H } from '../canvas.ts';
import { BAR_Y, BAR_CX, BAR_HALF, BAR_H, ORB_R, TIMER_CY } from '../constants.ts';
import type { GameState } from '../state/GameState.ts';

export function drawScore(
  state: GameState,
  p1Color: string, p2Color: string,
  scoreScale: [number, number]
): void { /* paste drawScore() verbatim */ }

export function drawBar(
  balance: number,
  p1Color: string, p2Color: string,
  orbBounce: number, orbVelX: number, coinAngle: number, orbitAngle: number,
  orbTrail: Array<{ x: number; age: number }>,
  tapFlash: [number, number]
): void { /* paste drawBar() verbatim */ }

export function drawRoundTimer(roundTimer: number): void { /* paste verbatim */ }
export function drawCountdown(state: GameState): void { /* paste verbatim */ }
```

- [ ] **Step 5: Create `src/renderer/DrawPlayers.ts`**

Source: `drawPlayers()`, `drawWinCelebration()`.

```typescript
import type { GameState } from '../state/GameState.ts';

export function drawPlayers(
  state: GameState,
  p1Color: string, p2Color: string,
  tps: [number, number]
): void { /* paste drawPlayers() verbatim */ }

export function drawWinCelebration(
  state: GameState,
  p1Color: string, p2Color: string,
  t: number
): void { /* paste drawWinCelebration() verbatim */ }
```

- [ ] **Step 6: Create `src/renderer/DrawOverlays.ts`**

Source: `drawOverlay()`, `drawScreenFlash()`.

```typescript
import { ctx, W, H } from '../canvas.ts';

export function drawOverlay(color: string, title: string, sub: string): void { /* paste verbatim */ }
export function drawScreenFlash(flashAlpha: number, flashCol: string): void { /* paste verbatim */ }
```

- [ ] **Step 7: Create `src/renderer/DrawScreens.ts`**

Source: `drawCharSelect()`, `drawNameEntry()`, `drawLeaderboard()`, `drawHowToPlay()`, `drawLobby()` — the 5 full-screen draws (~700 lines total).

```typescript
import type { GameState } from '../state/GameState.ts';
import type { IStorageManager } from '../storage/StorageManager.ts';

export function drawCharSelect(state: GameState, p1Color: string, p2Color: string, t: number): void { /* paste */ }
export function drawLobby(state: GameState, storage: IStorageManager, lobbyHover: boolean, t: number): void { /* paste */ }
export function drawNameEntry(state: GameState, p1Color: string, p2Color: string): void { /* paste */ }
export function drawLeaderboard(storage: IStorageManager, lbNewName: string | null): void { /* paste */ }
export function drawHowToPlay(howToPlayFrom: string): void { /* paste */ }
```

- [ ] **Step 8: Create `src/renderer/Renderer.ts`** — the top-level draw compositor

This replaces the large `draw()` function in `main-legacy.ts`. It imports all Draw* modules and calls them in the correct order.

```typescript
import { ctx } from '../canvas.ts';
import { getShakeOffset } from '../vfx/ScreenEffects.ts';
import { drawParticles } from '../vfx/Particles.ts';
import { drawComboTexts, drawPuTexts } from '../vfx/FloatTexts.ts';
import { drawPowerUp, drawEffectHud } from '../powerups/PowerUpSystem.ts';
import { rhythmTracker } from '../rhythm/RhythmTracker.ts';
import { drawBoot } from './DrawBoot.ts';
import { drawBg } from './DrawBackground.ts';
import { drawScore, drawBar, drawRoundTimer, drawCountdown } from './DrawHUD.ts';
import { drawPlayers, drawWinCelebration } from './DrawPlayers.ts';
import { drawOverlay, drawScreenFlash } from './DrawOverlays.ts';
import { drawCharSelect, drawLobby, drawNameEntry, drawLeaderboard, drawHowToPlay } from './DrawScreens.ts';
import { drawChangeBtn, drawEscHint } from './DrawUIChrome.ts';
import type { GameState } from '../state/GameState.ts';
import type { IStorageManager } from '../storage/StorageManager.ts';

export interface RenderContext {
  state: GameState;
  p1Color: string;
  p2Color: string;
  scoreScale: [number, number];
  balance: number;       // current orb position, comes from active game mode
  roundTimer: number;    // comes from active game mode
  t: number;             // elapsed seconds (performance.now() / 1000)
  lobbyHover: boolean;
  changeHover: boolean;
  lbNewName: string | null;
  howToPlayFrom: string;
  flashAlpha: number;
  flashCol: string;
}

export function draw(rc: RenderContext): void {
  const { state } = rc;
  ctx.save();
  const { x: sx, y: sy } = getShakeOffset();
  ctx.translate(sx, sy);

  // Full-screen phases — render and return
  if (state.phase === 'boot')        { drawBoot(); ctx.restore(); return; }
  if (state.phase === 'howToPlay')   { drawHowToPlay(rc.howToPlayFrom); drawScreenFlash(rc.flashAlpha, rc.flashCol); ctx.restore(); return; }
  if (state.phase === 'nameEntry')   { drawNameEntry(state, rc.p1Color, rc.p2Color); ctx.restore(); return; }
  if (state.phase === 'leaderboard') { drawLeaderboard(/* storage, rc.lbNewName */); ctx.restore(); return; }
  if (state.phase === 'charSelect')  { drawCharSelect(state, rc.p1Color, rc.p2Color, rc.t); drawScreenFlash(rc.flashAlpha, rc.flashCol); ctx.restore(); return; }

  // Common gameplay layers (lobby / countdown / playing / roundEnd / gameOver)
  drawBg(rc.balance);
  drawScore(state, rc.p1Color, rc.p2Color, rc.scoreScale);
  rhythmTracker.drawMeter(1, rc.p1Color, rc.p2Color);
  rhythmTracker.drawMeter(2, rc.p1Color, rc.p2Color);
  drawBar(rc.balance, rc.p1Color, rc.p2Color, /* ... VFX state from ScreenEffects */);
  drawPlayers(state, rc.p1Color, rc.p2Color, [rhythmTracker.getTPS(1), rhythmTracker.getTPS(2)]);
  drawParticles();

  if (state.phase === 'lobby')                                { drawLobby(state, /* storage, rc.lobbyHover, rc.t */); }
  if (state.phase === 'playing')                              { drawRoundTimer(rc.roundTimer); }
  if (state.phase === 'countdown')                            { drawCountdown(state); }
  if (state.phase === 'roundEnd' || state.phase === 'gameOver') {
    drawOverlay(/* ... */);
    drawWinCelebration(state, rc.p1Color, rc.p2Color, rc.t);
  }

  drawPowerUp();
  drawComboTexts();
  drawPuTexts();
  drawEffectHud(rc.p1Color, rc.p2Color);
  drawChangeBtn(rc.changeHover);
  drawEscHint();
  drawScreenFlash(rc.flashAlpha, rc.flashCol);

  ctx.restore();
}
```

- [ ] **Step 9: In `main-legacy.ts`, delete the original `draw()` function and all individual `draw*()` function definitions. Import and call the new Renderer:**

```typescript
import { draw, RenderContext } from './renderer/Renderer.ts';

// In the RAF loop, replace the old draw() call with:
draw({
  state,
  p1Color:      getAlienColor(state.p1Icon),
  p2Color:      getAlienColor(state.p2Icon),
  scoreScale:   scoreScale,
  balance:      /* from game mode or state.balance */,
  roundTimer:   /* from game mode */,
  t:            performance.now() / 1000,
  lobbyHover,
  changeHover,
  lbNewName,
  howToPlayFrom,
  flashAlpha,
  flashCol,
});
```

- [ ] **Step 10: Playwright full regression — compare every phase against reference**

```
// New implementation — exercise all phases
browser_navigate("http://localhost:5173")
browser_console_messages()     // must be empty
browser_take_screenshot(filename="reference/screenshots/phase3-done-new-boot.png")

browser_press_key("Space")     // charSelect
browser_take_screenshot(filename="reference/screenshots/phase3-done-new-charSelect.png")

browser_press_key("Space")     // lobby
browser_take_screenshot(filename="reference/screenshots/phase3-done-new-lobby.png")

browser_press_key("Space")     // countdown
browser_take_screenshot(filename="reference/screenshots/phase3-done-new-countdown.png")

browser_press_key("a")
browser_press_key("l")
browser_take_screenshot(filename="reference/screenshots/phase3-done-new-playing.png")

browser_press_key("Escape")
browser_take_screenshot(filename="reference/screenshots/phase3-done-new-lobby2.png")
browser_console_messages()     // must be empty

// Reference — same flow
browser_navigate("http://localhost:5173/reference.html")
browser_take_screenshot(filename="reference/screenshots/phase3-done-ref-boot.png")
browser_press_key("Space")
browser_take_screenshot(filename="reference/screenshots/phase3-done-ref-charSelect.png")
browser_press_key("Space")
browser_take_screenshot(filename="reference/screenshots/phase3-done-ref-lobby.png")
```

Compare all pairs. Any visual difference indicates a regression.

- [ ] **Step 11: Run tests**

```bash
npm test
```

Expected: `16 tests passed`.

- [ ] **Step 12: Commit**

```bash
git add src/renderer/ src/main-legacy.ts reference/screenshots/
git commit -m "refactor: extract all renderer modules and Renderer compositor; phase 3 complete"
```

---

## Phase 3 Complete ✓

**Deliverables:**
- `npm run dev` — all 10 game phases render correctly
- `npm test` — 16 tests pass
- `public/reference.html` still untouched; Playwright confirms visual parity
- `main-legacy.ts` now contains only: RAF loop, `onTap()`, `tickGame()`, `winRound()`, `nextRound()`, `inputBus.subscribe()` block
- New modules: `InputBus`, `KeyboardInput`, `MouseInput`, `TouchInput`, all `Draw*.ts`, `Renderer.ts`

**Key architectural outcome:** `InputBus` dispatches `{ type: 'tap', player }`. In Phase 4, a Transport will also call `inputBus.dispatch({ type: 'tap', player })` when a remote tap arrives — the game loop handles both identically.

**Next:** `docs/migration/phase-4-abstractions.md`
