# Phase 4: Core Abstractions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## Context for a new agent

**What is this repo?** Spam Wars — a 2-player browser tapping game being migrated from a monolithic `index.html` to a modular Vite + TypeScript project.

**What has been done (Phases 1–3)?**
- Phase 1: Vite + TS project set up. `public/reference.html` preserves the original game. Modules: `canvas.ts`, `constants.ts`, `CanvasUtils.ts`, `StorageManager.ts`, `GameState.ts`.
- Phase 2: All game subsystems extracted: `AlienSprites`, VFX modules, `RhythmTracker`, `ChiptuneAudio`, `PowerUpSystem`, `MobileScale`.
- Phase 3: `InputBus` created, all draw functions split into `Draw*.ts` modules, `Renderer.ts` compositor.

**What `main-legacy.ts` contains NOW** (everything else has been extracted):
- The RAF loop (`loop(ts)`)
- `onTap(player)` — moves the orb, triggers VFX/audio
- `tickGame(dt)` — orb drift, tug-zone physics, power-up tick, win detection
- `winRound(player)`, `drawRound()`, `nextRound()` — round/match lifecycle
- Boot/countdown/roundEnd timing (inline in the loop)
- `inputBus.subscribe()` block

**What this phase does:** Define three interface contracts that enable future extensibility. Then extract the existing behavior as the first implementation of each.

1. **`PhaseController`** — moves boot/countdown/roundEnd timing out of the RAF loop into a testable class
2. **`GameMode` abstract class** — wraps `tickGame()`/`onTap()` behind a contract that any game mode implements. Adding a WPM mode = extend `GameMode`, no other files change.
3. **`Transport` abstract class** — wraps input delivery. Adding remote multiplayer = fill in `PartyKitTransport.ts`.

**Working directory:** `/Users/yunnie/cc-projects/thumb-app`

**How to start:**
```bash
npm run dev &    # dev server at localhost:5173
npm test         # should show 16 passing
```

**Reference for comparison:** `http://localhost:5173/reference.html` (never modify)

---

## Task 1: Extract PhaseController

**What:** Move the boot sequence tick, countdown (3-2-1-GO) tick, and roundEnd delay timer from the RAF loop into a class. This makes phase transitions testable and removes branching from the main loop.

**Files:** Create `src/state/PhaseController.ts`. Modify `src/main-legacy.ts`.

- [ ] **Step 1: Create `src/state/PhaseController.ts`**

```typescript
import type { GameState } from './GameState.ts';
import { sfxCountdown } from '../audio/ChiptuneAudio.ts';

export type PhaseEvent =
  | { type: 'round_start' }
  | { type: 'round_end_expired' }
  | { type: 'boot_done' };

export class PhaseController {
  // Transition state → countdown and reset counters
  startCountdown(state: GameState): void {
    state.phase = 'countdown';
    state.countdown = 3;
    state.cdTimer = 0;
    state.cdScale = 1;
  }

  goToLobby(state: GameState): void {
    state.phase = 'lobby';
  }

  goToCharSelect(state: GameState): void {
    state.phase = 'charSelect';
    state.p1Cursor = state.p1Icon;
    state.p2Cursor = state.p2Icon;
  }

  // Call every frame — moves countdowns forward, returns events for the loop to handle
  tick(state: GameState, dt: number): PhaseEvent[] {
    const events: PhaseEvent[] = [];

    if (state.phase === 'countdown') {
      state.cdTimer += dt;
      state.cdScale = Math.max(1, state.cdScale - 3 * dt);
      if (state.cdTimer >= 1) {
        state.cdTimer = 0;
        state.cdScale = 1.6;
        if (state.countdown > 0) {
          state.countdown--;
          sfxCountdown(state.countdown === 0);
        }
        if (state.countdown === 0) {
          state.phase = 'playing';
          events.push({ type: 'round_start' });
        }
      }
    }

    if (state.phase === 'roundEnd') {
      state.reTimer -= dt;
      if (state.reTimer <= 0) {
        events.push({ type: 'round_end_expired' });
      }
    }

    return events;
  }
}

export const phaseController = new PhaseController();
```

