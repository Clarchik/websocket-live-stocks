import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FinnhubStockService } from './finnhub-stock.service';
import { StockStore, INITIAL_STOCKS } from '../stores/stock-store';
import { MockWebSocket } from '../testing/websocket.mock';

const SYMBOLS = INITIAL_STOCKS.map((s) => s.quote.symbol);

const mockStoreFactory = () => ({
  stocks: signal(INITIAL_STOCKS.map((s) => ({ ...s, quote: { ...s.quote } }))),
  applyUpdate: vi.fn(),
  toggleStock: vi.fn(),
});

describe('FinnhubStockService', () => {
  let service: FinnhubStockService;
  let mockStore: ReturnType<typeof mockStoreFactory>;

  beforeEach(() => {
    MockWebSocket.allInstances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();

    mockStore = mockStoreFactory();

    TestBed.configureTestingModule({
      providers: [FinnhubStockService, { provide: StockStore, useValue: mockStore }],
    });
    service = TestBed.inject(FinnhubStockService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts with connecting status', () => {
    expect(service.connectionStatus()).toBe('connecting');
  });

  it('connects to the Finnhub WebSocket URL', () => {
    expect(MockWebSocket.last.url).toContain('ws.finnhub.io');
  });

  it('exposes the store stocks signal', () => {
    expect(service.stocks).toBe(mockStore.stocks);
  });

  describe('on open', () => {
    it('sets status to connected', () => {
      MockWebSocket.last.triggerOpen();
      expect(service.connectionStatus()).toBe('connected');
    });

    it('subscribes to all symbols', () => {
      MockWebSocket.last.triggerOpen();
      const subscriptions = MockWebSocket.last.parsedSentMessages.filter(
        (m: any) => m.type === 'subscribe',
      );
      expect(subscriptions).toHaveLength(SYMBOLS.length);
      SYMBOLS.forEach((symbol) =>
        expect(subscriptions).toContainEqual({ type: 'subscribe', symbol }),
      );
    });
  });

  describe('on message', () => {
    beforeEach(() => MockWebSocket.last.triggerOpen());

    it('ignores ping messages', () => {
      MockWebSocket.last.triggerMessage(JSON.stringify({ type: 'ping' }));
      expect(mockStore.applyUpdate).not.toHaveBeenCalled();
    });

    it('ignores trade messages with empty data array', () => {
      MockWebSocket.last.triggerMessage(JSON.stringify({ type: 'trade', data: [] }));
      expect(mockStore.applyUpdate).not.toHaveBeenCalled();
    });

    it('calls store.applyUpdate for a trade', () => {
      MockWebSocket.last.triggerMessage(
        JSON.stringify({
          type: 'trade',
          data: [{ s: 'AAPL', p: 180, v: 10, t: Date.now() }],
        }),
      );
      expect(mockStore.applyUpdate).toHaveBeenCalledOnce();
      expect(mockStore.applyUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'AAPL', currentPrice: 180 }),
      );
    });

    it('keeps only the latest trade per symbol when multiple arrive in one message', () => {
      MockWebSocket.last.triggerMessage(
        JSON.stringify({
          type: 'trade',
          data: [
            { s: 'AAPL', p: 170, v: 5, t: 1000 },
            { s: 'AAPL', p: 185, v: 10, t: 2000 }, // ← latest, should win
          ],
        }),
      );
      expect(mockStore.applyUpdate).toHaveBeenCalledOnce();
      expect(mockStore.applyUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'AAPL', currentPrice: 185 }),
      );
    });

    it('processes trades for multiple symbols in one message', () => {
      MockWebSocket.last.triggerMessage(
        JSON.stringify({
          type: 'trade',
          data: [
            { s: 'AAPL', p: 180, v: 5, t: 1000 },
            { s: 'GOOGL', p: 170, v: 3, t: 1000 },
          ],
        }),
      );
      expect(mockStore.applyUpdate).toHaveBeenCalledTimes(2);
    });

    it('ignores trades for unknown symbols', () => {
      MockWebSocket.last.triggerMessage(
        JSON.stringify({
          type: 'trade',
          data: [{ s: 'UNKNOWN', p: 100, v: 1, t: 1000 }],
        }),
      );
      expect(mockStore.applyUpdate).not.toHaveBeenCalled();
    });

    it('updates dailyHigh when new price exceeds current high', () => {
      MockWebSocket.last.triggerMessage(
        JSON.stringify({
          type: 'trade',
          data: [{ s: 'AAPL', p: 999, v: 1, t: 1000 }],
        }),
      );
      expect(mockStore.applyUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ dailyHigh: 999 }),
      );
    });

    it('updates dailyLow when new price falls below current low', () => {
      MockWebSocket.last.triggerMessage(
        JSON.stringify({
          type: 'trade',
          data: [{ s: 'AAPL', p: 1, v: 1, t: 1000 }],
        }),
      );
      expect(mockStore.applyUpdate).toHaveBeenCalledWith(expect.objectContaining({ dailyLow: 1 }));
    });
  });

  describe('retry', () => {
    it('sets status to connecting when retrying', () => {
      MockWebSocket.last.triggerOpen();
      MockWebSocket.last.triggerClose();
      expect(service.connectionStatus()).toBe('connecting');
    });

    it('sets status to error after all retries exhausted', () => {
      for (let i = 0; i <= 3; i++) {
        MockWebSocket.last.triggerClose();
        vi.advanceTimersByTime(10_000);
      }
      expect(service.connectionStatus()).toBe('error');
    });
  });

  describe('toggleStock', () => {
    it('delegates to store', () => {
      service.toggleStock('AAPL');
      expect(mockStore.toggleStock).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('ngOnDestroy', () => {
    it('sends unsubscribe for all symbols', () => {
      MockWebSocket.last.triggerOpen();
      service.ngOnDestroy();
      const unsubscriptions = MockWebSocket.last.parsedSentMessages.filter(
        (m: any) => m.type === 'unsubscribe',
      );
      SYMBOLS.forEach((symbol) =>
        expect(unsubscriptions).toContainEqual({ type: 'unsubscribe', symbol }),
      );
    });

    it('does not retry after destroy', () => {
      service.ngOnDestroy();
      vi.advanceTimersByTime(10_000);
      expect(MockWebSocket.allInstances).toHaveLength(1);
    });
  });
});
