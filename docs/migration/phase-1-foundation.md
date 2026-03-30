# Phase 1: Reference Preservation + Vite Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## Context for a new agent

**What is this repo?** A browser-based 2-player tapping game called "Spam Wars". The entire game — ~2566 lines of HTML, CSS, and JavaScript — currently lives in a single `index.html` file. No build tools, no modules, no tests.

**What are we doing and why?** We are migrating this to a Vite + TypeScript project with proper module boundaries. The goal is NOT to change behavior — the game must look and play identically after every step. The goal is to make it easy to later add:
1. New visual themes (different colors, sprites, audio)
2. Remote 2-player mode via PartyKit
3. A WPM typing game mode
4. Difficulty settings

**What this phase specifically does:**
1. Preserves the original `index.html` game as a permanent read-only reference (`public/reference.html`) — so we can always compare the new implementation against it
2. Captures golden screenshots of the original game for visual regression
3. Creates the `docs/migration/` directory with all phase plan docs (so any agent can pick up the work)
4. Bootstraps the Vite + TypeScript project with the game script untouched
5. Extracts the lowest-risk modules: canvas setup, constants, canvas utilities, StorageManager, GameState type

**Working directory:** `/Users/yunnie/cc-projects/thumb-app`

**Current repo state at start of Phase 1:**
- `index.html` — the entire game (one file, ~2566 lines)
- `CLAUDE.md` — architecture notes
- `.gitignore`
- No `package.json`, no `src/`, no `tests/`

**How to verify the original game works before starting:**
```bash
open index.html   # macOS
# or: python3 -m http.server 8080
```

**Important file references (in the original `index.html` script block):**
- Canvas setup: lines ~260–270
- Constants (BAR_*, DRIFT_SPD, etc.): lines ~277–309
- Canvas utils (hexAlpha, shadeHex, txt, glowTxt, fireGrad): lines ~1203–1228
- Storage functions (getWins, getLB, etc.): lines ~856–870
- Game state / initState(): lines ~901–927

---

## Task 0: Preserve reference files and capture golden screenshots

**Purpose:** Before touching a single line, lock the original game as a permanent read-only reference. This is what Playwright will compare against in every phase.

**Files:** Create `public/reference.html`, `reference/screenshots/` (dir), `docs/migration/` (dir + 6 files).

- [ ] **Step 1: Copy `index.html` to `public/reference.html`**

```bash
mkdir -p public reference/screenshots docs/migration
cp index.html public/reference.html
```

`public/reference.html` will be served by Vite at `http://localhost:5173/reference.html`. **Never modify this file.**

- [ ] **Step 2: Add a banner comment at the top of `public/reference.html`** (so future agents know not to edit it)

Open `public/reference.html` and add this as the very first line:

```html
<!-- READ-ONLY REFERENCE: Original monolithic game. Do not modify. Used for visual regression comparison. -->
```

- [ ] **Step 3: Serve the original reference file with Python and capture golden screenshots**

```bash
python3 -m http.server 8082 --directory public &
```

Then use Playwright to capture golden screenshots:

```
browser_navigate("http://localhost:8082/reference.html")
browser_wait_for("canvas")
browser_take_screenshot(filename="reference/screenshots/boot.png")

// Advance through boot sequence
browser_press_key("Space")
browser_wait_for(".3s")
browser_take_screenshot(filename="reference/screenshots/charSelect.png")

// Confirm character select → lobby
browser_press_key("Space")
browser_take_screenshot(filename="reference/screenshots/lobby.png")

// Start game
browser_press_key("Space")
// Wait for countdown to finish (~4s)
browser_wait_for(".4s")
browser_press_key("a")
browser_press_key("l")
browser_take_screenshot(filename="reference/screenshots/playing.png")

browser_console_messages()  // should be empty — note any errors for reference
```

Kill the Python server after capturing:
```bash
kill %1
```

- [ ] **Step 4: Write `docs/migration/README.md` to the repo**

This file is the in-repo entry point for any new agent picking up this work:

