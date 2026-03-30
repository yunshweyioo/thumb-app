# Spam Wars — Modular Refactoring

## What is this?

Spam Wars is a 2-player browser tapping game. P1 taps `A`, P2 taps `L`.
The orb moves toward whoever taps faster. Push it to your opponent's side to win.
Best-of-3 match. 16 alien characters. 3 power-ups. Retro chiptune audio.

## Why are we refactoring?

The entire game (~2566 lines) lives in `index.html`. We need modularity to support:
1. New visual themes (colors, sprites, audio)
2. Remote 2-player via PartyKit
3. WPM typing game mode
4. Difficulty settings

## Reference file

`public/reference.html` is a READ-ONLY copy of the original game preserved before any changes.
It is served at `http://localhost:5173/reference.html` during development.
Every phase compares the new implementation against this reference using Playwright screenshots.
Golden screenshots are in `reference/screenshots/`.

## How to run

```bash
npm install
npm run dev         # dev server at localhost:5173
npm test            # run unit tests
npm run build       # production build
```

Reference (original game): `http://localhost:5173/reference.html`
New implementation:         `http://localhost:5173/`

## Migration phases

| Phase | Doc | Status |
|---|---|---|
| 1 | [phase-1-foundation.md](phase-1-foundation.md) | ☐ |
| 2 | [phase-2-systems.md](phase-2-systems.md) | ☐ |
| 3 | [phase-3-input-renderer.md](phase-3-input-renderer.md) | ☐ |
| 4 | [phase-4-abstractions.md](phase-4-abstractions.md) | ☐ |
| 5 | [phase-5-theme-words.md](phase-5-theme-words.md) | ☐ |

## Key interface contracts (defined in Phase 4-5)

- `GameMode` — abstract class for game rule sets (`src/modes/GameMode.ts`)
- `Transport` — abstract class for local/remote input (`src/transport/Transport.ts`)
- `Theme` — JSON schema for visual/audio customization (`src/theme/Theme.ts`)
