import { GameMode } from './GameMode.ts';
import type { TickResult, HudData } from './GameMode.ts';
import type { GameState } from '../state/GameState.ts';
import { puEffects, getPuEffects, getActivePU, tickPowerUp } from '../powerups/PowerUpSystem.ts';
import type { PUEffect, PUState } from '../powerups/PowerUpSystem.ts';
import { rhythmTracker } from '../rhythm/RhythmTracker.ts';
import { sfxTap } from '../audio/ChiptuneAudio.ts';
import { burst, tickParticles } from '../vfx/Particles.ts';
import { addShake, addFlash, triggerOrbBounce, setOrbVelX, orbVelX, pushTrail,
         tickOrb, tickTrail, tickShake, tickFlash } from '../vfx/ScreenEffects.ts';
import { addComboText, tickComboTexts, tickPuTexts } from '../vfx/FloatTexts.ts';
import { triggerScorePop, tickScorePop } from '../vfx/ScorePop.ts';
import { getAlienColor } from '../sprites/AlienSprites.ts';
import { TAP_STEP, DRIFT_SPD, ROUND_TIME, BAR_CX, BAR_HALF, BAR_Y } from '../constants.ts';

export interface TugHudData extends HudData {
  balance: number;
  roundTimer: number;
  powerUp: PUState | null;
  puEffects: [PUEffect, PUEffect];
  meterLevel: [number, number];
  meterPeak: [number, number];
}

export class TugOfWarMode extends GameMode {
  readonly id = 'tug-of-war';
  readonly label = 'Tug of War';
  readonly defaultConfig: Record<string, unknown> = {
    tapStep:         TAP_STEP,
    driftSpeed:      DRIFT_SPD,
    roundTime:       ROUND_TIME,
    powerUpsEnabled: true,
  };

  balance = 0;
  roundTimer = ROUND_TIME;
  private tapStep    = TAP_STEP;
  private driftSpeed = DRIFT_SPD;
  private lastComboShow = [0, 0];

  init(gameState: GameState, config?: Record<string, unknown>): void {
    this.balance    = 0;
    this.roundTimer = (config?.roundTime  as number) ?? ROUND_TIME;
    this.tapStep    = (config?.tapStep    as number) ?? TAP_STEP;
    this.driftSpeed = (config?.driftSpeed as number) ?? DRIFT_SPD;
    gameState.tapCount = [0, 0];
  }

  tick(gameState: GameState, dt: number): TickResult {
    // Check for instant win — balance may have been set to ±1 by onInput
    if (this.balance >= 1.0) return { won: 1, events: [] };
    if (this.balance <= -1.0) return { won: 2, events: [] };

    // Accumulate each player's personal active time (excludes freeze)
    for (let idx = 0; idx < 2; idx++) {
      if (!(puEffects[idx].id === 'freeze' && puEffects[idx].timer > 0))
        gameState.timeActive[idx] += dt;
    }

    // Tug zones — drift gets stronger past the 50% mark (comeback mechanic)
    const absBal   = Math.abs(this.balance);
    const tugBoost = absBal > 0.5 ? 1 + (absBal - 0.5) * 3.5 : 1;

    // Idle boost — if both players have stopped tapping, ball snaps back faster
    const now         = performance.now();
    const sinceAnyTap = now - Math.max(rhythmTracker.lastTapTime[0], rhythmTracker.lastTapTime[1]);
    const idleBoost   = sinceAnyTap > 250 ? 1 + Math.min(4, (sinceAnyTap - 250) / 200) : 1;

    const drift = this.driftSpeed * tugBoost * idleBoost * dt;
    if      (this.balance > 0) this.balance = Math.max(0, this.balance - drift);
    else if (this.balance < 0) this.balance = Math.min(0, this.balance + drift);

    tickPowerUp(dt, this.balance);
    tickComboTexts(dt);
    tickPuTexts(dt);

    // Round countdown
    this.roundTimer -= dt;
    if (this.roundTimer <= 5 && Math.floor(this.roundTimer + dt) > Math.floor(this.roundTimer)) {
      addShake(0.2); // light shake each second in final 5s
    }
    if (this.roundTimer <= 0) {
      if      (this.balance > 0.01)  return { won: 1, events: [] };
      else if (this.balance < -0.01) return { won: 2, events: [] };
      else                           return { won: 0, events: [] };
    }

    gameState.tapFlash[0] = Math.max(0, gameState.tapFlash[0] - dt * 6);
    gameState.tapFlash[1] = Math.max(0, gameState.tapFlash[1] - dt * 6);

    const orbX = BAR_CX + this.balance * BAR_HALF;
    pushTrail(orbX);
    tickParticles(dt); tickOrb(dt); tickTrail(dt);
    tickShake(dt); tickFlash(dt); tickScorePop(dt); rhythmTracker.tickMeters(dt);

    return { won: null, events: [] };
  }

