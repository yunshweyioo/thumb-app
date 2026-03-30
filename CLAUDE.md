# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

No build step. Open `index.html` directly in a browser:

```
open index.html          # macOS
python3 -m http.server   # or serve via local HTTP if needed
```

## Architecture

The entire game lives in a single `index.html` file (~2566 lines). There are no build tools; external resources are limited to Google Fonts (Bangers, Press Start 2P) loaded via `<link>`.

### Structure within index.html

- **CSS (lines 9–243):** Page layout, title slam/bob animations, tagline fade, impact flash overlay, CRT arcade bezel styling (corner screws, inset shadows, scanlines, gloss layer), scrolling ticker.
- **Canvas setup (lines 260–270):** Fixed logical size 820×420, scaled for HiDPI via `devicePixelRatio` (capped at 2×).
- **Colors & geometry (lines 272–303):** `P1C()` / `P2C()` pull color from selected alien; bar/orb geometry constants; pre-generated star positions for background.
- **Audio (lines 311–424):** Web Audio API synth functions — `sfxTap` (3-layer chiptune hit with pitch scaling by TPS), `sfxCountdown`, `sfxWin`, and a sustain drone (`pinTone`).
- **Visual subsystems (lines 426–610):** Particle burst system, screen shake, screen flash, orb bounce/trail, TPS (taps-per-second) tracking with rhythm bonus, and segmented energy meters (`drawMeter`).
- **Pixel-art alien sprites (lines 612–695):** 4 `SHAPES` (crab, insect, blob, spider), 16 `ALIENS` entries with body/eye colors. `alienAnim(i, t)` returns per-alien canvas transforms for the character select screen.
- **Score pop & floating texts (lines 713–789):** `triggerScorePop` for score digit zoom; combo float-up texts; power-up pickup texts (zoom-out + fade style).
- **Boot sequence (lines 721–734):** Scrolling terminal-style lines shown once on first load before transitioning to `charSelect` / `howToPlay`.
- **Power-ups (lines 790–853):** Three types — `speed` (SPD, 4 s), `reverse` (REV, 2.5 s), `freeze` (FRZ, 2.5 s). A diamond token spawns on the bar every ~5 s; orb collision collects it for the nearer player. Active effects tracked in `puEffects[2]`.
- **Leaderboard storage (lines 855–870):** `localStorage`-backed win counts per player (`spamwars_wins_p1/p2`) and a top-10 leaderboard (`spamwars_lb`) storing name, icon, win count, total taps, and spam rate.
- **Game state (lines 901–927):** `initState()` creates the canonical `state` object — balance, scores, round, phase, timers, tap counts, player icon indices.
- **Input (lines 931–989):**
  - During `playing`: `A` → Player 1 tap, `L` → Player 2 tap.
  - During `charSelect`: `A`/`S` cycle P1 alien; `L`/`K` cycle P2 alien; `Space` confirms.
  - `ESC` → return to lobby from most phases.
  - `R` → restart from `gameOver` (goes to lobby).
  - `Space` → start from lobby; dismiss `howToPlay`.
  - Touch events on canvas map to tap zones for mobile.
- **Game logic (lines 1071–1147):** `tickGame` drives orb drift (with tug-zone comeback mechanic and idle snap-back), power-up ticks, round timer, and win/draw detection. `winRound` / `drawRound` / `nextRound` handle phase transitions. Best-of-3 match (first to 2 rounds).
- **Main loop (lines 1149–1200):** `requestAnimationFrame` loop; `dt` capped at 50 ms to avoid spiral-of-death on tab blur.
- **Draw functions (lines 1229–2566):** Each visual layer is its own `draw*` function — `drawBoot`, `drawBg`, `drawScore`, `drawMeter`, `drawBar`, `drawPowerUp`, `drawPlayers`, `drawRoundTimer`, `drawCountdown`, `drawOverlay`, `drawScreenFlash`, `drawCelebration`, `drawCharSelect`, `drawNameEntry`, `drawLeaderboard`, `drawHowToPlay`, `drawLobby`, `drawChangePlayersBtn`, `drawEscHint`.

### Game phases

```
boot → howToPlay* → charSelect → lobby → countdown (3-2-1-GO)
                                    ↑         ↓
                               lobby ← roundEnd (2.8–3.2 s pause)
                                           ↓ (match over)
                                      nameEntry → leaderboard → lobby
                                      gameOver (draw) → lobby
```
\* `howToPlay` only shown on first run; skipped if `spamwars_seen_howto` is set in localStorage.

### Key tuning constants

| Constant | Value | Effect |
|---|---|---|
| `TAP_STEP` | 0.068 | How far each tap moves the orb |
| `DRIFT_SPD` | 0.10 | Base speed orb returns to center |
| `ROUND_TIME` | 30 | Seconds per round |