- [ ] **Step 2: In `main-legacy.ts`, remove the countdown tick block and roundEnd delay block from the RAF loop. Add:**

```typescript
import { phaseController } from './state/PhaseController.ts';

// In the loop, replace the countdown/roundEnd blocks with:
const phaseEvents = phaseController.tick(state, dt);
for (const ev of phaseEvents) {
  if (ev.type === 'round_start')      { /* reset rhythm tracker, particles, etc. */ }
  if (ev.type === 'round_end_expired') { nextRound(); }
}
```

Replace `startCountdown()` calls with `phaseController.startCountdown(state)`.
Replace `goToCharSelect()` calls with `phaseController.goToCharSelect(state)`.

- [ ] **Step 3: Playwright comparison — countdown sequence**

```
// New: watch countdown 3→2→1→GO
browser_navigate("http://localhost:5173")
browser_press_key("Space")     // advance to lobby
browser_press_key("Space")     // start → countdown "3"
browser_take_screenshot(filename="reference/screenshots/phase4-task1-new-countdown.png")
browser_console_messages()     // must be empty

// Reference
browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_press_key("Space")
browser_take_screenshot(filename="reference/screenshots/phase4-task1-ref-countdown.png")
```

Compare: countdown "3" visible in both, same position and style.

- [ ] **Step 4: Commit**

```bash
git add src/state/PhaseController.ts src/main-legacy.ts
git commit -m "refactor: extract PhaseController (countdown + roundEnd timing + phase transitions)"
```

---

## Task 2: Define GameMode and extract TugOfWarMode

**Why this matters:** Currently, `tickGame()` and `onTap()` are standalone functions that read from global `state.balance`. Adding a WPM mode means adding a second version of these functions — which would require branching throughout the game loop. With `GameMode`, adding a mode = subclass + register. The loop stays unchanged.

**Files:** Create `src/modes/GameMode.ts`, `src/modes/ModeRegistry.ts`, `src/modes/TugOfWarMode.ts`. Create `tests/TugOfWarMode.test.ts`. Modify `src/main-legacy.ts`.

- [ ] **Step 1: Create `src/modes/GameMode.ts`**

This is the contract. Every game mode implements these methods:

```typescript
import type { GameState } from '../state/GameState.ts';

export interface GameEvent {
  type: string;
  payload?: unknown;
}

export interface TickResult {
  won: 0 | 1 | 2 | null;  // null = still in progress; 0 = draw
  events: GameEvent[];
}

export interface HudData {
  [key: string]: unknown;  // mode-specific data for the HUD renderer
}

export abstract class GameMode {
  // Unique ID used by ModeRegistry
  abstract readonly id: string;

  // Display name shown in lobby/mode select
  abstract readonly label: string;

  // Default tuning values for this mode (can be overridden per-session for difficulty)
  abstract readonly defaultConfig: Record<string, unknown>;

  /** Reset mode-internal state at the start of each round. */
  abstract init(gameState: GameState, config?: Record<string, unknown>): void;

  /**
   * Called every frame during 'playing' phase.
   * Returns { won: 1|2|0|null, events: [] }.
   * won=null means the round is still in progress.
   * Does NOT mutate state.phase — the caller does that based on won.
   */
  abstract tick(gameState: GameState, dt: number): TickResult;

  /**
   * Called when player input arrives.
   * inputType: 'tap' (for tug-of-war), 'key' (for WPM), etc.
   */
  abstract onInput(
    gameState: GameState,
    player: 1 | 2,
    inputType: string,
    data?: unknown
  ): void;

  /** Snapshot for network sync (Transport.send) — must be JSON-serializable. */
  abstract serialize(): Record<string, unknown>;
  abstract deserialize(data: Record<string, unknown>): void;

  /**
   * Returns data the HUD renderer needs.
   * Keeps Renderer.ts decoupled from mode internals —
   * Renderer reads HudData, never imports TugOfWarMode directly.
   */
  abstract getHudData(gameState: GameState): HudData;
}
```

