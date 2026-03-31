export type GameAction =
  | { type: 'tap';          player: 1 | 2 }
  | { type: 'navigate';     direction: 'prev' | 'next'; player: 1 | 2 }
  | { type: 'confirm' }
  | { type: 'escape' }
  | { type: 'restart' }
  | { type: 'nameChar';     char: string }
  | { type: 'nameBackspace' }
  | { type: 'nameSubmit' }
  | { type: 'click';        x: number; y: number }
  | { type: 'hover';        target: string; active: boolean };

type Listener = (action: GameAction) => void;
const listeners: Listener[] = [];

export const inputBus = {
  dispatch(action: GameAction): void {
    [...listeners].forEach(l => l(action));
  },
  subscribe(fn: Listener): () => void {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i > -1) listeners.splice(i, 1);
    };
  },
};
