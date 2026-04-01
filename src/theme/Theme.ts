export type BackgroundType = 'stars' | 'grid' | 'solid';
export type AudioStyle    = 'chiptune' | 'synth' | 'silent';

export interface ThemeColors {
  bg: string;
  p1Default: string;
  p2Default: string;
  accent: string;
  fire: [string, string, string, string];
  text: string;
  meterFill: [string, string, string, string, string, string];
  barFill: string;
  starColor: string;
}

export interface ThemeFonts {
  main: string;
  fallback: string;
  googleFontsUrl?: string;
}

export interface ThemeBackground {
  type: BackgroundType;
  starCount?: number;
  gridColor?: string;
  solidColor?: string;
}

export interface AlienDef {
  s: number;
  c: string;
  e: string;
}

export interface ThemeSprites {
  shapes: number[][][];
  aliens: AlienDef[];
}

export interface ThemeAudio {
  style: AudioStyle;
  p1RootHz?: number;
  p2RootHz?: number;
  scales?: [number, number][];
}

export interface Theme {
  id: string;
  label: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  background: ThemeBackground;
  sprites: ThemeSprites;
  audio: ThemeAudio;
}
