# Phase 5: Theme System + Word Lists + Final Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## Context for a new agent

### What is this project?

**Spam Wars** is a 2-player browser tapping game. Player 1 taps `A`, Player 2 taps `L`. Whoever pushes the orb to their opponent's side wins a round. Best-of-3 match. 16 selectable pixel-art alien characters. 3 power-up types (SPD/REV/FRZ). Retro chiptune audio (Web Audio API).

The original game lived entirely in a monolithic `index.html` (~2566 lines). This 5-phase refactor migrates it to a **Vite 5 + TypeScript 5** project without changing any visible behavior.

**You are implementing Phase 5** — the final phase. The game must look and feel identical to the original after every task.

### What the previous 4 phases did

- **Phase 1:** Created the Vite project, `src/constants.ts`, `src/utils.ts`, `StorageManager`, `GameState`. Entry point: `src/main-legacy.ts` which still holds the RAFloop and all game logic not yet extracted. `public/reference.html` is the read-only copy of the original. `reference/screenshots/` has golden images of the original. `docs/migration/` has all plan docs in the repo.
- **Phase 2:** Extracted `AlienSprites.ts`, `Particles.ts`, `ScreenEffects.ts`, `FloatTexts.ts`, `ScorePop.ts`, `RhythmTracker.ts`, `ChiptuneAudio.ts`, `PowerUpSystem.ts`, `MobileScale.ts`.
- **Phase 3:** Created `InputBus.ts`, `KeyboardInput.ts`, `MouseInput.ts`, `TouchInput.ts`. Extracted all `Draw*.ts` modules and `Renderer.ts`. `main-legacy.ts` no longer contains any draw logic.
- **Phase 4:** Created `PhaseController.ts`, `GameMode.ts`, `TugOfWarMode.ts`, `ModeRegistry.ts`, `Transport.ts`, `LocalTransport.ts`, `PartyKitTransport.ts`. All round-transition and tick logic is fully delegated.

### What `src/main-legacy.ts` contains NOW (start of Phase 5)

At the start of Phase 5, `main-legacy.ts` is essentially a thin wiring file:
- Imports and wires all extracted modules
- RAF loop calling `renderer.draw(renderContext)`
- `inputBus.subscribe()` routing `GameAction` to `mode.onInput()`
- `themeManager.load(retro)` — **NOT YET ADDED** (Phase 5 Task 1 adds this)
- Inline hardcoded color strings still appear in a few draw files (Phase 5 Task 1 removes them)

### What this phase does

1. **Task 0:** Copy this plan to `docs/migration/phase-5-theme-words.md` in the repo.
2. **Task 1:** Define `Theme` type + `ThemeManager`. Extract all hardcoded colors/sprites/audio into `retro.theme.json`. Wire draw files and `AlienSprites` to read from the theme.
3. **Task 2:** Add `WordList.ts` + bundled JSON word lists (easy/medium/hard) for the future WPM game mode.
4. **Task 3:** Rename `main-legacy.ts` → `main.ts`. Run `npm run build`. Full regression Playwright pass comparing new vs reference.

### Reference file

`public/reference.html` is the read-only original game, served by Vite at `http://localhost:5173/reference.html`. **Never modify it.** Use it for visual regression comparison in every Playwright step.

### How to start

```bash
cd /path/to/spam-wars
npm install           # if node_modules missing
npm run dev           # Vite dev server on http://localhost:5173
npm test              # should show 31 tests passing before you start
```

### Key source line references (original `index.html`, for your context)

- Colors block: lines ~277–303 — `P1C()`, `P2C()`, bar/orb geometry constants
- `SHAPES` (pixel-art grids): lines ~612–660
- `ALIENS` array (16 entries with `s`, `c`, `e` fields): lines ~661–695
- `SP_SCALES`, `p1RootHz`, `p2RootHz` in audio: lines ~374–380
- All `'#080c1c'`, `'#ff8800'`, `'#8833cc'`, `'#ff2266'` hex strings: scattered throughout draw functions

---

## Task 0: Copy plan to repo

**Files:** Write `docs/migration/phase-5-theme-words.md` in the repo.

- [ ] **Step 1: Copy this plan file into the repo**