- [ ] **Step 2: Create `src/modes/ModeRegistry.ts`**

```typescript
import type { GameMode } from './GameMode.ts';

const registry = new Map<string, new () => GameMode>();

export const modeRegistry = {
  register(Cls: new () => GameMode): void {
    registry.set(new Cls().id, Cls);
  },
  get(id: string): GameMode {
    const Cls = registry.get(id);
    if (!Cls) {
      throw new Error(
        `Unknown game mode: "${id}". Registered modes: [${[...registry.keys()].join(', ')}]`
      );
    }
    return new Cls();
  },
  list(): string[] {
    return [...registry.keys()];
  },
};
```

- [ ] **Step 3: Create `src/modes/TugOfWarMode.ts`**

Move the bodies of `tickGame(dt)`, `onTap(player)`, `winRound(player)`, `drawRound()`, `nextRound()` from `main-legacy.ts` into the appropriate methods. `balance` and `roundTimer` become class fields.

```typescript
import { GameMode, TickResult, HudData } from './GameMode.ts';
import type { GameState } from '../state/GameState.ts';
import { getPuEffects, tickPowerUp, getActivePU } from '../powerups/PowerUpSystem.ts';
import type { PUEffect, PUState } from '../powerups/PowerUpSystem.ts';
import { rhythmTracker } from '../rhythm/RhythmTracker.ts';
import { sfxTap } from '../audio/ChiptuneAudio.ts';
import { burst } from '../vfx/Particles.ts';
import { addShake, addFlash, triggerOrbBounce, pushTrail } from '../vfx/ScreenEffects.ts';
import { addComboText } from '../vfx/FloatTexts.ts';
import { triggerScorePop } from '../vfx/ScorePop.ts';
import { getAlienColor } from '../sprites/AlienSprites.ts';
import { TAP_STEP, DRIFT_SPD, ROUND_TIME, BAR_CX, BAR_HALF } from '../constants.ts';

export interface TugHudData extends HudData {
  balance: number;
  roundTimer: number;
  powerUp: PUState | null;
  puEffects: [PUEffect, PUEffect];
  meterLevel: [number, number];
  meterPeak: [number, number];
}

export class TugOfWarMode extends GameMode {
  readonly id = 'tug-of-war';
  readonly label = 'Tug of War';
  readonly defaultConfig: Record<string, unknown> = {
    tapStep:       TAP_STEP,   // 0.068 — how much each tap moves the orb
    driftSpeed:    DRIFT_SPD,  // 0.10 — how fast orb drifts back to center
    roundTime:     ROUND_TIME, // 30 — seconds per round
    powerUpsEnabled: true,
  };

  // Mode-owned state (NOT on GameState — GameState is match-level only)
  balance = 0;
  roundTimer = ROUND_TIME;

  init(gameState: GameState, config?: Record<string, unknown>): void {
    this.balance = 0;
    this.roundTimer = (config?.roundTime as number) ?? ROUND_TIME;
    gameState.tapCount = [0, 0];
    // Reset power-up state here if needed
  }

  tick(gameState: GameState, dt: number): TickResult {
    // Paste the body of tickGame(dt) here verbatim.
    // Replace state.balance with this.balance
    // Replace state.roundTimer with this.roundTimer
    // Instead of calling winRound(player) or drawRound() directly,
    // return { won: 1|2|0|null, events: [] }
    // The caller (main-legacy.ts loop) handles won result.
    return { won: null, events: [] }; // replace with actual logic
  }

  onInput(gameState: GameState, player: 1 | 2, inputType: string): void {
    if (inputType !== 'tap') return;
    // Paste the body of onTap(player) here verbatim.
    // Replace state.balance with this.balance
  }

  serialize(): Record<string, unknown> {
    return {
      balance:    this.balance,
      roundTimer: this.roundTimer,
    };
  }

  deserialize(data: Record<string, unknown>): void {
    this.balance    = data.balance    as number;
    this.roundTimer = data.roundTimer as number;
  }

  getHudData(gameState: GameState): TugHudData {
    return {
      balance:    this.balance,
      roundTimer: this.roundTimer,
      powerUp:    getActivePU(),
      puEffects:  getPuEffects(),
      meterLevel: [...rhythmTracker.meterLevel] as [number, number],
      meterPeak:  [...rhythmTracker.meterPeak]  as [number, number],
    };
  }
}
```

