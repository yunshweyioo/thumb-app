import type { Theme } from './Theme.ts';

export class ThemeManager {
  private theme: Theme | null = null;

  load(json: unknown): Theme {
    this.validate(json);
    this.theme = json as Theme;
    this.applyCSS(this.theme);
    return this.theme;
  }

  validate(json: unknown): asserts json is Theme {
    if (!json || typeof json !== 'object') throw new Error('Theme must be an object');
    const t = json as Record<string, unknown>;
    if (typeof t.id !== 'string')         throw new Error('Theme missing id');
    if (!t.colors)                        throw new Error('Theme missing colors');
    if (typeof (t.colors as any).bg !== 'string')
                                          throw new Error('Theme missing colors.bg');
    if (!t.sprites)                       throw new Error('Theme missing sprites');
    if (!Array.isArray((t.sprites as any).aliens))
                                          throw new Error('Theme sprites.aliens must be an array');
    if (!Array.isArray((t.sprites as any).shapes))
                                          throw new Error('Theme sprites.shapes must be an array');
    const validAudio = ['chiptune', 'synth', 'silent'];
    if (!validAudio.includes((t.audio as any)?.style))
                                          throw new Error('Theme audio.style must be "chiptune" | "synth" | "silent"');
  }

  applyCSS(theme: Theme): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--sw-font-main', theme.fonts.main);
    root.style.setProperty('--sw-bg', theme.colors.bg);
    root.style.setProperty('--sw-accent', theme.colors.accent);

    if (theme.fonts.googleFontsUrl) {
      const id = `sw-gfont-${theme.id}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id; link.rel = 'stylesheet'; link.href = theme.fonts.googleFontsUrl;
        document.head.appendChild(link);
      }
    }
  }

  get(): Theme {
    if (!this.theme) throw new Error('No theme loaded. Call themeManager.load(json) first.');
    return this.theme;
  }

  getAliens()  { return this.get().sprites.aliens; }
  getShapes()  { return this.get().sprites.shapes; }
}

export const themeManager = new ThemeManager();
