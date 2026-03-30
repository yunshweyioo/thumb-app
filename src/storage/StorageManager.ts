export interface LeaderboardEntry {
  name: string;
  wins: number;
  icon: number;
  date: string;
  spamCount: number;
  spamRate: string;
}

export interface IStorageManager {
  getWins(player: 1 | 2): number;
  addWin(player: 1 | 2): void;
  getLB(): LeaderboardEntry[];
  saveLB(lb: LeaderboardEntry[]): void;
  addLBEntry(name: string, icon: number, spamCount: number, spamRate: string): void;
  getSeenHowTo(): boolean;
  setSeenHowTo(): void;
}

export class LocalStorageManager implements IStorageManager {
  getWins(p: 1 | 2): number {
    return parseInt(localStorage.getItem(`spamwars_wins_p${p}`) || '0') || 0;
  }
  addWin(p: 1 | 2): void {
    localStorage.setItem(`spamwars_wins_p${p}`, String(this.getWins(p) + 1));
  }
  getLB(): LeaderboardEntry[] {
    try { return JSON.parse(localStorage.getItem('spamwars_lb') || '[]'); }
    catch { return []; }
  }
  saveLB(lb: LeaderboardEntry[]): void {
    localStorage.setItem('spamwars_lb', JSON.stringify(lb));
  }
  addLBEntry(name: string, icon: number, spamCount: number, spamRate: string): void {
    const lb = this.getLB();
    const date = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    const existing = lb.find(e => e.name === name);
    if (existing) {
      existing.wins++;
      existing.icon = icon;
      existing.date = date;
      existing.spamCount = Math.max(existing.spamCount, spamCount);
      existing.spamRate = spamRate;
    } else {
      lb.push({ name, wins: 1, icon, date, spamCount, spamRate });
    }
    lb.sort((a, b) => b.wins - a.wins);
    this.saveLB(lb.slice(0, 10));
  }
  getSeenHowTo(): boolean {
    return localStorage.getItem('spamwars_seen_howto') === '1';
  }
  setSeenHowTo(): void {
    localStorage.setItem('spamwars_seen_howto', '1');
  }
}

// In-memory implementation for unit tests (no localStorage dependency)
export class MemoryStorageManager implements IStorageManager {
  private wins: [number, number] = [0, 0];
  private lb: LeaderboardEntry[] = [];
  private seenHowTo = false;

  getWins(p: 1 | 2): number { return this.wins[p - 1]; }
  addWin(p: 1 | 2): void { this.wins[p - 1]++; }
  getLB(): LeaderboardEntry[] { return [...this.lb]; }
  saveLB(lb: LeaderboardEntry[]): void { this.lb = [...lb]; }
  addLBEntry(name: string, icon: number, spamCount: number, spamRate: string): void {
    const existing = this.lb.find(e => e.name === name);
    if (existing) { existing.wins++; }
    else { this.lb.push({ name, wins: 1, icon, date: '01/01', spamCount, spamRate }); }
    this.lb.sort((a, b) => b.wins - a.wins);
    this.lb = this.lb.slice(0, 10);
  }
  getSeenHowTo(): boolean { return this.seenHowTo; }
  setSeenHowTo(): void { this.seenHowTo = true; }
}

export const storage: IStorageManager = new LocalStorageManager();