```bash
cp /path/to/this/plan docs/migration/phase-5-theme-words.md
git add docs/migration/phase-5-theme-words.md
git commit -m "docs: add phase-5 migration plan to repo"
```

> **Note:** Replace `/path/to/this/plan` with wherever this file is located. If working from `docs/migration/phase-5-theme-words.md` already in the repo, skip this task.

---

## Task 1: Define Theme type and extract retro.theme.json

**Files:** Create `src/theme/Theme.ts`, `src/theme/ThemeManager.ts`, `src/theme/themes/retro.theme.json`. Update `AlienSprites.ts`, `ChiptuneAudio.ts`, all `Draw*.ts` files.

**Why this matters:** After this task, swapping the entire look/feel of the game — colors, sprites, fonts, audio pitch — requires only loading a new JSON file. No code changes.

- [ ] **Step 1: Create `src/theme/Theme.ts`**

```typescript
export type BackgroundType = 'stars' | 'grid' | 'solid';
export type AudioStyle    = 'chiptune' | 'synth' | 'silent';

export interface ThemeColors {
  bg: string;              // canvas background fill — '#080c1c'
  p1Default: string;       // fallback P1 color — '#8833cc'
  p2Default: string;       // fallback P2 color — '#ff2266'
  accent: string;          // VS box, round text  — '#ff8800'
  fire: [string, string, string, string]; // gradient stops
  text: string;            // primary text — '#ffffff'
  meterFill: [string, string, string, string, string, string]; // 6-stop low→high ramp
  barFill: string;         // tug bar casing — '#06040e'
  starColor: string;       // background stars — '#ffffff'
}

export interface ThemeFonts {
  main: string;            // CSS font stack — '"Press Start 2P", monospace'
  fallback: string;        // system fallback — 'monospace'
  googleFontsUrl?: string; // optional link href
}

export interface ThemeBackground {
  type: BackgroundType;
  starCount?: number;
  gridColor?: string;
  solidColor?: string;
}

export interface AlienDef {
  s: number;   // index into shapes[]
  c: string;   // body color hex
  e: string;   // eye color hex
}

export interface ThemeSprites {
  shapes: number[][][];  // array of pixel-art grids (0=empty, 1=body, 2=eye)
  aliens: AlienDef[];
}

export interface ThemeAudio {
  style: AudioStyle;
  p1RootHz?: number;          // chiptune: 587 (D5)
  p2RootHz?: number;          // chiptune: 440 (A4)
  scales?: [number, number][]; // SP_SCALES equivalent
}

export interface Theme {
  id: string;
  label: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  background: ThemeBackground;
  sprites: ThemeSprites;
  audio: ThemeAudio;
}
```

- [ ] **Step 2: Create `src/theme/themes/retro.theme.json`**

Extract every hardcoded value from the draw files and AlienSprites. The `shapes` array is the current `SHAPES` constant (original lines ~612–660); `aliens` is the current `ALIENS` constant (original lines ~661–695).

```json
{
  "id": "retro",
  "label": "Retro Arcade",
  "colors": {
    "bg": "#080c1c",
    "p1Default": "#8833cc",
    "p2Default": "#ff2266",
    "accent": "#ff8800",
    "fire": ["#ffe600", "#ff9900", "#ff3300", "#cc1100"],
    "text": "#ffffff",
    "meterFill": ["#224466", "#2255aa", "#3399ff", "#55ddff", "#aaffee", "#ffffff"],
    "barFill": "#06040e",
    "starColor": "#ffffff"
  },
  "fonts": {
    "main": "\"Press Start 2P\", monospace",
    "fallback": "monospace",
    "googleFontsUrl": "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
  },
  "background": { "type": "stars", "starCount": 90 },
  "sprites": {
    "shapes": [
      [ /* SHAPES[0] — crab grid, copy from AlienSprites.ts or original index.html lines ~612–625 */ ],
      [ /* SHAPES[1] — insect grid */ ],
      [ /* SHAPES[2] — blob grid */ ],
      [ /* SHAPES[3] — spider grid */ ]
    ],
    "aliens": [
      { "s": 0, "c": "#8833cc", "e": "#ffaaff" },
      /* ... all 16 ALIENS entries, copy from AlienSprites.ts or original lines ~661–695 ... */
    ]
  },
  "audio": {
    "style": "chiptune",
    "p1RootHz": 587,
    "p2RootHz": 440,
    "scales": [
      [1.0, 1.0], [1.1, 1.05], [1.2, 1.15],
      [0.9, 0.95], [1.3, 1.2], [0.85, 0.9]
    ]
  }
}
```

