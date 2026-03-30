export let shakeAmt = 0;
export let flashAlpha = 0;
export let flashCol = '#fff';
export let orbBounce = 0;
export let orbVelX = 0;   // -1..1, direction+magnitude of recent tap
export let coinAngle = 0;
export let orbitAngle = 0;   // for orbiting dots
export const orbTrail: Array<{ x: number; age: number }> = [];

export function addShake(v: number): void { shakeAmt = Math.max(shakeAmt, v); }
export function tickShake(dt: number): void { shakeAmt = Math.max(0, shakeAmt - dt * 18); }
export function getShakeOffset(): { x: number; y: number } {
  return shakeAmt > 0.2
    ? { x: (Math.random()-0.5)*shakeAmt*14, y: (Math.random()-0.5)*shakeAmt*14 }
    : { x: 0, y: 0 };
}

export function addFlash(col: string, a = 1): void { flashAlpha = a; flashCol = col; }
export function tickFlash(dt: number): void { flashAlpha = Math.max(0, flashAlpha - dt * 4); }

export function triggerOrbBounce(): void { orbBounce = 1; }
export function tickOrb(dt: number): void {
  orbBounce  = Math.max(0, orbBounce - dt * 9);
  orbVelX   *= Math.max(0, 1 - dt * 6);
  coinAngle  += orbVelX * dt * 18;
  // Orbit dots spin at base speed + boost from current velocity
  orbitAngle += dt * (2.5 + Math.abs(orbVelX) * 8);
}
export function setOrbVelX(v: number): void { orbVelX = v; }

export function pushTrail(x: number): void {
  orbTrail.push({ x, age: 0 });
  if (orbTrail.length > 28) orbTrail.shift();
}
export function tickTrail(dt: number): void { orbTrail.forEach(t => t.age += dt); }

export function resetScreenEffects(): void {
  shakeAmt = 0;
  flashAlpha = 0;
  orbBounce = 0;
  orbVelX = 0;
  coinAngle = 0;
  orbitAngle = 0;
  orbTrail.length = 0;
}
