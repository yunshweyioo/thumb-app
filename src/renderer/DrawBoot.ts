import { ctx, W, H } from '../canvas.ts';

export const BOOT_LINES = [
  'SPAMCO SYSTEMS v1.0',
  '',
  '> MEMORY CHECK..... OK',
  '> AUDIO............ OK',
  '> VIDEO............ OK',
  '',
  '> LOADING SPAM WARS...',
  '',
];

export let bootLineShown = 0;
export let bootLineTimer = 0;
export let bootDoneTimer = 0;
export const BOOT_LINE_DELAY = 0.18;

export function tickBoot(dt: number): boolean {
  bootLineTimer += dt;
  while (bootLineTimer >= BOOT_LINE_DELAY && bootLineShown < BOOT_LINES.length) {
    bootLineShown++;
    bootLineTimer -= BOOT_LINE_DELAY;
  }
  if (bootLineShown >= BOOT_LINES.length) {
    bootDoneTimer += dt;
    return bootDoneTimer > 1.0;
  }
  return false;
}

export function resetBoot(): void {
  bootLineShown = 0;
  bootLineTimer = 0;
  bootDoneTimer = 0;
}

export function drawBoot(): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const startX = 48, startY = 60, lineH = 24;
  for (let i = 0; i < Math.min(bootLineShown, BOOT_LINES.length); i++) {
    const line = BOOT_LINES[i];
    if (!line) continue;
    const isCmd = line.startsWith('>');
    ctx.save();
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = isCmd ? '#33ff55' : '#8899bb';
    ctx.shadowColor = isCmd ? '#33ff55' : 'transparent';
    ctx.shadowBlur  = isCmd ? 10 : 0;
    ctx.fillText(line, startX, startY + i * lineH);
    ctx.restore();
  }
  // Blinking cursor at end
  if (bootLineShown >= BOOT_LINES.length) {
    const blinkOn = (performance.now() % 700) < 350;
    if (blinkOn) {
      ctx.save();
      ctx.fillStyle = '#33ff55';
      ctx.shadowColor = '#33ff55'; ctx.shadowBlur = 10;
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText('_', startX, startY + BOOT_LINES.length * lineH);
      ctx.restore();
    }
  }
}
