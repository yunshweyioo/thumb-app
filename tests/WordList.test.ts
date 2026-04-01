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
