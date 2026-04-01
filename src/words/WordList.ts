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