```markdown
# Spam Wars — Modular Refactoring

## What is this?

Spam Wars is a 2-player browser tapping game. P1 taps `A`, P2 taps `L`.
The orb moves toward whoever taps faster. Push it to your opponent's side to win.
Best-of-3 match. 16 alien characters. 3 power-ups. Retro chiptune audio.

## Why are we refactoring?

The entire game (~2566 lines) lives in `index.html`. We need modularity to support:
1. New visual themes (colors, sprites, audio)
2. Remote 2-player via PartyKit
3. WPM typing game mode
4. Difficulty settings

## Reference file

`public/reference.html` is a READ-ONLY copy of the original game preserved before any changes.
It is served at `http://localhost:5173/reference.html` during development.
Every phase compares the new implementation against this reference using Playwright screenshots.
Golden screenshots are in `reference/screenshots/`.

## How to run

```bash
npm install
npm run dev         # dev server at localhost:5173
npm test            # run unit tests
npm run build       # production build
```

Reference (original game): `http://localhost:5173/reference.html`
New implementation:         `http://localhost:5173/`

## Migration phases

| Phase | Doc | Status |
|---|---|---|
| 1 | [phase-1-foundation.md](phase-1-foundation.md) | ☐ |
| 2 | [phase-2-systems.md](phase-2-systems.md) | ☐ |
| 3 | [phase-3-input-renderer.md](phase-3-input-renderer.md) | ☐ |
| 4 | [phase-4-abstractions.md](phase-4-abstractions.md) | ☐ |
| 5 | [phase-5-theme-words.md](phase-5-theme-words.md) | ☐ |

## Key interface contracts (defined in Phase 4-5)

- `GameMode` — abstract class for game rule sets (`src/modes/GameMode.ts`)
- `Transport` — abstract class for local/remote input (`src/transport/Transport.ts`)
- `Theme` — JSON schema for visual/audio customization (`src/theme/Theme.ts`)
```

- [ ] **Step 5: Write phase plan docs to `docs/migration/`**

Copy each of the following plan files into the repo:
- `/Users/yunnie/.claude/plans/phase-1-vite-foundation.md` → `docs/migration/phase-1-foundation.md`
- `/Users/yunnie/.claude/plans/phase-2-game-systems.md` → `docs/migration/phase-2-systems.md`
- `/Users/yunnie/.claude/plans/phase-3-input-renderer.md` → `docs/migration/phase-3-input-renderer.md`
- `/Users/yunnie/.claude/plans/phase-4-abstractions.md` → `docs/migration/phase-4-abstractions.md`
- `/Users/yunnie/.claude/plans/phase-5-theme-words.md` → `docs/migration/phase-5-theme-words.md`

- [ ] **Step 6: Commit the reference files and docs**

```bash
git add public/reference.html reference/screenshots/ docs/migration/
git commit -m "chore: preserve reference game and add migration docs"
```

---

## Task 1: Scaffold the Vite project

**State at start:** `index.html` is the only source file. `public/reference.html` and `docs/migration/` now exist.

**Files:** Create `package.json`, `vite.config.ts`, `tsconfig.json`. Modify `index.html`. Create `src/main-legacy.ts`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "spam-wars",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.5.0",
    "jsdom": "^24.0.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 4: Extract the `<script>` block from `index.html` into `src/main-legacy.ts`**

Find the `<script>` tag in `index.html` (it starts after the `<body>` and contains all the game code). Copy everything between `<script>` and `</script>` into `src/main-legacy.ts`. Do not change a single character of the content.

- [ ] **Step 5: In `index.html`, replace the original `<script>...</script>` block with:**

```html
<script type="module" src="/src/main-legacy.ts"></script>
```

The `<link>` tags for Google Fonts and the `<canvas id="c">` element remain exactly as they are.

- [ ] **Step 6: Run `npm install`**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Start the dev server in the background**

```bash
npm run dev &
```

Expected: Terminal shows `Local: http://localhost:5173`

- [ ] **Step 8: Playwright comparison — new vs reference**

Open both the new implementation and the preserved reference. They must look identical.

```
// New implementation
browser_navigate("http://localhost:5173")
browser_wait_for("canvas")
browser_console_messages()     // MUST be empty — any error here means the scaffold failed
browser_take_screenshot(filename="reference/screenshots/phase1-task1-new-boot.png")

// Reference (original game)
browser_navigate("http://localhost:5173/reference.html")
browser_wait_for("canvas")
browser_take_screenshot(filename="reference/screenshots/phase1-task1-ref-boot.png")
```

Visually compare the two screenshots. They must show the same boot screen text and layout.

- [ ] **Step 9: Commit**

