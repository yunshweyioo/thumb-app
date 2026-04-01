import type { GameMode } from './GameMode.ts';

const registry = new Map<string, new () => GameMode>();

export const modeRegistry = {
  register(Cls: new () => GameMode): void {
    registry.set(new Cls().id, Cls);
  },
  get(id: string): GameMode {
    const Cls = registry.get(id);
    if (!Cls) {
      throw new Error(
        `Unknown game mode: "${id}". Registered modes: [${[...registry.keys()].join(', ')}]`
      );
    }
    return new Cls();
  },
  list(): string[] {
    return [...registry.keys()];
  },
};
