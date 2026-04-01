import { ctx, W, H } from '../canvas.ts';
import { getShakeOffset, flashAlpha, flashCol, orbBounce, orbVelX, coinAngle, orbitAngle, orbTrail } from '../vfx/ScreenEffects.ts';
import { drawParticles } from '../vfx/Particles.ts';
import { drawComboTexts, drawPuTexts } from '../vfx/FloatTexts.ts';
import { drawPowerUp, drawEffectHud } from '../powerups/PowerUpSystem.ts';
import { rhythmTracker } from '../rhythm/RhythmTracker.ts';
import { drawBoot } from './DrawBoot.ts';
import { drawBg } from './DrawBackground.ts';
import { drawScore, drawBar, drawRoundTimer, drawCountdown } from './DrawHUD.ts';
import { drawPlayers, drawWinCelebration } from './DrawPlayers.ts';
import { drawOverlay, drawScreenFlash } from './DrawOverlays.ts';
import { drawCharSelect, drawLobby, drawNameEntry, drawLeaderboard, drawHowToPlay } from './DrawScreens.ts';
import type { NameEntryState } from './DrawScreens.ts';
import { drawChangeBtn, drawEscHint } from './DrawUIChrome.ts';
import { scoreScale } from '../vfx/ScorePop.ts';
import { getAlienColor } from '../sprites/AlienSprites.ts';
import type { GameState } from '../state/GameState.ts';
import type { IStorageManager } from '../storage/StorageManager.ts';
import type { HudData } from '../modes/GameMode.ts';

export interface RenderContext {
  state: GameState;
  storage: IStorageManager;
  p1Color: string;
  p2Color: string;
  lobbyHover: boolean;
  changeHover: boolean;
  lbNewName: string | null;
  nameEntryState: NameEntryState;
  hudData?: HudData;  // optional so it doesn't break existing call sites during transition
}

export function draw(rc: RenderContext): void {
  const { state } = rc;
  const { x: sx, y: sy } = getShakeOffset();
  ctx.save();
  ctx.translate(sx, sy);

  if (state.phase === 'boot') {
    drawBoot();
    ctx.restore();
    return;
  }

  const balance = (rc.hudData?.balance as number) ?? state.balance;
  drawBg(balance, rc.p1Color, rc.p2Color);

  if (state.phase === 'howToPlay') {
    drawHowToPlay();
    ctx.restore();
    return;
  }

  if (state.phase === 'nameEntry') {
    drawNameEntry(state, rc.p1Color, rc.p2Color, rc.nameEntryState);
    ctx.restore();
    return;
  }

  if (state.phase === 'leaderboard') {
    drawLeaderboard(rc.storage, rc.lbNewName);
    ctx.restore();
    return;
  }

  if (state.phase === 'charSelect') {
    drawCharSelect(state, rc.p1Color, rc.p2Color);
    drawScreenFlash(flashAlpha, flashCol);
    ctx.restore();
    return;
  }

  // Gameplay layers
  drawScore(state, rc.p1Color, rc.p2Color, scoreScale);
  rhythmTracker.drawMeter(1, rc.p1Color, rc.p2Color);
  rhythmTracker.drawMeter(2, rc.p1Color, rc.p2Color);
  drawBar(balance, rc.p1Color, rc.p2Color, orbBounce, orbVelX, coinAngle, orbitAngle, orbTrail, state.tapFlash);
  drawPlayers(state, rc.p1Color, rc.p2Color, [rhythmTracker.getTPS(1), rhythmTracker.getTPS(2)]);
  drawParticles();

  if (state.phase === 'lobby') {
    drawLobby(state, rc.storage, rc.lobbyHover, rc.p1Color, rc.p2Color);
  } else if (state.phase === 'playing') {
    const roundTimer = (rc.hudData?.roundTimer as number) ?? state.roundTimer;
    drawRoundTimer(roundTimer);
  } else if (state.phase === 'countdown') {
    drawCountdown(state);
  } else if (state.phase === 'roundEnd') {
    if (state.roundWinner === 0) {
      drawOverlay('#aaaaaa', 'DRAW!', '');
    } else {
      const col = state.roundWinner === 1 ? rc.p1Color : rc.p2Color;
      const ws = state.scores[state.roundWinner! - 1];
      const matchWon = ws >= 2;
      drawOverlay(col,
        matchWon ? `Player ${state.roundWinner} wins!` : `Player ${state.roundWinner} wins the round!`,
        '');
      // Score between title and alien
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.shadowColor = col; ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffcc44';
      ctx.fillText(`${state.scores[0]}  \u2013  ${state.scores[1]}`, W / 2, H / 2 + 14);
      ctx.restore();
      drawWinCelebration(state, rc.p1Color, rc.p2Color);
    }
  } else if (state.phase === 'gameOver') {
    const w = state.scores[0] > state.scores[1] ? 1 : state.scores[1] > state.scores[0] ? 2 : 0;
    if (w === 0) {
      drawOverlay('#aaaaaa', 'MATCH DRAW!', `${state.scores[0]} \u2013 ${state.scores[1]}   \u00B7   press ESC to restart`);
    } else {
      drawOverlay(w === 1 ? rc.p1Color : rc.p2Color,
        `Player ${w} wins!`,
        `${state.scores[0]} \u2013 ${state.scores[1]}   \u00B7   press ESC to restart`);
      drawWinCelebration(state, rc.p1Color, rc.p2Color);
    }
  }

  drawPowerUp();
  drawComboTexts();
  drawPuTexts();
  drawEffectHud(rc.p1Color, rc.p2Color);
  drawChangeBtn(rc.changeHover);
  drawEscHint();
  drawScreenFlash(flashAlpha, flashCol);
  ctx.restore();
}
