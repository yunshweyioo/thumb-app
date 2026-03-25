# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

No build step. Open `index.html` directly in a browser:

```
open index.html          # macOS
python3 -m http.server   # or serve via local HTTP if needed
```

## Architecture

The entire game lives in a single `index.html` file (~910 lines). There are no dependencies, no build tools, and no external JS — just vanilla HTML/CSS/JS.

### Structure within index.html

- **CSS (lines 8–107):** Page layout, title slam/bob animations, tagline fade, impact flash overlay.
- **Canvas setup (lines 117–127):** Fixed logical size 820×420, scaled for HiDPI via `devicePixelRatio`.
- **Audio (lines 146–258):** Web Audio API synth functions — `sfxTap` (3-layer chiptune hit), `sfxCountdown`, `sfxWin`, and a sustain drone (`pinTone`) that's initialized but not yet triggered during gameplay.
- **Visual subsystems (lines 260–414):** Particle burst system, screen shake, screen flash, orb bounce/trail, TPS (taps-per-second) tracking, and segmented energy meters.
- **Game state (lines 416–434):** `initState()` creates the canonical `state` object — balance, scores, round, phase, timers.
- **Input (lines 441–461):** `keydown` listener maps `A` → Player 1, `L` → Player 2; `R` restarts from `gameOver`.
- **Game logic (lines 463–510):** `tickGame` drives orb drift and round timer; `winRound` / `nextRound` handle phase transitions. Best-of-3 match (first to 2 rounds).
- **Draw functions (lines 545–907):** Each visual layer is its own `draw*` function — `drawBg`, `drawScore`, `drawMeter`, `drawBar`, `drawPlayers`, `drawRoundTimer`, `drawCountdown`, `drawOverlay`, `drawScreenFlash`.
- **Main loop (lines 512–543):** `requestAnimationFrame` loop; `dt` capped at 50 ms to avoid spiral-of-death on tab blur.

### Game phases

`countdown` (3-2-1-GO) → `playing` → `roundEnd` (2.8 s pause) → back to `countdown` or `gameOver`

### Key tuning constants

| Constant | Value | Effect |
|---|---|---|
| `TAP_STEP` | 0.068 | How far each tap moves the orb |
| `DRIFT_SPD` | 0.10 | How fast the orb returns to center |
| `ROUND_TIME` | 30 | Seconds per round |
