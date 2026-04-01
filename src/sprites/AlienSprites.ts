import { ctx } from '../canvas.ts';
import { themeManager } from '../theme/ThemeManager.ts';

// New helper — replaces P1C() and P2C()
export function getAlienColor(idx: number): string {
  const aliens = themeManager.getAliens();
  return aliens[idx]?.c ?? themeManager.get().colors.p1Default;
}

// ── Per-alien select animation ─────────────────────────────────────────────────
// Returns {dx, dy, sx, sy, rot} canvas transforms for the selected sprite
export function alienAnim(i: number, t: number) {
  const s = Math.sin, c = Math.cos, abs = Math.abs;
  switch (i) {
    case  0: return { dx: s(t*4)*6,            dy: 0,                   sx: 1,                    sy: 1,           rot: 0             }; // crab: scuttle L/R
    case  1: return { dx: 0,                   dy: -abs(s(t*5))*9,      sx: 1,                    sy: 1,           rot: 0             }; // insect: hop
    case  2: { const p=0.82+0.18*s(t*3);       return {dx:0,dy:0,       sx:p,                     sy:p,            rot:0             }; } // blob: pulse
    case  3: return { dx: 0,                   dy: 0,                   sx: 1,                    sy: 1,           rot: t * 2.0       }; // spider: spin
    case  4: return { dx: s(t*6)*5,            dy: s(t*12)*2,           sx: 1,                    sy: 1,           rot: s(t*6)*0.12   }; // crab: scuttle+tilt
    case  5: return { dx: s(t*9)*3,            dy: -abs(s(t*9))*7,      sx: 1,                    sy: 1,           rot: 0             }; // insect: flutter
    case  6: { const q=1+0.22*s(t*4);          return {dx:0,dy:5*(q-1), sx:q,                     sy:2-q,          rot:0             }; } // blob: squash & stretch
    case  7: return { dx: s(t*22)*3,           dy: c(t*19)*3,           sx: 1,                    sy: 1,           rot: 0             }; // spider: vibrate
    case  8: return { dx: s(t*3)*7,            dy: 0,                   sx: 1,                    sy: 1,           rot: s(t*3)*0.18   }; // crab: wave
    case  9: { const j=(t*3.5)%(Math.PI*2);    return {dx:0,           dy:-abs(s(j))*11,          sx:1,            sy:1,            rot:0}; } // insect: jump
    case 10: { const p=0.88+0.12*s(t*2.5);     return {dx:0,dy:s(t*2.5)*4, sx:p,                 sy:p,            rot:0             }; } // blob: float+breathe
    case 11: return { dx: 0,                   dy: 0,                   sx: 1,                    sy: 1,           rot: s(t*1.4)*0.45 }; // spider: sway
    case 12: return { dx: s(t*11)*8,           dy: 0,                   sx: 1,                    sy: 1,           rot: 0             }; // crab: dash
    case 13: { const z=1+0.2*s(t*3.5);         return {dx:0,dy:0,       sx:z,                     sy:z,            rot:0             }; } // insect: zoom
    case 14: return { dx: s(t*5)*5,            dy: c(t*5)*4,            sx: 1,                    sy: 1,           rot: s(t*5)*0.22   }; // blob: orbit wiggle
    case 15: return { dx: 0,                   dy: s(t*2)*6,            sx: 1,                    sy: 1,           rot: 0             }; // spider: float
    default: return { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 };
  }
}

export function drawAlienSprite(idx: number, cx: number, cy: number, ps: number): void {
  const aliens = themeManager.getAliens();
  const shapes = themeManager.getShapes();
  const a = aliens[idx];
  const grid = shapes[a.s];
  const cols = grid[0].length, rows = grid.length;
  const ox = cx - (cols * ps) / 2;
  const oy = cy - (rows * ps) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (!v) continue;
      ctx.fillStyle = v === 2 ? a.e : a.c;
      ctx.fillRect(Math.round(ox + c * ps), Math.round(oy + r * ps), ps, ps);
    }
  }
}
