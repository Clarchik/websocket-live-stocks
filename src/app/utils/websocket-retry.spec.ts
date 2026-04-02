import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { connectWithRetry } from './websocket-retry';

class MockWebSocket {
  static readonly OPEN = 1;
  static allInstances: MockWebSocket[] = [];

  readyState = 0;
  readonly sentMessages: string[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public readonly url: string) {
    MockWebSocket.allInstances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }
  close(): void {
    this.triggerClose();
  }

  triggerOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }
  triggerMessage(d: string): void {
    this.onmessage?.({ data: d });
  }
  triggerError(): void {
    this.onerror?.();
  }
  triggerClose(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  static get last(): MockWebSocket {
    return MockWebSocket.allInstances.at(-1)!;
  }
}

const makeHandlers = () => ({
  onOpen: vi.fn(),
  onMessage: vi.fn(),
  onRetrying: vi.fn(),
  onFailed: vi.fn(),
});

beforeEach(() => {
  MockWebSocket.allInstances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('connectWithRetry', () => {
  describe('initial connection', () => {
    it('creates a WebSocket with the given url', () => {
      connectWithRetry('ws://test', makeHandlers());
      expect(MockWebSocket.last.url).toBe('ws://test');
    });

    it('calls onOpen when connection succeeds', () => {
      const h = makeHandlers();
      connectWithRetry('ws://test', h);
      MockWebSocket.last.triggerOpen();
      expect(h.onOpen).toHaveBeenCalledOnce();
    });

    it('calls onMessage with raw data string', () => {
      const h = makeHandlers();
      connectWithRetry('ws://test', h);
      MockWebSocket.last.triggerOpen();
      MockWebSocket.last.triggerMessage('{"type":"ping"}');
      expect(h.onMessage).toHaveBeenCalledWith('{"type":"ping"}');
    });
  });

  describe('retry behaviour', () => {
    it('calls onRetrying with attempt=1 and delay=1000ms on first close', () => {
      const h = makeHandlers();
      connectWithRetry('ws://test', h);
      MockWebSocket.last.triggerClose();
      expect(h.onRetrying).toHaveBeenCalledWith(1, 1000);
    });

    it('reconnects after the backoff delay', () => {
      connectWithRetry('ws://test', makeHandlers());
      MockWebSocket.last.triggerClose();
      expect(MockWebSocket.allInstances).toHaveLength(1);
      vi.advanceTimersByTime(1000);
      expect(MockWebSocket.allInstances).toHaveLength(2);
    });

    it('uses exponential backoff: 1s → 2s → 4s', () => {
      const h = makeHandlers();
      connectWithRetry('ws://test', h);

      MockWebSocket.last.triggerClose();
      expect(h.onRetrying).toHaveBeenCalledWith(1, 1000);

      vi.advanceTimersByTime(1000);
      MockWebSocket.last.triggerClose();
      expect(h.onRetrying).toHaveBeenCalledWith(2, 2000);

      vi.advanceTimersByTime(2000);
      MockWebSocket.last.triggerClose();
      expect(h.onRetrying).toHaveBeenCalledWith(3, 4000);
    });

    it('calls onFailed after maxAttempts exceeded', () => {
      const h = makeHandlers();
      connectWithRetry('ws://test', h, { maxAttempts: 2 });

      MockWebSocket.last.triggerClose(); // attempt 1
      vi.advanceTimersByTime(1000);
      MockWebSocket.last.triggerClose(); // attempt 2
      vi.advanceTimersByTime(2000);
      MockWebSocket.last.triggerClose(); // attempt 3 → exceeds limit

      expect(h.onFailed).toHaveBeenCalledOnce();
    });

    it('does not call onFailed before maxAttempts are exhausted', () => {
      const h = makeHandlers();
      connectWithRetry('ws://test', h, { maxAttempts: 3 });

      MockWebSocket.last.triggerClose();
      vi.advanceTimersByTime(1000);
      MockWebSocket.last.triggerClose();

      expect(h.onFailed).not.toHaveBeenCalled();
    });

    it('resets attempt counter after a successful reconnect', () => {
      const h = makeHandlers();
      connectWithRetry('ws://test', h);

      MockWebSocket.last.triggerClose(); // attempt 1
      vi.advanceTimersByTime(1000);
      MockWebSocket.last.triggerOpen(); // successful → reset
      MockWebSocket.last.triggerClose(); // back to attempt 1

      expect(h.onRetrying).toHaveBeenCalledTimes(2);
      expect(h.onRetrying).toHaveBeenNthCalledWith(2, 1, 1000);
    });
  });

  describe('destroy', () => {
    it('prevents retries after destroy', () => {
      const h = makeHandlers();
      const { destroy } = connectWithRetry('ws://test', h);
      destroy();
      vi.advanceTimersByTime(10_000);
      expect(MockWebSocket.allInstances).toHaveLength(1);
      expect(h.onRetrying).not.toHaveBeenCalled();
    });

    it('cancels a pending retry timer on destroy', () => {
      const h = makeHandlers();
      const { destroy } = connectWithRetry('ws://test', h);
      MockWebSocket.last.triggerClose(); // starts 1s timer
      destroy();
      vi.advanceTimersByTime(2000);
      expect(MockWebSocket.allInstances).toHaveLength(1);
    });
  });

  describe('send', () => {
    it('sends data when socket is open', () => {
      const { send } = connectWithRetry('ws://test', makeHandlers());
      MockWebSocket.last.triggerOpen();
      send('hello');
      expect(MockWebSocket.last.sentMessages).toContain('hello');
    });

    it('does not send when socket is still connecting', () => {
      const { send } = connectWithRetry('ws://test', makeHandlers());
      send('hello');
      expect(MockWebSocket.last.sentMessages).toHaveLength(0);
    });

    it('does not throw when socket is null during retry gap', () => {
      const { send } = connectWithRetry('ws://test', makeHandlers());
      MockWebSocket.last.triggerClose(); // socket closed, retry pending
      expect(() => send('hello')).not.toThrow();
    });
  });
});
