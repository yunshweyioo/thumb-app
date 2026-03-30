export const scoreScale: [number, number] = [1, 1];

export function triggerScorePop(p: 1 | 2): void {
  scoreScale[p - 1] = 1.7;
}

export function tickScorePop(dt: number): void {
  for (let i = 0; i < 2; i++) {
    if (scoreScale[i] > 1) scoreScale[i] = Math.max(1, scoreScale[i] - 5 * dt);
  }
}

export function resetScorePop(): void {
  scoreScale[0] = 1;
  scoreScale[1] = 1;
}