> **Important:** Copy the actual pixel grid arrays from `src/sprites/AlienSprites.ts` (which has them from Phase 2 extraction). Do not leave placeholders in the JSON — the game will break.

- [ ] **Step 3: Create `src/theme/ThemeManager.ts`**

```typescript
import type { Theme } from './Theme.ts';

export class ThemeManager {
  private theme: Theme | null = null;

  load(json: unknown): Theme {
    this.validate(json);
    this.theme = json as Theme;
    this.applyCSS(this.theme);
    return this.theme;
  }

  validate(json: unknown): asserts json is Theme {
    if (!json || typeof json !== 'object') throw new Error('Theme must be an object');
    const t = json as Record<string, unknown>;
    if (typeof t.id !== 'string')         throw new Error('Theme missing id');
    if (!t.colors)                        throw new Error('Theme missing colors');
    if (typeof (t.colors as any).bg !== 'string')
                                          throw new Error('Theme missing colors.bg');
    if (!t.sprites)                       throw new Error('Theme missing sprites');
    if (!Array.isArray((t.sprites as any).aliens))
                                          throw new Error('Theme sprites.aliens must be an array');
    if (!Array.isArray((t.sprites as any).shapes))
                                          throw new Error('Theme sprites.shapes must be an array');
    const validAudio = ['chiptune', 'synth', 'silent'];
    if (!validAudio.includes((t.audio as any)?.style))
                                          throw new Error('Theme audio.style must be "chiptune" | "synth" | "silent"');
  }

  applyCSS(theme: Theme): void {
    const root = document.documentElement;
    root.style.setProperty('--sw-font-main', theme.fonts.main);
    root.style.setProperty('--sw-bg', theme.colors.bg);
    root.style.setProperty('--sw-accent', theme.colors.accent);

    if (theme.fonts.googleFontsUrl) {
      const id = `sw-gfont-${theme.id}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id; link.rel = 'stylesheet'; link.href = theme.fonts.googleFontsUrl;
        document.head.appendChild(link);
      }
    }
  }

  get(): Theme {
    if (!this.theme) throw new Error('No theme loaded. Call themeManager.load(json) first.');
    return this.theme;
  }

  getAliens()  { return this.get().sprites.aliens; }
  getShapes()  { return this.get().sprites.shapes; }
}

export const themeManager = new ThemeManager();
```

- [ ] **Step 4: Wire theme loading in `src/main-legacy.ts`**

Add these two lines at the very top of the file, before any other imports that touch colors:

```typescript
import { themeManager } from './theme/ThemeManager.ts';
import retro from './theme/themes/retro.theme.json';

themeManager.load(retro);
```

- [ ] **Step 5: Update `AlienSprites.ts` to read from `themeManager`**

`AlienSprites.ts` currently has local `const SHAPES` and `const ALIENS` arrays (extracted in Phase 2 from original lines ~612–695). Remove them and read from the theme instead:

```typescript
import { themeManager } from '../theme/ThemeManager.ts';

// DELETE: const SHAPES = [...]
// DELETE: const ALIENS = [...]

export function getAlienColor(idx: number): string {
  const aliens = themeManager.getAliens();
  return aliens[idx]?.c ?? themeManager.get().colors.p1Default;
}

export function alienAnim(i: number, t: number) { /* unchanged */ }

export function drawAlienSprite(idx: number, cx: number, cy: number, ps: number): void {
  const shapes = themeManager.getShapes();
  const aliens = themeManager.getAliens();
  // Replace local SHAPES[alien.s] and ALIENS[idx] references
  // with shapes[alien.s] and aliens[idx]
}
```

- [ ] **Step 6: Update `ChiptuneAudio.ts` to read pitch/scale from theme**

`ChiptuneAudio.ts` currently has hardcoded `SP_SCALES`, `p1RootHz = 587`, `p2RootHz = 440` (from original lines ~374–380). Replace:

```typescript
import { themeManager } from '../theme/ThemeManager.ts';

