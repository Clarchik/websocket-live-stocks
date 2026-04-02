import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MockStockService } from './mock-stock.service';
import { MockWebSocket } from '../testing/websocket.mock';
import { StockStore } from '../stores/stock-store';

const mockStoreFactory = () => ({
  stocks: signal([] as any[]),
  applyUpdate: vi.fn(),
  toggleStock: vi.fn(),
});

describe('MockStockService', () => {
  let service: MockStockService;
  let mockStore: ReturnType<typeof mockStoreFactory>;

  beforeEach(() => {
    MockWebSocket.allInstances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers();

    mockStore = mockStoreFactory();

    TestBed.configureTestingModule({
      providers: [MockStockService, { provide: StockStore, useValue: mockStore }],
    });
    service = TestBed.inject(MockStockService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts with connecting status', () => {
    expect(service.connectionStatus()).toBe('connecting');
  });

  it('exposes the store stocks signal', () => {
    expect(service.stocks).toBe(mockStore.stocks);
  });

  it('sets status to connected on open', () => {
    MockWebSocket.last.triggerOpen();
    expect(service.connectionStatus()).toBe('connected');
  });

  it('calls store.applyUpdate on message', () => {
    const update = {
      symbol: 'AAPL',
      currentPrice: 180,
      dailyHigh: 181,
      dailyLow: 174,
      weekHigh52: 199,
      weekLow52: 143,
    };
    MockWebSocket.last.triggerMessage(JSON.stringify(update));
    expect(mockStore.applyUpdate).toHaveBeenCalledWith(update);
  });

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

  it('delegates toggleStock to store', () => {
    service.toggleStock('AAPL');
    expect(mockStore.toggleStock).toHaveBeenCalledWith('AAPL');
  });

  it('closes the socket on destroy', () => {
    const closeSpy = vi.spyOn(MockWebSocket.last, 'close');
    service.ngOnDestroy();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('does not retry after destroy', () => {
    service.ngOnDestroy();
    vi.advanceTimersByTime(10_000);
    expect(MockWebSocket.allInstances).toHaveLength(1);
  });
});
