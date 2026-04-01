import type { GameState } from '../state/GameState.ts';

export interface GameEvent {
  type: string;
  payload?: unknown;
}

export interface TickResult {
  won: 0 | 1 | 2 | null;  // null = still in progress; 0 = draw
  events: GameEvent[];
}

export interface HudData {
  [key: string]: unknown;  // mode-specific data for the HUD renderer
}

export abstract class GameMode {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly defaultConfig: Record<string, unknown>;

  abstract init(gameState: GameState, config?: Record<string, unknown>): void;
  abstract tick(gameState: GameState, dt: number): TickResult;
  abstract onInput(gameState: GameState, player: 1 | 2, inputType: string, data?: unknown): void;
  abstract serialize(): Record<string, unknown>;
  abstract deserialize(data: Record<string, unknown>): void;
  abstract getHudData(gameState: GameState): HudData;
}