```bash
git add package.json vite.config.ts tsconfig.json index.html src/main-legacy.ts
git commit -m "chore: scaffold Vite + TypeScript project, game script verbatim in main-legacy.ts"
```

---

## Task 2: Extract canvas setup and constants

**State at start:** `src/main-legacy.ts` contains the full game script. The canvas setup block is near lines 260–270 of the original; the constants block is at lines 277–309.

**Files:** Create `src/canvas.ts`, `src/constants.ts`. Modify `src/main-legacy.ts`.

- [ ] **Step 1: Create `src/canvas.ts`**

This replaces the canvas setup block in `main-legacy.ts` (find the block that sets `canvas.width`, `canvas.height`, and calls `ctx.scale()`):

```typescript
export const canvas = document.getElementById('c') as HTMLCanvasElement;
export const ctx = canvas.getContext('2d')!;
export const W = 820;
export const H = 420;
export const DPR = Math.min(window.devicePixelRatio || 1, 2);

canvas.width = W * DPR;
canvas.height = H * DPR;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(DPR, DPR);
```

- [ ] **Step 2: Create `src/constants.ts`**

Find and move these values from `main-legacy.ts` (originally lines ~277–309):

```typescript
export const BAR_Y = 248;
export const BAR_CX = 410;
export const BAR_HALF = 180;
export const BAR_H = 30;
export const ORB_R = 19;
export const TIMER_CY = BAR_Y - 72;
export const TAP_STEP = 0.068;
export const DRIFT_SPD = 0.10;
export const ROUND_TIME = 30;
export const METER_SEGS = 12;
export const METER_H = 188;
export const METER_W = 16;
export const METER_GAP = 3;
export const SEG_H = (METER_H - (METER_SEGS - 1) * METER_GAP) / METER_SEGS;
export const LOBBY_BTN = { x: 310, y: 154, w: 200, h: 44 };
export const HOW_BTN   = { x: 335, y: 8,   w: 70,  h: 22 };
export const HS_BTN    = { x: 415, y: 8,   w: 90,  h: 22 };
```

- [ ] **Step 3: Delete those blocks from `main-legacy.ts`, add imports at the top:**

```typescript
import { canvas, ctx, W, H, DPR } from './canvas.ts';
import { BAR_Y, BAR_CX, BAR_HALF, BAR_H, ORB_R, TIMER_CY, TAP_STEP, DRIFT_SPD,
         ROUND_TIME, METER_SEGS, METER_H, METER_W, METER_GAP, SEG_H,
         LOBBY_BTN, HOW_BTN, HS_BTN } from './constants.ts';
```

- [ ] **Step 4: Playwright comparison**

```
browser_navigate("http://localhost:5173")
browser_console_messages()     // must be empty
browser_take_screenshot(filename="reference/screenshots/phase1-task2-new.png")

browser_navigate("http://localhost:5173/reference.html")
browser_take_screenshot(filename="reference/screenshots/phase1-task2-ref.png")
```

Compare: identical boot screens.

- [ ] **Step 5: Commit**

```bash
git add src/canvas.ts src/constants.ts src/main-legacy.ts
git commit -m "refactor: extract canvas setup and game constants"
```

---

## Task 3: Extract canvas utility functions

**State at start:** `main-legacy.ts` still contains `hexAlpha`, `shadeHex`, `txt`, `glowTxt`, `fireGrad` (originally lines ~1203–1228).

**Files:** Create `src/renderer/CanvasUtils.ts`. Modify `src/main-legacy.ts`.

- [ ] **Step 1: Create `src/renderer/CanvasUtils.ts`**

```typescript
import { ctx } from '../canvas.ts';

export function hexAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function shadeHex(hex: string, d: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + d));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + d));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + d));
  return `rgb(${r},${g},${b})`;
}

export function txt(text: string, x: number, y: number): void {
  ctx.fillText(text, x, y);
}

export function glowTxt(text: string, x: number, y: number): void {
  const prev = ctx.shadowBlur;
  ctx.shadowBlur = 8;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = prev;
}

export function fireGrad(y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0,    '#ffe600');
  g.addColorStop(0.35, '#ff9900');
  g.addColorStop(0.70, '#ff3300');
  g.addColorStop(1,    '#cc1100');
  return g;
}
```

- [ ] **Step 2: In `main-legacy.ts`, delete those 5 function definitions and add:**