// In sfxTap(player, tps):
const audio = themeManager.get().audio;
const p1RootHz = audio.p1RootHz ?? 587;
const p2RootHz = audio.p2RootHz ?? 440;
const SP_SCALES = audio.scales ?? DEFAULT_SCALES;
```

- [ ] **Step 7: Update draw files to use theme colors**

Replace each hardcoded color string in `Draw*.ts` files with `themeManager.get().colors.X`. Key replacements:

| Hardcoded | Theme field |
|---|---|
| `'#080c1c'` | `colors.bg` |
| `'#8833cc'` (default alien) | `colors.p1Default` |
| `'#ff2266'` | `colors.p2Default` |
| `'#ff8800'` | `colors.accent` |
| `'#ffe600','#ff9900','#ff3300','#cc1100'` | `colors.fire[]` |
| meter ramp colors | `colors.meterFill[]` |
| `'#06040e'` (bar fill) | `colors.barFill` |
| `'#ffffff'` (stars) | `colors.starColor` |

Search for any remaining hex literals in `src/renderer/` after the replacements:
```bash
grep -r '#[0-9a-fA-F]\{6\}' src/renderer/ src/vfx/
```
There should be zero matches when you're done (except test files).

- [ ] **Step 8: Write `tests/ThemeManager.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeManager } from '../src/theme/ThemeManager.ts';
import retro from '../src/theme/themes/retro.theme.json';

describe('ThemeManager', () => {
  let tm: ThemeManager;
  beforeEach(() => { tm = new ThemeManager(); });

  it('get() throws before any theme is loaded', () => {
    expect(() => tm.get()).toThrow('No theme loaded');
  });
  it('load() accepts valid retro theme', () => {
    expect(() => tm.load(retro)).not.toThrow();
  });
  it('get() returns the loaded theme', () => {
    tm.load(retro);
    expect(tm.get().id).toBe('retro');
  });
  it('getAliens() returns an array', () => {
    tm.load(retro);
    expect(Array.isArray(tm.getAliens())).toBe(true);
    expect(tm.getAliens().length).toBeGreaterThan(0);
  });
  it('validate() throws if colors.bg is missing', () => {
    const bad = JSON.parse(JSON.stringify(retro));
    delete bad.colors.bg;
    expect(() => tm.validate(bad)).toThrow('colors.bg');
  });
  it('validate() throws if sprites.aliens is not an array', () => {
    const bad = JSON.parse(JSON.stringify(retro));
    bad.sprites.aliens = 'not-an-array';
    expect(() => tm.validate(bad)).toThrow('aliens');
  });
  it('validate() throws if audio.style is invalid', () => {
    const bad = JSON.parse(JSON.stringify(retro));
    bad.audio.style = 'jazz';
    expect(() => tm.validate(bad)).toThrow('audio.style');
  });
  it('load() can swap theme at runtime', () => {
    tm.load(retro);
    const custom = JSON.parse(JSON.stringify(retro));
    custom.id = 'custom';
    custom.colors.accent = '#00ff88';
    tm.load(custom);
    expect(tm.get().id).toBe('custom');
    expect(tm.get().colors.accent).toBe('#00ff88');
  });
});
```

- [ ] **Step 9: Run tests**

```bash
npm test
```
Expected: **39 tests pass** (8 new + 31 from previous phases). 0 failures.

- [ ] **Step 10: Playwright — verify new game matches reference after theme extraction**

With `npm run dev` running:

```
browser_navigate("http://localhost:5173")
browser_console_messages()
// Expected: empty (no errors)

browser_take_screenshot()
// Save as: reference/screenshots/phase5-task1-new-boot.png

browser_navigate("http://localhost:5173/reference.html")
browser_take_screenshot()
// Save as: reference/screenshots/phase5-task1-ref-boot.png
// Compare: colors, background, fonts must match
```

Advance to charSelect on the new build and compare alien sprites:

```
browser_navigate("http://localhost:5173")
browser_press_key("Space")
browser_take_screenshot()
// Save as: reference/screenshots/phase5-task1-new-charselect.png

browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_take_screenshot()
// Save as: reference/screenshots/phase5-task1-ref-charselect.png
// Compare: alien sprites must look identical (pulled from theme JSON now)
```

Verify theme swap works from browser console on the new build:
```
browser_navigate("http://localhost:5173")
browser_evaluate("
  import('/src/theme/ThemeManager.ts').then(m => {
    const t = m.themeManager.get();
    t.colors.accent = '#00ff88';
    console.log('accent changed to', t.colors.accent);
  });
")
browser_console_messages()
// Expected: 'accent changed to #00ff88' in console (no errors)
```

- [ ] **Step 11: Commit**

```bash
git add src/theme/ tests/ThemeManager.test.ts src/main-legacy.ts src/sprites/ src/audio/ src/renderer/ src/vfx/
git commit -m "feat: scaffold Theme system; extract all colors/sprites/audio into retro.theme.json"
```

---

## Task 2: Add Word List scaffolding

**Files:** Create `src/words/WordList.ts`, `src/words/lists/easy.json`, `medium.json`, `hard.json`. Create `tests/WordList.test.ts`.

**Why this matters:** The WPM typing game mode (future work) needs word lists. This task adds the scaffolding — bundled JSON files + a loader/picker module — without touching any game logic. No behavioral change to the current game.

- [ ] **Step 1: Create `src/words/lists/easy.json`**

```json
{
  "version": 1,
  "difficulty": "easy",
  "description": "Common 3–5 letter words",
  "words": [
    "the", "and", "run", "tap", "win", "hit", "go", "yes", "up",
    "key", "game", "fast", "type", "play", "word", "red", "blue",
    "stop", "wait", "now", "fire", "ice", "aim", "score", "beat"
  ]
}
```

- [ ] **Step 2: Create `src/words/lists/medium.json`**

```json
{
  "version": 1,
  "difficulty": "medium",
  "description": "5–8 letter common words",
  "words": [
    "typing", "faster", "battle", "winner", "player", "attack",
    "keypad", "sprint", "arcade", "blazing", "method", "system",
    "rocket", "master", "energy", "impact", "strike", "combat"
  ]
}
```

- [ ] **Step 3: Create `src/words/lists/hard.json`**

```json
{
  "version": 1,
  "difficulty": "hard",
  "description": "8–12 letter uncommon words",
  "words": [
    "quintuple", "challenger", "overwhelming", "devastating",
    "consecutive", "unstoppable", "competitive", "achievement",
    "independent", "extraordinary", "thunderstruck", "spectacular"
  ]
}
```

- [ ] **Step 4: Create `src/words/WordList.ts`**

```typescript
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface WordListJson {
  version: number;
  difficulty: Difficulty;
  description: string;
  words: string[];
}

const cache = new Map<Difficulty, string[]>();

export async function loadWordList(difficulty: Difficulty): Promise<string[]> {
  if (cache.has(difficulty)) return cache.get(difficulty)!;
  const mod = await import(`./lists/${difficulty}.json`);
  const list = mod.default as WordListJson;
  cache.set(difficulty, list.words);
  return list.words;
}

export function pickWord(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)];
}

export function buildSequence(words: string[], count: number): string[] {
  const seq: string[] = [];
  let last = '';
  for (let i = 0; i < count; i++) {
    let w: string;
    do { w = pickWord(words); } while (w === last && words.length > 1);
    seq.push(w);
    last = w;
  }
  return seq;
}
```

- [ ] **Step 5: Create `tests/WordList.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { pickWord, buildSequence } from '../src/words/WordList.ts';
import easy   from '../src/words/lists/easy.json';
import medium from '../src/words/lists/medium.json';
import hard   from '../src/words/lists/hard.json';

describe('Word list JSON shape', () => {
  it('easy.json has required fields', () => {
    expect(easy.version).toBe(1);
    expect(easy.difficulty).toBe('easy');
    expect(Array.isArray(easy.words)).toBe(true);
    expect(easy.words.length).toBeGreaterThan(0);
  });
  it('medium.json difficulty matches filename', () => {
    expect(medium.difficulty).toBe('medium');
  });
  it('hard.json words array is non-empty', () => {
    expect(hard.words.length).toBeGreaterThan(0);
  });
  it('all words in easy list are strings', () => {
    expect(easy.words.every(w => typeof w === 'string')).toBe(true);
  });
});

