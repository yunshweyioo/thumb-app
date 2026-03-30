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
