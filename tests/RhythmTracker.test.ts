import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock canvas and renderer dependencies so drawMeter doesn't cause failures in jsdom
vi.mock('../src/canvas.ts', () => ({ ctx: {}, W: 820, H: 420, DPR: 1 }));
vi.mock('../src/renderer/CanvasUtils.ts', () => ({
  hexAlpha: (c: string, a: number) => c,
  glowTxt: () => {},
  txt: () => {},
  shadeHex: (c: string) => c,
  fireGrad: () => null,
}));

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