```typescript
import { hexAlpha, shadeHex, txt, glowTxt, fireGrad } from './renderer/CanvasUtils.ts';
```

- [ ] **Step 3: Playwright comparison — test text rendering**

```
browser_navigate("http://localhost:5173")
browser_console_messages()     // must be empty
browser_press_key("Space")     // advance past boot/howToPlay
browser_take_screenshot(filename="reference/screenshots/phase1-task3-new-lobby.png")

browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_take_screenshot(filename="reference/screenshots/phase1-task3-ref-lobby.png")
```

Compare: lobby text, fire gradient on title, and all fonts must match.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/CanvasUtils.ts src/main-legacy.ts
git commit -m "refactor: extract canvas utility functions"
```

---

## Task 4: Extract StorageManager

**State at start:** `main-legacy.ts` contains `getWins()`, `addWin()`, `getLB()`, `saveLB()`, `addLBEntry()` (originally lines ~856–870) plus inline `localStorage.getItem('spamwars_seen_howto')` calls.

**Files:** Create `src/storage/StorageManager.ts`, `tests/StorageManager.test.ts`. Modify `src/main-legacy.ts`.

**localStorage keys used by the original game:**
- `spamwars_wins_p1` / `spamwars_wins_p2` — integer win counts
- `spamwars_lb` — JSON array of leaderboard entries
- `spamwars_seen_howto` — `'1'` if how-to-play has been shown

- [ ] **Step 1: Create `src/storage/StorageManager.ts`**

```typescript
export interface LeaderboardEntry {
  name: string;
  wins: number;
  icon: number;
  date: string;
  spamCount: number;
  spamRate: string;
}

export interface IStorageManager {
  getWins(player: 1 | 2): number;
  addWin(player: 1 | 2): void;
  getLB(): LeaderboardEntry[];
  saveLB(lb: LeaderboardEntry[]): void;
  addLBEntry(name: string, icon: number, spamCount: number, spamRate: string): void;
  getSeenHowTo(): boolean;
  setSeenHowTo(): void;
}

export class LocalStorageManager implements IStorageManager {
  getWins(p: 1 | 2): number {
    return parseInt(localStorage.getItem(`spamwars_wins_p${p}`) || '0') || 0;
  }
  addWin(p: 1 | 2): void {
    localStorage.setItem(`spamwars_wins_p${p}`, String(this.getWins(p) + 1));
  }
  getLB(): LeaderboardEntry[] {
    try { return JSON.parse(localStorage.getItem('spamwars_lb') || '[]'); }
    catch { return []; }
  }
  saveLB(lb: LeaderboardEntry[]): void {
    localStorage.setItem('spamwars_lb', JSON.stringify(lb));
  }
  addLBEntry(name: string, icon: number, spamCount: number, spamRate: string): void {
    const lb = this.getLB();
    const date = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    const existing = lb.find(e => e.name === name);
    if (existing) {
      existing.wins++;
      existing.icon = icon;
      existing.date = date;
      existing.spamCount = Math.max(existing.spamCount, spamCount);
      existing.spamRate = spamRate;
    } else {
      lb.push({ name, wins: 1, icon, date, spamCount, spamRate });
    }
    lb.sort((a, b) => b.wins - a.wins);
    this.saveLB(lb.slice(0, 10));
  }
  getSeenHowTo(): boolean {
    return localStorage.getItem('spamwars_seen_howto') === '1';
  }
  setSeenHowTo(): void {
    localStorage.setItem('spamwars_seen_howto', '1');
  }
}

// In-memory implementation for unit tests (no localStorage dependency)
export class MemoryStorageManager implements IStorageManager {
  private wins: [number, number] = [0, 0];
  private lb: LeaderboardEntry[] = [];
  private seenHowTo = false;

  getWins(p: 1 | 2): number { return this.wins[p - 1]; }
  addWin(p: 1 | 2): void { this.wins[p - 1]++; }
  getLB(): LeaderboardEntry[] { return [...this.lb]; }
  saveLB(lb: LeaderboardEntry[]): void { this.lb = [...lb]; }
  addLBEntry(name: string, icon: number, spamCount: number, spamRate: string): void {
    const existing = this.lb.find(e => e.name === name);
    if (existing) { existing.wins++; }
    else { this.lb.push({ name, wins: 1, icon, date: '01/01', spamCount, spamRate }); }
    this.lb.sort((a, b) => b.wins - a.wins);
    this.lb = this.lb.slice(0, 10);
  }
  getSeenHowTo(): boolean { return this.seenHowTo; }
  setSeenHowTo(): void { this.seenHowTo = true; }
}

