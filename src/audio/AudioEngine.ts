let ac: AudioContext | null = null;

export function getAC(): AudioContext {
  if (!ac) ac = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

// spIdx tracks which chiptune scale variant to use next for each player
export const spIdx: [number, number] = [0, 0];