  onInput(gameState: GameState, player: 1 | 2, inputType: string): void {
    if (inputType !== 'tap') return;
    const idx = player - 1;
    // Freeze effect: this player's taps do nothing
    if (puEffects[idx].id === 'freeze' && puEffects[idx].timer > 0) return;

    const orbX = BAR_CX + this.balance * BAR_HALF;
    // Speed boost effect
    const speedMult = (puEffects[idx].id === 'speed' && puEffects[idx].timer > 0) ? 1.6 : 1;
    const step = this.tapStep * (1 + rhythmTracker.rhythmBonus[idx] * 0.6) * speedMult;
    const oppIdx = 1 - idx;
    const reversed = puEffects[oppIdx].id === 'reverse' && puEffects[oppIdx].timer > 0;
    if (player === 1) this.balance = reversed ? Math.max(-1, this.balance - step) : Math.min( 1, this.balance + step);
    else              this.balance = reversed ? Math.min( 1, this.balance + step) : Math.max(-1, this.balance - step);
    gameState.tapFlash[player - 1] = 0.18;
    gameState.tapCount[player - 1]++;
    gameState.totalTaps[player - 1]++;
    rhythmTracker.recordTap(player);
    // Combo floating text
    const now = performance.now();
    if (rhythmTracker.rhythmBonus[idx] > 0.65 && now - this.lastComboShow[idx] > 700) {
      const words = rhythmTracker.rhythmBonus[idx] > 0.9 ? 'PERFECT!' : rhythmTracker.rhythmBonus[idx] > 0.78 ? 'COMBO!' : 'NICE!';
      const col   = player === 1 ? getAlienColor(gameState.p1Icon) : getAlienColor(gameState.p2Icon);
      addComboText(words, orbX + (player === 1 ? 44 : -44), BAR_Y - 32, col);
      this.lastComboShow[idx] = now;
    }
    triggerOrbBounce();
    setOrbVelX(Math.max(-1, Math.min(1, orbVelX + (player === 1 ? 0.7 : -0.7))));
    rhythmTracker.spikeMe(player);
    burst(player === 1 ? getAlienColor(gameState.p1Icon) : getAlienColor(gameState.p2Icon), orbX, false);
    sfxTap(player);
    // Instant win check — detected in tick() but balance is clamped above already
    // (win detection is handled by the caller via tick() result)
  }

  serialize(): Record<string, unknown> {
    return { balance: this.balance, roundTimer: this.roundTimer };
  }

  deserialize(data: Record<string, unknown>): void {
    this.balance = data.balance as number;
    this.roundTimer = data.roundTimer as number;
  }

  getHudData(gameState: GameState): TugHudData {
    return {
      balance:    this.balance,
      roundTimer: this.roundTimer,
      powerUp:    getActivePU(),
      puEffects:  getPuEffects(),
      meterLevel: [...rhythmTracker.meterLevel] as [number, number],
      meterPeak:  [...rhythmTracker.meterPeak]  as [number, number],
    };
  }
}