- [ ] **Step 4: In `main-legacy.ts`, delete `tickGame()`, `onTap()`, `winRound()`, `drawRound()`, `nextRound()`. Replace with:**

```typescript
import { TugOfWarMode } from './modes/TugOfWarMode.ts';
import { modeRegistry } from './modes/ModeRegistry.ts';

modeRegistry.register(TugOfWarMode);
const activeMode = modeRegistry.get('tug-of-war');
activeMode.init(state, activeMode.defaultConfig);

// In the RAF loop, during 'playing' phase:
const result = activeMode.tick(state, dt);
if (result.won !== null) {
  if (result.won === 0) {
    // draw condition
    state.phase = 'roundEnd';
    state.roundWinner = 0;
    state.reTimer = 2.8;
  } else {
    // player won the round
    state.scores[result.won - 1]++;
    state.phase = 'roundEnd';
    state.roundWinner = result.won;
    state.reTimer = 3.0;
    // trigger win effects (sfxWin, addShake, etc.)
  }
}

// In inputBus.subscribe, tap action:
if (state.phase === 'playing') activeMode.onInput(state, action.player, 'tap');

// Pass hudData to Renderer:
const hudData = activeMode.getHudData(state);
draw({ state, hudData, /* ... */ });
```

- [ ] **Step 5: Update `Renderer.ts` to accept `hudData` as part of `RenderContext`**

```typescript
export interface RenderContext {
  // ... existing fields ...
  hudData: TugHudData;   // use HudData type (import from modes/GameMode.ts)
}
```

Draw functions that previously read `state.balance` now read `rc.hudData.balance`, etc.

- [ ] **Step 6: Write `tests/TugOfWarMode.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TugOfWarMode } from '../src/modes/TugOfWarMode.ts';
import { initGameState } from '../src/state/GameState.ts';

describe('TugOfWarMode', () => {
  let mode: TugOfWarMode;
  let state: ReturnType<typeof initGameState>;

  beforeEach(() => {
    mode = new TugOfWarMode();
    state = initGameState();
    mode.init(state, mode.defaultConfig);
  });

  it('balance starts at 0', () => {
    expect(mode.getHudData(state).balance).toBe(0);
  });
  it('P1 tap moves balance positive', () => {
    mode.onInput(state, 1, 'tap');
    expect(mode.getHudData(state).balance as number).toBeGreaterThan(0);
  });
  it('P2 tap moves balance negative', () => {
    mode.onInput(state, 2, 'tap');
    expect(mode.getHudData(state).balance as number).toBeLessThan(0);
  });
  it('tap step matches defaultConfig', () => {
    mode.onInput(state, 1, 'tap');
    expect(mode.getHudData(state).balance as number).toBeCloseTo(0.068, 3);
  });
  it('balance clamps to 1', () => {
    for (let i = 0; i < 20; i++) mode.onInput(state, 1, 'tap');
    expect(mode.getHudData(state).balance as number).toBeLessThanOrEqual(1);
  });
  it('tick returns won:1 when balance reaches 1.0', () => {
    (mode as any).balance = 1.0;
    expect(mode.tick(state, 0.016).won).toBe(1);
  });
  it('tick returns won:2 when balance reaches -1.0', () => {
    (mode as any).balance = -1.0;
    expect(mode.tick(state, 0.016).won).toBe(2);
  });
  it('tick returns won:0 (draw) when timer expires near center', () => {
    (mode as any).roundTimer = 0;
    (mode as any).balance = 0.003;
    expect(mode.tick(state, 0.016).won).toBe(0);
  });
  it('serialize/deserialize round-trips balance', () => {
    mode.onInput(state, 1, 'tap');
    const snap = mode.serialize();
    const m2 = new TugOfWarMode();
    m2.init(state, mode.defaultConfig);
    m2.deserialize(snap);
    expect(m2.getHudData(state).balance).toBe(mode.getHudData(state).balance);
  });
  it('getHudData exposes balance, roundTimer, puEffects', () => {
    const hud = mode.getHudData(state);
    expect('balance' in hud).toBe(true);
    expect('roundTimer' in hud).toBe(true);
    expect('puEffects' in hud).toBe(true);
  });
});
```

