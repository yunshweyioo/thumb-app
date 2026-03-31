export interface TransportMessage {
  from: string;     // playerId of sender
  event: string;    // e.g. 'tap', 'sync', 'ping'
  payload: unknown;
  ts: number;       // sender's performance.now() at time of send
}

export type TransportEventMap = {
  message:      TransportMessage;
  connected:    { roomId: string; playerId: string };
  disconnected: { code: number; reason: string };
  error:        { message: string; cause?: unknown };
};

export abstract class Transport {
  /** Connect to a room. Resolves when handshake is complete. */
  abstract connect(roomId: string, playerId: string): Promise<void>;

  /** Send an event to connected peer(s). */
  abstract send(eventType: string, payload: unknown): void;

  /** Alias for send() — semantically "broadcast to all peers". */
  abstract broadcast(eventType: string, payload: unknown): void;

  /** Close the connection gracefully. */
  abstract disconnect(): void;

  abstract on<K extends keyof TransportEventMap>(
    event: K,
    listener: (data: TransportEventMap[K]) => void
  ): this;

  abstract off<K extends keyof TransportEventMap>(
    event: K,
    listener: (data: TransportEventMap[K]) => void
  ): this;
}
