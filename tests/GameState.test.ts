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