- [ ] **Step 7: Run tests**

```bash
npm test
```

Expected: `26 tests passed` (16 from Phase 2 + 10 new).

- [ ] **Step 8: Playwright comparison — full game plays correctly**

```
// New: play through 2 rounds
browser_navigate("http://localhost:5173")
browser_press_key("Space")             // advance
browser_press_key("Space")             // start
// Spam P1 taps to win round 1
browser_press_key("a") × 30
browser_take_screenshot(filename="reference/screenshots/phase4-task2-new-roundEnd.png")
browser_console_messages()             // must be empty

// Reference: same
browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_press_key("Space")
browser_press_key("a") × 30
browser_take_screenshot(filename="reference/screenshots/phase4-task2-ref-roundEnd.png")
```

Compare: round-end overlay visible in both, P1 indicated as winner.

- [ ] **Step 9: Commit**

```bash
git add src/modes/ tests/TugOfWarMode.test.ts src/main-legacy.ts
git commit -m "refactor: define GameMode interface; extract TugOfWarMode as first implementation"
```

---

## Task 3: Define Transport interface and LocalTransport

**Why this matters:** Currently, taps come from DOM events only. For remote multiplayer, we need P2's taps to arrive over a WebSocket. `Transport` is the abstraction layer. By wiring `LocalTransport` now, we ensure the game loop sends and receives via the transport — so swapping in `PartyKitTransport` is purely a configuration change.

**Files:** Create `src/transport/Transport.ts`, `src/transport/LocalTransport.ts`, `src/transport/PartyKitTransport.ts`. Create `tests/LocalTransport.test.ts`. Modify `src/main-legacy.ts`.

- [ ] **Step 1: Create `src/transport/Transport.ts`**

```typescript
export interface TransportMessage {
  from: string;     // playerId of sender
  event: string;    // e.g. 'tap', 'sync', 'ping'
  payload: unknown;
  ts: number;       // sender's performance.now() at time of send
}

export type TransportEventMap = {
  message:      TransportMessage;
  connected:    { roomId: string; playerId: string };
  disconnected: { code: number; reason: string };
  error:        { message: string; cause?: unknown };
};

export abstract class Transport {
  /** Connect to a room. Resolves when handshake is complete. */
  abstract connect(roomId: string, playerId: string): Promise<void>;

  /** Send an event to connected peer(s). */
  abstract send(eventType: string, payload: unknown): void;

  /** Alias for send() — semantically "broadcast to all peers". */
  abstract broadcast(eventType: string, payload: unknown): void;

  /** Close the connection gracefully. */
  abstract disconnect(): void;

  abstract on<K extends keyof TransportEventMap>(
    event: K,
    listener: (data: TransportEventMap[K]) => void
  ): this;

  abstract off<K extends keyof TransportEventMap>(
    event: K,
    listener: (data: TransportEventMap[K]) => void
  ): this;
}
```

- [ ] **Step 2: Create `src/transport/LocalTransport.ts`**

Same-tab, zero-latency implementation. Used as the default transport for local 2-player.