export const storage: IStorageManager = new LocalStorageManager();
```

- [ ] **Step 2: In `main-legacy.ts`, delete the 5 storage functions and the inline `localStorage.getItem('spamwars_seen_howto')` references. Add at the top:**

```typescript
import { storage } from './storage/StorageManager.ts';
```

Replace call sites:
- `getWins(1)` → `storage.getWins(1)`
- `addWin(1)` → `storage.addWin(1)`
- `getLB()` → `storage.getLB()`
- `saveLB(lb)` → `storage.saveLB(lb)`
- `addLBEntry(...)` → `storage.addLBEntry(...)`
- `localStorage.getItem('spamwars_seen_howto') === '1'` → `storage.getSeenHowTo()`
- `localStorage.setItem('spamwars_seen_howto', '1')` → `storage.setSeenHowTo()`

- [ ] **Step 3: Create `tests/StorageManager.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageManager } from '../src/storage/StorageManager.ts';

describe('MemoryStorageManager', () => {
  let s: MemoryStorageManager;
  beforeEach(() => { s = new MemoryStorageManager(); });

  it('getWins returns 0 initially', () => {
    expect(s.getWins(1)).toBe(0);
    expect(s.getWins(2)).toBe(0);
  });
  it('addWin increments count', () => {
    s.addWin(1); s.addWin(1);
    expect(s.getWins(1)).toBe(2);
    expect(s.getWins(2)).toBe(0);
  });
  it('getLB returns [] initially', () => {
    expect(s.getLB()).toEqual([]);
  });
  it('addLBEntry creates entry', () => {
    s.addLBEntry('ACE', 0, 100, '8.5');
    expect(s.getLB()[0].name).toBe('ACE');
    expect(s.getLB()[0].wins).toBe(1);
  });
  it('addLBEntry increments on duplicate name', () => {
    s.addLBEntry('ACE', 0, 100, '8.5');
    s.addLBEntry('ACE', 0, 120, '9.0');
    expect(s.getLB().filter(e => e.name === 'ACE').length).toBe(1);
    expect(s.getLB()[0].wins).toBe(2);
  });
  it('addLBEntry sorts by wins descending', () => {
    s.addLBEntry('B', 0, 50, '5.0');
    s.addLBEntry('A', 0, 50, '5.0');
    s.addLBEntry('A', 0, 50, '5.0');
    expect(s.getLB()[0].name).toBe('A');
  });
  it('caps leaderboard at 10 entries', () => {
    for (let i = 0; i < 12; i++) s.addLBEntry(`P${i}`, 0, 100, '5.0');
    expect(s.getLB().length).toBe(10);
  });
  it('getSeenHowTo returns false initially', () => {
    expect(s.getSeenHowTo()).toBe(false);
  });
  it('setSeenHowTo makes getSeenHowTo return true', () => {
    s.setSeenHowTo();
    expect(s.getSeenHowTo()).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected output: `8 tests passed`.

- [ ] **Step 5: Commit**

```bash
git add src/storage/StorageManager.ts tests/StorageManager.test.ts src/main-legacy.ts
git commit -m "refactor: extract StorageManager; add MemoryStorageManager for tests"
```

---

## Task 5: Extract GameState type

**State at start:** `main-legacy.ts` contains `let state = { ... }` (lines ~901–927) and `function initState()`. The `state` object drives everything: which phase is active, scores, round, countdown state, per-player tap counts, icon selections, etc.

**Files:** Create `src/state/GameState.ts`, `tests/GameState.test.ts`. Modify `src/main-legacy.ts`.

- [ ] **Step 1: Create `src/state/GameState.ts`**

```typescript
export type Phase =
  | 'boot' | 'howToPlay' | 'charSelect' | 'lobby'
  | 'countdown' | 'playing' | 'roundEnd'
  | 'nameEntry' | 'leaderboard' | 'gameOver';

export interface GameState {
  phase: Phase;
  scores: [number, number];    // match wins per player
  round: number;               // 1, 2, or 3
  roundWinner: 0 | 1 | 2 | null; // 0 = draw
  countdown: number;           // 3, 2, 1, 0 (GO!)
  cdTimer: number;             // time since last countdown tick
  cdScale: number;             // animation scale for countdown number
  reTimer: number;             // roundEnd delay countdown
  tapFlash: [number, number];  // flash animation on tap (decays from ~0.18 to 0)
  tapCount: [number, number];  // taps this round
  totalTaps: [number, number]; // taps this match (for leaderboard)
  timeActive: [number, number]; // active time (excludes freeze)
  p1Icon: number;              // index into ALIENS[] (0–15)
  p2Icon: number;
  p1Cursor: number;            // selection cursor during charSelect
  p2Cursor: number;
}

export function initGameState(): GameState {
  return {
    phase: 'boot',
    scores: [0, 0],
    round: 1,
    roundWinner: null,
    countdown: 3,
    cdTimer: 0,
    cdScale: 1,
    reTimer: 0,
    tapFlash: [0, 0],
    tapCount: [0, 0],
    totalTaps: [0, 0],
    timeActive: [0, 0],
    p1Icon: 0,
    p2Icon: 8,
    p1Cursor: 0,
    p2Cursor: 8,
  };
}

export function cloneGameState(s: GameState): GameState {
  return JSON.parse(JSON.stringify(s)) as GameState;
}
```

- [ ] **Step 2: In `main-legacy.ts`, replace the `let state = {...}` block and `function initState()` with:**

```typescript
import { GameState, initGameState, cloneGameState } from './state/GameState.ts';
let state: GameState = initGameState();
```

Replace every `state = initState()` / `initState()` call with `state = initGameState()`.

- [ ] **Step 3: Create `tests/GameState.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { initGameState, cloneGameState } from '../src/state/GameState.ts';

describe('initGameState', () => {
  it('starts in boot phase', () => {
    expect(initGameState().phase).toBe('boot');
  });
  it('starts with scores [0,0]', () => {
    expect(initGameState().scores).toEqual([0, 0]);
  });
  it('starts at round 1', () => {
    expect(initGameState().round).toBe(1);
  });
  it('cloneGameState produces a deep copy', () => {
    const a = initGameState();
    const b = cloneGameState(a);
    b.scores[0] = 99;
    expect(a.scores[0]).toBe(0);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: `12 tests passed` (8 from Task 4 + 4 new).

- [ ] **Step 5: Playwright full comparison — all critical phases**

Check 4 screens against reference. Each must look identical to the golden screenshots captured in Task 0.

```
// New implementation — boot
browser_navigate("http://localhost:5173")
browser_wait_for("canvas")
browser_console_messages()     // MUST be empty
browser_take_screenshot(filename="reference/screenshots/phase1-done-new-boot.png")

// New implementation — advance to lobby
browser_press_key("Space")
browser_press_key("Space")
browser_take_screenshot(filename="reference/screenshots/phase1-done-new-lobby.png")

// Reference — boot
browser_navigate("http://localhost:5173/reference.html")
browser_wait_for("canvas")
browser_take_screenshot(filename="reference/screenshots/phase1-done-ref-boot.png")

// Reference — lobby
browser_press_key("Space")
browser_press_key("Space")
browser_take_screenshot(filename="reference/screenshots/phase1-done-ref-lobby.png")
```

Visually compare new-boot vs ref-boot and new-lobby vs ref-lobby. They must be identical.

- [ ] **Step 6: Run production build**

```bash
npm run build
```

Expected: `dist/` created, zero TypeScript errors in output.

- [ ] **Step 7: Commit**

```bash
git add src/state/GameState.ts tests/GameState.test.ts src/main-legacy.ts reference/screenshots/
git commit -m "refactor: extract GameState type + initGameState; phase 1 complete"
```

---

## Phase 1 Complete ✓

**Deliverables:**
- `public/reference.html` — READ-ONLY original game, served at `/reference.html`
- `reference/screenshots/` — golden screenshots for visual regression
- `docs/migration/` — all 6 plan docs written to the repo
- `npm run dev` — game works, visually identical to reference
- `npm test` — 12 tests pass
- `npm run build` — zero TypeScript errors
- New modules: `canvas.ts`, `constants.ts`, `renderer/CanvasUtils.ts`, `storage/StorageManager.ts`, `state/GameState.ts`
- `main-legacy.ts` — lighter but still contains all game logic (no behavior changes)

**Next:** `docs/migration/phase-2-systems.md`
