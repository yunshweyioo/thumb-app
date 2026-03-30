import { getAC, spIdx } from './AudioEngine.ts';
import { rhythmTracker } from '../rhythm/RhythmTracker.ts';

// Scott Pilgrim style — cycling chiptune hit sounds, pitch scales with tap speed
const SP_SCALES = [
  [1, 1.5], [1.25, 1.78], [1.5, 2], [1.12, 1.68], [0.89, 1.33], [1.33, 1.78],
];

let pinTone: { o: OscillatorNode; g: GainNode } | null = null;

export function sfxTap(player: 1 | 2): void {
  try {
    const a   = getAC();
    const t   = a.currentTime;
    const tps = rhythmTracker.getTPS(player);
    // Base pitch: P1 higher/brighter, P2 lower/punchier
    const root  = player === 1 ? 587 : 440;  // D5 vs A4
    const boost = 1 + Math.min(tps / 20, 0.3);  // pitch creeps up when spamming fast
    const [r1, r2] = SP_SCALES[spIdx[player-1] % SP_SCALES.length];
    spIdx[player-1]++;

    // ── Layer 1: punchy square-wave sweep ──
    const o1 = a.createOscillator(), g1 = a.createGain();
    o1.connect(g1); g1.connect(a.destination);
    o1.type = 'square';
    o1.frequency.setValueAtTime(root * r2 * boost, t);
    o1.frequency.exponentialRampToValueAtTime(root * r1 * boost * 0.55, t + 0.06);
    g1.gain.setValueAtTime(0.13, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o1.start(t); o1.stop(t + 0.09);

    // ── Layer 2: sub-octave thud ──
    const o2 = a.createOscillator(), g2 = a.createGain();
    o2.connect(g2); g2.connect(a.destination);
    o2.type = 'square';
    o2.frequency.setValueAtTime(root * r1 * boost * 0.5, t);
    o2.frequency.exponentialRampToValueAtTime(root * boost * 0.25, t + 0.05);
    g2.gain.setValueAtTime(0.07, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o2.start(t); o2.stop(t + 0.06);

    // ── Layer 3: noise burst (percussive crunch) ──
    const bufLen = Math.floor(a.sampleRate * 0.04);
    const buf    = a.createBuffer(1, bufLen, a.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
    const noise  = a.createBufferSource();
    noise.buffer = buf;
    const gn     = a.createGain();
    noise.connect(gn); gn.connect(a.destination);
    gn.gain.setValueAtTime(0.055, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.start(t); noise.stop(t + 0.04);
  } catch (_) {}
}

export function sfxCountdown(isGo: boolean): void {
  try {
    const a = getAC(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.frequency.value = isGo ? 880 : 440;
    o.type = 'sine';
    g.gain.setValueAtTime(0.18, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + (isGo ? 0.25 : 0.1));
    o.start(); o.stop(a.currentTime + (isGo ? 0.25 : 0.1));
  } catch (_) {}
}

export function sfxWin(player: 1 | 2): void {
  try {
    const a = getAC();
    const freqs = player === 1 ? [523,659,784,1047] : [392,494,587,784];
    freqs.forEach((f, i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination);
      const t = a.currentTime + i * 0.11;
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.start(t); o.stop(t + 0.35);
    });
  } catch (_) {}
}

export function startPinTone(): void {
  if (pinTone) return;
  try {
    const a = getAC(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = 'sawtooth'; o.frequency.value = 80;
    g.gain.setValueAtTime(0, a.currentTime);
    g.gain.linearRampToValueAtTime(0.04, a.currentTime + 0.3);
    o.start();
    pinTone = { o, g };
  } catch (_) {}
}

export function updatePinTone(prog: number): void {
  if (!pinTone) return;
  try {
    const a = getAC();
    pinTone.o.frequency.setTargetAtTime(80 + prog * 280, a.currentTime, 0.05);
    pinTone.g.gain.setTargetAtTime(0.025 + prog * 0.05, a.currentTime, 0.05);
  } catch (_) {}
}

export function stopPinTone(): void {
  if (!pinTone) return;
  try {
    const a = getAC();
    pinTone.g.gain.linearRampToValueAtTime(0, a.currentTime + 0.12);
    pinTone.o.stop(a.currentTime + 0.12);
  } catch (_) {}
  pinTone = null;
}