```typescript
import { Transport, TransportMessage, TransportEventMap } from './Transport.ts';

type AnyFn = (data: unknown) => void;

export class LocalTransport extends Transport {
  private peer: LocalTransport | null = null;
  private listeners = new Map<string, Set<AnyFn>>();
  private playerId = '';

  /** Create two paired transports that can deliver messages to each other. */
  static pair(): [LocalTransport, LocalTransport] {
    const a = new LocalTransport();
    const b = new LocalTransport();
    a.peer = b;
    b.peer = a;
    return [a, b];
  }

  async connect(roomId: string, playerId: string): Promise<void> {
    this.playerId = playerId;
    this._emit('connected', { roomId, playerId });
  }

  send(eventType: string, payload: unknown): void {
    if (!this.peer) return;
    const msg: TransportMessage = {
      from:    this.playerId,
      event:   eventType,
      payload,
      ts:      performance.now(),
    };
    this.peer._deliver(msg);
  }

  broadcast(eventType: string, payload: unknown): void {
    this.send(eventType, payload);
  }

  disconnect(): void {
    this._emit('disconnected', { code: 1000, reason: 'local disconnect' });
    this.peer?._emit('disconnected', { code: 1000, reason: 'peer disconnected' });
  }

  on<K extends keyof TransportEventMap>(event: K, listener: (d: TransportEventMap[K]) => void): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as AnyFn);
    return this;
  }

  off<K extends keyof TransportEventMap>(event: K, listener: (d: TransportEventMap[K]) => void): this {
    this.listeners.get(event)?.delete(listener as AnyFn);
    return this;
  }

  private _deliver(msg: TransportMessage): void { this._emit('message', msg); }

  private _emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(l => l(data));
  }
}
```

- [ ] **Step 3: Create `src/transport/PartyKitTransport.ts`**

All methods throw `NotImplementedError`. This file is a template for future remote multiplayer.

```typescript
import { Transport } from './Transport.ts';
import type { TransportEventMap } from './Transport.ts';

/**
 * PartyKit (Cloudflare Durable Objects) WebSocket transport.
 *
 * TO IMPLEMENT:
 *   1. npm install partysocket
 *   2. Create a PartyKit server at `parties/game.ts` (see https://docs.partykit.io)
 *   3. Replace the throw statements below with PartySocket connection logic
 *   4. Room URL pattern: `${this.hostUrl}/parties/game/${roomId}`
 *   5. All messages must use TransportMessage shape: { from, event, payload, ts }
 */
export class PartyKitTransport extends Transport {
  constructor(private hostUrl: string) { super(); }

  connect(_roomId: string, _playerId: string): Promise<void> {
    throw new Error(
      'PartyKitTransport.connect() not implemented. ' +
      'See src/transport/PartyKitTransport.ts for instructions.'
    );
  }
  send(_eventType: string, _payload: unknown): void {
    throw new Error('PartyKitTransport.send() not implemented.');
  }
  broadcast(_eventType: string, _payload: unknown): void {
    throw new Error('PartyKitTransport.broadcast() not implemented.');
  }
  disconnect(): void {
    throw new Error('PartyKitTransport.disconnect() not implemented.');
  }
  on<K extends keyof TransportEventMap>(_e: K, _l: (d: TransportEventMap[K]) => void): this {
    throw new Error('PartyKitTransport.on() not implemented.');
  }
  off<K extends keyof TransportEventMap>(_e: K, _l: (d: TransportEventMap[K]) => void): this {
    throw new Error('PartyKitTransport.off() not implemented.');
  }
}
```

- [ ] **Step 4: Wire `LocalTransport` into `main-legacy.ts` as the default transport**

For same-tab 2-player, both players share the process, so broadcast is a no-op in practice. The important outcome: `onTap()` now routes through the transport, which is what allows remote injection later.

```typescript
import { LocalTransport } from './transport/LocalTransport.ts';

const [p1Transport] = LocalTransport.pair();
await p1Transport.connect('local', 'p1');

// When a tap is registered, broadcast it so a remote peer would also receive it:
// (In TugOfWarMode.onInput, after moving the orb, add:)
//   p1Transport.broadcast('tap', { player });

// When a message arrives from the transport (future remote use):
p1Transport.on('message', (msg) => {
  if (msg.event === 'tap') {
    // Remote tap received — inject into InputBus exactly like a local keypress
    inputBus.dispatch({ type: 'tap', player: (msg.payload as any).player });
  }
});
```