describe('pickWord', () => {
  it('returns a string from the list', () => {
    const words = ['foo', 'bar', 'baz'];
    expect(words).toContain(pickWord(words));
  });
  it('works with a single word', () => {
    expect(pickWord(['only'])).toBe('only');
  });
});

describe('buildSequence', () => {
  it('returns exactly N words', () => {
    expect(buildSequence(['a', 'b', 'c'], 5).length).toBe(5);
  });
  it('no immediate repeats when list has 2+ words', () => {
    const seq = buildSequence(['a', 'b', 'c'], 20);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).not.toBe(seq[i - 1]);
    }
  });
  it('handles count=0', () => {
    expect(buildSequence(['a', 'b'], 0)).toEqual([]);
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npm test
```
Expected: **50 tests pass** (11 new + 39 from previous tasks). 0 failures.

- [ ] **Step 7: Playwright — confirm game still works (word lists are inert)**

```
browser_navigate("http://localhost:5173")
browser_console_messages()
// Expected: empty (word list imports must not cause side effects)

browser_take_screenshot()
// Save as: reference/screenshots/phase5-task2-new-boot.png

browser_navigate("http://localhost:5173/reference.html")
browser_take_screenshot()
// Save as: reference/screenshots/phase5-task2-ref-boot.png
// Compare: must look identical (word list scaffolding has no visual effect)
```

- [ ] **Step 8: Commit**

```bash
git add src/words/ tests/WordList.test.ts
git commit -m "feat: add WordList module and bundled word lists (easy/medium/hard) for future WPM mode"
```

---

## Task 3: Final cleanup — rename and production build

**Files:** Rename `src/main-legacy.ts` → `src/main.ts`. Update `index.html`. Verify clean production build. Full regression Playwright comparison.

- [ ] **Step 1: Rename the entry point**

```bash
git mv src/main-legacy.ts src/main.ts
```

- [ ] **Step 2: Update `index.html` script tag**

```html
<!-- Change: -->
<script type="module" src="/src/main-legacy.ts"></script>
<!-- To: -->
<script type="module" src="/src/main.ts"></script>
```

- [ ] **Step 3: Verify dev server still works**

```bash
npm run dev
```

Then:
```
browser_navigate("http://localhost:5173")
browser_console_messages()
// Expected: empty
browser_take_screenshot()
// Expected: boot screen visible, no white screen of death
```

- [ ] **Step 4: Run full test suite**

```bash
npm test
```
Expected: **50 tests pass, 0 fail.**

- [ ] **Step 5: Production build**

```bash
npm run build
```
Expected:
- `dist/` directory created
- Zero TypeScript errors in terminal
- Zero `tsc` type errors
- Bundle sizes look reasonable (no accidental import of huge deps)

If `npm run build` fails with TypeScript errors: fix them before continuing. Common causes after a refactor:
- Missing `export` on a type used across modules
- `any` usage that tsc flags in strict mode
- JSON import missing `assert { type: 'json' }` (add to `tsconfig.json` if needed: `"resolveJsonModule": true`)

- [ ] **Step 6: Playwright — final full regression comparing new vs reference**

With `npm run dev` running, exercise every game phase:

**Boot phase:**
```
browser_navigate("http://localhost:5173")
browser_console_messages()
// Expected: empty

browser_take_screenshot()
// Save as: reference/screenshots/phase5-final-new-boot.png

browser_navigate("http://localhost:5173/reference.html")
browser_take_screenshot()
// Save as: reference/screenshots/phase5-final-ref-boot.png
// Compare: scrolling boot text, background stars, layout
```

**charSelect phase:**
```
browser_navigate("http://localhost:5173")
browser_press_key("Space")
browser_press_key("s")    // P1 next alien
browser_press_key("k")    // P2 next alien
browser_take_screenshot()
// Save as: reference/screenshots/phase5-final-new-charselect.png

browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_press_key("s")
browser_press_key("k")
browser_take_screenshot()
// Save as: reference/screenshots/phase5-final-ref-charselect.png
// Compare: alien grid, cursors, colors pulled from theme JSON
```

**Lobby → playing phase:**
```
browser_navigate("http://localhost:5173")
browser_press_key("Space")   // charSelect
browser_press_key("Space")   // confirm → lobby
browser_take_screenshot()
// Save as: reference/screenshots/phase5-final-new-lobby.png

browser_press_key("Space")   // start countdown
browser_take_screenshot()
// Save as: reference/screenshots/phase5-final-new-countdown.png

// Spam some taps
browser_press_key("a")
browser_press_key("a")
browser_press_key("a")
browser_press_key("l")
browser_press_key("l")
browser_press_key("l")
browser_take_screenshot()
// Save as: reference/screenshots/phase5-final-new-playing.png
browser_console_messages()
// Expected: empty (no errors during gameplay)

// ESC back to lobby
browser_press_key("Escape")
browser_take_screenshot()
// Save as: reference/screenshots/phase5-final-new-lobby2.png
browser_console_messages()
// Expected: empty
```

**Reference comparison for lobby+playing:**
```
browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_press_key("Space")
browser_take_screenshot()
// Save as: reference/screenshots/phase5-final-ref-lobby.png

browser_press_key("Space")
browser_press_key("a")
browser_press_key("a")
browser_press_key("a")
browser_press_key("l")
browser_press_key("l")
browser_press_key("l")
browser_take_screenshot()
// Save as: reference/screenshots/phase5-final-ref-playing.png
```

Compare all paired screenshots visually. The games must look identical.

- [ ] **Step 7: Commit**

```bash
git add index.html src/main.ts
git rm src/main-legacy.ts 2>/dev/null || true
git commit -m "chore: rename main-legacy.ts → main.ts; phase 5 complete — all 5 phases done"
```

---

## Phase 5 Complete ✓ — All Phases Done

**Final deliverables:**
- `npm run dev` — game is fully playable, visually identical to original
- `npm run build` — zero TypeScript errors, production bundle in `dist/`
- `npm test` — 50 tests pass across 7 test files
- 40+ focused modules replacing the monolithic `index.html` script
- `public/reference.html` — original preserved and accessible at `/reference.html`
- `docs/migration/` — all 5 phase plans in the repo

**How to verify extensibility:**

```typescript
// 1. New theme: swap accent color at runtime
// In browser console (or a theme switcher UI):
import('/src/theme/ThemeManager.ts').then(m => {
  const custom = JSON.parse(JSON.stringify(m.themeManager.get()));
  custom.id = 'custom';
  custom.colors.accent = '#00ff88';
  m.themeManager.load(custom);
});

// 2. New game mode (stub)
// Create src/modes/TimedClickMode.ts extending GameMode, then:
// modeRegistry.register(new TimedClickMode())
// modeRegistry.list() → ['tug-of-war', 'timed-click']

// 3. Remote transport (stub)
// new PartyKitTransport('wss://localhost').connect('room1', 'p1')
// → throws "PartyKitTransport.connect() not implemented — install partysocket..."

// 4. WPM mode word list
import { loadWordList, buildSequence } from '/src/words/WordList.ts';
const words = await loadWordList('medium');
const round = buildSequence(words, 10);
console.log(round); // ['blazing', 'keypad', ...]
```

---

## Summary: What each new file enables

| File | Enables |
|---|---|
| `src/theme/Theme.ts` | Type-safe theme validation — any JSON matching this schema is a valid theme |
| `src/theme/themes/retro.theme.json` | All current visual/audio values in one editable place |
| `src/theme/ThemeManager.ts` | Runtime theme loading and CSS variable injection |
| `src/modes/GameMode.ts` | Drop-in game modes: WPM, timed click, etc. — no other files change |
| `src/modes/TugOfWarMode.ts` | Reference implementation every new mode can copy from |
| `src/transport/Transport.ts` | Network abstraction — swap `LocalTransport` for `PartyKitTransport` to go remote |
| `src/transport/PartyKitTransport.ts` | Clear "fill this in" stub for remote multiplayer |
| `src/words/WordList.ts` + JSON | Ready-made word lists for WPM mode |
| `src/input/InputBus.ts` | Remote input injection point — transport delivers to InputBus, game loop unchanged |
