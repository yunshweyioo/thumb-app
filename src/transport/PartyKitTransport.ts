import { Transport } from './Transport.ts';
import type { TransportEventMap } from './Transport.ts';

/**
 * PartyKit (Cloudflare Durable Objects) WebSocket transport.
 *
 * TO IMPLEMENT:
 *   1. npm install partysocket
 *   2. Create a PartyKit server at `parties/game.ts` (see https://docs.partykit.io)
 *   3. Replace the throw statements below with PartySocket connection logic
 *   4. Room URL pattern: `${this.hostUrl}/parties/game/${roomId}`
 *   5. All messages must use TransportMessage shape: { from, event, payload, ts }
 */
export class PartyKitTransport extends Transport {
  constructor(private hostUrl: string) { super(); }

  connect(_roomId: string, _playerId: string): Promise<void> {
    throw new Error(
      'PartyKitTransport.connect() not implemented. ' +
      'See src/transport/PartyKitTransport.ts for instructions.'
    );
  }
  send(_eventType: string, _payload: unknown): void {
    throw new Error('PartyKitTransport.send() not implemented.');
  }
  broadcast(_eventType: string, _payload: unknown): void {
    throw new Error('PartyKitTransport.broadcast() not implemented.');
  }
  disconnect(): void {
    throw new Error('PartyKitTransport.disconnect() not implemented.');
  }
  on<K extends keyof TransportEventMap>(_e: K, _l: (d: TransportEventMap[K]) => void): this {
    throw new Error('PartyKitTransport.on() not implemented.');
  }
  off<K extends keyof TransportEventMap>(_e: K, _l: (d: TransportEventMap[K]) => void): this {
    throw new Error('PartyKitTransport.off() not implemented.');
  }
}