- [ ] **Step 5: Write `tests/LocalTransport.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { LocalTransport } from '../src/transport/LocalTransport.ts';

describe('LocalTransport', () => {
  it('connect resolves immediately', async () => {
    const [a] = LocalTransport.pair();
    await expect(a.connect('room1', 'p1')).resolves.toBeUndefined();
  });

  it('send delivers message to peer', async () => {
    const [a, b] = LocalTransport.pair();
    await a.connect('r', 'p1');
    await b.connect('r', 'p2');
    const spy = vi.fn();
    b.on('message', spy);
    a.send('tap', { player: 1 });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0].event).toBe('tap');
    expect(spy.mock.calls[0][0].from).toBe('p1');
    expect(spy.mock.calls[0][0].payload).toEqual({ player: 1 });
  });

  it('message includes ts as number', async () => {
    const [a, b] = LocalTransport.pair();
    await a.connect('r', 'p1'); await b.connect('r', 'p2');
    const spy = vi.fn();
    b.on('message', spy);
    a.send('ping', {});
    expect(typeof spy.mock.calls[0][0].ts).toBe('number');
  });

  it('disconnect fires disconnected on peer', async () => {
    const [a, b] = LocalTransport.pair();
    await a.connect('r', 'p1'); await b.connect('r', 'p2');
    const spy = vi.fn();
    b.on('disconnected', spy);
    a.disconnect();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('off unregisters listener', async () => {
    const [a, b] = LocalTransport.pair();
    await a.connect('r', 'p1'); await b.connect('r', 'p2');
    const spy = vi.fn();
    b.on('message', spy);
    b.off('message', spy);
    a.send('tap', {});
    expect(spy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: `31 tests passed` (26 + 5 new).

- [ ] **Step 7: Playwright full regression + PartyKit stub verification**

```
// Full game still works
browser_navigate("http://localhost:5173")
browser_console_messages()             // must be empty
browser_press_key("Space")
browser_press_key("Space")             // start game
browser_press_key("a")
browser_press_key("l")
browser_take_screenshot(filename="reference/screenshots/phase4-done-new-playing.png")
browser_console_messages()             // must be empty

// Reference
browser_navigate("http://localhost:5173/reference.html")
browser_press_key("Space")
browser_press_key("Space")
browser_press_key("a")
browser_press_key("l")
browser_take_screenshot(filename="reference/screenshots/phase4-done-ref-playing.png")

// Verify PartyKitTransport stub throws the expected error
browser_evaluate("
  import('/src/transport/PartyKitTransport.ts').then(m => {
    const pt = new m.PartyKitTransport('wss://localhost');
    try { pt.connect('r', 'p1'); }
    catch(e) { console.log('STUB_OK:', e.message.slice(0,30)); }
  });
")
browser_console_messages()   // must contain a line starting with 'STUB_OK:'
```

- [ ] **Step 8: Commit**

```bash
git add src/transport/ tests/LocalTransport.test.ts src/main-legacy.ts reference/screenshots/
git commit -m "refactor: define Transport interface; add LocalTransport + PartyKitTransport stub; phase 4 complete"
```

---

## Phase 4 Complete ✓

**Deliverables:**
- `npm test` — 31 tests pass
- `npm run dev` — game plays identically to `public/reference.html`
- 3 new interface contracts in place:
  - `src/modes/GameMode.ts` — implement this to add WPM, timed click, etc.
  - `src/transport/Transport.ts` — implement this for remote multiplayer
  - `src/state/PhaseController.ts` — testable phase timing
- `modeRegistry.list()` returns `['tug-of-war']`
- `PartyKitTransport` throws "not implemented" — the interface exists, the implementation does not
- Remote input flow is ready: `transport.on('message') → inputBus.dispatch() → activeMode.onInput()`

**Next:** `docs/migration/phase-5-theme-words.md`
