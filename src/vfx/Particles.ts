import { ctx } from '../canvas.ts';
import { BAR_Y } from '../constants.ts';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; life: number; decay: number; color: string;
}

const particles: Particle[] = [];

export function burst(color: string, orbX: number, big: boolean): void {
  const count = big ? 32 : 12;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.7;
    const spd   = big ? (90 + Math.random() * 240) : (55 + Math.random() * 140);
    particles.push({
      x: orbX, y: BAR_Y,
      vx: Math.cos(angle) * spd * 0.7 + (Math.random()-0.5)*90,
      vy: Math.sin(angle) * spd,
      r: big ? (5 + Math.random() * 8) : (3 + Math.random() * 5),
      life: 1.0, decay: big ? 1.5 : 2.2, color,
    });
  }
}

export function tickParticles(dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 200 * dt; p.vx *= (1 - 1.5 * dt);
    p.life -= p.decay * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(): void {
  for (const p of particles) {
    const sz = Math.ceil(p.r * Math.max(0.1, p.life));
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life) * 0.9;
    ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x - sz/2), Math.round(p.y - sz/2), sz, sz);
    ctx.restore();
  }
}

export function resetParticles(): void {
  particles.length = 0;
}
