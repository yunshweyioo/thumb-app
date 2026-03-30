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
  balance: number;             // orb position (-1 to 1)
  roundTimer: number;          // seconds remaining in round
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
    balance: 0,
    roundTimer: 30,
  };
}

export function cloneGameState(s: GameState): GameState {
  return JSON.parse(JSON.stringify(s)) as GameState;
}
