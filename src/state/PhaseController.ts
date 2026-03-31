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
