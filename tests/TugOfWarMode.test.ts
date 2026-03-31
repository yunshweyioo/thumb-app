import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock canvas and renderer dependencies so DOM/canvas modules don't fail in jsdom
vi.mock('../src/canvas.ts', () => ({ ctx: {
  save: () => {}, restore: () => {}, beginPath: () => {}, fill: () => {},
  stroke: () => {}, fillText: () => {}, fillRect: () => {}, rect: () => {},
  moveTo: () => {}, lineTo: () => {}, closePath: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }),
}, W: 820, H: 420, DPR: 1 }));
vi.mock('../src/renderer/CanvasUtils.ts', () => ({
  hexAlpha: (c: string) => c,
  glowTxt: () => {},
  txt: () => {},
  shadeHex: (c: string) => c,
  fireGrad: () => null,
}));
vi.mock('../src/audio/ChiptuneAudio.ts', () => ({
  sfxTap: () => {},
  sfxWin: () => {},
  startPinTone: () => {},
  updatePinTone: () => {},
  stopPinTone: () => {},
}));
vi.mock('../src/audio/AudioEngine.ts', () => ({
  getAC: () => null,
  spIdx: [0, 0],
}));
vi.mock('../src/sprites/AlienSprites.ts', () => ({
  SHAPES: [],
  ALIENS: [],
  getAlienColor: () => '#ff0000',
  alienAnim: () => ({ x: 0, y: 0, sx: 1, sy: 1 }),
  drawAlienSprite: () => {},
}));

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
