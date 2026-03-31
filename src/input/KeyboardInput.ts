import { inputBus } from './InputBus.ts';

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();

  switch (e.key) {
    case 'Escape':      inputBus.dispatch({ type: 'escape' }); break;
    case 'r': case 'R': inputBus.dispatch({ type: 'restart' }); break;
    case 'Enter':
    case ' ':           inputBus.dispatch({ type: 'confirm' }); break;
    case 'Backspace':   inputBus.dispatch({ type: 'nameBackspace' }); break;
    case 'a': case 'A':
      inputBus.dispatch({ type: 'tap',      player: 1 });
      inputBus.dispatch({ type: 'navigate', direction: 'prev', player: 1 });
      break;
    case 's': case 'S':
      inputBus.dispatch({ type: 'navigate', direction: 'next', player: 1 });
      break;
    case 'l': case 'L':
      inputBus.dispatch({ type: 'tap',      player: 2 });
      inputBus.dispatch({ type: 'navigate', direction: 'prev', player: 2 });
      break;
    case 'k': case 'K':
      inputBus.dispatch({ type: 'navigate', direction: 'next', player: 2 });
      break;
    default:
      if (e.key.length === 1) inputBus.dispatch({ type: 'nameChar', char: e.key.toUpperCase() });
  }
});
