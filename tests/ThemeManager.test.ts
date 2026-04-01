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
