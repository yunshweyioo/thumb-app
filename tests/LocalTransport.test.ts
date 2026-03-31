import { describe, it, expect, vi } from 'vitest';
import { LocalTransport } from '../src/transport/LocalTransport.ts';

describe('LocalTransport', () => {
  it('connect resolves immediately', async () => {
    const [a] = LocalTransport.pair();
    await expect(a.connect('room1', 'p1')).resolves.toBeUndefined();
  });

  it('send delivers message to peer', async () => {
    const [a, b] = LocalTransport.pair();
    await a.connect('r', 'p1');
    await b.connect('r', 'p2');
    const spy = vi.fn();
    b.on('message', spy);
    a.send('tap', { player: 1 });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0].event).toBe('tap');
    expect(spy.mock.calls[0][0].from).toBe('p1');
    expect(spy.mock.calls[0][0].payload).toEqual({ player: 1 });
  });

  it('message includes ts as number', async () => {
    const [a, b] = LocalTransport.pair();
    await a.connect('r', 'p1'); await b.connect('r', 'p2');
    const spy = vi.fn();
    b.on('message', spy);
    a.send('ping', {});
    expect(typeof spy.mock.calls[0][0].ts).toBe('number');
  });

  it('disconnect fires disconnected on peer', async () => {
    const [a, b] = LocalTransport.pair();
    await a.connect('r', 'p1'); await b.connect('r', 'p2');
    const spy = vi.fn();
    b.on('disconnected', spy);
    a.disconnect();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('off unregisters listener', async () => {
    const [a, b] = LocalTransport.pair();
    await a.connect('r', 'p1'); await b.connect('r', 'p2');
    const spy = vi.fn();
    b.on('message', spy);
    b.off('message', spy);
    a.send('tap', {});
    expect(spy).not.toHaveBeenCalled();
  });
});
