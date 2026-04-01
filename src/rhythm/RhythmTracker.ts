import { ctx, W } from '../canvas.ts';
import { BAR_Y, METER_SEGS, METER_H, METER_W, METER_GAP, SEG_H } from '../constants.ts';
import { hexAlpha, glowTxt } from '../renderer/CanvasUtils.ts';
import { themeManager } from '../theme/ThemeManager.ts';

export class RhythmTracker {
  tapHistory: [number[], number[]] = [[], []];
  lastTapTime: [number, number] = [0, 0];
  lastTapGap: [number, number] = [0, 0];
  rhythmBonus: [number, number] = [0, 0];
  meterLevel: [number, number] = [0, 0];
  meterPeak: [number, number] = [0, 0];
  meterPeakT: [number, number] = [0, 0];

  recordTap(player: 1 | 2, now = performance.now()): void {
    const idx = player - 1;
    const gap = now - this.lastTapTime[idx];
    if (this.lastTapTime[idx] > 0 && gap < 600) {
      // How similar is this gap to the last gap? (1 = identical, 0 = very different)
      const consistency = this.lastTapGap[idx] > 0
        ? Math.max(0, 1 - Math.abs(gap - this.lastTapGap[idx]) / this.lastTapGap[idx])
        : 0;
      this.rhythmBonus[idx] = Math.min(1, this.rhythmBonus[idx] * 0.6 + consistency * 0.5);
    } else {
      this.rhythmBonus[idx] *= 0.4; // gap too long, decay bonus
    }
    this.lastTapGap[idx]  = gap;
    this.lastTapTime[idx] = now;
    this.tapHistory[idx].push(now);
  }

  getTPS(player: 1 | 2): number {
    const now = performance.now();
    this.tapHistory[player-1] = this.tapHistory[player-1].filter(t => now - t < 1000);
    return this.tapHistory[player-1].length;
  }

  getBonus(player: 1 | 2): number {
    return this.rhythmBonus[player - 1];
  }

  spikeMe(player: 1 | 2): void {
    const p = player - 1;
    this.meterLevel[p] = Math.min(1, this.meterLevel[p] + 0.18);
    if (this.meterLevel[p] >= this.meterPeak[p]) {
      this.meterPeak[p] = this.meterLevel[p];
      this.meterPeakT[p] = 0.55;
    }
  }

  tickMeters(dt: number): void {
    for (let p = 0; p < 2; p++) {
      const target = Math.min(this.getTPS((p + 1) as 1 | 2) / 10, 1);
      this.meterLevel[p] += (target > this.meterLevel[p] ? 10 : 3) * dt * (target - this.meterLevel[p]);
      this.meterLevel[p] = Math.max(0, Math.min(1, this.meterLevel[p]));
      this.meterPeakT[p] -= dt;
      if (this.meterPeakT[p] < 0) this.meterPeak[p] = Math.max(this.meterLevel[p], this.meterPeak[p] - dt * 1.5);
    }
  }

  // drawMeter takes colors as params so this module doesn't depend on alien data
  drawMeter(player: 1 | 2, p1Color: string, p2Color: string): void {
    const isP1 = player === 1;
    const mx   = isP1 ? 26 : W - 26;
    const col  = isP1 ? p1Color : p2Color;
    const lv   = this.meterLevel[player - 1];
    const topY = BAR_Y - METER_H / 2;
    const PAD  = 4; // casing padding

    // Segment colour ramp: green → yellow-green → yellow → orange → red
    const meterFill = themeManager.get().colors.meterFill;
    function segColor(frac: number): string {
      if (frac <= 0.20) return meterFill[0];
      if (frac <= 0.40) return meterFill[1];
      if (frac <= 0.58) return meterFill[2];
      if (frac <= 0.75) return meterFill[3];
      if (frac <= 0.88) return meterFill[4];
      return meterFill[5];
    }

    // Outer casing
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(mx - METER_W/2 - PAD, topY - PAD, METER_W + PAD*2, METER_H + PAD*2, 4);
    ctx.fillStyle = '#0d0d18';
    ctx.fill();
    ctx.strokeStyle = '#555566';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Segments
    for (let i = 0; i < METER_SEGS; i++) {
      const frac = (i + 1) / METER_SEGS;
      const sy   = topY + METER_H - (i + 1) * SEG_H - i * METER_GAP;
      const on   = frac <= lv;
      const sc   = segColor(frac);

      ctx.save();
      if (on) { ctx.shadowColor = sc; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.rect(mx - METER_W/2, sy, METER_W, SEG_H);
      ctx.fillStyle = on ? sc : hexAlpha(sc, 0.1);
      ctx.fill();
      if (!on) { ctx.strokeStyle = hexAlpha(sc, 0.2); ctx.lineWidth = 1; ctx.stroke(); }
      ctx.restore();
    }

    // Label
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save();
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.shadowColor = col; ctx.shadowBlur = 8;
    ctx.fillStyle = col;
    glowTxt('PWR', mx, topY - 10);
    ctx.restore();
  }

  reset(): void {
    this.meterLevel[0] = this.meterLevel[1] = this.meterPeak[0] = this.meterPeak[1] = 0;
    this.meterPeakT[0] = this.meterPeakT[1] = 0;
    this.tapHistory[0].length = this.tapHistory[1].length = 0;
    this.lastTapTime[0] = this.lastTapTime[1] = this.lastTapGap[0] = this.lastTapGap[1] = this.rhythmBonus[0] = this.rhythmBonus[1] = 0;
  }
}

export const rhythmTracker = new RhythmTracker();
