import { Transport, TransportMessage, TransportEventMap } from './Transport.ts';

type AnyFn = (data: unknown) => void;

export class LocalTransport extends Transport {
  private peer: LocalTransport | null = null;
  private listeners = new Map<string, Set<AnyFn>>();
  private playerId = '';

  /** Create two paired transports that can deliver messages to each other. */
  static pair(): [LocalTransport, LocalTransport] {
    const a = new LocalTransport();
    const b = new LocalTransport();
    a.peer = b;
    b.peer = a;
    return [a, b];
  }

  async connect(roomId: string, playerId: string): Promise<void> {
    this.playerId = playerId;
    this._emit('connected', { roomId, playerId });
  }

  send(eventType: string, payload: unknown): void {
    if (!this.peer) return;
    const msg: TransportMessage = {
      from:    this.playerId,
      event:   eventType,
      payload,
      ts:      performance.now(),
    };
    this.peer._deliver(msg);
  }

  broadcast(eventType: string, payload: unknown): void {
    this.send(eventType, payload);
  }

  disconnect(): void {
    this._emit('disconnected', { code: 1000, reason: 'local disconnect' });
    this.peer?._emit('disconnected', { code: 1000, reason: 'peer disconnected' });
  }

  on<K extends keyof TransportEventMap>(event: K, listener: (d: TransportEventMap[K]) => void): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as AnyFn);
    return this;
  }

  off<K extends keyof TransportEventMap>(event: K, listener: (d: TransportEventMap[K]) => void): this {
    this.listeners.get(event)?.delete(listener as AnyFn);
    return this;
  }

  private _deliver(msg: TransportMessage): void { this._emit('message', msg); }

  private _emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(l => l(data));
  }
}
